import { create } from 'zustand';
import type { Pattern, Project, Track } from '@beatforge/shared';

interface StudioState {
  projects: Project[];
  selectedProjectId: string | null;
  // Espejo de useAuth().user.id (fuente de verdad real de la sesión): el
  // store no puede llamar al hook de auth directamente, así que StudioShell
  // lo mantiene sincronizado vía setCurrentUserId(). Sirve únicamente para
  // saber bajo qué clave de localStorage leer/escribir el último proyecto
  // seleccionado -- no se usa para nada de autenticación/autorización real.
  currentUserId: string | null;
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
  // Preparado para cuando exista borrado de proyectos en la UI: quita el
  // proyecto de la lista y, si era el seleccionado, limpia también la
  // selección y el valor recordado en localStorage.
  removeProjectLocal: (projectId: string) => void;
  selectProject: (projectId: string | null) => void;
  // Se llama desde StudioShell cada vez que cambia el usuario autenticado
  // (login, logout, o cambio de cuenta sin recarga completa). Si el id
  // cambia de verdad, re-deriva `selectedProjectId` a partir del
  // lastProjectId guardado bajo LA CLAVE DE ESE USUARIO -- nunca la de otro.
  setCurrentUserId: (userId: string | null) => void;
  setTracks: (tracks: Track[]) => void;
  addTrack: (track: Track) => void;
  updateTrackLocal: (track: Track) => void;
  setLoadingTracks: (loading: boolean) => void;
  setDrumPattern: (pattern: Pattern | null) => void;
  setLoadingPattern: (loading: boolean) => void;
}

// Preferencia de UI pura (qué proyecto tenía abierto CADA usuario), no dato
// de negocio -- localStorage es lo correcto aquí, no hace falta tocar el
// backend/BD. La clave incluye el userId a propósito: es un valor global por
// NAVEGADOR, y varias cuentas pueden usarse en el mismo navegador (los dos
// usuarios demo, por ejemplo) sin que la selección de una se pise con la de
// otra. La antigua clave fija "beatforge:lastProjectId" (sin namespacing) ya
// no se lee ni se escribe en ningún sitio -- si quedara un valor de pruebas
// anteriores bajo esa clave, se ignora sin más, no se migra.
function storageKeyFor(userId: string): string {
  return `beatforge:lastProjectId:${userId}`;
}

// Guardas try/catch + typeof window: estas funciones se llaman desde
// acciones del store, siempre en efectos/handlers de cliente en la
// práctica, pero el módulo del store en sí podría en teoría evaluarse en un
// contexto sin `window` (SSR) o con localStorage bloqueado (modo privado,
// cuota llena) -- en ninguno de los dos casos debe romper la app, solo dejar
// de recordar. `userId` nulo (usuario aún no conocido) tampoco debe leer ni
// escribir nada.
function readLastProjectId(userId: string | null): string | null {
  if (!userId || typeof window === 'undefined') {
    return null;
  }
  try {
    return window.localStorage.getItem(storageKeyFor(userId));
  } catch {
    return null;
  }
}

function writeLastProjectId(userId: string | null, projectId: string | null): void {
  if (!userId || typeof window === 'undefined') {
    return;
  }
  try {
    const key = storageKeyFor(userId);
    if (projectId) {
      window.localStorage.setItem(key, projectId);
    } else {
      window.localStorage.removeItem(key);
    }
  } catch {
    // No crítico: simplemente no se recordará el proyecto entre recargas.
  }
}

export const useStudioStore = create<StudioState>((set, get) => ({
  projects: [],
  selectedProjectId: null,
  currentUserId: null,
  tracks: [],
  isLoadingTracks: false,
  drumPattern: null,
  isLoadingPattern: false,

  // Deliberadamente NO toca localStorage ni intenta autoseleccionar aquí: en
  // el montaje de StudioShell, `initialProjects` (síncrono, viene del
  // servidor) suele llegar ANTES que el userId real (asíncrono, viene de
  // useAuth -> /api/auth/me). Autoseleccionar con un currentUserId todavía
  // desconocido leería la clave equivocada (o ninguna). Esa hidratación pasa
  // en setCurrentUserId, que es quien de verdad sabe de qué usuario se trata.
  // Resetear `selectedProjectId` a null aquí es además una red de seguridad:
  // si el store conservaba una selección de una sesión anterior (otro
  // usuario, mismo navegador, sin recarga completa), queda borrada antes de
  // que se derive la selección correcta del usuario nuevo.
  setProjects: (projects) =>
    set({ projects, selectedProjectId: null, tracks: [], drumPattern: null }),

  addProject: (project) => set((state) => ({ projects: [project, ...state.projects] })),

  updateProjectLocal: (project) =>
    set((state) => ({
      projects: state.projects.map((p) => (p.id === project.id ? project : p)),
    })),

  removeProjectLocal: (projectId) => {
    const { selectedProjectId, currentUserId } = get();
    const wasSelected = selectedProjectId === projectId;
    if (wasSelected) {
      writeLastProjectId(currentUserId, null);
    }
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== projectId),
      ...(wasSelected ? { selectedProjectId: null, tracks: [], drumPattern: null } : {}),
    }));
  },

  selectProject: (projectId) => {
    writeLastProjectId(get().currentUserId, projectId);
    set({ selectedProjectId: projectId, tracks: [], drumPattern: null });
  },

  setCurrentUserId: (userId) => {
    const state = get();
    if (state.currentUserId === userId) {
      // Mismo usuario que ya conocíamos (re-render sin cambio real): no
      // re-derivar, para no pisar una selección que el usuario ya haya
      // hecho a mano en esta misma sesión.
      return;
    }

    const storedId = readLastProjectId(userId);
    const validId =
      storedId && state.projects.some((project) => project.id === storedId) ? storedId : null;

    if (storedId && !validId) {
      writeLastProjectId(userId, null);
    }

    set({ currentUserId: userId, selectedProjectId: validId, tracks: [], drumPattern: null });
  },

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
