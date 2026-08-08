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

const snareTrack: Track = {
  id: 't4',
  projectId: 'p1',
  name: 'Snare',
  type: 'SNARE',
  order: 3,
  volume: 0.8,
  muted: false,
  soloed: false,
  instrumentConfig: {},
  sampleId: null,
  createdAt: '',
  updatedAt: '',
};

const snarePattern: Pattern = {
  id: 'pat4',
  trackId: 't4',
  name: 'Backbeat',
  steps: Array.from({ length: 16 }, (_, i) => ({
    active: i === 4 || i === 12,
    note: null,
    velocity: i === 4 || i === 12 ? 0.8 : 0,
  })),
  timelinePosition: 0,
  lengthInBars: 1,
  createdAt: '',
  updatedAt: '',
};

const hihatOpenTrack: Track = {
  id: 't5',
  projectId: 'p1',
  name: 'Hi-hat abierto',
  type: 'HIHAT_OPEN',
  order: 4,
  volume: 0.7,
  muted: false,
  soloed: false,
  instrumentConfig: {},
  sampleId: null,
  createdAt: '',
  updatedAt: '',
};

const hihatOpenPattern: Pattern = {
  id: 'pat5',
  trackId: 't5',
  name: 'Acento final',
  steps: Array.from({ length: 16 }, (_, i) => ({
    active: i === 15,
    note: null,
    velocity: i === 15 ? 0.7 : 0,
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
    currentUserId: null,
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
    localStorage.clear();
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

  it('un Track recién creado con su Pattern vacío auto-generado (16 steps inactivos) se muestra como grid editable, no como mensaje bloqueado', async () => {
    // Misma forma exacta que crea track.service.ts al crear un Track nuevo:
    // 16 steps { active:false, note:null, velocity:0 }. Antes del fix de
    // auto-creación de Pattern, un Track así no existía nunca en la
    // práctica (el backend no creaba ningún Pattern) y el usuario se quedaba
    // bloqueado sin ningún botón para salir de ahí -- este test fija que,
    // en cuanto el Pattern (aunque esté vacío) llega al store, el grid
    // aparece igual que con cualquier otro Pattern, sin mensaje de aviso.
    const freshPattern: Pattern = {
      id: 'pat-fresh',
      trackId: drumTrack.id,
      name: 'Patrón principal',
      steps: Array.from({ length: 16 }, () => ({ active: false, note: null, velocity: 0 })),
      timelinePosition: 0,
      lengthInBars: 1,
      createdAt: '',
      updatedAt: '',
    };
    useStudioStore.setState({
      tracks: [drumTrack],
      trackPatterns: { [drumTrack.id]: freshPattern },
    });
    render(<SequencerPanel bpm={124} />);

    expect(
      screen.queryByText('Este track de batería no tiene ningún patrón todavía'),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Kick')).toBeInTheDocument();
    const step0 = screen.getByTestId(`step-${drumTrack.id}-0`);
    expect(step0).toHaveAttribute('aria-pressed', 'false');

    updatePatternRequestMock.mockResolvedValueOnce(freshPattern);
    const user = userEvent.setup();
    await user.click(step0);
    expect(step0).toHaveAttribute('aria-pressed', 'true');
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

  it('muestra los cuatro grids apilados (Kick, Bajo, Hi-hat y Snare) sin tocar el componente para el cuarto Track', () => {
    useStudioStore.setState({
      tracks: [drumTrack, bassTrack, hihatTrack, snareTrack],
      trackPatterns: {
        [drumTrack.id]: drumPattern,
        [bassTrack.id]: bassPattern,
        [hihatTrack.id]: hihatPattern,
        [snareTrack.id]: snarePattern,
      },
    });
    render(<SequencerPanel bpm={124} />);

    expect(screen.getByText('Kick')).toBeInTheDocument();
    expect(screen.getByText('Bajo')).toBeInTheDocument();
    expect(screen.getByText('Hi-hat')).toBeInTheDocument();
    expect(screen.getByText('Snare')).toBeInTheDocument();
    expect(screen.getByTestId(`step-${drumTrack.id}-0`)).toBeInTheDocument();
    expect(screen.getByTestId(`step-${bassTrack.id}-0`)).toBeInTheDocument();
    expect(screen.getByTestId(`step-${hihatTrack.id}-0`)).toBeInTheDocument();
    expect(screen.getByTestId(`step-${snareTrack.id}-4`)).toBeInTheDocument();
  });

  it('muestra los cinco grids apilados (Kick, Bajo, Hi-hat, Snare y Hi-hat abierto) sin tocar el componente para el quinto Track', () => {
    useStudioStore.setState({
      tracks: [drumTrack, bassTrack, hihatTrack, snareTrack, hihatOpenTrack],
      trackPatterns: {
        [drumTrack.id]: drumPattern,
        [bassTrack.id]: bassPattern,
        [hihatTrack.id]: hihatPattern,
        [snareTrack.id]: snarePattern,
        [hihatOpenTrack.id]: hihatOpenPattern,
      },
    });
    render(<SequencerPanel bpm={124} />);

    expect(screen.getByText('Kick')).toBeInTheDocument();
    expect(screen.getByText('Bajo')).toBeInTheDocument();
    expect(screen.getByText('Hi-hat')).toBeInTheDocument();
    expect(screen.getByText('Snare')).toBeInTheDocument();
    expect(screen.getByText('Hi-hat abierto')).toBeInTheDocument();
    expect(screen.getByTestId(`step-${drumTrack.id}-0`)).toBeInTheDocument();
    expect(screen.getByTestId(`step-${bassTrack.id}-0`)).toBeInTheDocument();
    expect(screen.getByTestId(`step-${hihatTrack.id}-0`)).toBeInTheDocument();
    expect(screen.getByTestId(`step-${snareTrack.id}-4`)).toBeInTheDocument();
    expect(screen.getByTestId(`step-${hihatOpenTrack.id}-15`)).toBeInTheDocument();
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

  describe('hint de primera vez', () => {
    const HINT_TEXT = 'Haz click en una celda para cambiar el ritmo';

    it('aparece para un usuario nuevo (sin localStorage) en cuanto hay al menos un Track editable', async () => {
      useStudioStore.setState({
        currentUserId: 'user-hint-1',
        tracks: [drumTrack],
        trackPatterns: { [drumTrack.id]: drumPattern },
      });
      render(<SequencerPanel bpm={124} />);

      await waitFor(() => {
        expect(screen.getByText(new RegExp(HINT_TEXT))).toBeInTheDocument();
      });
    });

    it('no aparece si no hay ningún Track editable, aunque el usuario nunca lo haya visto', () => {
      useStudioStore.setState({
        currentUserId: 'user-hint-2',
        tracks: [],
        trackPatterns: {},
      });
      render(<SequencerPanel bpm={124} />);

      expect(screen.queryByText(new RegExp(HINT_TEXT))).not.toBeInTheDocument();
    });

    it('desaparece al pulsar la X y no vuelve a aparecer en un remount (persistido en localStorage)', async () => {
      useStudioStore.setState({
        currentUserId: 'user-hint-3',
        tracks: [drumTrack],
        trackPatterns: { [drumTrack.id]: drumPattern },
      });
      const user = userEvent.setup();
      const { unmount } = render(<SequencerPanel bpm={124} />);

      await waitFor(() => {
        expect(screen.getByText(new RegExp(HINT_TEXT))).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: 'Cerrar aviso' }));
      expect(screen.queryByText(new RegExp(HINT_TEXT))).not.toBeInTheDocument();

      unmount();
      render(<SequencerPanel bpm={124} />);
      expect(screen.queryByText(new RegExp(HINT_TEXT))).not.toBeInTheDocument();
    });

    it('desaparece al hacer click en cualquier step (no solo con la X), y el click sigue activando el step', async () => {
      updatePatternRequestMock.mockReturnValue(new Promise(() => {})); // nunca resuelve
      useStudioStore.setState({
        currentUserId: 'user-hint-4',
        tracks: [drumTrack],
        trackPatterns: { [drumTrack.id]: drumPattern },
      });
      const user = userEvent.setup();
      render(<SequencerPanel bpm={124} />);

      await waitFor(() => {
        expect(screen.getByText(new RegExp(HINT_TEXT))).toBeInTheDocument();
      });

      const step1 = screen.getByTestId(`step-${drumTrack.id}-1`);
      expect(step1).toHaveAttribute('aria-pressed', 'false');
      await user.click(step1);

      expect(screen.queryByText(new RegExp(HINT_TEXT))).not.toBeInTheDocument();
      expect(step1).toHaveAttribute('aria-pressed', 'true');
    });
  });
});
