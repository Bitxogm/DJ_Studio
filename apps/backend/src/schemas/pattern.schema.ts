import { z } from 'zod';

// Secuenciador de pasos: 16 steps fijos por patrón (ver dominio en CLAUDE.md).
export const patternStepSchema = z.object({
  active: z.boolean(),
  note: z.string().nullable(),
  velocity: z.number().min(0).max(1),
});

export const createPatternSchema = z.object({
  name: z.string().min(1),
  steps: z.array(patternStepSchema).length(16),
  timelinePosition: z.number().int().min(0),
  lengthInBars: z.number().int().min(1).optional(),
});
export type CreatePatternInput = z.infer<typeof createPatternSchema>;

export const updatePatternSchema = z.object({
  name: z.string().min(1).optional(),
  steps: z.array(patternStepSchema).length(16).optional(),
  timelinePosition: z.number().int().min(0).optional(),
  lengthInBars: z.number().int().min(1).optional(),
});
export type UpdatePatternInput = z.infer<typeof updatePatternSchema>;
