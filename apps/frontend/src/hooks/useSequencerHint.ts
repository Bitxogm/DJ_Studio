'use client';

import { useEffect, useState } from 'react';

// Mismo patrón de namespacing por userId que storageKeyFor en store/studio.ts
// (lastProjectId): el hint es "visto/no visto" por usuario, no global del
// navegador -- así los dos usuarios demo (u otros que compartan máquina) no
// se pisan el uno al otro.
function storageKeyFor(userId: string): string {
  return `beatforge:sequencerHintDismissed:${userId}`;
}

interface UseSequencerHintResult {
  /** true solo si el usuario NUNCA ha cerrado el hint (ni por click en un step, ni por la X). */
  showHint: boolean;
  dismiss: () => void;
}

// Hint sutil de primera vez ("haz click en una celda para cambiar el
// ritmo"), pensado para alguien sin experiencia previa. Empieza SIEMPRE
// oculto (dismissed=true) hasta que el efecto confirma en localStorage que
// de verdad no se ha visto antes -- evita el flash de "aparece y
// desaparece" que se vería si arrancara visible por defecto en SSR/primer
// render y el efecto lo ocultara después.
export function useSequencerHint(userId: string | null): UseSequencerHintResult {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (!userId || typeof window === 'undefined') {
      setDismissed(true);
      return;
    }
    try {
      setDismissed(window.localStorage.getItem(storageKeyFor(userId)) === '1');
    } catch {
      setDismissed(true);
    }
  }, [userId]);

  function dismiss(): void {
    setDismissed(true);
    if (!userId || typeof window === 'undefined') {
      return;
    }
    try {
      window.localStorage.setItem(storageKeyFor(userId), '1');
    } catch {
      // No crítico: en el peor caso, el hint vuelve a aparecer la próxima vez.
    }
  }

  return { showHint: !dismissed, dismiss };
}
