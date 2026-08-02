import type { NextRequest } from 'next/server';
import type { NextResponse } from 'next/server';
import { proxyJson } from '@/lib/server/apiProxy';

interface RouteContext {
  params: Promise<{ projectId: string }>;
}

export async function GET(req: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  const { projectId } = await params;
  return proxyJson(`/api/projects/${projectId}/tracks`, {
    method: 'GET',
    cookie: req.headers.get('cookie'),
  });
}

export async function POST(req: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  const { projectId } = await params;
  return proxyJson(`/api/projects/${projectId}/tracks`, {
    method: 'POST',
    cookie: req.headers.get('cookie'),
    body: await req.text(),
  });
}
