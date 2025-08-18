import { z } from "zod";

export const createAbsenceSchema = z.object({
  eleveId: z.number().int().positive(),
  matiereId: z.number().int().positive(),
  date: z.coerce.date(),
  justificationText: z.string().max(500).optional(),
  enseignantId: z.number().int().positive(),     // l’auteur (souvent req.user.id si enseignant)
  status: z.enum(["ABSENT", "RETARD"]).default("ABSENT"),
});

export const updateAbsenceSchema = z.object({
  matiereId: z.number().int().positive().optional(),
  date: z.coerce.date().optional(),
  justificationText: z.string().max(500).optional(),
  status: z.enum(["ABSENT", "RETARD"]).optional(),
  justified: z.boolean().optional(),
});

export const justifyAbsenceSchema = z.object({
  justified: z.literal(true),
  justificationText: z.string().min(2).max(500),
});
