import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Pattern, Track } from '@beatforge/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useStudioStore } from '@/store/studio';
import { SequencerPanel } from './SequencerPanel';

const playMock = vi.fn();
const stopMock = vi.fn();
let sequencerState: { isPlaying: boolean; currentStep: number; canPlay: boolean } = {
  isPlaying: false,
  currentStep: -1,
  canPlay: false,
};

vi.mock('@/hooks/useSequencer', () => ({
  useSequencer: () => ({
    ...sequencerState,
    play: playMock,
    stop: stopMock,
  }),
}));

const drumTrack: Track = {
  id: 't1',
  projectId: 'p1',
  name: 'Kick',
  type: 'DRUM',
  order: 0,
  volume: 0.8,
  muted: false,
  soloed: false,
  instrumentConfig: {},
  sampleId: null,
  createdAt: '',
  updatedAt: '',
};

const drumPattern: Pattern = {
  id: 'pat1',
  trackId: 't1',
  name: 'Loop principal',
  steps: Array.from({ length: 16 }, (_, i) => ({
    active: i % 4 === 0,
    note: null,
    velocity: 1,
  })),
  timelinePosition: 0,
  lengthInBars: 1,
  createdAt: '',
  updatedAt: '',
};

function resetStore() {
  useStudioStore.setState({
    projects: [],
    selectedProjectId: null,
    tracks: [],
    isLoadingTracks: false,
    drumPattern: null,
    isLoadingPattern: false,
  });
}

describe('SequencerPanel', () => {
  beforeEach(() => {
    playMock.mockClear();
    stopMock.mockClear();
    sequencerState = { isPlaying: false, currentStep: -1, canPlay: false };
    resetStore();
  });

  it('deshabilita el botón Play si no hay ningún Track DRUM', () => {
    useStudioStore.setState({ tracks: [], drumPattern: null });
    render(<SequencerPanel bpm={120} />);

    const playButton = screen.getByRole('button', { name: 'Reproducir secuenciador' });
    expect(playButton).toBeDisabled();
    expect(screen.getByText('Añade un Track de batería para poder reproducir')).toBeInTheDocument();
  });

  it('deshabilita el botón Play si hay Track DRUM pero sin pattern', () => {
    useStudioStore.setState({ tracks: [drumTrack], drumPattern: null, isLoadingPattern: false });
    render(<SequencerPanel bpm={120} />);

    expect(screen.getByRole('button', { name: 'Reproducir secuenciador' })).toBeDisabled();
    expect(
      screen.getByText('Este track de batería no tiene ningún patrón todavía'),
    ).toBeInTheDocument();
  });

  it('habilita el botón Play y muestra el grid cuando hay Track DRUM con pattern', async () => {
    sequencerState = { isPlaying: false, currentStep: -1, canPlay: true };
    useStudioStore.setState({ tracks: [drumTrack], drumPattern });
    const user = userEvent.setup();
    render(<SequencerPanel bpm={124} />);

    const playButton = screen.getByRole('button', { name: 'Reproducir secuenciador' });
    expect(playButton).toBeEnabled();
    expect(screen.getByText('Kick')).toBeInTheDocument();

    await user.click(playButton);
    expect(playMock).toHaveBeenCalledTimes(1);
  });

  it('al pulsar mientras suena, llama a stop()', async () => {
    sequencerState = { isPlaying: true, currentStep: 0, canPlay: true };
    useStudioStore.setState({ tracks: [drumTrack], drumPattern });
    const user = userEvent.setup();
    render(<SequencerPanel bpm={124} />);

    await user.click(screen.getByRole('button', { name: 'Detener secuenciador' }));
    expect(stopMock).toHaveBeenCalledTimes(1);
  });
});
