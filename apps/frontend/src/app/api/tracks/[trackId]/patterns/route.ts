import type { NextRequest } from 'next/server';
import type { NextResponse } from 'next/server';
import { proxyJson } from '@/lib/server/apiProxy';

interface RouteContext {
  params: Promise<{ trackId: string }>;
}

export async function GET(req: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  const { trackId } = await params;
  return proxyJson(`/api/tracks/${trackId}/patterns`, {
    method: 'GET',
    cookie: req.headers.get('cookie'),
  });
}
