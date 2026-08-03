import type { PatternStep, Track, TrackType } from '@beatforge/shared';

// Lógica pura del secuenciador, sin importar 'tone' ni React: extraída a
// propósito para poder testearla sin depender de la Web Audio API (que no
// existe en jsdom). src/hooks/useSequencer.ts la usa dentro del callback de
// cada Tone.Sequence; los componentes visuales la usan para decidir el
// estado del botón Play.

export interface StepTrigger {
  note: string;
  velocity: number;
}

// Nota por defecto cuando un step activo no especifica la suya -- varía por
// tipo de Track porque un valor fijo (p.ej. 'C1' para todo) no tendría
// sentido para un synth de bajo. Los tipos sin synth soportado hoy (SYNTH,
// SAMPLE) tienen igualmente un valor por si en el futuro lo necesitan.
export function defaultNoteForTrackType(type: TrackType): string {
  switch (type) {
    case 'DRUM':
      return 'C1';
    case 'BASS':
      return 'C2';
    default:
      return 'C3';
  }
}

// Decide si un step debe sonar y con qué nota/velocity. `defaultNote` la
// decide quien llama (ver defaultNoteForTrackType) en vez de venir
// hardcodeada aquí, para que esta función no sepa nada de tipos de Track.
export function resolveStepTrigger(step: PatternStep, defaultNote: string): StepTrigger | null {
  if (!step.active) {
    return null;
  }
  return { note: step.note ?? defaultNote, velocity: step.velocity };
}

// Invierte el step del índice dado, sin mutar el array original -- tanto la
// UI (actualización optimista) como el PATCH necesitan el array "de después"
// sin tocar el "de antes", que se guarda aparte para poder revertir.
export function toggleStepActive(steps: PatternStep[], index: number): PatternStep[] {
  return steps.map((step, i) => (i === index ? { ...step, active: !step.active } : step));
}

// El grid interactivo del secuenciador sigue centrado en un único Track (el
// primero de tipo DRUM) -- ver SequencerPanel. Esto es independiente de
// cuántos Tracks reproduce realmente el motor de audio (useSequencer, que sí
// soporta todos los que tengan Pattern).
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

// ¿Hay al menos un Track con Solo activado en el proyecto? Se recalcula
// sobre la lista completa cada vez que cambia cualquier Track, porque el
// solo de UNO afecta a la audibilidad de TODOS los demás.
export function hasAnySoloedTrack(tracks: Track[]): boolean {
  return tracks.some((track) => track.soloed);
}

// Decide si un Track concreto debe sonar, dado su propio mute/solo y si HAY
// algún solo activo en el proyecto (en cualquier Track, no solo este). Mute
// gana siempre sobre solo: un Track muteado nunca suena, ni siquiera si él
// mismo tiene el solo activado -- es el comportamiento estándar de una mesa
// de mezclas real y evita el caso ambiguo "muted + soloed" del propio Track.
export function isTrackAudible(
  track: Pick<Track, 'muted' | 'soloed'>,
  isAnyTrackSoloed: boolean,
): boolean {
  if (track.muted) {
    return false;
  }
  if (isAnyTrackSoloed) {
    return track.soloed;
  }
  return true;
}

// Conversión ganancia lineal (0-1, el valor que guarda Track.volume en BD)
// -> decibelios (la escala que usa Tone.js para sus nodos de audio, más
// fiel a cómo se percibe el volumen que una escala lineal). Misma fórmula
// estándar que Tone.gainToDb -- reimplementada aquí, sin importar 'tone',
// para poder testear esta conversión y la lógica que la usa
// (applyMixerStateToVoices) sin tocar la Web Audio API en absoluto.
export function linearVolumeToDb(volume: number): number {
  if (volume <= 0) {
    return -Infinity;
  }
  return 20 * Math.log10(volume);
}

// Forma mínima de una "voz" de audio que le basta a esta función: cualquier
// objeto con un .synth.volume.value numérico sirve, sea un synth real de
// Tone.js o un doble de test. No se importa ningún tipo de 'tone' aquí a
// propósito.
export interface AudioVoiceLike {
  synth: { volume: { value: number } };
}

// Aplica mute/solo/volumen del mixer a cada voz que YA exista (synth+Sequence
// ya construidos para ese Track). Si un Track no tiene voz registrada
// todavía -- porque no se ha dado a Play, o porque ese Track no tiene
// Pattern o su tipo no tiene synth soportado -- se ignora sin más: mover su
// fader nunca debe romper nada.
export function applyMixerStateToVoices(
  tracks: Track[],
  voices: Map<string, AudioVoiceLike>,
): void {
  const anySoloed = hasAnySoloedTrack(tracks);
  for (const track of tracks) {
    const voice = voices.get(track.id);
    if (!voice) {
      continue;
    }
    const audible = isTrackAudible(track, anySoloed);
    voice.synth.volume.value = audible ? linearVolumeToDb(track.volume) : -Infinity;
  }
}
