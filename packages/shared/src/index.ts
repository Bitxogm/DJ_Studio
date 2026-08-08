// Tipos consumibles desde frontend y backend sin depender de @prisma/client.
// Reflejan los modelos de apps/backend/prisma/schema.prisma. Las fechas son
// `string` (ISO), no `Date`: así es como llegan realmente en un JSON de la API.

// ─── User ─────────────────────────────────────────────────────────────────────
// Sin passwordHash: este tipo es para consumo externo, el hash nunca sale del backend.
export interface User {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Project ──────────────────────────────────────────────────────────────────
export interface Project {
  id: string;
  userId: string;
  name: string;
  bpm: number;
  key: string | null;
  swing: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Track ────────────────────────────────────────────────────────────────────
export const TRACK_TYPES = [
  'DRUM',
  'SYNTH',
  'SAMPLE',
  'BASS',
  'HIHAT',
  'SNARE',
  'HIHAT_OPEN',
] as const;
export type TrackType = (typeof TRACK_TYPES)[number];

export interface Track {
  id: string;
  projectId: string;
  name: string;
  type: TrackType;
  order: number;
  volume: number;
  muted: boolean;
  soloed: boolean;
  /** Parámetros del instrumento/sampler de Tone.js (forma libre, definida en cliente) */
  instrumentConfig: Record<string, unknown>;
  sampleId: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Pattern ──────────────────────────────────────────────────────────────────
export interface PatternStep {
  active: boolean;
  note: string | null;
  velocity: number;
}

export interface Pattern {
  id: string;
  trackId: string;
  name: string;
  steps: PatternStep[];
  timelinePosition: number;
  lengthInBars: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Sample ───────────────────────────────────────────────────────────────────
export interface Sample {
  id: string;
  userId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  durationSeconds: number | null;
  storagePath: string;
  createdAt: string;
}

// ─── API helpers ──────────────────────────────────────────────────────────────
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  error: string;
  statusCode: number;
}
