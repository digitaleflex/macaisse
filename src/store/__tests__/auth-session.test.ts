import { beforeEach, describe, expect, it } from 'vitest';
import { DEMO_PASSWORD } from '@/mocks';
import { login, logout, reloadOrganization, switchOrganization } from '../auth';
import { useAuthStore } from '../useAuthStore';
import { useCartStore } from '../useCartStore';
import { useSessionStore } from '../useSessionStore';

/**
 * Orchestration de session (issues #10 et #11) : un échec doit être signalé à
 * l'appelant, et la déconnexion ne doit rien laisser derrière elle.
 */
describe('session — bascule d’organisation', () => {
  beforeEach(async () => {
    localStorage.clear();
    useCartStore.setState({ lines: [] });
    await logout();
    await login({ email: 'mamadou@boutique-etoile.sn', password: DEMO_PASSWORD });
  });

  it('renvoie true quand la bascule réussit', async () => {
    await expect(switchOrganization('org-baobab')).resolves.toBe(true);
    expect(useSessionStore.getState().session?.business.name).toBe('Supérette Le Baobab');
  });

  it('renvoie false et expose l’erreur quand la bascule échoue', async () => {
    await expect(switchOrganization('org-inconnue')).resolves.toBe(false);
    expect(useSessionStore.getState().status).toBe('error');
  });

  it('renvoie true sur une demande de rechargement valide', async () => {
    await expect(reloadOrganization()).resolves.toBe(true);
  });

  it('renvoie false si aucune organisation n’est ouverte', async () => {
    await logout();
    await expect(reloadOrganization()).resolves.toBe(false);
  });
});

describe('session — déconnexion', () => {
  it('vide le panier et le contexte d’authentification', async () => {
    await login({ email: 'mamadou@boutique-etoile.sn', password: DEMO_PASSWORD });
    useCartStore.setState({
      lines: [{ productId: 'p1', name: 'Lait', price: 1000, quantity: 2, unit: 'brique' }],
    });

    await logout();

    expect(useCartStore.getState().lines).toHaveLength(0);
    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().memberships).toHaveLength(0);
  });
});
