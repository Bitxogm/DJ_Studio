import type { Application } from 'express';
import request from 'supertest';

export function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

export const TEST_PASSWORD = 'supersecret123';

export interface PublicUser {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponseBody {
  user?: PublicUser;
  error?: string;
}

export interface ProjectBody {
  id: string;
  userId: string;
  name: string;
  bpm: number;
  key: string | null;
  swing: number;
}

export interface ProjectResponseBody {
  project?: ProjectBody;
  projects?: ProjectBody[];
  error?: string;
}

export interface TrackBody {
  id: string;
  projectId: string;
  name: string;
  type: string;
  order: number;
  volume: number;
  muted: boolean;
  soloed: boolean;
  instrumentConfig: Record<string, unknown>;
  sampleId: string | null;
}

export interface TrackResponseBody {
  track?: TrackBody;
  tracks?: TrackBody[];
  error?: string;
}

export interface PatternStepBody {
  active: boolean;
  note: string | null;
  velocity: number;
}

export interface PatternBody {
  id: string;
  trackId: string;
  name: string;
  steps: PatternStepBody[];
  timelinePosition: number;
  lengthInBars: number;
}

export interface PatternResponseBody {
  pattern?: PatternBody;
  patterns?: PatternBody[];
  error?: string;
}

export interface SampleBody {
  id: string;
  userId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
}

export interface SampleResponseBody {
  sample?: SampleBody;
  samples?: SampleBody[];
  error?: string;
}

export type TestAgent = ReturnType<typeof request.agent>;

export async function registerUser(
  app: Application,
  prefix: string,
): Promise<{ agent: TestAgent; email: string; userId: string }> {
  const agent = request.agent(app);
  const email = uniqueEmail(prefix);

  const res = await agent
    .post('/api/auth/register')
    .send({ email, password: TEST_PASSWORD, displayName: prefix });

  const body = res.body as AuthResponseBody;
  return { agent, email, userId: body.user!.id };
}

export function defaultSteps(): PatternStepBody[] {
  return Array.from({ length: 16 }, () => ({ active: false, note: null, velocity: 0.8 }));
}

export async function createProjectFor(
  agent: TestAgent,
  name = 'Test Project',
): Promise<ProjectBody> {
  const res = await agent.post('/api/projects').send({ name });
  return (res.body as ProjectResponseBody).project!;
}

export async function createTrackFor(
  agent: TestAgent,
  projectId: string,
  overrides: Partial<{ name: string; type: string; order: number }> = {},
): Promise<TrackBody> {
  const res = await agent.post(`/api/projects/${projectId}/tracks`).send({
    name: overrides.name ?? 'Track',
    type: overrides.type ?? 'DRUM',
    order: overrides.order ?? 0,
    instrumentConfig: {},
  });
  return (res.body as TrackResponseBody).track!;
}

/** WAV real y mínimo (44 bytes de cabecera + silencio), no un mock. */
export function createMinimalWavBuffer(numSamples = 100): Buffer {
  const sampleRate = 44100;
  const numChannels = 1;
  const bitsPerSample = 16;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;

  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0, 'ascii');
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8, 'ascii');
  buffer.write('fmt ', 12, 'ascii');
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36, 'ascii');
  buffer.writeUInt32LE(dataSize, 40);
  // El resto queda a cero (silencio digital): basta con que sea un WAV válido.
  return buffer;
}

/** Contenido que NO es audio, con un mimetype de audio falseado en el upload. */
export function createFakeExecutableBuffer(): Buffer {
  return Buffer.from('MZ\x90\x00esto-no-es-audio-es-un-binario-cualquiera', 'binary');
}
