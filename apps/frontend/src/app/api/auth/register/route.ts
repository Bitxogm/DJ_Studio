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
    backendRes = await fetch(`${getBackendUrl()}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: await req.text(),
    });
  } catch {
    return connectionErrorResponse();
  }

  const data: unknown = await backendRes.json().catch(() => null);

  if (!backendRes.ok) {
    const { message, code } = translateAuthError(
      'register',
      backendRes.status,
      data as BackendErrorBody | null,
    );
    return NextResponse.json({ message, code }, { status: backendRes.status });
  }

  const response = NextResponse.json(data, { status: backendRes.status });
  forwardSetCookies(backendRes, response);
  return response;
}
