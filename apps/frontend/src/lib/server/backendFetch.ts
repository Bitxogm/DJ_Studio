import { NextResponse } from 'next/server';

export interface BackendErrorBody {
  error?: string;
  details?: Array<{ message: string }>;
}

export function getBackendUrl(): string {
  const url = process.env.BACKEND_INTERNAL_URL;
  if (!url) {
    throw new Error('BACKEND_INTERNAL_URL no está definida');
  }
  return url;
}

export function connectionErrorResponse(): NextResponse {
  return NextResponse.json({ message: 'No se pudo conectar con el servidor' }, { status: 502 });
}
