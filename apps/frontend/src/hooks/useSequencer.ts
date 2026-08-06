'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';
import type { Pattern, Track, TrackType } from '@beatforge/shared';

import {
  applyMixerStateToVoices,
  defaultNoteForTrackType,
  resolveStepTrigger,
  synthKindForTrackType,
} from '@/lib/sequencer/logic';

interface UseSequencerOptions {
  /** BPM real del Project seleccionado -- se mantiene sincronizado con Tone.Transport. */
  bpm: number;
  /** Todos los Tracks del proyecto (tipo, mute, solo, volumen del mixer). */
  tracks: Track[];
  /** Pattern de cada Track que tenga uno asociado, indexado por trackId. */
  patternsByTrackId: Record<string, Pattern>;
}

interface UseSequencerResult {
  isPlaying: boolean;
  /** Índice (0-15) del step que suena ahora mismo, o -1 si está parado. */
  currentStep: number;
  /** Hay al menos un Track con Pattern reproducible. Ver SequencerPanel para
   * el gate real del botón Play, que sigue centrado en el Track DRUM. */
  canPlay: boolean;
  play: () => Promise<void>;
  stop: () => void;
}

type TrackSynth = Tone.MembraneSynth | Tone.MonoSynth | Tone.NoiseSynth;

interface TrackVoice {
  synth: TrackSynth;
  sequence: Tone.Sequence<number>;
}

// Un synth por tipo de Track, no por nombre ni por posición -- así cualquier
// Track nuevo del mismo tipo suena igual sin tocar este código. Qué clase le
// corresponde a cada tipo vive en synthKindForTrackType (logic.ts, pura y
// testeada sin Tone.js); aquí solo se instancia la clase real. Tipos sin
// synth soportado hoy (SYNTH, SAMPLE) devuelven null: ver alcance en
// CLAUDE.md > Audio.
function createSynthForTrackType(type: TrackType): TrackSynth | null {
  switch (synthKindForTrackType(type)) {
    case 'MembraneSynth':
      return new Tone.MembraneSynth().toDestination();
    case 'MonoSynth': {
      const synth = new Tone.MonoSynth({
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.01, decay: 0.25, sustain: 0.3, release: 0.3 },
        filterEnvelope: {
          attack: 0.01,
          decay: 0.2,
          sustain: 0.2,
          release: 0.3,
          baseFrequency: 100,
          octaves: 2.5,
        },
      }).toDestination();
      // Portamento corto: da carácter de línea de bajo tocada (glide entre
      // notas) en vez de sonar a notas staccato desconectadas entre sí.
      synth.portamento = 0.02;
      return synth;
    }
    case 'NoiseSynth':
      return createNoiseSynthForTrackType(type).toDestination();
    default:
      return null;
  }
}

// HIHAT y SNARE comparten clase (NoiseSynth, ver synthKindForTrackType) pero
// no timbre: un hi-hat cerrado es corto y brillante, un snare/clap tiene más
// cuerpo y algo de sustain. MetalSynth (FM con parciales metálicos) se
// descarta para ambos por estar pensado para campana/platillo, no para un
// golpe basado en ruido.
function createNoiseSynthForTrackType(type: TrackType): Tone.NoiseSynth {
  if (type === 'SNARE') {
    // Ruido rosa (más cuerpo/graves que el blanco) + decay/release más
    // largos que el hi-hat: da el "cuerpo" característico de snare/clap sin
    // llegar a tener sustain real (sigue siendo un golpe, sustain: 0).
    return new Tone.NoiseSynth({
      noise: { type: 'pink' },
      envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.1 },
    });
  }
  // HIHAT: ruido blanco + envelope muy corto -- el estándar para hi-hats
  // cerrados, el "tick" percusivo y seco.
  return new Tone.NoiseSynth({
    envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.02 },
  });
}

// Toda la orquestación de Tone.js vive aquí -- ver CLAUDE.md > Audio. Los
// componentes visuales (SequencerPanel) solo leen isPlaying/currentStep y
// llaman a play()/stop(), nunca tocan Tone.js directamente.
//
// Por qué Tone.Sequence y no Tone.Loop: cada Pattern.steps ya es un array
// fijo de 16 elementos guardado en la BD. Sequence toma ese array
// directamente y llama al callback una vez por elemento a la subdivisión
// dada ("16n"), pasando el propio valor -- encaja exactamente con la forma
// de los datos, sin llevar un contador de step a mano como haría falta con
// Loop.
//
// Por qué UN solo hook y no uno por Track: React no permite llamar hooks
// dentro de un bucle/condicional (el número de Tracks reproducibles puede
// cambiar entre renders -- se añade un Track, tarda en cargar su Pattern,
// etc.), así que un hipotético "useTrackVoice" por Track no sería seguro de
// invocar dinámicamente. En su lugar, este hook mantiene un registro
// imperativo (voicesRef, un Map normal, no hooks) de sintetizador+Sequence
// por trackId, construido/destruido con un simple bucle -- misma idea que
// useSequencer ya usaba para un único Track, generalizada.
export function useSequencer({
  bpm,
  tracks,
  patternsByTrackId,
}: UseSequencerOptions): UseSequencerResult {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);

  const voicesRef = useRef<Map<string, TrackVoice>>(new Map());
  // tracksRef/patternsRef permiten que play() y el callback de cada Sequence
  // lean siempre el estado más reciente sin que play() tenga que
  // reconstruirse (deps vacías) cada vez que cambia cualquier campo del
  // mixer -- igual que patternRef en la versión de un solo Track.
  const tracksRef = useRef(tracks);
  tracksRef.current = tracks;
  const patternsRef = useRef(patternsByTrackId);
  patternsRef.current = patternsByTrackId;

  // El bpm del Project siempre manda, incluso si cambia mientras está sonando.
  useEffect(() => {
    Tone.Transport.bpm.value = bpm;
  }, [bpm]);

  const teardownAllVoices = useCallback(() => {
    for (const voice of voicesRef.current.values()) {
      voice.sequence.dispose();
      voice.synth.dispose();
    }
    voicesRef.current.clear();
  }, []);

  // Parada completa: para el Transport, cancela lo programado y libera
  // (dispose) cada Sequence/synth -- Tone.js no permite volver a `.start()`
  // una Sequence/Part ya iniciada sin cancelar antes, así que la forma
  // segura de poder reproducir de nuevo es no dejar ninguna viva a medias.
  const stop = useCallback(() => {
    Tone.Transport.stop();
    Tone.Transport.cancel(0);
    teardownAllVoices();
    setIsPlaying(false);
    setCurrentStep(-1);
  }, [teardownAllVoices]);

  // Firma estable de "qué Tracks con qué Pattern EXACTO deberían sonar":
  // cambia solo si se añaden/quitan Tracks reproducibles, o si a un Track le
  // cambian de Pattern por completo (otro proyecto/track). Editar los steps
  // de un Pattern ya existente NO cambia esta firma (mismo pattern.id), así
  // que no dispara una reconstrucción -- el callback de cada Sequence ya lee
  // los steps más recientes vía patternsRef en cada iteración (ver play()),
  // así que un edit en caliente se refleja solo en el siguiente step sin
  // tocar el Transport ni ninguna Sequence.
  const voiceSignature = tracks
    .map((track) => {
      const pattern = patternsByTrackId[track.id];
      return pattern ? `${track.id}:${pattern.id}` : null;
    })
    .filter((entry): entry is string => entry !== null)
    .sort()
    .join('|');

  useEffect(() => {
    stop();
    return () => {
      Tone.Transport.stop();
      Tone.Transport.cancel(0);
      teardownAllVoices();
    };
  }, [voiceSignature, stop, teardownAllVoices]);

  // Mute/Solo/Volumen se aplican directamente al nodo de audio de cada synth
  // (su propio .volume, en dB) en cuanto cambian, nunca dentro del callback
  // de la Sequence -- así el cambio es inmediato (no cuantizado al
  // siguiente step) y nunca toca el Transport ni recrea nada, pudiendo
  // cambiarse en caliente con el secuenciador sonando. La conversión
  // volumen lineal -> dB y la decisión de audibilidad (mute/solo) viven en
  // applyMixerStateToVoices (lib/sequencer/logic.ts) -- lógica pura,
  // testeada sin Tone.js; aquí solo se le pasa el registro real de voces.
  useEffect(() => {
    applyMixerStateToVoices(tracks, voicesRef.current);
  }, [tracks]);

  const play = useCallback(async () => {
    // Los navegadores bloquean el audio hasta una interacción explícita del
    // usuario; Tone.start() desbloquea el AudioContext. Es seguro llamarlo
    // en cada play(), no solo la primera vez (no-op si ya está arrancado).
    await Tone.start();

    if (voicesRef.current.size === 0) {
      for (const track of tracksRef.current) {
        const pattern = patternsRef.current[track.id];
        if (!pattern) {
          continue;
        }
        const synth = createSynthForTrackType(track.type);
        if (!synth) {
          continue;
        }

        const defaultNote = defaultNoteForTrackType(track.type);
        const trackId = track.id;
        const stepIndices = pattern.steps.map((_, index) => index);

        const sequence = new Tone.Sequence<number>(
          (time, stepIndex) => {
            // Siempre a través de patternsRef, nunca del `pattern` capturado
            // arriba: así un toggle de step (misma identidad de Pattern) se
            // refleja en el siguiente step sin recrear la Sequence.
            const currentPattern = patternsRef.current[trackId];
            const step = currentPattern?.steps[stepIndex];
            const trigger = step ? resolveStepTrigger(step, defaultNote) : null;
            if (trigger) {
              // NoiseSynth no tiene altura (es ruido filtrado): su
              // triggerAttackRelease no lleva nota, a diferencia de
              // MembraneSynth/MonoSynth -- ver Tone/instrument/NoiseSynth.ts.
              if (synth instanceof Tone.NoiseSynth) {
                synth.triggerAttackRelease('8n', time, trigger.velocity);
              } else {
                synth.triggerAttackRelease(trigger.note, '8n', time, trigger.velocity);
              }
            }
            // Todas las Sequences comparten Transport/subdivisión y arrancan
            // juntas (sequence.start(0) más abajo), así que siempre están en
            // el mismo step -- basta con que cualquiera de ellas actualice
            // el playhead visual. Tone.Draw sincroniza ese callback con el
            // instante de audio programado (compensa el "lookahead" del
            // scheduler): sin esto el playhead iría desacompasado del
            // sonido real.
            Tone.Draw.schedule(() => {
              setCurrentStep(stepIndex);
            }, time);
          },
          stepIndices,
          '16n',
        );

        voicesRef.current.set(trackId, { synth, sequence });
      }

      // Volumen inicial de cada voz recién creada: mismo cálculo que el
      // efecto de mute/solo/volumen de arriba, para no duplicar la lógica.
      applyMixerStateToVoices(tracksRef.current, voicesRef.current);
    }

    for (const voice of voicesRef.current.values()) {
      voice.sequence.start(0);
    }
    Tone.Transport.start();
    setIsPlaying(true);
  }, []);

  return {
    isPlaying,
    currentStep,
    canPlay: Object.keys(patternsByTrackId).length > 0,
    play,
    stop,
  };
}
