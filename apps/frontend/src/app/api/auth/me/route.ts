import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  connectionErrorResponse,
  getBackendUrl,
  translateAuthError,
  type BackendErrorBody,
} from '@/lib/server/authProxy';

export async function GET(req: NextRequest): Promise<NextResponse> {
  let backendRes: Response;
  try {
    backendRes = await fetch(`${getBackendUrl()}/api/auth/me`, {
      method: 'GET',
      headers: { cookie: req.headers.get('cookie') ?? '' },
      cache: 'no-store',
    });
  } catch {
    return connectionErrorResponse();
  }

  const data: unknown = await backendRes.json().catch(() => null);

  if (!backendRes.ok) {
    const { message, code } = translateAuthError(
      'me',
      backendRes.status,
      data as BackendErrorBody | null,
    );
    return NextResponse.json({ message, code }, { status: backendRes.status });
  }

  return NextResponse.json(data, { status: backendRes.status });
}
