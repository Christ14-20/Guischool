import { z } from "zod";

export const createMatiereSchema = z.object({
  nom: z.string().min(1),
  classeId: z.number().int().positive(),
  coef: z.number().positive(),
  enseignantId: z.number().int().positive(),
  ecoleId: z.number().int().positive()
});

export const updateMatiereSchema = z.object({
  nom: z.string().min(1).optional(),
  classeId: z.number().int().positive().optional(),
  coef: z.number().positive().optional(),
  enseignantId: z.number().int().positive().optional()
});
