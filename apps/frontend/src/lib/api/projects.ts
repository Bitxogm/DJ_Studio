import type { Project } from '@beatforge/shared';

import { throwApiRequestError } from './httpError';

export interface CreateProjectInput {
  name: string;
  bpm?: number;
  key?: string | null;
}

export interface UpdateProjectInput {
  name?: string;
  bpm?: number;
  key?: string | null;
  swing?: number;
}

export async function listProjectsRequest(): Promise<Project[]> {
  const res = await fetch('/api/projects', { cache: 'no-store' });
  if (!res.ok) await throwApiRequestError(res);
  const { projects } = (await res.json()) as { projects: Project[] };
  return projects;
}

export async function createProjectRequest(input: CreateProjectInput): Promise<Project> {
  const res = await fetch('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) await throwApiRequestError(res);
  const { project } = (await res.json()) as { project: Project };
  return project;
}

export async function updateProjectRequest(
  projectId: string,
  input: UpdateProjectInput,
): Promise<Project> {
  const res = await fetch(`/api/projects/${projectId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) await throwApiRequestError(res);
  const { project } = (await res.json()) as { project: Project };
  return project;
}
