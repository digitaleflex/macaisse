import { ApiError } from './ApiError';

/**
 * Client HTTP minimal (fetch) : JSON, délai d'abandon, jeton d'authentification
 * optionnel et normalisation des erreurs en `ApiError`. Aucune dépendance externe.
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface HttpClientOptions {
  baseUrl: string;
  timeoutMs: number;
  /** Fournit le jeton Bearer courant (ou `null`). */
  getToken?: () => string | null;
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

export function createHttpClient(options: HttpClientOptions): HttpClient {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);

  async function request<T>(method: HttpMethod, path: string, opts: RequestOptions = {}): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs);
    opts.signal?.addEventListener('abort', () => controller.abort());

    const headers: Record<string, string> = { Accept: 'application/json' };
    if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
    const token = options.getToken?.();
    if (token) headers.Authorization = `Bearer ${token}`;

    try {
      const response = await fetchImpl(buildUrl(options.baseUrl, path, opts.query), {
        method,
        headers,
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
        signal: controller.signal,
      });
      const body = await readBody(response);
      if (!response.ok) {
        throw new ApiError(
          errorMessage(body, `Le serveur a répondu ${response.status}.`),
          response.status,
          `HTTP_${response.status}`,
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

  return {
    request,
    get: (path, opts) => request('GET', path, opts),
    post: (path, body) => request('POST', path, { body }),
    patch: (path, body) => request('PATCH', path, { body }),
    delete: (path) => request('DELETE', path),
  };
}
