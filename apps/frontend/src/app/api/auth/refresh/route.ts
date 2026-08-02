import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  connectionErrorResponse,
  forwardSetCookies,
  getBackendUrl,
  translateAuthError,
  type BackendErrorBody,
} from '@/lib/server/authProxy';

export async function POST(req: NextRequest): Promise<NextResponse> {
  let backendRes: Response;
  try {
    backendRes = await fetch(`${getBackendUrl()}/api/auth/refresh`, {
      method: 'POST',
      headers: { cookie: req.headers.get('cookie') ?? '' },
    });
  } catch {
    return connectionErrorResponse();
  }

  const data: unknown = await backendRes.json().catch(() => null);

  if (!backendRes.ok) {
    const { message, code } = translateAuthError(
      'refresh',
      backendRes.status,
      data as BackendErrorBody | null,
    );
    const response = NextResponse.json({ message, code }, { status: backendRes.status });
    // El backend limpia las cookies de sesión aunque el refresh falle (sesión inválida/expirada).
    forwardSetCookies(backendRes, response);
    return response;
  }

  const response = NextResponse.json(data, { status: backendRes.status });
  forwardSetCookies(backendRes, response);
  return response;
}
