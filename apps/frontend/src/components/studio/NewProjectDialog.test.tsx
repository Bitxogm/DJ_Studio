import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Project } from '@beatforge/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CreateProjectInput } from '@/lib/api/projects';
import { useStudioStore } from '@/store/studio';
import { NewProjectDialog } from './NewProjectDialog';

const createProjectRequestMock = vi.fn<(input: CreateProjectInput) => Promise<Project>>();
vi.mock('@/lib/api/projects', () => ({
  createProjectRequest: (...args: [CreateProjectInput]) => createProjectRequestMock(...args),
}));

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]): void => {
      toastSuccess(...args);
    },
    error: (...args: unknown[]): void => {
      toastError(...args);
    },
  },
}));

describe('NewProjectDialog', () => {
  beforeEach(() => {
    createProjectRequestMock.mockReset();
    toastSuccess.mockClear();
    toastError.mockClear();
    useStudioStore.setState({
      projects: [],
      selectedProjectId: null,
      tracks: [],
      isLoadingTracks: false,
    });
  });

  it('crea un proyecto, muestra el toast de éxito y aparece en la lista del store', async () => {
    createProjectRequestMock.mockResolvedValueOnce({
      id: 'p1',
      userId: 'u1',
      name: 'Mi nueva sesión',
      bpm: 120,
      key: null,
      swing: 0,
      createdAt: '',
      updatedAt: '',
    });
    const user = userEvent.setup();
    render(<NewProjectDialog />);

    await user.click(screen.getByRole('button', { name: /Nuevo proyecto/ }));
    await user.type(screen.getByLabelText('Nombre'), 'Mi nueva sesión');
    await user.click(screen.getByRole('button', { name: 'Crear proyecto' }));

    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith('Proyecto "Mi nueva sesión" creado');
    });
    expect(useStudioStore.getState().projects.map((p) => p.name)).toContain('Mi nueva sesión');
  });

  it('muestra un toast de error si falla la creación', async () => {
    const { ApiRequestError } = await import('@/lib/api/httpError');
    createProjectRequestMock.mockRejectedValueOnce(new ApiRequestError('Datos inválidos', 400));
    const user = userEvent.setup();
    render(<NewProjectDialog />);

    await user.click(screen.getByRole('button', { name: /Nuevo proyecto/ }));
    await user.type(screen.getByLabelText('Nombre'), 'X');
    await user.click(screen.getByRole('button', { name: 'Crear proyecto' }));

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith('Datos inválidos');
    });
    expect(useStudioStore.getState().projects).toHaveLength(0);
  });
});
