// Error ya traducido por un Route Handler (BFF): { message, code? } listo para
// mostrar en un toast, nunca el body crudo del backend. Contraparte genérica
// de AuthApiError (src/lib/api/auth.ts), para recursos no relacionados con auth.
export class ApiRequestError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
  }
}

export async function throwApiRequestError(res: Response): Promise<never> {
  const body = (await res.json().catch(() => null)) as { message?: string; code?: string } | null;
  throw new ApiRequestError(
    body?.message ?? 'Ha ocurrido un error inesperado',
    res.status,
    body?.code,
  );
}
