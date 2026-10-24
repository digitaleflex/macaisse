import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readEnv } from '@/config/env';
import { createMockApi } from '../adapters/mockApi';
import { createHttpApi } from '../adapters/httpApi';
import { createHttpClient } from '../http/httpClient';
import { ApiError } from '../http/ApiError';
import { ENDPOINTS } from '../endpoints';
import { setActiveOrganization, setAuthToken } from '../tenant';
import { DEMO_PASSWORD } from '@/mocks';

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

describe('createMockApi — multi-organisation', () => {
  beforeEach(() => {
    setAuthToken(null);
    setActiveOrganization(null);
  });

  async function loginAs(api: ReturnType<typeof createMockApi>, email: string) {
    const result = await api.auth.login({ email, password: DEMO_PASSWORD });
    setAuthToken(result.token);
    return result;
  }

  it('refuse un mot de passe invalide', async () => {
    const api = createMockApi();
    await expect(api.auth.login({ email: 'mamadou@boutique-etoile.sn', password: 'faux' })).rejects.toMatchObject({ status: 401 });
  });

  it('renvoie les appartenances et le rôle par organisation', async () => {
    const api = createMockApi();
    const result = await loginAs(api, 'mamadou@boutique-etoile.sn');
    expect(result.memberships.map((m) => [m.organizationId, m.role])).toEqual([
      ['org-etoile', 'owner'],
      ['org-baobab', 'manager'],
    ]);
    const session = await api.session.get('org-baobab');
    expect(session.role).toBe('manager');
    expect(session.business.name).toBe('Supérette Le Baobab');
  });

  it('isole les données de chaque organisation', async () => {
    const api = createMockApi();
    await loginAs(api, 'mamadou@boutique-etoile.sn');
    setActiveOrganization('org-etoile');
    const etoile = await api.products.list();
    setActiveOrganization('org-baobab');
    const baobab = await api.products.list();
    expect(etoile.some((p) => baobab.some((q) => q.id === p.id))).toBe(false);
  });

  it('interdit l’accès à une organisation dont on n’est pas membre', async () => {
    const api = createMockApi();
    await loginAs(api, 'koffi@superette-baobab.ci');
    await expect(api.session.get('org-etoile')).rejects.toMatchObject({ status: 403 });
    setActiveOrganization('org-etoile');
    await expect(api.products.list()).rejects.toMatchObject({ status: 403 });
  });

  it('réserve la gestion de l’équipe au propriétaire et active les invitations à la connexion', async () => {
    const api = createMockApi();
    await loginAs(api, 'awa@boutique-etoile.sn');
    await expect(
      api.team.invite('org-etoile', { firstName: 'Ibou', lastName: 'Sarr', email: 'ibou@test.sn', role: 'cashier' })
    ).rejects.toMatchObject({ status: 403 });

    await loginAs(api, 'mamadou@boutique-etoile.sn');
    const invited = await api.team.invite('org-etoile', { firstName: 'Ibou', lastName: 'Sarr', email: 'ibou@test.sn', role: 'cashier' });
    expect(invited.status).toBe('invited');

    const ibou = await loginAs(api, 'ibou@test.sn');
    expect(ibou.memberships).toEqual([expect.objectContaining({ organizationId: 'org-etoile', role: 'cashier' })]);
  });

  it('crée une organisation vide à l’inscription', async () => {
    const api = createMockApi();
    const result = await api.auth.signup({
      firstName: 'Aïcha',
      lastName: 'Ba',
      email: 'aicha@test.sn',
      phone: '',
      password: 'motdepasse',
      organizationName: 'Boutique Aïcha',
      activity: 'Cosmétiques',
      city: 'Thiès',
    });
    setAuthToken(result.token);
    const [membership] = result.memberships;
    expect(membership.role).toBe('owner');
    setActiveOrganization(membership.organizationId);
    expect(await api.products.list()).toEqual([]);
  });

  it('rejette un identifiant inconnu par une ApiError 404', async () => {
    const api = createMockApi();
    await loginAs(api, 'mamadou@boutique-etoile.sn');
    setActiveOrganization('org-etoile');
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
    setActiveOrganization('org-1');

    await api.products.restock('p1', 2);

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://api.test/orgs/org-1/products/p1/restock');
    expect(url).toBe(`https://api.test${ENDPOINTS.productRestock('org-1', 'p1')}`);
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
