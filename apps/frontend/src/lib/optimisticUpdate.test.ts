import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiRequestError } from '@/lib/api/httpError';
import { runOptimisticUpdate } from './optimisticUpdate';

const toastError = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]): void => {
      toastError(...args);
    },
  },
}));

describe('runOptimisticUpdate', () => {
  beforeEach(() => {
    toastError.mockClear();
  });

  it('aplica el cambio antes de que la petición resuelva', async () => {
    const apply = vi.fn();
    const revert = vi.fn();
    let resolveRequest = () => {};
    const request = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveRequest = resolve;
        }),
    );

    const promise = runOptimisticUpdate({ apply, revert, request });

    expect(apply).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledTimes(1);

    resolveRequest();
    await promise;

    expect(revert).not.toHaveBeenCalled();
    expect(toastError).not.toHaveBeenCalled();
  });

  it('revierte y muestra el mensaje del error si la petición falla', async () => {
    const apply = vi.fn();
    const revert = vi.fn();
    const request = vi.fn().mockRejectedValue(new ApiRequestError('No encontrado', 404));

    await runOptimisticUpdate({ apply, revert, request });

    expect(revert).toHaveBeenCalledTimes(1);
    expect(toastError).toHaveBeenCalledWith('No encontrado');
  });

  it('usa un mensaje genérico si el error no es un ApiRequestError', async () => {
    const request = vi.fn().mockRejectedValue(new Error('boom'));

    await runOptimisticUpdate({ apply: vi.fn(), revert: vi.fn(), request });

    expect(toastError).toHaveBeenCalledWith('No se pudo conectar con el servidor');
  });
});
