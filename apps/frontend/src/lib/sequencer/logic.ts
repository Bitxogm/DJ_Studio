import type { PatternStep, Track } from '@beatforge/shared';

// Lógica pura del secuenciador, sin importar 'tone' ni React: extraída a
// propósito para poder testearla sin depender de la Web Audio API (que no
// existe en jsdom). src/hooks/useSequencer.ts la usa dentro del callback de
// Tone.Sequence; los componentes visuales la usan para decidir el estado del
// botón Play.

export interface StepTrigger {
  note: string;
  velocity: number;
}

// Decide si un step debe sonar y con qué nota/velocity. 'C1' es la nota fija
// del kick (MembraneSynth) cuando el step no especifica una propia -- que es
// el caso de todos los steps de batería sembrados hasta ahora.
export function resolveStepTrigger(step: PatternStep): StepTrigger | null {
  if (!step.active) {
    return null;
  }
  return { note: step.note ?? 'C1', velocity: step.velocity };
}

// Invierte el step del índice dado, sin mutar el array original -- tanto la
// UI (actualización optimista) como el PATCH necesitan el array "de después"
// sin tocar el "de antes", que se guarda aparte para poder revertir.
export function toggleStepActive(steps: PatternStep[], index: number): PatternStep[] {
  return steps.map((step, i) => (i === index ? { ...step, active: !step.active } : step));
}

// Alcance de este prompt: un único track suena, el primero de tipo DRUM.
export function findDrumTrack(tracks: Track[]): Track | null {
  return tracks.find((track) => track.type === 'DRUM') ?? null;
}

export interface PlayDisabledParams {
  drumTrack: Track | null;
  hasPattern: boolean;
  isLoadingPattern: boolean;
}

// null => se puede reproducir (o, si isLoadingPattern, se deshabilita sin
// mensaje todavía porque no sabemos si habrá pattern o no).
export function getPlayDisabledReason(params: PlayDisabledParams): string | null {
  if (!params.drumTrack) {
    return 'Añade un Track de batería para poder reproducir';
  }
  if (params.isLoadingPattern) {
    return null;
  }
  if (!params.hasPattern) {
    return 'Este track de batería no tiene ningún patrón todavía';
  }
  return null;
}
