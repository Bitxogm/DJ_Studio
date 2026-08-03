import { toast } from 'sonner';

import { ApiRequestError } from '@/lib/api/httpError';

interface OptimisticUpdateOptions<T> {
  /** Aplica el cambio localmente, antes de que responda el servidor. */
  apply: () => void;
  /** Deshace `apply()` si la petición falla. */
  revert: () => void;
  /** La petición real (normalmente un PATCH). */
  request: () => Promise<T>;
}

// Patrón reutilizable de actualización optimista: aplica el cambio de
// inmediato en la UI, lanza la petición, y si falla revierte + muestra un
// toast de error. Extraído aquí (no era necesario hasta ahora: mute/solo del
// mixer, por ejemplo, esperan la respuesta antes de actualizar la UI) para
// que la edición de steps del secuenciador lo use, y cualquier mutación
// futura que quiera feedback instantáneo pueda reutilizarlo sin duplicar el
// apply/revert/toast a mano.
export async function runOptimisticUpdate<T>({
  apply,
  revert,
  request,
}: OptimisticUpdateOptions<T>): Promise<T | undefined> {
  apply();
  try {
    return await request();
  } catch (error) {
    revert();
    toast.error(
      error instanceof ApiRequestError ? error.message : 'No se pudo conectar con el servidor',
    );
    return undefined;
  }
}
