import { create } from 'zustand';
import type { Pattern, Project, Track } from '@beatforge/shared';

interface StudioState {
  projects: Project[];
  selectedProjectId: string | null;
  tracks: Track[];
  isLoadingTracks: boolean;
  // Pattern del primer Track DRUM del proyecto seleccionado (reproducción de
  // audio, ver src/hooks/useSequencer.ts). Alcance deliberadamente acotado a
  // un único track/pattern -- no hay mezcla de varios tracks todavía.
  drumPattern: Pattern | null;
  isLoadingPattern: boolean;
  setProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
  updateProjectLocal: (project: Project) => void;
  selectProject: (projectId: string | null) => void;
  setTracks: (tracks: Track[]) => void;
  addTrack: (track: Track) => void;
  updateTrackLocal: (track: Track) => void;
  setLoadingTracks: (loading: boolean) => void;
  setDrumPattern: (pattern: Pattern | null) => void;
  setLoadingPattern: (loading: boolean) => void;
}

export const useStudioStore = create<StudioState>((set) => ({
  projects: [],
  selectedProjectId: null,
  tracks: [],
  isLoadingTracks: false,
  drumPattern: null,
  isLoadingPattern: false,

  setProjects: (projects) => set({ projects }),

  addProject: (project) => set((state) => ({ projects: [project, ...state.projects] })),

  updateProjectLocal: (project) =>
    set((state) => ({
      projects: state.projects.map((p) => (p.id === project.id ? project : p)),
    })),

  selectProject: (projectId) =>
    set({ selectedProjectId: projectId, tracks: [], drumPattern: null }),

  setTracks: (tracks) => set({ tracks }),

  addTrack: (track) => set((state) => ({ tracks: [...state.tracks, track] })),

  updateTrackLocal: (track) =>
    set((state) => ({
      tracks: state.tracks.map((t) => (t.id === track.id ? track : t)),
    })),

  setLoadingTracks: (isLoadingTracks) => set({ isLoadingTracks }),

  setDrumPattern: (drumPattern) => set({ drumPattern }),

  setLoadingPattern: (isLoadingPattern) => set({ isLoadingPattern }),
}));
