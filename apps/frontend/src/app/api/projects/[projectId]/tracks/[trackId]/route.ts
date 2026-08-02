import type { NextRequest } from 'next/server';
import type { NextResponse } from 'next/server';
import { proxyJson } from '@/lib/server/apiProxy';

interface RouteContext {
  params: Promise<{ projectId: string; trackId: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  const { projectId, trackId } = await params;
  return proxyJson(`/api/projects/${projectId}/tracks/${trackId}`, {
    method: 'PATCH',
    cookie: req.headers.get('cookie'),
    body: await req.text(),
  });
}
