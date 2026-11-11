import { beforeEach, describe, expect, it } from 'vitest';
// eslint-disable-next-line no-restricted-imports
import { subscribeToast, type Toast } from '@/ui/toastBus';
import { selectIsOnline, useUiStore } from '../useUiStore';

beforeEach(() => {
  useUiStore.setState({ tab: 'accueil', modal: null, isOnline: true });
});

describe('useUiStore — navigation et modales', () => {
  it('change d’onglet', () => {
    useUiStore.getState().setTab('bilan');
    expect(useUiStore.getState().tab).toBe('bilan');
  });

  it('ouvre, bascule et ferme les modales', () => {
    useUiStore.getState().openModal('depenses');
    expect(useUiStore.getState().modal).toBe('depenses');

    useUiStore.getState().toggleModal('depenses');
    expect(useUiStore.getState().modal).toBeNull();

    useUiStore.getState().toggleModal('profil');
    expect(useUiStore.getState().modal).toBe('profil');

    useUiStore.getState().closeModal();
    expect(useUiStore.getState().modal).toBeNull();
  });
});

describe('useUiStore — toast', () => {
  it('showToast publie sur le bus et non dans le store', () => {
    const seen: Array<Toast | null> = [];
    const unsubscribe = subscribeToast((toast) => seen.push(toast));

    useUiStore.getState().showToast('Vente validée', 'success');

    expect(seen.at(-1)).toMatchObject({ message: 'Vente validée', tone: 'success' });
    unsubscribe();
  });

  it('showToast utilise le ton info par défaut', () => {
    const seen: Array<Toast | null> = [];
    const unsubscribe = subscribeToast((toast) => seen.push(toast));

    useUiStore.getState().showToast('Panier vidé.');

    expect(seen.at(-1)).toMatchObject({ message: 'Panier vidé.', tone: 'info' });
    unsubscribe();
  });
});

describe('useUiStore — état réseau', () => {
  it('setOnline met à jour l’état réel', () => {
    useUiStore.getState().setOnline(false);
    expect(useUiStore.getState().isOnline).toBe(false);
    expect(selectIsOnline(useUiStore.getState())).toBe(false);
  });

  it('initOnlineListener synchronise et nettoie les écouteurs', () => {
    useUiStore.getState().setOnline(false);
    const cleanup = useUiStore.getState().initOnlineListener();

    // jsdom annonce navigator.onLine === true.
    expect(useUiStore.getState().isOnline).toBe(true);

    useUiStore.getState().setOnline(false);
    window.dispatchEvent(new Event('online'));
    expect(useUiStore.getState().isOnline).toBe(true);

    cleanup();
    useUiStore.getState().setOnline(false);
    window.dispatchEvent(new Event('online'));
    expect(useUiStore.getState().isOnline).toBe(false);
  });
});

describe('useUiStore — historique des ventes', () => {
  it('ouvre l’historique dans l’onglet Caisse', () => {
    useUiStore.setState({ tab: 'accueil', salesView: 'pos' });
    useUiStore.getState().openSalesHistory();
    expect(useUiStore.getState()).toMatchObject({ tab: 'ventes', salesView: 'history' });
  });

  it('ne persiste pas le volet courant', () => {
    useUiStore.getState().setSalesView('history');
    const saved = JSON.parse(localStorage.getItem('ma-caisse/ui') ?? '{}') as { state?: Record<string, unknown> };
    expect(saved.state ?? {}).not.toHaveProperty('salesView');
  });
});
