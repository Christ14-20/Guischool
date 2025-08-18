import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Créer une école
export const createEcole = async (data) => {
  return prisma.ecole.create({
    data: {
      nom: data.nom,
      adresse: data.adresse,
      email: data.email,
      tel: data.tel,
      niveauDisponible: data.niveauDisponible || "",
      bareme: data.bareme || "",
      horaires: data.horaires || "",
      optionsPaiement: data.optionsPaiement || "",
      actif: true,
    },
  });
};

// Récupérer toutes les écoles avec pagination et recherche
export const getEcoles = async ({ page = 1, limit = 10, search = "" }) => {
  const skip = (page - 1) * limit;
  return prisma.ecole.findMany({
    where: {
      nom: { contains: search, mode: "insensitive" },
    },
    skip,
    take: limit,
    orderBy: { createdAt: "desc" },
  });
};

// Récupérer école par ID
export const getEcoleById = async (id) => {
  return prisma.ecole.findUnique({ where: { id } });
};

// Mettre à jour école
export const updateEcole = async (id, data) => {
  return prisma.ecole.update({
    where: { id },
    data,
  });
};

// Désactiver école (soft delete)
export const deleteEcole = async (id) => {
  return prisma.ecole.update({
    where: { id },
    data: { actif: false, updatedAt: new Date() },
  });
};
