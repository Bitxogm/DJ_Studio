import { z } from 'zod';

// Mismo shape que apps/backend/src/schemas/auth.schema.ts (ver CLAUDE.md > Auth):
// valida en cliente antes de enviar, el backend es quien tiene la última palabra.
export const loginSchema = z.object({
  email: z.string().email('Introduce un email válido'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
});
export type LoginFormValues = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  email: z.string().email('Introduce un email válido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  displayName: z.string().min(1, 'El nombre es obligatorio'),
});
export type RegisterFormValues = z.infer<typeof registerSchema>;
