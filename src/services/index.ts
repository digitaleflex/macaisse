import { env } from '@/config/env';
import { createHttpApi } from './adapters/httpApi';
import { createMockApi } from './adapters/mockApi';
import { createHttpClient } from './http/httpClient';
import { isApiError } from './http/ApiError';
import { reportError } from './errorReporter';
import type { Api } from './contracts';
import { getAuthToken } from './tenant';

/**
 * Point d'accès unique au backend. L'adaptateur est choisi par `VITE_API_MODE` :
 * - `mock` (défaut) : données de démonstration en mémoire (`@/mocks`) ;
 * - `http` : API REST à `VITE_API_BASE_URL` (voir `docs/API_CONTRACT.md`).
 */

export const api: Api =
  env.apiMode === 'http'
    ? createHttpApi(
        createHttpClient({
          baseUrl: env.apiBaseUrl,
          timeoutMs: env.requestTimeoutMs,
          getToken: getAuthToken,
        })
      )
    : createMockApi({ latencyMs: env.mockLatencyMs, persist: typeof localStorage !== 'undefined' });

/**
 * Propage une mutation déjà appliquée localement (mise à jour optimiste) vers le
 * backend. Un échec n'annule pas l'état local : il est signalé par un toast.
 * En mode `mock`, les stores persistés localement font foi : rien n'est envoyé.
 */
export function syncRemote<T>(task: (client: Api) => Promise<T>, failureMessage: string): void {
  if (api.mode !== 'http') return;
  task(api).catch((error: unknown) => {
    const detail = isApiError(error) ? ` ${error.message}` : '';
    reportError(`${failureMessage}${detail}`);
  });
}

export type { Api } from './contracts';
export { reportError, setErrorReporter, type ErrorReporter } from './errorReporter';
export { ApiError, isApiError } from './http/ApiError';
export { ENDPOINTS } from './endpoints';
export {
  getActiveOrganization,
  getAuthToken,
  setActiveOrganization,
  setAuthToken,
} from './tenant';
