import { act, renderHook, waitFor } from '@testing-library/react';
import type { Pattern, PatternStep } from '@beatforge/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { usePatternEditor } from './usePatternEditor';

const updatePatternRequestMock =
  vi.fn<
    (trackId: string, patternId: string, input: { steps: PatternStep[] }) => Promise<Pattern>
  >();
vi.mock('@/lib/api/patterns', () => ({
  updatePatternRequest: (...args: [string, string, { steps: PatternStep[] }]) =>
    updatePatternRequestMock(...args),
}));

const toastError = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]): void => {
      toastError(...args);
    },
  },
}));

function buildPattern(overrides: Partial<Pattern> = {}): Pattern {
  return {
    id: 'pat1',
    trackId: 't1',
    name: 'Pattern',
    steps: Array.from({ length: 16 }, () => ({ active: false, note: null, velocity: 1 })),
    timelinePosition: 0,
    lengthInBars: 1,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

describe('usePatternEditor', () => {
  beforeEach(() => {
    updatePatternRequestMock.mockReset();
    toastError.mockClear();
  });

  it('no hace nada si el trackId no tiene Pattern en el mapa', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => usePatternEditor({ patternsByTrackId: {}, onChange }));

    act(() => {
      result.current.toggleStep('missing-track', 0);
    });

    expect(onChange).not.toHaveBeenCalled();
    expect(updatePatternRequestMock).not.toHaveBeenCalled();
  });

  it('actualiza optimistamente solo el Track indicado, sin tocar los demás', () => {
    const kick = buildPattern({ id: 'kick-pat', trackId: 'kick' });
    const bass = buildPattern({ id: 'bass-pat', trackId: 'bass' });
    const onChange = vi.fn();
    updatePatternRequestMock.mockReturnValue(new Promise(() => {})); // nunca resuelve

    const { result } = renderHook(() =>
      usePatternEditor({ patternsByTrackId: { kick, bass }, onChange }),
    );

    act(() => {
      result.current.toggleStep('bass', 2);
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    const [calledTrackId, calledPattern] = onChange.mock.calls[0] as [string, Pattern];
    expect(calledTrackId).toBe('bass');
    expect(calledPattern.steps[2].active).toBe(true);
    expect(calledPattern.steps[0].active).toBe(false);
  });

  it('llama al PATCH con el trackId y patternId del Track correcto (no el de otro)', async () => {
    const bass = buildPattern({ id: 'bass-pat', trackId: 'bass' });
    const kick = buildPattern({ id: 'kick-pat', trackId: 'kick' });
    updatePatternRequestMock.mockResolvedValueOnce(bass);
    const onChange = vi.fn();

    const { result } = renderHook(() =>
      usePatternEditor({ patternsByTrackId: { bass, kick }, onChange }),
    );

    act(() => {
      result.current.toggleStep('bass', 5);
    });

    await waitFor(() => {
      expect(updatePatternRequestMock).toHaveBeenCalledTimes(1);
    });
    const [trackId, patternId, input] = updatePatternRequestMock.mock.calls[0];
    expect(trackId).toBe('bass');
    expect(patternId).toBe('bass-pat');
    expect(input.steps[5].active).toBe(true);
  });

  it('revierte al Pattern anterior y muestra un toast de error si el PATCH falla', async () => {
    const { ApiRequestError } = await import('@/lib/api/httpError');
    const bass = buildPattern({ id: 'bass-pat', trackId: 'bass' });
    updatePatternRequestMock.mockRejectedValueOnce(new ApiRequestError('No encontrado', 404));
    const onChange = vi.fn();

    const { result } = renderHook(() =>
      usePatternEditor({ patternsByTrackId: { bass }, onChange }),
    );

    act(() => {
      result.current.toggleStep('bass', 3);
    });

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledTimes(2);
    });
    const [revertTrackId, revertedPattern] = onChange.mock.calls[1] as [string, Pattern];
    expect(revertTrackId).toBe('bass');
    expect(revertedPattern).toBe(bass);
    expect(toastError).toHaveBeenCalledWith('No encontrado');
  });
});
