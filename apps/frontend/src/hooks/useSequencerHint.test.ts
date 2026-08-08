import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useSequencerHint } from './useSequencerHint';

function storageKey(userId: string): string {
  return `beatforge:sequencerHintDismissed:${userId}`;
}

describe('useSequencerHint', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('se muestra para un usuario que nunca lo ha descartado (localStorage vacío)', async () => {
    const { result } = renderHook(() => useSequencerHint('u1'));

    // El estado inicial (dismissed:true, ver el hook) evita el flash de
    // "aparece y desaparece" en un navegador real, pero en Testing Library
    // el efecto que lo confirma corre síncronamente dentro del propio
    // renderHook (act ya flushea los efectos) -- por eso aquí solo se
    // observa el resultado final, no el estado transitorio previo al efecto.
    await waitFor(() => {
      expect(result.current.showHint).toBe(true);
    });
  });

  it('dismiss() lo oculta al instante y lo persiste en localStorage bajo la clave del usuario', async () => {
    const { result } = renderHook(() => useSequencerHint('u1'));
    await waitFor(() => {
      expect(result.current.showHint).toBe(true);
    });

    act(() => {
      result.current.dismiss();
    });

    expect(result.current.showHint).toBe(false);
    expect(localStorage.getItem(storageKey('u1'))).toBe('1');
  });

  it('no vuelve a aparecer en un remount posterior del mismo usuario (persistencia real)', async () => {
    const first = renderHook(() => useSequencerHint('u1'));
    await waitFor(() => {
      expect(first.result.current.showHint).toBe(true);
    });
    act(() => {
      first.result.current.dismiss();
    });
    first.unmount();

    const second = renderHook(() => useSequencerHint('u1'));
    // Nunca debe pasar por "true": ya estaba descartado antes del montaje.
    await waitFor(() => {
      expect(second.result.current.showHint).toBe(false);
    });
  });

  it('un usuario distinto no hereda el dismiss de otro (namespacing por userId)', async () => {
    const owner = renderHook(() => useSequencerHint('u1'));
    await waitFor(() => {
      expect(owner.result.current.showHint).toBe(true);
    });
    act(() => {
      owner.result.current.dismiss();
    });

    const other = renderHook(() => useSequencerHint('u2'));
    await waitFor(() => {
      expect(other.result.current.showHint).toBe(true);
    });
  });

  it('con userId null, nunca se muestra (todavía no se sabe bajo qué clave guardar)', () => {
    const { result } = renderHook(() => useSequencerHint(null));

    expect(result.current.showHint).toBe(false);
  });
});
