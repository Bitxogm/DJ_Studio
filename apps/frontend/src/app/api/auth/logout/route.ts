import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { connectionErrorResponse, forwardSetCookies, getBackendUrl } from '@/lib/server/authProxy';

export async function POST(req: NextRequest): Promise<NextResponse> {
  let backendRes: Response;
  try {
    backendRes = await fetch(`${getBackendUrl()}/api/auth/logout`, {
      method: 'POST',
      headers: { cookie: req.headers.get('cookie') ?? '' },
    });
  } catch {
    return connectionErrorResponse();
  }

  const response = new NextResponse(null, { status: backendRes.status });
  forwardSetCookies(backendRes, response);
  return response;
}
