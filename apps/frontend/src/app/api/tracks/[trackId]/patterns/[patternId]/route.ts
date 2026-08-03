import type { NextRequest } from 'next/server';
import type { NextResponse } from 'next/server';
import { proxyJson } from '@/lib/server/apiProxy';

interface RouteContext {
  params: Promise<{ trackId: string; patternId: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  const { trackId, patternId } = await params;
  return proxyJson(`/api/tracks/${trackId}/patterns/${patternId}`, {
    method: 'PATCH',
    cookie: req.headers.get('cookie'),
    body: await req.text(),
  });
}
