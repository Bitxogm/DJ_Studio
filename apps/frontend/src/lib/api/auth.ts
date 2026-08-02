import type { User } from '@beatforge/shared';

import type { LoginFormValues, RegisterFormValues } from '@/lib/validation/auth';

// Errores ya traducidos por el Route Handler (src/app/api/auth/*/route.ts):
// { message, code? } listo para mostrar en un toast, nunca el body crudo del backend.
export class AuthApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'AuthApiError';
    this.status = status;
    this.code = code;
  }
}

async function throwAuthApiError(res: Response): Promise<never> {
  const body = (await res.json().catch(() => null)) as { message?: string; code?: string } | null;
  throw new AuthApiError(
    body?.message ?? 'Ha ocurrido un error inesperado',
    res.status,
    body?.code,
  );
}

export async function registerRequest(input: RegisterFormValues): Promise<User> {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) await throwAuthApiError(res);
  const { user } = (await res.json()) as { user: User };
  return user;
}

export async function loginRequest(input: LoginFormValues): Promise<User> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) await throwAuthApiError(res);
  const { user } = (await res.json()) as { user: User };
  return user;
}

export async function logoutRequest(): Promise<void> {
  const res = await fetch('/api/auth/logout', { method: 'POST' });
  if (!res.ok) await throwAuthApiError(res);
}

// Devuelve null si no hay sesión activa (401), en vez de lanzar: es el caso
// esperado en cada carga de /login y /register, no un error a mostrar.
export async function meRequest(): Promise<User | null> {
  const res = await fetch('/api/auth/me', { cache: 'no-store' });
  if (res.status === 401) return null;
  if (!res.ok) await throwAuthApiError(res);
  const { user } = (await res.json()) as { user: User };
  return user;
}
