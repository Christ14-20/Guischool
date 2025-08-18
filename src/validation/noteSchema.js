import { z } from "zod";

export const createNoteSchema = z.object({
  eleveId: z.number().int().positive(),
  matiereId: z.number().int().positive(),
  note: z.number().min(0).max(20),
  date: z.coerce.date(),
  enseignantId: z.number().int().positive()
});

export const updateNoteSchema = z.object({
  note: z.number().min(0).max(20).optional(),
  date: z.coerce.date().optional(),
});
