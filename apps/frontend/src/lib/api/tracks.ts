import type { Track, TrackType } from '@beatforge/shared';

import { throwApiRequestError } from './httpError';

export interface CreateTrackInput {
  name: string;
  type: TrackType;
  order: number;
}

export interface UpdateTrackInput {
  name?: string;
  volume?: number;
  muted?: boolean;
  soloed?: boolean;
}

export async function listTracksRequest(projectId: string): Promise<Track[]> {
  const res = await fetch(`/api/projects/${projectId}/tracks`, { cache: 'no-store' });
  if (!res.ok) await throwApiRequestError(res);
  const { tracks } = (await res.json()) as { tracks: Track[] };
  return tracks;
}

export async function createTrackRequest(
  projectId: string,
  input: CreateTrackInput,
): Promise<Track> {
  const res = await fetch(`/api/projects/${projectId}/tracks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) await throwApiRequestError(res);
  const { track } = (await res.json()) as { track: Track };
  return track;
}

export async function updateTrackRequest(
  projectId: string,
  trackId: string,
  input: UpdateTrackInput,
): Promise<Track> {
  const res = await fetch(`/api/projects/${projectId}/tracks/${trackId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) await throwApiRequestError(res);
  const { track } = (await res.json()) as { track: Track };
  return track;
}
