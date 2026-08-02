import { StudioShell } from '@/components/studio/StudioShell';
import { fetchProjectsServer } from '@/lib/server/projects';

// Server Component: carga inicial de proyectos en el servidor (más rápido,
// sin loading flash) y se la pasa a StudioShell (cliente), que gestiona la
// comprobación de sesión, el store y las mutaciones.
export default async function StudioPage() {
  const initialProjects = await fetchProjectsServer();

  return <StudioShell initialProjects={initialProjects} />;
}
