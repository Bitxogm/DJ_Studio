import type { Pattern, PatternStep } from '@beatforge/shared';

import { throwApiRequestError } from './httpError';

export async function listPatternsRequest(trackId: string): Promise<Pattern[]> {
  const res = await fetch(`/api/tracks/${trackId}/patterns`, { cache: 'no-store' });
  if (!res.ok) await throwApiRequestError(res);
  const { patterns } = (await res.json()) as { patterns: Pattern[] };
  return patterns;
}

export interface UpdatePatternInput {
  steps: PatternStep[];
}

export async function updatePatternRequest(
  trackId: string,
  patternId: string,
  input: UpdatePatternInput,
): Promise<Pattern> {
  const res = await fetch(`/api/tracks/${trackId}/patterns/${patternId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) await throwApiRequestError(res);
  const { pattern } = (await res.json()) as { pattern: Pattern };
  return pattern;
}
