import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Créer une classe
export const createClasse = async (data) => {
  return prisma.classe.create({
    data: {
      nom: data.nom,
      niveau: data.niveau,
      filiere: data.filiere || "",
      capacite: data.capacite || null,
      ecoleId: data.ecoleId,
      createurId: data.createurId,
    },
  });
};

// Lister classes avec pagination et recherche
export const getClasses = async ({ page = 1, limit = 10, search = "", ecoleId }) => {
  const skip = (page - 1) * limit;
  return prisma.classe.findMany({
    where: {
      ecoleId,
      OR: [
        { nom: { contains: search, mode: "insensitive" } },
        { filiere: { contains: search, mode: "insensitive" } },
        { niveau: { contains: search, mode: "insensitive" } },
      ],
    },
    skip,
    take: limit,
    orderBy: { createdAt: "desc" },
  });
};

// Récupérer classe par ID
export const getClasseById = async (id) => {
  return prisma.classe.findUnique({ where: { id } });
};

// Mettre à jour classe
export const updateClasse = async (id, data) => {
  return prisma.classe.update({
    where: { id },
    data,
  });
};

// Supprimer classe (soft delete)
export const deleteClasse = async (id) => {
  return prisma.classe.update({
    where: { id },
    data: { nom: "[Supprimée] " + new Date().toISOString() },
  });
};
