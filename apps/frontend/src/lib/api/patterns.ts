import type { Pattern } from '@beatforge/shared';

import { throwApiRequestError } from './httpError';

// Solo lectura por ahora: este prompt reproduce el Pattern ya guardado, no
// edita steps todavía (eso es el siguiente prompt).
export async function listPatternsRequest(trackId: string): Promise<Pattern[]> {
  const res = await fetch(`/api/tracks/${trackId}/patterns`, { cache: 'no-store' });
  if (!res.ok) await throwApiRequestError(res);
  const { patterns } = (await res.json()) as { patterns: Pattern[] };
  return patterns;
}
