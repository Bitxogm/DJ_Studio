import { cookies } from 'next/headers';
import type { Project } from '@beatforge/shared';

import { getBackendUrl } from './backendFetch';

// Carga inicial server-side para src/app/studio/page.tsx (Server Component):
// habla directo con el backend (no consigo mismo vía /api/projects) y reenvía
// la cookie de la petición entrante para autenticar como el usuario actual.
// Si algo falla (backend caído, sin sesión...) se degrada a lista vacía: el
// StudioShell del cliente ya gestiona el estado de "sin sesión" vía useAuth.
export async function fetchProjectsServer(): Promise<Project[]> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  try {
    const res = await fetch(`${getBackendUrl()}/api/projects`, {
      headers: { cookie: cookieHeader },
      cache: 'no-store',
    });
    if (!res.ok) {
      return [];
    }
    const { projects } = (await res.json()) as { projects: Project[] };
    return projects;
  } catch {
    return [];
  }
}
