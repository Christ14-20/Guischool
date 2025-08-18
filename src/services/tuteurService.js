import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Créer un tuteur
export const createTuteur = async (data) => {
  return prisma.tuteur.create({
    data: {
      nom: data.nom,
      prenom: data.prenom,
      email: data.email,
      tel: data.tel,
      adresse: data.adresse,
    },
  });
};

// Lister tuteurs avec pagination et recherche
export const getTuteurs = async ({ page = 1, limit = 10, search = "" }) => {
  const skip = (page - 1) * limit;
  return prisma.tuteur.findMany({
    where: {
      OR: [
        { nom: { contains: search, mode: "insensitive" } },
        { prenom: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ],
    },
    skip,
    take: limit,
    orderBy: { createdAt: "desc" },
  });
};

// Récupérer tuteur par ID
export const getTuteurById = async (id) => {
  return prisma.tuteur.findUnique({ where: { id } });
};

// Mettre à jour tuteur
export const updateTuteur = async (id, data) => {
  return prisma.tuteur.update({
    where: { id },
    data,
  });
};

// Supprimer tuteur (soft delete si nécessaire)
export const deleteTuteur = async (id) => {
  return prisma.tuteur.delete({ where: { id } }); // suppression stricte
};
