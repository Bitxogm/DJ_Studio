import type { PatternStep, Track } from '@beatforge/shared';
import { describe, expect, it } from 'vitest';

import {
  applyMixerStateToVoices,
  defaultNoteForTrackType,
  findChokeTargetTrackId,
  findDrumTrack,
  getPlayDisabledReason,
  hasAnySoloedTrack,
  isTrackAudible,
  linearVolumeToDb,
  resolveStepTrigger,
  synthKindForTrackType,
  toggleStepActive,
  type AudioVoiceLike,
} from './logic';

function step(overrides: Partial<PatternStep> = {}): PatternStep {
  return { active: false, note: null, velocity: 0.8, ...overrides };
}

function track(overrides: Partial<Track> = {}): Track {
  return {
    id: 't1',
    projectId: 'p1',
    name: 'Track',
    type: 'DRUM',
    order: 0,
    volume: 0.8,
    muted: false,
    soloed: false,
    instrumentConfig: {},
    sampleId: null,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

describe('defaultNoteForTrackType', () => {
  it('DRUM usa C1', () => {
    expect(defaultNoteForTrackType('DRUM')).toBe('C1');
  });

  it('BASS usa C2 (una octava más grave)', () => {
    expect(defaultNoteForTrackType('BASS')).toBe('C2');
  });

  it('tipos sin synth soportado hoy devuelven igualmente un valor', () => {
    expect(defaultNoteForTrackType('SYNTH')).toBe('C3');
    expect(defaultNoteForTrackType('SAMPLE')).toBe('C3');
  });

  it('HIHAT tiene synth (NoiseSynth) pero es ruido sin altura -- el valor devuelto no se usa', () => {
    expect(defaultNoteForTrackType('HIHAT')).toBe('C3');
  });

  it('SNARE también es ruido sin altura (comparte NoiseSynth con HIHAT) -- el valor devuelto no se usa', () => {
    expect(defaultNoteForTrackType('SNARE')).toBe('C3');
  });

  it('HIHAT_OPEN también es ruido sin altura -- el valor devuelto no se usa', () => {
    expect(defaultNoteForTrackType('HIHAT_OPEN')).toBe('C3');
  });
});

describe('synthKindForTrackType', () => {
  it('DRUM usa MembraneSynth', () => {
    expect(synthKindForTrackType('DRUM')).toBe('MembraneSynth');
  });

  it('BASS usa MonoSynth', () => {
    expect(synthKindForTrackType('BASS')).toBe('MonoSynth');
  });

  it('HIHAT usa NoiseSynth (ruido filtrado, no un oscilador afinable)', () => {
    expect(synthKindForTrackType('HIHAT')).toBe('NoiseSynth');
  });

  it('SNARE también usa NoiseSynth (misma clase que HIHAT, distinta configuración en useSequencer)', () => {
    expect(synthKindForTrackType('SNARE')).toBe('NoiseSynth');
  });

  it('HIHAT_OPEN también usa NoiseSynth (misma clase que HIHAT, distinta configuración en useSequencer)', () => {
    expect(synthKindForTrackType('HIHAT_OPEN')).toBe('NoiseSynth');
  });

  it('tipos sin synth soportado hoy (SYNTH, SAMPLE) devuelven null', () => {
    expect(synthKindForTrackType('SYNTH')).toBeNull();
    expect(synthKindForTrackType('SAMPLE')).toBeNull();
  });
});

describe('findChokeTargetTrackId', () => {
  it('devuelve el trackId del HIHAT_OPEN cuando type es HIHAT y existe un HIHAT_OPEN', () => {
    const tracks = [
      track({ id: 'closed', type: 'HIHAT' }),
      track({ id: 'open', type: 'HIHAT_OPEN' }),
    ];
    expect(findChokeTargetTrackId(tracks, 'HIHAT')).toBe('open');
  });

  it('devuelve null si type es HIHAT pero no hay ningún HIHAT_OPEN en el proyecto', () => {
    const tracks = [track({ id: 'closed', type: 'HIHAT' })];
    expect(findChokeTargetTrackId(tracks, 'HIHAT')).toBeNull();
  });

  it('devuelve null para HIHAT_OPEN -- el choke es de un solo sentido, el abierto nunca corta al cerrado', () => {
    const tracks = [
      track({ id: 'closed', type: 'HIHAT' }),
      track({ id: 'open', type: 'HIHAT_OPEN' }),
    ];
    expect(findChokeTargetTrackId(tracks, 'HIHAT_OPEN')).toBeNull();
  });

  it('devuelve null para cualquier otro TrackType, aunque haya un HIHAT_OPEN presente', () => {
    const tracks = [track({ id: 'open', type: 'HIHAT_OPEN' })];
    expect(findChokeTargetTrackId(tracks, 'DRUM')).toBeNull();
    expect(findChokeTargetTrackId(tracks, 'BASS')).toBeNull();
    expect(findChokeTargetTrackId(tracks, 'SNARE')).toBeNull();
  });
});

describe('resolveStepTrigger', () => {
  it('devuelve null si el step no está activo', () => {
    expect(resolveStepTrigger(step({ active: false }), 'C1')).toBeNull();
  });

  it('usa el defaultNote dado para un step activo sin nota propia', () => {
    expect(resolveStepTrigger(step({ active: true, note: null, velocity: 1 }), 'C2')).toEqual({
      note: 'C2',
      velocity: 1,
    });
  });

  it('respeta la nota del step si viene definida, ignorando el defaultNote', () => {
    expect(resolveStepTrigger(step({ active: true, note: 'A1', velocity: 0.5 }), 'C2')).toEqual({
      note: 'A1',
      velocity: 0.5,
    });
  });
});

describe('findDrumTrack', () => {
  it('devuelve null si no hay tracks', () => {
    expect(findDrumTrack([])).toBeNull();
  });

  it('devuelve null si no hay ningún track de tipo DRUM', () => {
    expect(findDrumTrack([track({ type: 'BASS' }), track({ type: 'SYNTH' })])).toBeNull();
  });

  it('devuelve el primer track de tipo DRUM', () => {
    const drum1 = track({ id: 'd1', type: 'DRUM', order: 0 });
    const drum2 = track({ id: 'd2', type: 'DRUM', order: 1 });
    expect(findDrumTrack([track({ type: 'BASS' }), drum1, drum2])).toBe(drum1);
  });
});

describe('toggleStepActive', () => {
  it('invierte solo el step del índice indicado', () => {
    const steps = [step({ active: false }), step({ active: true }), step({ active: false })];
    const result = toggleStepActive(steps, 0);

    expect(result[0].active).toBe(true);
    expect(result[1].active).toBe(true);
    expect(result[2].active).toBe(false);
  });

  it('no muta el array ni los steps originales', () => {
    const steps = [step({ active: false })];
    const result = toggleStepActive(steps, 0);

    expect(steps[0].active).toBe(false);
    expect(result).not.toBe(steps);
    expect(result[0]).not.toBe(steps[0]);
  });

  it('preserva note y velocity del step invertido', () => {
    const steps = [step({ active: false, note: 'A1', velocity: 0.7 })];
    const result = toggleStepActive(steps, 0);

    expect(result[0]).toEqual({ active: true, note: 'A1', velocity: 0.7 });
  });

  it('activar un step con velocity 0 le asigna velocity 1 (si no, sonaría silencioso)', () => {
    const steps = [step({ active: false, note: null, velocity: 0 })];
    const result = toggleStepActive(steps, 0);

    expect(result[0]).toEqual({ active: true, note: null, velocity: 1 });
  });

  it('reactivar un step que ya tenía una velocity distinta de 0 no la sobrescribe', () => {
    const steps = [step({ active: false, note: 'G1', velocity: 0.65 })];
    const result = toggleStepActive(steps, 0);

    expect(result[0]).toEqual({ active: true, note: 'G1', velocity: 0.65 });
  });

  it('desactivar un step (true -> false) nunca toca su velocity, aunque sea 0', () => {
    const steps = [step({ active: true, note: 'C2', velocity: 0 })];
    const result = toggleStepActive(steps, 0);

    expect(result[0]).toEqual({ active: false, note: 'C2', velocity: 0 });
  });
});

describe('getPlayDisabledReason', () => {
  it('pide añadir un track de batería si no hay ninguno', () => {
    expect(
      getPlayDisabledReason({ drumTrack: null, hasPattern: false, isLoadingPattern: false }),
    ).toBe('Añade un Track de batería para poder reproducir');
  });

  it('no da mensaje mientras carga el pattern (solo deshabilita)', () => {
    expect(
      getPlayDisabledReason({ drumTrack: track(), hasPattern: false, isLoadingPattern: true }),
    ).toBeNull();
  });

  it('avisa si el track de batería no tiene pattern', () => {
    expect(
      getPlayDisabledReason({ drumTrack: track(), hasPattern: false, isLoadingPattern: false }),
    ).toBe('Este track de batería no tiene ningún patrón todavía');
  });

  it('devuelve null (reproducible) si hay track y pattern', () => {
    expect(
      getPlayDisabledReason({ drumTrack: track(), hasPattern: true, isLoadingPattern: false }),
    ).toBeNull();
  });
});

describe('hasAnySoloedTrack', () => {
  it('devuelve false si no hay tracks', () => {
    expect(hasAnySoloedTrack([])).toBe(false);
  });

  it('devuelve false si ningún track tiene solo activado', () => {
    expect(hasAnySoloedTrack([track({ soloed: false }), track({ soloed: false })])).toBe(false);
  });

  it('devuelve true si al menos un track tiene solo activado', () => {
    expect(hasAnySoloedTrack([track({ soloed: false }), track({ soloed: true })])).toBe(true);
  });
});

describe('isTrackAudible', () => {
  it('sin ningún solo activo en el proyecto, un track normal (no muted) suena', () => {
    expect(isTrackAudible({ muted: false, soloed: false }, false)).toBe(true);
  });

  it('sin ningún solo activo, un track muteado no suena', () => {
    expect(isTrackAudible({ muted: true, soloed: false }, false)).toBe(false);
  });

  it('con un solo activo en OTRO track, este track (no muted, no soloed) no suena', () => {
    expect(isTrackAudible({ muted: false, soloed: false }, true)).toBe(false);
  });

  it('con un solo activo y ESTE track es el soloeado, suena', () => {
    expect(isTrackAudible({ muted: false, soloed: true }, true)).toBe(true);
  });

  it('mute gana sobre solo: muted + soloed (siendo este el propio track soloeado) no suena', () => {
    expect(isTrackAudible({ muted: true, soloed: true }, true)).toBe(false);
  });

  it('muted true, sin ningún solo activo en el proyecto, tampoco suena', () => {
    expect(isTrackAudible({ muted: true, soloed: false }, false)).toBe(false);
  });
});

describe('linearVolumeToDb', () => {
  it('0 (fader al mínimo) es silencio total (-Infinity dB)', () => {
    expect(linearVolumeToDb(0)).toBe(-Infinity);
  });

  it('1 (fader al máximo) es ganancia unidad (0 dB)', () => {
    expect(linearVolumeToDb(1)).toBeCloseTo(0);
  });

  it('valores negativos (no deberían darse, pero por si acaso) también son silencio', () => {
    expect(linearVolumeToDb(-1)).toBe(-Infinity);
  });

  it('un valor intermedio da un valor negativo de dB (más silencioso que 0dB)', () => {
    const db = linearVolumeToDb(0.5);
    expect(db).toBeLessThan(0);
    expect(db).toBeGreaterThan(-Infinity);
  });
});

function fakeVoice(volumeDb = 0): AudioVoiceLike {
  return { synth: { volume: { value: volumeDb } } };
}

describe('applyMixerStateToVoices', () => {
  it('mover el fader de un Track sin voz registrada (sin dar a play todavía) no rompe nada', () => {
    const tracks = [track({ id: 't1', volume: 0.3 })];
    const voices = new Map<string, AudioVoiceLike>(); // vacío: play() no se ha llamado

    expect(() => applyMixerStateToVoices(tracks, voices)).not.toThrow();
    expect(voices.size).toBe(0);
  });

  it('ignora silenciosamente Tracks sin voz aunque otros sí la tengan (Track sin Pattern o tipo no soportado)', () => {
    const withVoice = track({ id: 'with-voice', volume: 0.8 });
    const withoutVoice = track({ id: 'without-voice', volume: 0.5 });
    const voices = new Map<string, AudioVoiceLike>([['with-voice', fakeVoice()]]);

    expect(() => applyMixerStateToVoices([withVoice, withoutVoice], voices)).not.toThrow();
    expect(voices.has('without-voice')).toBe(false);
    expect(voices.get('with-voice')?.synth.volume.value).toBeCloseTo(linearVolumeToDb(0.8));
  });

  it('aplica el volumen convertido a dB a un Track normal (no muted, sin solos activos)', () => {
    const t = track({ id: 't1', volume: 0.5, muted: false, soloed: false });
    const voices = new Map<string, AudioVoiceLike>([['t1', fakeVoice()]]);

    applyMixerStateToVoices([t], voices);

    expect(voices.get('t1')?.synth.volume.value).toBeCloseTo(linearVolumeToDb(0.5));
  });

  it('silencia (-Infinity) un Track muteado', () => {
    const t = track({ id: 't1', volume: 1, muted: true, soloed: false });
    const voices = new Map<string, AudioVoiceLike>([['t1', fakeVoice()]]);

    applyMixerStateToVoices([t], voices);

    expect(voices.get('t1')?.synth.volume.value).toBe(-Infinity);
  });

  it('silencia un Track no soloeado cuando otro Track del proyecto sí tiene solo activo', () => {
    const soloed = track({ id: 'solo-track', volume: 1, soloed: true });
    const other = track({ id: 'other-track', volume: 1, soloed: false });
    const voices = new Map<string, AudioVoiceLike>([
      ['solo-track', fakeVoice()],
      ['other-track', fakeVoice()],
    ]);

    applyMixerStateToVoices([soloed, other], voices);

    expect(voices.get('solo-track')?.synth.volume.value).toBeCloseTo(linearVolumeToDb(1));
    expect(voices.get('other-track')?.synth.volume.value).toBe(-Infinity);
  });
});
