import { beforeEach, describe, expect, it } from 'vitest';
import { DEMO_PASSWORD } from '@/mocks';
import { api } from '@/services';
import { setActiveOrganization, setAuthToken } from '@/services/tenant';
import { useTeamStore } from '../useTeamStore';

const ORG = 'org-etoile';

async function connectAsOwner(): Promise<void> {
  const result = await api.auth.login({
    email: 'mamadou@boutique-etoile.sn',
    password: DEMO_PASSWORD,
  });
  setAuthToken(result.token);
  setActiveOrganization(ORG);
}

describe('useTeamStore', () => {
  beforeEach(async () => {
    setAuthToken(null);
    setActiveOrganization(null);
    useTeamStore.getState().reset();
    await connectAsOwner();
  });

  it('charge les membres de l’organisation active', async () => {
    await useTeamStore.getState().load(ORG);

    const { members, status } = useTeamStore.getState();
    expect(status).toBe('ready');
    expect(members.map((member) => member.email)).toContain('mamadou@boutique-etoile.sn');
  });

  it('ajoute un invité sans recharger la liste', async () => {
    await useTeamStore.getState().load(ORG);
    const before = useTeamStore.getState().members.length;

    const member = await useTeamStore.getState().invite(ORG, {
      firstName: 'Awa',
      lastName: 'Test',
      email: 'awa.test@example.com',
      role: 'cashier',
    });

    const { members } = useTeamStore.getState();
    expect(members).toHaveLength(before + 1);
    expect(member.status).toBe('invited');
    expect(members.at(-1)?.email).toBe('awa.test@example.com');
  });

  it('met à jour le rôle d’un membre', async () => {
    await useTeamStore.getState().load(ORG);
    // Le singleton `api` garde son état entre tests : on cible n'importe quel
    // membre actif non propriétaire plutôt qu'un rôle figé.
    const target = useTeamStore
      .getState()
      .members.find((member) => member.role !== 'owner' && member.status === 'active');
    expect(target).toBeDefined();

    await useTeamStore.getState().updateRole(ORG, target!.userId, 'manager');

    const updated = useTeamStore.getState().members.find((m) => m.userId === target!.userId);
    expect(updated?.role).toBe('manager');
  });

  it('retire un membre', async () => {
    await useTeamStore.getState().load(ORG);
    const target = useTeamStore
      .getState()
      .members.find((member) => member.role !== 'owner' && member.status === 'active');

    await useTeamStore.getState().remove(ORG, target!.userId);

    const ids = useTeamStore.getState().members.map((member) => member.userId);
    expect(ids).not.toContain(target!.userId);
  });

  it('expose une erreur sans jeter quand l’organisation est inconnue', async () => {
    await useTeamStore.getState().load('org-inconnue');

    const { status, error, members } = useTeamStore.getState();
    expect(status).toBe('error');
    expect(error).not.toBeNull();
    expect(members).toHaveLength(0);
  });

  it('se vide au changement d’organisation', async () => {
    await useTeamStore.getState().load(ORG);
    expect(useTeamStore.getState().members.length).toBeGreaterThan(0);

    useTeamStore.getState().reset();
    expect(useTeamStore.getState().members).toHaveLength(0);
    expect(useTeamStore.getState().status).toBe('idle');
  });
});
