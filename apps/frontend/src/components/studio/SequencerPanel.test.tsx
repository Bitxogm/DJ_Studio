import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Pattern, PatternStep, Track } from '@beatforge/shared';
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

const updatePatternRequestMock =
  vi.fn<
    (trackId: string, patternId: string, input: { steps: PatternStep[] }) => Promise<Pattern>
  >();
vi.mock('@/lib/api/patterns', () => ({
  updatePatternRequest: (...args: [string, string, { steps: PatternStep[] }]) =>
    updatePatternRequestMock(...args),
}));

const toastError = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]): void => {
      toastError(...args);
    },
  },
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
    updatePatternRequestMock.mockReset();
    toastError.mockClear();
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

  it('invierte el estado visual del step al instante, sin esperar la red', async () => {
    sequencerState = { isPlaying: false, currentStep: -1, canPlay: true };
    useStudioStore.setState({ tracks: [drumTrack], drumPattern });
    updatePatternRequestMock.mockReturnValue(new Promise(() => {})); // nunca resuelve
    const user = userEvent.setup();
    render(<SequencerPanel bpm={124} />);

    const step0 = screen.getByTestId('step-0');
    expect(step0).toHaveAttribute('aria-pressed', 'true'); // steps[0] viene activo

    await user.click(step0);

    expect(step0).toHaveAttribute('aria-pressed', 'false');
  });

  it('llama al PATCH con el array de steps correcto (solo el step clickeado invertido)', async () => {
    sequencerState = { isPlaying: false, currentStep: -1, canPlay: true };
    useStudioStore.setState({ tracks: [drumTrack], drumPattern });
    updatePatternRequestMock.mockResolvedValueOnce(drumPattern);
    const user = userEvent.setup();
    render(<SequencerPanel bpm={124} />);

    // steps[1] viene inactivo (solo 0, 4, 8, 12 activos de fábrica)
    await user.click(screen.getByTestId('step-1'));

    await waitFor(() => {
      expect(updatePatternRequestMock).toHaveBeenCalledTimes(1);
    });

    const [trackId, patternId, input] = updatePatternRequestMock.mock.calls[0];
    expect(trackId).toBe(drumTrack.id);
    expect(patternId).toBe(drumPattern.id);
    expect(input.steps).toHaveLength(16);
    input.steps.forEach((step, index) => {
      if (index === 1) {
        expect(step.active).toBe(true);
      } else {
        expect(step.active).toBe(drumPattern.steps[index].active);
      }
    });
  });

  it('revierte el step y muestra un toast de error si el PATCH falla', async () => {
    sequencerState = { isPlaying: false, currentStep: -1, canPlay: true };
    useStudioStore.setState({ tracks: [drumTrack], drumPattern });
    const { ApiRequestError } = await import('@/lib/api/httpError');
    updatePatternRequestMock.mockRejectedValueOnce(new ApiRequestError('No encontrado', 404));
    const user = userEvent.setup();
    render(<SequencerPanel bpm={124} />);

    const step0 = screen.getByTestId('step-0');
    expect(step0).toHaveAttribute('aria-pressed', 'true');

    // No se comprueba el estado optimista intermedio aquí: con un rechazo
    // inmediato (sin demora artificial), el ciclo aplicar->fallar->revertir
    // puede completarse dentro del propio `await user.click`, antes de que
    // el test pueda observarlo -- esa instantaneidad ya la cubre el test
    // anterior (con una petición que nunca resuelve). Este test verifica el
    // estado final: revertido, con su toast de error.
    await user.click(step0);

    await waitFor(() => {
      expect(screen.getByTestId('step-0')).toHaveAttribute('aria-pressed', 'true');
    });
    expect(toastError).toHaveBeenCalledWith('No encontrado');
  });
});
