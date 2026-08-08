import { z } from 'zod';

export const trackTypeSchema = z.enum([
  'DRUM',
  'SYNTH',
  'SAMPLE',
  'BASS',
  'HIHAT',
  'SNARE',
  'HIHAT_OPEN',
]);

export const createTrackSchema = z.object({
  name: z.string().min(1),
  type: trackTypeSchema,
  order: z.number().int().min(0),
  volume: z.number().min(0).max(1).optional(),
  instrumentConfig: z.record(z.string(), z.unknown()).default({}),
  sampleId: z.string().min(1).nullable().optional(),
});
export type CreateTrackInput = z.infer<typeof createTrackSchema>;

export const updateTrackSchema = z.object({
  name: z.string().min(1).optional(),
  order: z.number().int().min(0).optional(),
  volume: z.number().min(0).max(1).optional(),
  muted: z.boolean().optional(),
  soloed: z.boolean().optional(),
  instrumentConfig: z.record(z.string(), z.unknown()).optional(),
  sampleId: z.string().min(1).nullable().optional(),
});
export type UpdateTrackInput = z.infer<typeof updateTrackSchema>;
