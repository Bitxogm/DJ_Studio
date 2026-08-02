import type { PatternStep, Track } from '@beatforge/shared';
import { describe, expect, it } from 'vitest';

import { findDrumTrack, getPlayDisabledReason, resolveStepTrigger } from './logic';

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

describe('resolveStepTrigger', () => {
  it('devuelve null si el step no está activo', () => {
    expect(resolveStepTrigger(step({ active: false }))).toBeNull();
  });

  it('usa C1 como nota por defecto para un step activo sin nota propia', () => {
    expect(resolveStepTrigger(step({ active: true, note: null, velocity: 1 }))).toEqual({
      note: 'C1',
      velocity: 1,
    });
  });

  it('respeta la nota del step si viene definida', () => {
    expect(resolveStepTrigger(step({ active: true, note: 'A1', velocity: 0.5 }))).toEqual({
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
