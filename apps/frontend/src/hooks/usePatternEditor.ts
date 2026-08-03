'use client';

import { useCallback } from 'react';
import type { Pattern } from '@beatforge/shared';

import { updatePatternRequest } from '@/lib/api/patterns';
import { runOptimisticUpdate } from '@/lib/optimisticUpdate';
import { toggleStepActive } from '@/lib/sequencer/logic';

interface UsePatternEditorOptions {
  trackId: string | null;
  pattern: Pattern | null;
  /** Empuja el Pattern (nuevo u original, al revertir) hacia quien lo posee -- el store. */
  onChange: (pattern: Pattern) => void;
}

interface UsePatternEditorResult {
  toggleStep: (stepIndex: number) => void;
}

// Hook hermano de useSequencer, no su ampliación: useSequencer no sabe nada
// de red/persistencia, solo reproduce lo que haya en `pattern` en cada
// momento; este hook es el único que llama al PATCH y decide qué hacer si
// falla. Al vivir aquí (no en el componente visual del grid), el componente
// solo necesita llamar a toggleStep(index) -- igual que useSequencer expone
// play()/stop() en vez de que el componente toque Tone.js directamente.
export function usePatternEditor({
  trackId,
  pattern,
  onChange,
}: UsePatternEditorOptions): UsePatternEditorResult {
  const toggleStep = useCallback(
    (stepIndex: number) => {
      if (!trackId || !pattern) {
        return;
      }

      const previousPattern = pattern;
      const nextSteps = toggleStepActive(pattern.steps, stepIndex);
      const nextPattern: Pattern = { ...pattern, steps: nextSteps };

      // Optimista: la UI (y la Sequence ya en marcha, vía patternRef en
      // useSequencer) reflejan el cambio al instante; si el PATCH falla se
      // revierte al Pattern anterior exacto, no a un cálculo inverso.
      void runOptimisticUpdate({
        apply: () => onChange(nextPattern),
        revert: () => onChange(previousPattern),
        request: () => updatePatternRequest(trackId, pattern.id, { steps: nextSteps }),
      });
    },
    [trackId, pattern, onChange],
  );

  return { toggleStep };
}
