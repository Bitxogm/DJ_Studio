'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Project } from '@beatforge/shared';
import { AnimatePresence, motion } from 'framer-motion';
import { Music2 } from 'lucide-react';
import { toast } from 'sonner';

import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/hooks/useAuth';
import { ApiRequestError } from '@/lib/api/httpError';
import { listPatternsRequest } from '@/lib/api/patterns';
import { listTracksRequest } from '@/lib/api/tracks';
import { findDrumTrack } from '@/lib/sequencer/logic';
import { useStudioStore } from '@/store/studio';
import { NewProjectDialog } from './NewProjectDialog';
import { ProjectHeader } from './ProjectHeader';
import { ProjectSidebar } from './ProjectSidebar';
import { SequencerPanel } from './SequencerPanel';
import { StudioHeader } from './StudioHeader';
import { TrackList } from './TrackList';

interface StudioShellProps {
  initialProjects: Project[];
}

export function StudioShell({ initialProjects }: StudioShellProps) {
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();

  const projects = useStudioStore((state) => state.projects);
  const selectedProjectId = useStudioStore((state) => state.selectedProjectId);
  const tracks = useStudioStore((state) => state.tracks);
  const setProjects = useStudioStore((state) => state.setProjects);
  const setTracks = useStudioStore((state) => state.setTracks);
  const setLoadingTracks = useStudioStore((state) => state.setLoadingTracks);
  const setDrumPattern = useStudioStore((state) => state.setDrumPattern);
  const setLoadingPattern = useStudioStore((state) => state.setLoadingPattern);

  // Solo en el montaje inicial: las mutaciones posteriores (crear proyecto)
  // ya actualizan el store directamente, no hace falta re-sincronizar aquí.
  useEffect(() => {
    setProjects(initialProjects);
  }, [initialProjects, setProjects]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [isLoading, user, router]);

  useEffect(() => {
    if (!selectedProjectId) {
      return;
    }
    let cancelled = false;
    setLoadingTracks(true);
    listTracksRequest(selectedProjectId)
      .then((tracks) => {
        if (!cancelled) setTracks(tracks);
      })
      .catch((error: unknown) => {
        toast.error(
          error instanceof ApiRequestError ? error.message : 'No se pudo conectar con el servidor',
        );
      })
      .finally(() => {
        if (!cancelled) setLoadingTracks(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedProjectId, setTracks, setLoadingTracks]);

  // Alcance de este prompt: solo suena el primer Track DRUM del proyecto, así
  // que solo hace falta cargar su Pattern. Depende del id del track DRUM (no
  // del array `tracks` completo) para no volver a pedir el pattern cada vez
  // que se mutea/soleaa/ajusta volumen en cualquier track del mixer.
  const drumTrackId = findDrumTrack(tracks)?.id ?? null;

  useEffect(() => {
    if (!drumTrackId) {
      setDrumPattern(null);
      return;
    }
    let cancelled = false;
    setLoadingPattern(true);
    listPatternsRequest(drumTrackId)
      .then((patterns) => {
        if (!cancelled) setDrumPattern(patterns[0] ?? null);
      })
      .catch((error: unknown) => {
        toast.error(
          error instanceof ApiRequestError ? error.message : 'No se pudo conectar con el servidor',
        );
      })
      .finally(() => {
        if (!cancelled) setLoadingPattern(false);
      });
    return () => {
      cancelled = true;
    };
  }, [drumTrackId, setDrumPattern, setLoadingPattern]);

  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? null;

  if (isLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Spinner className="size-8 text-primary" />
      </div>
    );
  }

  function handleLogout() {
    logout()
      .then(() => {
        toast.success('Sesión cerrada');
        router.push('/login');
      })
      .catch(() => {
        toast.error('No se pudo cerrar sesión');
      });
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <StudioHeader displayName={user.displayName} onLogout={handleLogout} />

      <div className="flex flex-1 overflow-hidden">
        <ProjectSidebar />

        <main className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {selectedProject ? (
              <motion.div
                key={selectedProject.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <ProjectHeader project={selectedProject} />
                <TrackList projectId={selectedProject.id} />
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex h-full flex-col items-center justify-center gap-4 text-center"
              >
                <Music2 className="size-10 text-muted-foreground" aria-hidden />
                <div className="space-y-1">
                  <p className="text-lg font-medium text-foreground">
                    Selecciona un proyecto para empezar
                  </p>
                  <p className="text-sm text-muted-foreground">
                    O crea uno nuevo desde la barra lateral.
                  </p>
                </div>
                <div className="w-56">
                  <NewProjectDialog />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      <SequencerPanel bpm={selectedProject?.bpm ?? 120} />
    </div>
  );
}
