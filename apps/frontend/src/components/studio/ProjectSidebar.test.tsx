import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Project } from '@beatforge/shared';
import { beforeEach, describe, expect, it } from 'vitest';

import { useStudioStore } from '@/store/studio';
import { ProjectSidebar } from './ProjectSidebar';

const projectA: Project = {
  id: 'p1',
  userId: 'u1',
  name: 'Project A',
  bpm: 120,
  key: null,
  swing: 0,
  createdAt: '',
  updatedAt: '',
};

const projectB: Project = {
  id: 'p2',
  userId: 'u1',
  name: 'Project B',
  bpm: 128,
  key: 'Cm',
  swing: 0,
  createdAt: '',
  updatedAt: '',
};

function resetStore() {
  useStudioStore.setState({
    projects: [],
    selectedProjectId: null,
    tracks: [],
    isLoadingTracks: false,
  });
}

describe('ProjectSidebar', () => {
  beforeEach(() => {
    resetStore();
  });

  it('renderiza la lista de proyectos con nombre y bpm', () => {
    useStudioStore.setState({ projects: [projectA, projectB] });
    render(<ProjectSidebar />);

    expect(screen.getByText('Project A')).toBeInTheDocument();
    expect(screen.getByText('120 BPM')).toBeInTheDocument();
    expect(screen.getByText('Project B')).toBeInTheDocument();
    expect(screen.getByText('128 BPM')).toBeInTheDocument();
  });

  it('resalta visualmente el proyecto seleccionado', () => {
    useStudioStore.setState({ projects: [projectA, projectB], selectedProjectId: projectB.id });
    render(<ProjectSidebar />);

    expect(screen.getByRole('button', { name: /Project B/ })).toHaveClass('border-primary/60');
    expect(screen.getByRole('button', { name: /Project A/ })).not.toHaveClass('border-primary/60');
  });

  it('al pulsar un proyecto, lo selecciona en el store', async () => {
    useStudioStore.setState({ projects: [projectA, projectB] });
    const user = userEvent.setup();
    render(<ProjectSidebar />);

    await user.click(screen.getByRole('button', { name: /Project A/ }));

    expect(useStudioStore.getState().selectedProjectId).toBe(projectA.id);
  });
});
