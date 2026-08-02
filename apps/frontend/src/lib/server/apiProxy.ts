import { NextResponse } from 'next/server';
import { connectionErrorResponse, getBackendUrl, type BackendErrorBody } from './backendFetch';

export type { BackendErrorBody };

// Traducción genérica (no específica de auth, ver authProxy.ts para esa) para
// los recursos del estudio (Project, Track...). 401/404 nunca deberían llegar
// aquí en uso normal del propio frontend -- son defensa en profundidad.
export function translateApiError(
  status: number,
  body: BackendErrorBody | null,
): { message: string; code?: string } {
  if (status === 401) {
    return { message: 'No autenticado', code: 'UNAUTHENTICATED' };
  }
  if (status === 404) {
    return { message: 'No encontrado', code: 'NOT_FOUND' };
  }
  if (status === 400) {
    const firstIssue = body?.details?.[0]?.message;
    return { message: firstIssue ?? body?.error ?? 'Datos inválidos', code: 'VALIDATION_ERROR' };
  }
  return { message: body?.error ?? 'Ha ocurrido un error inesperado', code: undefined };
}

interface ProxyJsonOptions {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  cookie: string | null;
  body?: string;
}

// Proxy genérico autenticado hacia el backend: reenvía la cookie de sesión
// entrante, traduce errores, y pasa el cuerpo de la respuesta tal cual en
// éxito. Usado por las rutas de /api/projects y /api/projects/*/tracks.
export async function proxyJson(path: string, options: ProxyJsonOptions): Promise<NextResponse> {
  let backendRes: Response;
  try {
    backendRes = await fetch(`${getBackendUrl()}${path}`, {
      method: options.method,
      headers: {
        cookie: options.cookie ?? '',
        ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: options.body,
      cache: 'no-store',
    });
  } catch {
    return connectionErrorResponse();
  }

  if (backendRes.status === 204) {
    return new NextResponse(null, { status: 204 });
  }

  const data: unknown = await backendRes.json().catch(() => null);

  if (!backendRes.ok) {
    const { message, code } = translateApiError(backendRes.status, data as BackendErrorBody | null);
    return NextResponse.json({ message, code }, { status: backendRes.status });
  }

  return NextResponse.json(data, { status: backendRes.status });
}
