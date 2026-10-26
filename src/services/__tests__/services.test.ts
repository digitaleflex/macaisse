import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readEnv } from '@/config/env';
import { createMockApi } from '../adapters/mockApi';
import { createHttpApi } from '../adapters/httpApi';
import { createHttpClient } from '../http/httpClient';
import { ApiError } from '../http/ApiError';
import { ENDPOINTS } from '../endpoints';
import { setActiveOrganization } from '../tenant';
import { DEMO_PASSWORD } from '@/mocks';
import { t } from '@/content';

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
    setActiveOrganization(null);
  });

  async function loginAs(api: ReturnType<typeof createMockApi>, email: string) {
    return api.auth.login({ email, password: DEMO_PASSWORD });
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

  it('réserve la gestion de l’équipe au propriétaire et exige une acceptation explicite', async () => {
    const api = createMockApi();
    await loginAs(api, 'awa@boutique-etoile.sn');
    await expect(
      api.team.invite('org-etoile', { firstName: 'Ibou', lastName: 'Sarr', email: 'ibou@test.sn', role: 'cashier' })
    ).rejects.toMatchObject({ status: 403 });

    await loginAs(api, 'mamadou@boutique-etoile.sn');
    const invited = await api.team.invite('org-etoile', { firstName: 'Ibou', lastName: 'Sarr', email: 'ibou@test.sn', role: 'cashier' });
    expect(invited.status).toBe('invited');

    // La connexion n'active plus l'invitation : l'accès reste fermé.
    const ibou = await loginAs(api, 'ibou@test.sn');
    expect(ibou.memberships).toEqual([]);
    setActiveOrganization('org-etoile');
    await expect(api.products.list()).rejects.toMatchObject({ status: 403 });

    // L'acceptation est un acte explicite.
    const accepted = await api.auth.acceptInvitation('org-etoile');
    expect(accepted.memberships).toEqual([
      expect.objectContaining({ organizationId: 'org-etoile', role: 'cashier' }),
    ]);
    setActiveOrganization('org-etoile');
    expect(await api.products.list()).toBeInstanceOf(Array);
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
    const [membership] = result.memberships;
    expect(membership.role).toBe('owner');
    setActiveOrganization(membership.organizationId);
    expect(await api.products.list()).toEqual([]);
  });

  it('ouvre un espace « Mon commerce » au premier sign-in Google', async () => {
    const api = createMockApi();
    const first = await api.auth.googleSignIn({
      email: 'awa.ndiaye@gmail.com',
      firstName: 'Awa',
      lastName: 'Ndiaye',
    });

    expect(first.memberships).toHaveLength(1);
    expect(first.memberships[0]).toMatchObject({
      organizationName: t.auth.googleDefaultOrg,
      role: 'owner',
    });
    // RG-A03 : compte Google sans téléphone vérifié — la vente reste bloquée (D2).
    expect(first.user.phone).toBe('');

    // Un second passage reprend le même compte, sans doublon (RG-A02).
    const second = await api.auth.googleSignIn({
      email: 'AWA.NDIAYE@GMAIL.COM',
      firstName: 'Awa',
      lastName: 'Ndiaye',
    });
    expect(second.user.id).toBe(first.user.id);
    expect(second.memberships).toHaveLength(1);
  });

  it('refuse une connexion par mot de passe sur un compte créé par Google', async () => {
    const api = createMockApi();
    const google = await api.auth.googleSignIn({
      email: 'awa.ndiaye@gmail.com',
      firstName: 'Awa',
      lastName: 'Ndiaye',
    });
    // Google fournit une adresse déjà vérifiée (RG-A02).
    expect(google.user.emailVerified).toBe(true);
    await expect(api.auth.login({ email: google.user.email, password: '' })).rejects.toMatchObject({
      status: 401,
    });
  });

  it('vérifie l’adresse e-mail par code à usage unique (RG-A27)', async () => {
    const api = createMockApi();
    const signup = await api.auth.signup({
      firstName: '',
      lastName: '',
      email: 'aicha@test.sn',
      phone: '',
      password: 'motdepasse-solide-2026',
      organizationName: '',
      activity: '',
      city: '',
    });
    expect(signup.user.emailVerified).toBe(false);
    expect(signup.user.emailVerificationDueAt).not.toBeNull();

    // Sans code demandé, rien ne peut être validé.
    await expect(api.auth.verifyEmail({ code: '123456' })).rejects.toMatchObject({ status: 400 });

    const challenge = await api.auth.requestEmailVerification();
    expect(challenge.expiresIn).toBe(600);
    await expect(api.auth.verifyEmail({ code: '123456' })).rejects.toMatchObject({ status: 401 });

    const verified = await api.auth.verifyEmail({ code: '000000' });
    expect(verified.user.emailVerified).toBe(true);
    expect(verified.user.emailVerificationDueAt).toBeNull();
  });

  it('clôt l’onboarding en enregistrant les informations du commerce (RG-A04)', async () => {
    const api = createMockApi();
    const signup = await api.auth.signup({
      firstName: '',
      lastName: '',
      email: 'aicha@test.sn',
      phone: '',
      password: 'motdepasse-solide-2026',
      organizationName: '',
      activity: '',
      city: '',
    });
    const orgId = signup.memberships[0]?.organizationId ?? '';
    // Espace neuf : onboarding à faire, nom par défaut.
    const before = await api.session.get(orgId);
    expect(before.business.name).toBe(t.auth.googleDefaultOrg);
    expect(before.business.onboardedAt).toBeNull();

    const business = await api.onboarding.complete(orgId, {
      name: 'Boutique Aïcha',
      city: 'Thiès',
      phone: '+221 77 123 45 67',
      activity: 'Cosmétiques',
    });
    expect(business).toMatchObject({ name: 'Boutique Aïcha', city: 'Thiès', activity: 'Cosmétiques' });
    expect(business.onboardedAt).not.toBeNull();

    const after = await api.session.get(orgId);
    expect(after.business.name).toBe('Boutique Aïcha');
  });

  it('connecte ou crée le compte par code téléphone (D2)', async () => {
    const api = createMockApi();
    const challenge = await api.auth.requestPhoneCode('77 123 45 67');
    expect(challenge.channel).toBe('whatsapp_user');
    expect(challenge.expiresIn).toBe(300);

    const first = await api.auth.verifyPhoneCode({ challengeId: challenge.challengeId, code: '000000' });
    expect(first.user.phone).toBe('221771234567');
    expect(first.memberships).toHaveLength(1);

    // Même numéro écrit autrement : même compte, aucun doublon (RG-A01).
    const again = await api.auth.requestPhoneCode('+221 77 123 45 67');
    const second = await api.auth.verifyPhoneCode({ challengeId: again.challengeId, code: '000000' });
    expect(second.user.id).toBe(first.user.id);
    expect(second.memberships).toHaveLength(1);
  });

  it('verrouille le code après cinq erreurs (RG-A08)', async () => {
    const api = createMockApi();
    const { challengeId } = await api.auth.requestPhoneCode('770000000');

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(api.auth.verifyPhoneCode({ challengeId, code: '111111' })).rejects.toMatchObject({
        status: 401,
      });
    }
    // Même le bon code est refusé : le défi est verrouillé.
    await expect(api.auth.verifyPhoneCode({ challengeId, code: '000000' })).rejects.toMatchObject({
      status: 429,
    });
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

  it('appelle la bonne route avec le corps JSON et le jeton CSRF', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ id: 'p1', stock: 12 }));
    const http = createHttpClient({
      baseUrl: 'https://api.test',
      timeoutMs: 1000,
      getCsrfToken: () => 'csrf-abc',
      fetchImpl,
    });
    const api = createHttpApi(http);
    setActiveOrganization('org-1');

    await api.products.restock('p1', 2);

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://api.test/orgs/org-1/products/p1/restock');
    expect(url).toBe(`https://api.test${ENDPOINTS.productRestock('org-1', 'p1')}`);
    expect(init?.method).toBe('POST');
    expect(init?.body).toBe(JSON.stringify({ quantity: 2 }));
    expect((init?.headers as Record<string, string>)['X-CSRF-Token']).toBe('csrf-abc');
    // D1 : plus d'en-tête Authorization, la session passe par les cookies.
    expect((init?.headers as Record<string, string>).Authorization).toBeUndefined();
    expect(init?.credentials).toBe('include');
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
