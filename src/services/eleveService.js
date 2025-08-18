import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Créer un élève
export const createEleve = async (data) => {
  return prisma.eleve.create({
    data: {
      nom: data.nom,
      prenom: data.prenom,
      dateNaissance: data.dateNaissance,
      classeId: data.classeId,
      ecoleId: data.ecoleId,
      tuteurId: data.tuteurId,
      status: "ACTIF",
    },
  });
};

// Lister élèves avec pagination, recherche et filtre
export const getEleves = async ({ page = 1, limit = 10, search = "", ecoleId }) => {
  const skip = (page - 1) * limit;
  return prisma.eleve.findMany({
    where: {
      ecoleId,
      OR: [
        { nom: { contains: search, mode: "insensitive" } },
        { prenom: { contains: search, mode: "insensitive" } },
      ],
      deletedAt: null,
    },
    skip,
    take: limit,
    orderBy: { createdAt: "desc" },
  });
};

// Récupérer élève par ID
export const getEleveById = async (id) => {
  return prisma.eleve.findUnique({ where: { id } });
};

// Mettre à jour élève
export const updateEleve = async (id, data) => {
  return prisma.eleve.update({
    where: { id },
    data,
  });
};

// Soft delete élève
export const deleteEleve = async (id) => {
  return prisma.eleve.update({
    where: { id },
    data: { deletedAt: new Date(), status: "SUPPRIME" },
  });
};
