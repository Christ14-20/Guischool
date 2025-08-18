import { PrismaClient } from "@prisma/client";
import { generatePaymentRef } from "../utils/ref.js";
const prisma = new PrismaClient();

// Créer un paiement
export const createPaiement = async (data, contextUser) => {
  // Multi-tenant: impose ecoleId du user
  const ecoleId = contextUser.ecoleId;
  const reference = generatePaymentRef(`GS${ecoleId}`);
  return prisma.paiement.create({
    data: {
      eleveId: data.eleveId,
      type: data.type,
      montant: data.montant,
      date: data.date,
      modePaiement: data.modePaiement,
      referencePaiement: reference,
      effectueParId: contextUser.id,
      statut: data.statut || "PENDING",
      comptableId: data.comptableId ?? (contextUser.role === "COMPTABLE" ? contextUser.id : null),
      ecoleId,
    },
  });
};

// Liste avec filtres + pagination
export const getPaiements = async ({ page = 1, limit = 10, search = "", filters = {}, ecoleId }) => {
  const skip = (page - 1) * limit;
  const where = {
    ecoleId,
    ...(filters.eleveId ? { eleveId: Number(filters.eleveId) } : {}),
    ...(filters.statut ? { statut: filters.statut } : {}),
    ...(filters.mode ? { modePaiement: filters.mode } : {}),
    ...(filters.dateFrom || filters.dateTo
      ? {
          date: {
            gte: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
            lte: filters.dateTo ? new Date(filters.dateTo) : undefined,
          },
        }
      : {}),
    ...(search
      ? {
          OR: [
            { referencePaiement: { contains: search, mode: "insensitive" } },
            { type: { contains: search, mode: "insensitive" } },
            { modePaiement: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [items, total, aggregates] = await Promise.all([
    prisma.paiement.findMany({
      where,
      include: { eleve: { select: { id: true, nom: true, prenom: true, classeId: true } } },
      orderBy: { date: "desc" },
      skip,
      take: limit,
    }),
    prisma.paiement.count({ where }),
    prisma.paiement.aggregate({
      _sum: { montant: true },
      where,
    }),
  ]);

  return {
    items,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit || 1),
    sumMontant: aggregates._sum.montant ?? 0,
  };
};

// Détails par ID (avec élève)
export const getPaiementById = async (id, ecoleId) => {
  return prisma.paiement.findFirst({
    where: { id, ecoleId },
    include: { eleve: { select: { id: true, nom: true, prenom: true } } },
  });
};

// Mettre à jour (montant, statut, etc.)
export const updatePaiement = async (id, data, ecoleId) => {
  return prisma.paiement.update({
    where: { id },
    data,
  });
};

// Annuler/Invalidation (soft approach: statut FAILED)
export const cancelPaiement = async (id, ecoleId) => {
  return prisma.paiement.update({
    where: { id },
    data: { statut: "FAILED" },
  });
};
