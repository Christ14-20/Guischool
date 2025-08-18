import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const createMatiere = async (data) => {
  // Sécurité multi-tenant: l'API appellera avec ecoleId = req.user.ecoleId
  return prisma.matiere.create({ data });
};

export const getMatieres = async ({ page = 1, limit = 10, search = "", classeId, ecoleId }) => {
  const skip = (page - 1) * limit;
  return prisma.matiere.findMany({
    where: {
      ecoleId,
      ...(classeId ? { classeId: Number(classeId) } : {}),
      ...(search
        ? { nom: { contains: search, mode: "insensitive" } }
        : {}),
    },
    include: {
      classe: { select: { id: true, nom: true, niveau: true } },
      enseignant: { select: { id: true, nom: true, prenom: true } }
    },
    orderBy: { createdAt: "desc" },
    skip,
    take: limit
  });
};

export const getMatiereById = async (id, ecoleId) => {
  return prisma.matiere.findFirst({
    where: { id, ecoleId },
    include: {
      classe: true,
      enseignant: { select: { id: true, nom: true, prenom: true } }
    }
  });
};

export const updateMatiere = async (id, data, ecoleId) => {
  return prisma.matiere.update({
    where: { id },
    data
  });
};

export const deleteMatiere = async (id, ecoleId) => {
  // Suppression logique possible si besoin; on fait simple: suppression stricte
  return prisma.matiere.delete({ where: { id } });
};
