import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Créer une note
export const createNote = async (data, context) => {
  // Option: empêcher doublon même jour matière (au niveau app)
  const exists = await prisma.note.findFirst({
    where: { eleveId: data.eleveId, matiereId: data.matiereId, date: data.date }
  });
  if (exists) throw new Error("Une note pour cet élève, matière et date existe déjà.");
  return prisma.note.create({ data });
};

// Lister notes (filtres)
export const getNotes = async ({ page = 1, limit = 10, ecoleId, eleveId, matiereId, classeId, dateFrom, dateTo }) => {
  const skip = (page - 1) * limit;

  const where = {
    ...(eleveId ? { eleveId: Number(eleveId) } : {}),
    ...(matiereId ? { matiereId: Number(matiereId) } : {}),
    ...(dateFrom || dateTo ? {
      date: {
        gte: dateFrom ? new Date(dateFrom) : undefined,
        lte: dateTo ? new Date(dateTo) : undefined
      }
    } : {}),
    // restreindre à l'école: via jointure sur Matiere.ecoleId
    matiere: { ecoleId }
  };

  if (classeId) {
    where.matiere = { ...where.matiere, classeId: Number(classeId) };
  }

  const [items, total] = await Promise.all([
    prisma.note.findMany({
      where,
      include: {
        eleve: { select: { id: true, nom: true, prenom: true, classeId: true } },
        matiere: { select: { id: true, nom: true, coef: true, classeId: true } },
        enseignant: { select: { id: true, nom: true, prenom: true } }
      },
      orderBy: { date: "desc" },
      skip,
      take: limit
    }),
    prisma.note.count({ where })
  ]);

  return { items, page, limit, total, totalPages: Math.ceil(total / limit || 1) };
};

// Détails
export const getNoteById = async (id, ecoleId) => {
  return prisma.note.findFirst({
    where: { id, matiere: { ecoleId } },
    include: {
      eleve: { select: { id: true, nom: true, prenom: true } },
      matiere: { select: { id: true, nom: true, coef: true } },
      enseignant: { select: { id: true, nom: true, prenom: true } }
    }
  });
};

// MAJ / suppression
export const updateNote = async (id, data, ecoleId) => {
  return prisma.note.update({ where: { id }, data });
};
export const deleteNote = async (id, ecoleId) => {
  return prisma.note.delete({ where: { id } });
};

// ---- Calculs de moyennes ----
// Moyenne pondérée d'un élève par matière (période)
export const moyenneEleveParMatiere = async ({ eleveId, matiereId, dateFrom, dateTo, ecoleId }) => {
  const notes = await prisma.note.findMany({
    where: {
      eleveId,
      matiereId,
      matiere: { ecoleId },
      ...(dateFrom || dateTo ? {
        date: { gte: dateFrom ? new Date(dateFrom) : undefined, lte: dateTo ? new Date(dateTo) : undefined }
      } : {})
    },
    include: { matiere: { select: { coef: true } } }
  });
  if (!notes.length) return { moyenne: null, coef: null };
  const coef = notes[0].matiere.coef;
  const moyenne = notes.reduce((acc, n) => acc + n.note, 0) / notes.length;
  return { moyenne, coef };
};

// Moyenne générale d'un élève (pondérée par les coefficients des matières de sa classe)
export const moyenneGeneraleEleve = async ({ eleveId, dateFrom, dateTo, ecoleId }) => {
  // Récupère toutes les matières de la classe de l'élève
  const eleve = await prisma.eleve.findFirst({ where: { id: eleveId, ecoleId }, select: { classeId: true } });
  if (!eleve) throw new Error("Élève introuvable dans cette école.");

  const matieres = await prisma.matiere.findMany({
    where: { ecoleId, classeId: eleve.classeId },
    select: { id: true, coef: true }
  });

  if (!matieres.length) return { moyenne: null, details: [] };

  let sumCoef = 0;
  let sumNoteCoef = 0;
  const details = [];

  for (const m of matieres) {
    const { moyenne, coef } = await moyenneEleveParMatiere({ eleveId, matiereId: m.id, dateFrom, dateTo, ecoleId });
    if (moyenne != null && coef) {
      sumCoef += coef;
      sumNoteCoef += moyenne * coef;
      details.push({ matiereId: m.id, moyenne, coef });
    } else {
      details.push({ matiereId: m.id, moyenne: null, coef: m.coef });
    }
  }

  const moyenne = sumCoef > 0 ? sumNoteCoef / sumCoef : null;
  return { moyenne, details, sumCoef };
};

// Moyennes d'une classe (tous élèves) sur une période
export const moyennesClasse = async ({ classeId, dateFrom, dateTo, ecoleId }) => {
  const eleves = await prisma.eleve.findMany({
    where: { ecoleId, classeId, deletedAt: null },
    select: { id: true, nom: true, prenom: true }
  });

  const results = [];
  for (const e of eleves) {
    const mg = await moyenneGeneraleEleve({ eleveId: e.id, dateFrom, dateTo, ecoleId });
    results.push({ eleveId: e.id, nom: e.nom, prenom: e.prenom, moyenne: mg.moyenne, details: mg.details });
  }

  // Classement par moyenne décroissante (nulls en bas)
  results.sort((a, b) => (b.moyenne ?? -1) - (a.moyenne ?? -1));
  return results;
};
