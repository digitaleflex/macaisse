import { beforeEach, describe, expect, it } from 'vitest';
import { DEMO_PASSWORD } from '@/mocks';
import { createMockApi } from '../adapters/mockApi';
import type { Api } from '../contracts';
import { setActiveOrganization, setAuthToken } from '../tenant';

/**
 * Cycle de vie des invitations (issue #20).
 *
 * Règle métier : une appartenance `invited` ne donne AUCUN accès tant qu'elle
 * n'a pas été acceptée explicitement, et la connexion n'active pas en masse les
 * invitations de l'utilisateur.
 */

const BAOBAB = 'org-baobab';

async function loginAs(api: Api, email: string): Promise<void> {
  const result = await api.auth.login({ email, password: DEMO_PASSWORD });
  setAuthToken(result.token);
  setActiveOrganization(null);
}

describe('invitations — accès refusé tant qu’elles ne sont pas acceptées', () => {
  let api: Api;

  beforeEach(() => {
    setAuthToken(null);
    setActiveOrganization(null);
    api = createMockApi();
  });

  async function inviteAwaToBaobab(): Promise<void> {
    await loginAs(api, 'koffi@superette-baobab.ci');
    await api.team.invite(BAOBAB, {
      firstName: 'Awa',
      lastName: 'Ndiaye',
      email: 'awa@boutique-etoile.sn',
      role: 'cashier',
    });
  }

  it('expose l’invitation en attente au destinataire, hors de ses appartenances', async () => {
    await inviteAwaToBaobab();
    await loginAs(api, 'awa@boutique-etoile.sn');

    const { memberships } = await api.auth.me();
    expect(memberships.map((membership) => membership.organizationId)).not.toContain(BAOBAB);

    const invitations = await api.auth.invitations();
    expect(invitations.map((invitation) => invitation.organizationId)).toContain(BAOBAB);
  });

  it('refuse l’accès aux données d’une organisation seulement invitée', async () => {
    await inviteAwaToBaobab();
    await loginAs(api, 'awa@boutique-etoile.sn');
    setActiveOrganization(BAOBAB);

    await expect(api.products.list()).rejects.toMatchObject({ status: 403 });
    await expect(api.session.get(BAOBAB)).rejects.toMatchObject({ status: 403 });
  });

  it('n’active pas les invitations à la connexion', async () => {
    await inviteAwaToBaobab();
    await loginAs(api, 'awa@boutique-etoile.sn');
    await loginAs(api, 'awa@boutique-etoile.sn');

    const invitations = await api.auth.invitations();
    expect(invitations).toHaveLength(1);

    setActiveOrganization(BAOBAB);
    await expect(api.products.list()).rejects.toMatchObject({ status: 403 });
  });

  it('ouvre l’accès après acceptation explicite', async () => {
    await inviteAwaToBaobab();
    await loginAs(api, 'awa@boutique-etoile.sn');

    const accepted = await api.auth.acceptInvitation(BAOBAB);
    setAuthToken(accepted.token);
    expect(accepted.memberships.map((membership) => membership.organizationId)).toContain(BAOBAB);

    setActiveOrganization(BAOBAB);
    await expect(api.products.list()).resolves.toBeInstanceOf(Array);
    expect(await api.auth.invitations()).toHaveLength(0);
  });

  it('refuse d’accepter une invitation inexistante', async () => {
    await loginAs(api, 'awa@boutique-etoile.sn');
    await expect(api.auth.acceptInvitation(BAOBAB)).rejects.toMatchObject({ status: 404 });
  });
});
