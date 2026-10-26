import { env } from '@/config/env';
import { createHttpApi } from './adapters/httpApi';
import { createMockApi } from './adapters/mockApi';
import { createHttpClient } from './http/httpClient';
import { reportError } from './errorReporter';
import { describeError } from './errorMessages';
import { enqueueSync } from './syncQueue';
import type { Api } from './contracts';

/**
 * Point d'accès unique au backend. L'adaptateur est choisi par `VITE_API_MODE` :
 * - `mock` (défaut) : données de démonstration en mémoire (`@/mocks`) ;
 * - `http` : API REST à `VITE_API_BASE_URL` (voir `docs/API_CONTRACT.md`).
 *
 * La session passe par des cookies `HttpOnly` (`credentials: 'include'`) : ce
 * module n'injecte plus aucun jeton (décision D1).
 */

export const api: Api =
  env.apiMode === 'http'
    ? createHttpApi(
        createHttpClient({
          baseUrl: env.apiBaseUrl,
          timeoutMs: env.requestTimeoutMs,
        })
      )
    : createMockApi({ latencyMs: env.mockLatencyMs, persist: typeof localStorage !== 'undefined' });

/**
 * Propage une mutation déjà appliquée localement (mise à jour optimiste) vers le
 * backend.
 *
 * Un échec **rejouable** (réseau, timeout, 5xx, 429) est signalé à l'utilisateur
 * **et** placé dans la file de synchronisation (`syncQueue`) : rien n'est perdu
 * silencieusement, et l'utilisateur peut relancer l'envoi. Un refus métier
 * (422, 403…) n'est pas rejoué : il faut corriger la donnée.
 * En mode `mock`, les stores persistés localement font foi : rien n'est envoyé.
 */
export function syncRemote<T>(task: (client: Api) => Promise<T>, label: string): void {
  if (api.mode !== 'http') return;
  task(api).catch((error: unknown) => {
    const described = describeError(error);
    reportError(`${label} — ${described.message}`);
    if (described.retryable) {
      enqueueSync({ label, run: task as (client: Api) => Promise<unknown> });
    }
  });
}

export type { Api } from './contracts';
export { reportError, setErrorReporter, type ErrorReporter } from './errorReporter';
export { ApiError, isApiError } from './http/ApiError';
export { ENDPOINTS } from './endpoints';
export { describeError, errorText, type UserError } from './errorMessages';
export {
  clearSyncQueue,
  enqueueSync,
  flushSyncQueue,
  getPendingSyncs,
  subscribePendingSyncs,
  type PendingSync,
} from './syncQueue';
export { getActiveOrganization, setActiveOrganization } from './tenant';
