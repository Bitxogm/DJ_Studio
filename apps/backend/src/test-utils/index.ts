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
