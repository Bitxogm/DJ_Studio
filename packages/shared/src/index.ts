// ─── User ─────────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Project ──────────────────────────────────────────────────────────────────
export interface Project {
  id: string;
  name: string;
  userId: string;
  bpm: number;
  timeSignature: [number, number];
  createdAt: Date;
  updatedAt: Date;
}

// ─── Track ────────────────────────────────────────────────────────────────────
export type TrackType = 'instrument' | 'audio' | 'bus';

export interface Track {
  id: string;
  projectId: string;
  name: string;
  type: TrackType;
  muted: boolean;
  soloed: boolean;
  volume: number;
  pan: number;
  order: number;
}

// ─── Pattern ──────────────────────────────────────────────────────────────────
export interface Pattern {
  id: string;
  projectId: string;
  name: string;
  bars: number;
  steps: number;
}

// ─── Sample ───────────────────────────────────────────────────────────────────
export interface Sample {
  id: string;
  userId: string;
  name: string;
  filename: string;
  mimeType: string;
  durationMs: number;
  sizeBytes: number;
  createdAt: Date;
}

// ─── Session ──────────────────────────────────────────────────────────────────
export interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
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
