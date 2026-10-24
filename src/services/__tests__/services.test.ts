import { describe, expect, it, vi } from 'vitest';
import { readEnv } from '@/config/env';
import { createMockApi } from '../adapters/mockApi';
import { createHttpApi } from '../adapters/httpApi';
import { createHttpClient } from '../http/httpClient';
import { ApiError } from '../http/ApiError';
import { ENDPOINTS } from '../endpoints';

describe('readEnv', () => {
  it('utilise le mode mock par défaut', () => {
    const env = readEnv({});
    expect(env.apiMode).toBe('mock');
    expect(env.apiBaseUrl).toBe('/api');
  });

  it('lit le mode http et normalise l’URL de base', () => {
    const env = readEnv({ VITE_API_MODE: 'http', VITE_API_BASE_URL: 'https://api.test/v1/', VITE_API_TIMEOUT_MS: '5000' });
    expect(env).toMatchObject({ apiMode: 'http', apiBaseUrl: 'https://api.test/v1', requestTimeoutMs: 5000 });
  });
});

describe('createMockApi', () => {
  it('sert la session et les collections de démonstration', async () => {
    const api = createMockApi(0);
    const session = await api.session.get();
    expect(session.business.name.length).toBeGreaterThan(0);
    expect((await api.products.list()).length).toBeGreaterThan(0);
  });

  it('applique les mutations en mémoire sans fuiter de références', async () => {
    const api = createMockApi(0);
    const [first] = await api.products.list();
    const restocked = await api.products.restock(first.id, 5);
    expect(restocked.stock).toBe(first.stock + 5);
    restocked.stock = 0;
    const [again] = await api.products.list();
    expect(again.stock).toBe(first.stock + 5);
  });

  it('rejette un identifiant inconnu par une ApiError 404', async () => {
    const api = createMockApi(0);
    await expect(api.credits.pay('inconnu', 100)).rejects.toMatchObject({ status: 404 });
  });
});

describe('createHttpClient / createHttpApi', () => {
  const jsonResponse = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

  it('appelle la bonne route avec le jeton et le corps JSON', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ id: 'p1', stock: 12 }));
    const http = createHttpClient({ baseUrl: 'https://api.test', timeoutMs: 1000, getToken: () => 'abc', fetchImpl });
    const api = createHttpApi(http);

    await api.products.restock('p1', 2);

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe(`https://api.test${ENDPOINTS.productRestock('p1')}`);
    expect(init?.method).toBe('POST');
    expect(init?.body).toBe(JSON.stringify({ quantity: 2 }));
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer abc');
  });

  it('convertit une réponse en erreur en ApiError avec le message serveur', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ message: 'Stock insuffisant' }, 422));
    const http = createHttpClient({ baseUrl: '', timeoutMs: 1000, fetchImpl });
    const error = await http.get('/products').catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 422, message: 'Stock insuffisant' });
  });

  it('signale une panne réseau', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('Failed to fetch'));
    const http = createHttpClient({ baseUrl: '', timeoutMs: 1000, fetchImpl });
    await expect(http.get('/session')).rejects.toMatchObject({ code: 'NETWORK' });
  });
});
