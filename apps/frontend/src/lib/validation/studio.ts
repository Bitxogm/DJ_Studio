import { z } from 'zod';
import { TRACK_TYPES } from '@beatforge/shared';

// Los <input> siempre entregan strings a react-hook-form. Se validan aquí
// como strings (bpm incluido) y se convierten a lo que espera el body de la
// API (mismo shape que apps/backend/src/schemas/project.schema.ts) en el
// onSubmit del componente -- evita mezclar tipos de entrada/salida distintos
// en el resolver, que choca con el genérico de FormField (ver src/components/ui/form.tsx).
export const newProjectSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  bpm: z.string().optional().refine(isValidOptionalBpm, {
    message: 'El BPM debe ser un número entero entre 1 y 999',
  }),
  key: z.string().optional(),
});
export type NewProjectFormValues = z.infer<typeof newProjectSchema>;

function isValidOptionalBpm(value: string | undefined): boolean {
  if (!value || value.trim() === '') return true;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 999;
}

export const newTrackSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  type: z.enum(TRACK_TYPES, { message: 'Selecciona un tipo de track' }),
});
export type NewTrackFormValues = z.infer<typeof newTrackSchema>;
