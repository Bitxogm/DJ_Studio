'use client';

import { useCallback } from 'react';
import type { Pattern } from '@beatforge/shared';

import { updatePatternRequest } from '@/lib/api/patterns';
import { runOptimisticUpdate } from '@/lib/optimisticUpdate';
import { toggleStepActive } from '@/lib/sequencer/logic';

interface UsePatternEditorOptions {
  /** Pattern de cada Track editable, indexado por trackId. */
  patternsByTrackId: Record<string, Pattern>;
  /** Empuja el Pattern (nuevo u original, al revertir) hacia quien lo posee -- el store. */
  onChange: (trackId: string, pattern: Pattern) => void;
}

interface UsePatternEditorResult {
  toggleStep: (trackId: string, stepIndex: number) => void;
}

// Hook hermano de useSequencer, no su ampliación: useSequencer no sabe nada
// de red/persistencia, solo reproduce lo que haya en cada Pattern en cada
// momento; este hook es el único que llama al PATCH y decide qué hacer si
// falla.
//
// UN solo hook para TODOS los Tracks editables, no uno por Track -- misma
// razón que useSequencer generalizó igual: el número de Tracks con Pattern
// puede cambiar entre renders (se añade un Track, tarda en cargar su
// Pattern...), y React no permite invocar hooks dentro de un bucle o
// condicional. En vez de un `toggleStep(stepIndex)` atado a un único
// trackId fijo, este hook recibe el mapa trackId->Pattern completo y expone
// `toggleStep(trackId, stepIndex)`, que resuelve internamente a qué Pattern
// se refiere. Quien llama (SequencerPanel) simplemente invoca
// toggleStep(track.id, index) por cada grid que pinte, sin que este hook
// sepa nada de cuántos grids hay ni de cuál es "el" Track de turno.
export function usePatternEditor({
  patternsByTrackId,
  onChange,
}: UsePatternEditorOptions): UsePatternEditorResult {
  const toggleStep = useCallback(
    (trackId: string, stepIndex: number) => {
      const pattern = patternsByTrackId[trackId];
      if (!pattern) {
        return;
      }

      const previousPattern = pattern;
      const nextSteps = toggleStepActive(pattern.steps, stepIndex);
      const nextPattern: Pattern = { ...pattern, steps: nextSteps };

      // Optimista: la UI (y la Sequence de ese Track ya en marcha, vía
      // patternsRef en useSequencer) reflejan el cambio al instante; si el
      // PATCH falla se revierte al Pattern anterior exacto, no a un cálculo
      // inverso.
      void runOptimisticUpdate({
        apply: () => onChange(trackId, nextPattern),
        revert: () => onChange(trackId, previousPattern),
        request: () => updatePatternRequest(trackId, pattern.id, { steps: nextSteps }),
      });
    },
    [patternsByTrackId, onChange],
  );

  return { toggleStep };
}
