import type { NextResponse } from 'next/server';
import { connectionErrorResponse, getBackendUrl, type BackendErrorBody } from './backendFetch';

export { connectionErrorResponse, getBackendUrl };
export type { BackendErrorBody };

export type AuthAction = 'register' | 'login' | 'refresh' | 'logout' | 'me';

// Traduce errores del backend a { message, code? } consistente para el cliente.
// Los mensajes de validación de campo (Zod) nunca deberían llegar aquí en uso
// normal -- react-hook-form + zodResolver ya validan antes de enviar -- pero se
// traducen igualmente como defensa en profundidad (petición directa, bug de cliente...).
export function translateAuthError(
  action: AuthAction,
  status: number,
  body: BackendErrorBody | null,
): { message: string; code?: string } {
  if (status === 429) {
    return {
      message: 'Demasiados intentos. Espera unos minutos antes de volver a intentarlo.',
      code: 'RATE_LIMITED',
    };
  }
  if (action === 'register' && status === 409) {
    return { message: 'Este email ya está registrado', code: 'EMAIL_TAKEN' };
  }
  if (action === 'login' && status === 401) {
    return { message: 'Email o contraseña incorrectos', code: 'INVALID_CREDENTIALS' };
  }
  if (status === 400) {
    const firstIssue = body?.details?.[0]?.message;
    return { message: firstIssue ?? body?.error ?? 'Datos inválidos', code: 'VALIDATION_ERROR' };
  }
  return { message: body?.error ?? 'Ha ocurrido un error inesperado', code: undefined };
}

// undici (fetch de Next.js) expone las cabeceras Set-Cookie repetidas vía
// getSetCookie(); Headers.get('set-cookie') las colapsaría en un solo string.
export function forwardSetCookies(from: Response, to: NextResponse): void {
  for (const cookie of from.headers.getSetCookie()) {
    to.headers.append('set-cookie', cookie);
  }
}
