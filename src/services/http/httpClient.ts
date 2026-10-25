import { ApiError } from './ApiError';

/**
 * Client HTTP minimal (fetch) : JSON, délai d'abandon, **session par cookie**,
 * jeton CSRF sur les mutations et rafraîchissement automatique (une tentative).
 *
 * Aucun jeton n'est conservé en JavaScript : la session vit dans des cookies
 * `HttpOnly` posés par le serveur (`mc_session` 15 min, `mc_refresh` rotatif).
 * Voir `docs/AUTH_DECISIONS.md` — décision D1 et règles RG-A10/RG-A11.
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** Chemin de rafraîchissement, aligné sur `ENDPOINTS.refresh`. */
const REFRESH_PATH = '/auth/refresh';

/**
 * Points d'entrée d'authentification : un `401` y est une réponse métier
 * (identifiants ou code invalides), jamais un signal de « session à renouveler ».
 * Rejouer ces routes après un refresh masquerait un vrai refus.
 */
const AUTH_ENTRY_PREFIXES = ['/auth/login', '/auth/signup', '/auth/otp', '/auth/oauth', '/auth/password', '/auth/pin'];

export interface HttpClientOptions {
  baseUrl: string;
  timeoutMs: number;
  /** Jeton CSRF des mutations (cookie lisible `mc_csrf` par défaut). */
  getCsrfToken?: () => string | null;
  fetchImpl?: typeof fetch;
}

export interface RequestOptions {
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  signal?: AbortSignal;
}

export interface HttpClient {
  request<T>(method: HttpMethod, path: string, options?: RequestOptions): Promise<T>;
  get<T>(path: string, options?: RequestOptions): Promise<T>;
  post<T>(path: string, body?: unknown): Promise<T>;
  patch<T>(path: string, body?: unknown): Promise<T>;
  delete<T>(path: string): Promise<T>;
  /** Renouvelle la session via le cookie refresh. `false` = session refusée. */
  refresh(): Promise<boolean>;
}

/** Cookie lisible côté client (le CSRF n'est pas `HttpOnly`, par construction). */
function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1] ?? '') : null;
}

function buildUrl(baseUrl: string, path: string, query?: RequestOptions['query']): string {
  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

async function readBody(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;
  const type = response.headers.get('content-type') ?? '';
  if (type.includes('application/json')) return response.json();
  const text = await response.text();
  return text.length > 0 ? text : undefined;
}

function errorMessage(body: unknown, fallback: string): string {
  if (typeof body === 'object' && body !== null && 'message' in body) {
    const message = (body as { message: unknown }).message;
    if (typeof message === 'string' && message.length > 0) return message;
  }
  return fallback;
}

/** Le serveur fournit un `code` métier ; à défaut on retombe sur le statut. */
function errorCode(body: unknown, status: number): string {
  if (typeof body === 'object' && body !== null && 'code' in body) {
    const code = (body as { code: unknown }).code;
    if (typeof code === 'string' && code.length > 0) return code;
  }
  return `HTTP_${status}`;
}

export function createHttpClient(options: HttpClientOptions): HttpClient {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
  const getCsrfToken = options.getCsrfToken ?? (() => readCookie('mc_csrf'));
  let refreshing: Promise<boolean> | null = null;

  async function send<T>(method: HttpMethod, path: string, opts: RequestOptions = {}): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs);
    opts.signal?.addEventListener('abort', () => controller.abort());

    const headers: Record<string, string> = { Accept: 'application/json' };
    if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
    // Double-submit : le cookie `mc_csrf` doit revenir dans l'en-tête (RG-A10).
    if (method !== 'GET') {
      const csrf = getCsrfToken();
      if (csrf) headers['X-CSRF-Token'] = csrf;
    }

    try {
      const response = await fetchImpl(buildUrl(options.baseUrl, path, opts.query), {
        method,
        headers,
        credentials: 'include',
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
        signal: controller.signal,
      });
      const body = await readBody(response);
      if (!response.ok) {
        throw new ApiError(
          errorMessage(body, `Le serveur a répondu ${response.status}.`),
          response.status,
          errorCode(body, response.status),
          body
        );
      }
      return body as T;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new ApiError('Le serveur ne répond pas (délai dépassé).', 0, 'TIMEOUT');
      }
      throw new ApiError('Connexion au serveur impossible.', 0, 'NETWORK', error);
    } finally {
      clearTimeout(timer);
    }
  }

  async function refresh(): Promise<boolean> {
    if (!refreshing) {
      refreshing = send<void>('POST', REFRESH_PATH, {})
        .then(() => true)
        .catch(() => false)
        .finally(() => {
          refreshing = null;
        });
    }
    return refreshing;
  }

  async function request<T>(method: HttpMethod, path: string, opts: RequestOptions = {}): Promise<T> {
    try {
      return await send<T>(method, path, opts);
    } catch (error) {
      const renewable = error instanceof ApiError && error.status === 401;
      const isEntryPoint = AUTH_ENTRY_PREFIXES.some((prefix) => path.startsWith(prefix));
      if (!renewable || isEntryPoint) throw error;
      if (!(await refresh())) throw error;
      // Un seul rejeu : si le serveur refuse encore, la session est réellement close.
      return send<T>(method, path, opts);
    }
  }

  return {
    request,
    get: (path, opts) => request('GET', path, opts),
    post: (path, body) => request('POST', path, { body }),
    patch: (path, body) => request('PATCH', path, { body }),
    delete: (path) => request('DELETE', path),
    refresh,
  };
}
