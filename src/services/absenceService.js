import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Créer une absence
export const createAbsence = async (data, contextUser) => {
  // sécurité multi-tenant : vérifier que l'élève appartient à l'école du user
  const eleve = await prisma.eleve.findFirst({
    where: { id: data.eleveId, ecoleId: contextUser.ecoleId, deletedAt: null },
    select: { id: true, nom: true, prenom: true, tuteurId: true, classeId: true }
  });
  if (!eleve) throw new Error("Élève introuvable dans cette école.");

  // Option: empêcher doublon pour même élève/matière/date
  const exists = await prisma.absence.findFirst({
    where: { eleveId: data.eleveId, matiereId: data.matiereId, date: data.date }
  });
  if (exists) throw new Error("Absence déjà enregistrée pour cette matière et cette date.");

  return prisma.absence.create({
    data: {
      eleveId: data.eleveId,
      matiereId: data.matiereId,
      date: data.date,
      justification: data.justificationText || null,
      enseignantId: data.enseignantId,
      status: data.status || "ABSENT",
      justified: false,
    },
    include: {
      eleve: { select: { id: true, nom: true, prenom: true, tuteurId: true } },
      matiere: { select: { id: true, nom: true } }
    }
  });
};

// Lister absences (pagination + filtres)
export const getAbsences = async ({ page=1, limit=10, ecoleId, search="", eleveId, classeId, matiereId, justified, status, dateFrom, dateTo }) => {
  const skip = (page - 1) * limit;

  const where = {
    // restreindre via l'école par jointures
    eleve: { ecoleId, deletedAt: null, ...(classeId ? { classeId: Number(classeId) } : {}) },
    ...(eleveId ? { eleveId: Number(eleveId) } : {}),
    ...(matiereId ? { matiereId: Number(matiereId) } : {}),
    ...(typeof justified === "string" ? { justified: justified === "true" } : {}),
    ...(status ? { status } : {}),
    ...(dateFrom || dateTo ? {
      date: {
        gte: dateFrom ? new Date(dateFrom) : undefined,
        lte: dateTo ? new Date(dateTo) : undefined
      }
    } : {}),
    ...(search ? {
      OR: [
        { eleve: { nom: { contains: search, mode: "insensitive" } } },
        { eleve: { prenom: { contains: search, mode: "insensitive" } } },
        { matiere: { nom: { contains: search, mode: "insensitive" } } },
      ]
    } : {})
  };

  const [items, total] = await Promise.all([
    prisma.absence.findMany({
      where,
      include: {
        eleve: { select: { id: true, nom: true, prenom: true, classeId: true, tuteurId: true } },
        matiere: { select: { id: true, nom: true } },
        enseignant: { select: { id: true, nom: true, prenom: true } }
      },
      orderBy: { date: "desc" },
      skip, take: limit
    }),
    prisma.absence.count({ where })
  ]);

  return { items, page, limit, total, totalPages: Math.ceil(total / limit || 1) };
};

// Détails
export const getAbsenceById = async (id, ecoleId) => {
  return prisma.absence.findFirst({
    where: { id, eleve: { ecoleId } },
    include: {
      eleve: { select: { id: true, nom: true, prenom: true, tuteurId: true } },
      matiere: { select: { id: true, nom: true } },
      enseignant: { select: { id: true, nom: true, prenom: true } }
    }
  });
};

// Mise à jour
export const updateAbsence = async (id, data, ecoleId) => {
  // On laisse Prisma vérifier l'existence; multi-tenant via where later si tu souhaites
  return prisma.absence.update({ where: { id }, data });
};

// Marquer justifiée
export const justifyAbsence = async (id, justificationText, ecoleId) => {
  return prisma.absence.update({
    where: { id },
    data: { justified: true, justification: justificationText }
  });
};

// Suppression
export const deleteAbsence = async (id, ecoleId) => {
  return prisma.absence.delete({ where: { id } });
};

// Marquage en masse (par classe + matière + date)
export const bulkMarkAbsences = async ({ classeId, matiereId, date, elevesIds, enseignantId, ecoleId }) => {
  // Sélection des élèves de la classe si non fournis
  let ids = elevesIds;
  if (!ids || !ids.length) {
    const rows = await prisma.eleve.findMany({ where: { ecoleId, classeId, deletedAt: null }, select: { id: true } });
    ids = rows.map(r => r.id);
  }
  // Crée en upsert pour éviter doublons
  const tasks = ids.map(eleveId =>
    prisma.absence.upsert({
      where: {
        // Unique logique possible si tu as @@unique([eleveId,matiereId,date]) côté Prisma
        // À défaut, on utilise une clé que tu auras créée en BDD
        eleveId_matiereId_date: { eleveId, matiereId, date }
      },
      update: { status: "ABSENT" },
      create: { eleveId, matiereId, date, status: "ABSENT", enseignantId, justified: false }
    })
  );
  return Promise.allSettled(tasks);
};
