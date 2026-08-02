import type { NextRequest } from 'next/server';
import type { NextResponse } from 'next/server';
import { proxyJson } from '@/lib/server/apiProxy';

export async function GET(req: NextRequest): Promise<NextResponse> {
  return proxyJson('/api/projects', {
    method: 'GET',
    cookie: req.headers.get('cookie'),
  });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  return proxyJson('/api/projects', {
    method: 'POST',
    cookie: req.headers.get('cookie'),
    body: await req.text(),
  });
}
