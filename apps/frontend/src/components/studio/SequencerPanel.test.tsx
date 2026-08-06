import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Pattern, PatternStep, Track } from '@beatforge/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useStudioStore } from '@/store/studio';
import { SequencerPanel } from './SequencerPanel';

const playMock = vi.fn();
const stopMock = vi.fn();
let sequencerState: { isPlaying: boolean; currentStep: number } = {
  isPlaying: false,
  currentStep: -1,
};

vi.mock('@/hooks/useSequencer', () => ({
  useSequencer: () => ({
    ...sequencerState,
    canPlay: true,
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

const bassTrack: Track = {
  id: 't2',
  projectId: 'p1',
  name: 'Bajo',
  type: 'BASS',
  order: 1,
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

const bassPattern: Pattern = {
  id: 'pat2',
  trackId: 't2',
  name: 'Línea de bajo',
  steps: Array.from({ length: 16 }, (_, i) => ({
    active: i % 3 === 0,
    note: i % 3 === 0 ? 'A1' : null,
    velocity: 0.9,
  })),
  timelinePosition: 0,
  lengthInBars: 1,
  createdAt: '',
  updatedAt: '',
};

const hihatTrack: Track = {
  id: 't3',
  projectId: 'p1',
  name: 'Hi-hat',
  type: 'HIHAT',
  order: 2,
  volume: 0.6,
  muted: false,
  soloed: false,
  instrumentConfig: {},
  sampleId: null,
  createdAt: '',
  updatedAt: '',
};

const hihatPattern: Pattern = {
  id: 'pat3',
  trackId: 't3',
  name: 'Corcheas',
  steps: Array.from({ length: 16 }, () => ({ active: true, note: null, velocity: 0.6 })),
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
    trackPatterns: {},
    isLoadingPatterns: false,
  });
}

describe('SequencerPanel', () => {
  beforeEach(() => {
    playMock.mockClear();
    stopMock.mockClear();
    updatePatternRequestMock.mockReset();
    toastError.mockClear();
    sequencerState = { isPlaying: false, currentStep: -1 };
    resetStore();
  });

  it('deshabilita el botón Play si no hay ningún Track DRUM', () => {
    useStudioStore.setState({ tracks: [], trackPatterns: {} });
    render(<SequencerPanel bpm={120} />);

    const playButton = screen.getByRole('button', { name: 'Reproducir secuenciador' });
    expect(playButton).toBeDisabled();
    expect(screen.getByText('Añade un Track de batería para poder reproducir')).toBeInTheDocument();
  });

  it('deshabilita Play si el Track DRUM no tiene pattern, pero sigue mostrando el grid del Bajo', () => {
    useStudioStore.setState({
      tracks: [drumTrack, bassTrack],
      trackPatterns: { [bassTrack.id]: bassPattern },
      isLoadingPatterns: false,
    });
    render(<SequencerPanel bpm={120} />);

    const playButton = screen.getByRole('button', { name: 'Reproducir secuenciador' });
    expect(playButton).toBeDisabled();
    expect(playButton).toHaveAttribute(
      'title',
      'Este track de batería no tiene ningún patrón todavía',
    );
    // El grid del Bajo no depende del Kick: si el Bajo ya tiene pattern, se
    // ve y se puede editar aunque el Kick todavía no tenga el suyo.
    expect(screen.getByText('Bajo')).toBeInTheDocument();
    expect(screen.queryByText('Kick')).not.toBeInTheDocument();
  });

  it('habilita el botón Play y muestra el grid del Kick cuando hay Track DRUM con pattern', async () => {
    sequencerState = { isPlaying: false, currentStep: -1 };
    useStudioStore.setState({
      tracks: [drumTrack],
      trackPatterns: { [drumTrack.id]: drumPattern },
    });
    const user = userEvent.setup();
    render(<SequencerPanel bpm={124} />);

    const playButton = screen.getByRole('button', { name: 'Reproducir secuenciador' });
    expect(playButton).toBeEnabled();
    expect(screen.getByText('Kick')).toBeInTheDocument();

    await user.click(playButton);
    expect(playMock).toHaveBeenCalledTimes(1);
  });

  it('muestra ambos grids apilados (Kick y Bajo) cuando los dos tienen pattern', () => {
    useStudioStore.setState({
      tracks: [drumTrack, bassTrack],
      trackPatterns: { [drumTrack.id]: drumPattern, [bassTrack.id]: bassPattern },
    });
    render(<SequencerPanel bpm={124} />);

    expect(screen.getByText('Kick')).toBeInTheDocument();
    expect(screen.getByText('Bajo')).toBeInTheDocument();
    expect(screen.getByTestId(`step-${drumTrack.id}-0`)).toBeInTheDocument();
    expect(screen.getByTestId(`step-${bassTrack.id}-0`)).toBeInTheDocument();
  });

  it('muestra los tres grids apilados (Kick, Bajo y Hi-hat) sin tocar el componente para el tercer Track', () => {
    useStudioStore.setState({
      tracks: [drumTrack, bassTrack, hihatTrack],
      trackPatterns: {
        [drumTrack.id]: drumPattern,
        [bassTrack.id]: bassPattern,
        [hihatTrack.id]: hihatPattern,
      },
    });
    render(<SequencerPanel bpm={124} />);

    expect(screen.getByText('Kick')).toBeInTheDocument();
    expect(screen.getByText('Bajo')).toBeInTheDocument();
    expect(screen.getByText('Hi-hat')).toBeInTheDocument();
    expect(screen.getByTestId(`step-${drumTrack.id}-0`)).toBeInTheDocument();
    expect(screen.getByTestId(`step-${bassTrack.id}-0`)).toBeInTheDocument();
    expect(screen.getByTestId(`step-${hihatTrack.id}-0`)).toBeInTheDocument();
  });

  it('al pulsar mientras suena, llama a stop()', async () => {
    sequencerState = { isPlaying: true, currentStep: 0 };
    useStudioStore.setState({
      tracks: [drumTrack],
      trackPatterns: { [drumTrack.id]: drumPattern },
    });
    const user = userEvent.setup();
    render(<SequencerPanel bpm={124} />);

    await user.click(screen.getByRole('button', { name: 'Detener secuenciador' }));
    expect(stopMock).toHaveBeenCalledTimes(1);
  });

  describe('grid del Kick (DRUM)', () => {
    beforeEach(() => {
      useStudioStore.setState({
        tracks: [drumTrack],
        trackPatterns: { [drumTrack.id]: drumPattern },
      });
    });

    it('invierte el estado visual del step al instante, sin esperar la red', async () => {
      updatePatternRequestMock.mockReturnValue(new Promise(() => {})); // nunca resuelve
      const user = userEvent.setup();
      render(<SequencerPanel bpm={124} />);

      const step0 = screen.getByTestId(`step-${drumTrack.id}-0`);
      expect(step0).toHaveAttribute('aria-pressed', 'true'); // steps[0] viene activo

      await user.click(step0);

      expect(step0).toHaveAttribute('aria-pressed', 'false');
    });

    it('llama al PATCH con el trackId del Kick y el array de steps correcto', async () => {
      updatePatternRequestMock.mockResolvedValueOnce(drumPattern);
      const user = userEvent.setup();
      render(<SequencerPanel bpm={124} />);

      // steps[1] viene inactivo (solo 0, 4, 8, 12 activos de fábrica)
      await user.click(screen.getByTestId(`step-${drumTrack.id}-1`));

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
      const { ApiRequestError } = await import('@/lib/api/httpError');
      updatePatternRequestMock.mockRejectedValueOnce(new ApiRequestError('No encontrado', 404));
      const user = userEvent.setup();
      render(<SequencerPanel bpm={124} />);

      const step0 = screen.getByTestId(`step-${drumTrack.id}-0`);
      expect(step0).toHaveAttribute('aria-pressed', 'true');

      // No se comprueba el estado optimista intermedio aquí: con un rechazo
      // inmediato (sin demora artificial), el ciclo aplicar->fallar->revertir
      // puede completarse dentro del propio `await user.click`, antes de que
      // el test pueda observarlo -- esa instantaneidad ya la cubre el test
      // anterior (con una petición que nunca resuelve). Este test verifica el
      // estado final: revertido, con su toast de error.
      await user.click(step0);

      await waitFor(() => {
        expect(screen.getByTestId(`step-${drumTrack.id}-0`)).toHaveAttribute(
          'aria-pressed',
          'true',
        );
      });
      expect(toastError).toHaveBeenCalledWith('No encontrado');
    });
  });

  describe('grid del Bajo (BASS)', () => {
    beforeEach(() => {
      // El Kick también tiene pattern: el Play sigue habilitado por él, pero
      // lo que se ejercita en este describe es exclusivamente el grid/PATCH
      // del Bajo, en el mismo render con ambos grids visibles a la vez.
      useStudioStore.setState({
        tracks: [drumTrack, bassTrack],
        trackPatterns: { [drumTrack.id]: drumPattern, [bassTrack.id]: bassPattern },
      });
    });

    it('invierte el estado visual del step del Bajo al instante, sin esperar la red', async () => {
      updatePatternRequestMock.mockReturnValue(new Promise(() => {})); // nunca resuelve
      const user = userEvent.setup();
      render(<SequencerPanel bpm={124} />);

      const step0 = screen.getByTestId(`step-${bassTrack.id}-0`);
      expect(step0).toHaveAttribute('aria-pressed', 'true'); // bassPattern.steps[0] viene activo

      await user.click(step0);

      expect(step0).toHaveAttribute('aria-pressed', 'false');
      // El grid del Kick, en el mismo render, no debe verse afectado.
      expect(screen.getByTestId(`step-${drumTrack.id}-0`)).toHaveAttribute('aria-pressed', 'true');
    });

    it('llama al PATCH con el trackId del Bajo (no el del Kick) y el array de steps correcto', async () => {
      updatePatternRequestMock.mockResolvedValueOnce(bassPattern);
      const user = userEvent.setup();
      render(<SequencerPanel bpm={124} />);

      // bassPattern.steps[1] viene inactivo (solo 0, 3, 6... activos de fábrica)
      await user.click(screen.getByTestId(`step-${bassTrack.id}-1`));

      await waitFor(() => {
        expect(updatePatternRequestMock).toHaveBeenCalledTimes(1);
      });

      const [trackId, patternId, input] = updatePatternRequestMock.mock.calls[0];
      expect(trackId).toBe(bassTrack.id);
      expect(patternId).toBe(bassPattern.id);
      expect(input.steps).toHaveLength(16);
      input.steps.forEach((step, index) => {
        if (index === 1) {
          expect(step.active).toBe(true);
        } else {
          expect(step.active).toBe(bassPattern.steps[index].active);
        }
      });
    });

    it('revierte el step del Bajo y muestra un toast de error si el PATCH falla', async () => {
      const { ApiRequestError } = await import('@/lib/api/httpError');
      updatePatternRequestMock.mockRejectedValueOnce(new ApiRequestError('No encontrado', 404));
      const user = userEvent.setup();
      render(<SequencerPanel bpm={124} />);

      const step0 = screen.getByTestId(`step-${bassTrack.id}-0`);
      expect(step0).toHaveAttribute('aria-pressed', 'true');

      await user.click(step0);

      await waitFor(() => {
        expect(screen.getByTestId(`step-${bassTrack.id}-0`)).toHaveAttribute(
          'aria-pressed',
          'true',
        );
      });
      expect(toastError).toHaveBeenCalledWith('No encontrado');
    });
  });

  describe('grid del Hi-hat (HIHAT) -- prueba de genericidad con un tercer TrackType', () => {
    beforeEach(() => {
      useStudioStore.setState({
        tracks: [drumTrack, bassTrack, hihatTrack],
        trackPatterns: {
          [drumTrack.id]: drumPattern,
          [bassTrack.id]: bassPattern,
          [hihatTrack.id]: hihatPattern,
        },
      });
    });

    it('invierte el estado visual del step del Hi-hat al instante, sin esperar la red', async () => {
      updatePatternRequestMock.mockReturnValue(new Promise(() => {})); // nunca resuelve
      const user = userEvent.setup();
      render(<SequencerPanel bpm={124} />);

      const step0 = screen.getByTestId(`step-${hihatTrack.id}-0`);
      expect(step0).toHaveAttribute('aria-pressed', 'true'); // hihatPattern.steps[0] viene activo

      await user.click(step0);

      expect(step0).toHaveAttribute('aria-pressed', 'false');
      // Kick y Bajo, en el mismo render, no deben verse afectados.
      expect(screen.getByTestId(`step-${drumTrack.id}-0`)).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByTestId(`step-${bassTrack.id}-0`)).toHaveAttribute('aria-pressed', 'true');
    });

    it('llama al PATCH con el trackId del Hi-hat (no Kick ni Bajo) y el array de steps correcto', async () => {
      updatePatternRequestMock.mockResolvedValueOnce(hihatPattern);
      const user = userEvent.setup();
      render(<SequencerPanel bpm={124} />);

      await user.click(screen.getByTestId(`step-${hihatTrack.id}-1`));

      await waitFor(() => {
        expect(updatePatternRequestMock).toHaveBeenCalledTimes(1);
      });

      const [trackId, patternId, input] = updatePatternRequestMock.mock.calls[0];
      expect(trackId).toBe(hihatTrack.id);
      expect(patternId).toBe(hihatPattern.id);
      expect(input.steps).toHaveLength(16);
      expect(input.steps[1].active).toBe(false); // hihatPattern.steps[1] venía activo
    });

    it('revierte el step del Hi-hat y muestra un toast de error si el PATCH falla', async () => {
      const { ApiRequestError } = await import('@/lib/api/httpError');
      updatePatternRequestMock.mockRejectedValueOnce(new ApiRequestError('No encontrado', 404));
      const user = userEvent.setup();
      render(<SequencerPanel bpm={124} />);

      const step0 = screen.getByTestId(`step-${hihatTrack.id}-0`);
      expect(step0).toHaveAttribute('aria-pressed', 'true');

      await user.click(step0);

      await waitFor(() => {
        expect(screen.getByTestId(`step-${hihatTrack.id}-0`)).toHaveAttribute(
          'aria-pressed',
          'true',
        );
      });
      expect(toastError).toHaveBeenCalledWith('No encontrado');
    });
  });
});
