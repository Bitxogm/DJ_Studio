'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';
import type { Pattern } from '@beatforge/shared';

import { resolveStepTrigger } from '@/lib/sequencer/logic';

interface UseSequencerOptions {
  /** BPM real del Project seleccionado -- se mantiene sincronizado con Tone.Transport. */
  bpm: number;
  /** Pattern del Track DRUM a reproducir. `null` = no hay nada reproducible todavía. */
  pattern: Pattern | null;
}

interface UseSequencerResult {
  isPlaying: boolean;
  /** Índice (0-15) del step que suena ahora mismo, o -1 si está parado. */
  currentStep: number;
  canPlay: boolean;
  play: () => Promise<void>;
  stop: () => void;
}

// Toda la orquestación de Tone.js vive aquí -- ver CLAUDE.md > Audio. Los
// componentes visuales (SequencerPanel) solo leen isPlaying/currentStep y
// llaman a play()/stop(), nunca tocan Tone.js directamente.
//
// Por qué Tone.Sequence y no Tone.Loop: Sequence toma directamente un array
// de valores (los 16 steps del Pattern) más una subdivisión ("16n") y llama
// al callback una vez por elemento, pasando el propio valor -- encaja
// exactamente con "16 steps guardados en Pattern.steps" sin tener que llevar
// un contador de step manual como haría falta con Loop (que solo dispara un
// callback periódico, sin noción de "qué array recorre").
export function useSequencer({ bpm, pattern }: UseSequencerOptions): UseSequencerResult {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);

  const synthRef = useRef<Tone.MembraneSynth | null>(null);
  const sequenceRef = useRef<Tone.Sequence<number> | null>(null);
  // La Sequence captura `pattern` en el closure de su callback en el momento
  // en que se construye; este ref permite que ese callback siempre lea los
  // steps más recientes sin tener que reconstruir la Sequence si el resto de
  // la lógica cambiase (aunque hoy, en la práctica, se reconstruye igual en
  // cada cambio de pattern -- ver el efecto de abajo).
  const patternRef = useRef(pattern);
  patternRef.current = pattern;

  // Un único MembraneSynth para todo el ciclo de vida del hook: crearlo de
  // nuevo en cada trigger sería carísimo y sonaría con clicks/artefactos.
  useEffect(() => {
    const synth = new Tone.MembraneSynth().toDestination();
    synthRef.current = synth;
    return () => {
      synth.dispose();
      synthRef.current = null;
    };
  }, []);

  // El bpm del Project siempre manda, incluso si cambia mientras está sonando.
  useEffect(() => {
    Tone.Transport.bpm.value = bpm;
  }, [bpm]);

  // Parada completa: para el Transport, cancela lo programado y libera
  // (dispose) la Sequence -- Tone.js no permite volver a `.start()` una
  // Sequence/Part ya iniciada sin cancelar antes, así que la forma segura de
  // poder reproducir de nuevo es no dejar ninguna viva a medias.
  const stop = useCallback(() => {
    Tone.Transport.stop();
    Tone.Transport.cancel(0);
    sequenceRef.current?.dispose();
    sequenceRef.current = null;
    setIsPlaying(false);
    setCurrentStep(-1);
  }, []);

  // Cambiar a un pattern DISTINTO (otro proyecto, u otro Track DRUM) para la
  // reproducción en curso y libera la Sequence vieja -- nunca se deja sonando
  // un pattern que ya no es el seleccionado. Esto cubre tanto "cambiar de
  // proyecto" como "desmontar el componente" (ambos disparan/reejecutan este
  // efecto o su cleanup).
  //
  // Depende de `pattern?.id`, NO de `pattern` completo a propósito: editar un
  // step (toggle de active) crea un objeto Pattern nuevo con el MISMO id, y
  // eso NO debe parar la reproducción -- el callback de la Sequence ya lee
  // los steps más recientes vía `patternRef` en cada iteración (ver `play`),
  // así que un edit en caliente se refleja solo en el siguiente step sin
  // tocar el Transport ni la Sequence. Si esto dependiera de `pattern` a
  // secas, cada click en el grid cortaría el sonido.
  useEffect(() => {
    stop();
    return () => {
      Tone.Transport.stop();
      Tone.Transport.cancel(0);
      sequenceRef.current?.dispose();
      sequenceRef.current = null;
    };
  }, [pattern?.id, stop]);

  const play = useCallback(async () => {
    const currentPattern = patternRef.current;
    if (!currentPattern) {
      return;
    }

    // Los navegadores bloquean el audio hasta una interacción explícita del
    // usuario; Tone.start() desbloquea el AudioContext. Es seguro llamarlo en
    // cada play(), no solo la primera vez (no-op si ya está arrancado).
    await Tone.start();

    if (!sequenceRef.current) {
      const stepIndices = currentPattern.steps.map((_, index) => index);
      sequenceRef.current = new Tone.Sequence<number>(
        (time, stepIndex) => {
          const step = patternRef.current?.steps[stepIndex];
          const trigger = step ? resolveStepTrigger(step) : null;
          if (trigger) {
            synthRef.current?.triggerAttackRelease(trigger.note, '8n', time, trigger.velocity);
          }
          // Tone.Draw sincroniza el callback visual con el instante de audio
          // programado (compensa el "lookahead" del scheduler de Tone): sin
          // esto el playhead iría desacompasado del sonido real.
          Tone.Draw.schedule(() => {
            setCurrentStep(stepIndex);
          }, time);
        },
        stepIndices,
        '16n',
      );
    }

    sequenceRef.current.start(0);
    Tone.Transport.start();
    setIsPlaying(true);
  }, []);

  return {
    isPlaying,
    currentStep,
    canPlay: pattern !== null,
    play,
    stop,
  };
}
