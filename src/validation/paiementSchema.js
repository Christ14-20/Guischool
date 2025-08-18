import { z } from "zod";

export const createPaiementSchema = z.object({
  eleveId: z.number().int().positive(),
  type: z.string().min(1),                     // scolarite, inscription, cantine, etc.
  montant: z.number().positive(),
  date: z.coerce.date(),
  modePaiement: z.enum(["CASH", "VIREMENT", "ORANGE_MONEY", "MTN_MOBILE_MONEY", "MOOV", "CHEQUE"]),
  statut: z.enum(["PENDING", "COMPLETED", "FAILED"]).default("PENDING"),
  // Optionnels
  comptableId: z.number().int().optional(),
  note: z.string().max(500).optional(),
});

export const updatePaiementSchema = z.object({
  type: z.string().min(1).optional(),
  montant: z.number().positive().optional(),
  date: z.coerce.date().optional(),
  modePaiement: z.enum(["CASH", "VIREMENT", "ORANGE_MONEY", "MTN_MOBILE_MONEY", "MOOV", "CHEQUE"]).optional(),
  statut: z.enum(["PENDING", "COMPLETED", "FAILED"]).optional(),
  comptableId: z.number().int().optional(),
  note: z.string().max(500).optional(),
});
