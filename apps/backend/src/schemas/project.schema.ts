import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().min(1),
  bpm: z.number().int().min(1).max(999).optional(),
  key: z.string().min(1).nullable().optional(),
  swing: z.number().min(0).max(1).optional(),
});
export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = createProjectSchema.partial();
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
