import type { Project } from '@beatforge/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useStudioStore } from './studio';

function storageKey(userId: string): string {
  return `beatforge:lastProjectId:${userId}`;
}

function project(overrides: Partial<Project> = {}): Project {
  return {
    id: 'p1',
    userId: 'u1',
    name: 'Project',
    bpm: 120,
    key: null,
    swing: 0,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

function resetStore() {
  useStudioStore.setState({
    projects: [],
    selectedProjectId: null,
    currentUserId: null,
    tracks: [],
    isLoadingTracks: false,
    drumPattern: null,
    isLoadingPattern: false,
  });
}

describe('useStudioStore -- persistencia del proyecto seleccionado (por usuario)', () => {
  beforeEach(() => {
    localStorage.clear();
    resetStore();
  });

  it('selectProject guarda el id bajo la clave del usuario actual', () => {
    useStudioStore.getState().setCurrentUserId('u1');
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    useStudioStore.getState().selectProject('p1');

    expect(setItemSpy).toHaveBeenCalledWith(storageKey('u1'), 'p1');
    expect(localStorage.getItem(storageKey('u1'))).toBe('p1');

    setItemSpy.mockRestore();
  });

  it('selectProject(null) borra el valor guardado del usuario actual', () => {
    useStudioStore.getState().setCurrentUserId('u1');
    localStorage.setItem(storageKey('u1'), 'p1');

    useStudioStore.getState().selectProject(null);

    expect(localStorage.getItem(storageKey('u1'))).toBeNull();
  });

  it('selectProject no toca localStorage si todavía no se conoce el usuario actual', () => {
    // currentUserId sigue en null (p.ej., useAuth no ha resuelto todavía).
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    useStudioStore.getState().selectProject('p1');

    expect(setItemSpy).not.toHaveBeenCalled();
    setItemSpy.mockRestore();
  });

  it('setCurrentUserId autoselecciona el lastProjectId de ESE usuario si sigue existiendo en la lista', () => {
    localStorage.setItem(storageKey('u1'), 'p2');
    useStudioStore.setState({ projects: [project({ id: 'p1' }), project({ id: 'p2' })] });

    useStudioStore.getState().setCurrentUserId('u1');

    expect(useStudioStore.getState().selectedProjectId).toBe('p2');
  });

  it('ignora en silencio un lastProjectId que no está en la lista actual (borrado)', () => {
    localStorage.setItem(storageKey('u1'), 'stale-id');
    useStudioStore.setState({ projects: [project({ id: 'p1' })] });

    useStudioStore.getState().setCurrentUserId('u1');

    expect(useStudioStore.getState().selectedProjectId).toBeNull();
    expect(localStorage.getItem(storageKey('u1'))).toBeNull();
  });

  it('no autoselecciona nada si el usuario actual no tiene ningún lastProjectId guardado', () => {
    useStudioStore.setState({ projects: [project({ id: 'p1' })] });

    useStudioStore.getState().setCurrentUserId('u1');

    expect(useStudioStore.getState().selectedProjectId).toBeNull();
  });

  it('cada usuario lee y escribe SOLO su propia clave: alternar A/B/A no arrastra ni pisa nada', () => {
    const projectsDeA = [project({ id: 'a1', userId: 'user-a' })];
    const projectsDeB = [project({ id: 'b1', userId: 'user-b' })];

    // Usuario A entra, carga sus proyectos y selecciona el suyo.
    useStudioStore.setState({ projects: projectsDeA });
    useStudioStore.getState().setCurrentUserId('user-a');
    useStudioStore.getState().selectProject('a1');
    expect(localStorage.getItem(storageKey('user-a'))).toBe('a1');

    // Cambia a usuario B (logout + login, sin recarga completa): llegan sus
    // propios proyectos y su propio id.
    useStudioStore.setState({ projects: projectsDeB, selectedProjectId: null });
    useStudioStore.getState().setCurrentUserId('user-b');

    // B no ve nada de A.
    expect(useStudioStore.getState().selectedProjectId).toBeNull();
    expect(localStorage.getItem(storageKey('user-b'))).toBeNull();
    // La clave de A no se ha tocado en ningún momento.
    expect(localStorage.getItem(storageKey('user-a'))).toBe('a1');

    // B selecciona su propio proyecto.
    useStudioStore.getState().selectProject('b1');
    expect(localStorage.getItem(storageKey('user-b'))).toBe('b1');
    expect(localStorage.getItem(storageKey('user-a'))).toBe('a1'); // sigue intacto

    // Vuelve A: recupera SU propia selección guardada, no la de B.
    useStudioStore.setState({ projects: projectsDeA, selectedProjectId: null });
    useStudioStore.getState().setCurrentUserId('user-a');
    expect(useStudioStore.getState().selectedProjectId).toBe('a1');
  });

  it('removeProjectLocal limpia la clave del usuario actual si el proyecto borrado era el seleccionado', () => {
    useStudioStore.getState().setCurrentUserId('u1');
    localStorage.setItem(storageKey('u1'), 'p1');
    useStudioStore.setState({ projects: [project({ id: 'p1' })], selectedProjectId: 'p1' });

    useStudioStore.getState().removeProjectLocal('p1');

    expect(useStudioStore.getState().selectedProjectId).toBeNull();
    expect(useStudioStore.getState().projects).toHaveLength(0);
    expect(localStorage.getItem(storageKey('u1'))).toBeNull();
  });

  it('removeProjectLocal no toca la selección ni localStorage si el proyecto borrado no era el seleccionado', () => {
    useStudioStore.getState().setCurrentUserId('u1');
    localStorage.setItem(storageKey('u1'), 'p2');
    useStudioStore.setState({
      projects: [project({ id: 'p1' }), project({ id: 'p2' })],
      selectedProjectId: 'p2',
    });

    useStudioStore.getState().removeProjectLocal('p1');

    expect(useStudioStore.getState().selectedProjectId).toBe('p2');
    expect(localStorage.getItem(storageKey('u1'))).toBe('p2');
  });

  it('setProjects resetea la selección sin tocar localStorage (la hidratación la hace setCurrentUserId)', () => {
    useStudioStore.getState().setCurrentUserId('u1');
    localStorage.setItem(storageKey('u1'), 'p1');
    useStudioStore.setState({ selectedProjectId: 'p1' });
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem');

    useStudioStore.getState().setProjects([project({ id: 'p1' })]);

    expect(useStudioStore.getState().selectedProjectId).toBeNull();
    expect(setItemSpy).not.toHaveBeenCalled();
    expect(removeItemSpy).not.toHaveBeenCalled();
    expect(localStorage.getItem(storageKey('u1'))).toBe('p1'); // intacto

    setItemSpy.mockRestore();
    removeItemSpy.mockRestore();
  });
});
