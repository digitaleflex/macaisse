import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import type { SaleTransaction, TabType } from '@/types';
import App from '@/app/App';
import { t } from '@/content';
import { personDisplayName } from '@/domain/users';
import { DEMO_PASSWORD } from '@/mocks';
import { login, logout, switchOrganization } from '@/store/auth';
import { useSessionStore } from '@/store/useSessionStore';
import { useUiStore } from '@/store/useUiStore';

/**
 * Smoke test de rendu — garde-fou contre les boucles `useSyncExternalStore`
 * (zustand v5), et vérification du parcours multi-organisation.
 */

const SALE: SaleTransaction = {
  id: 'sale-smoke',
  saleNumber: '#V-999',
  time: '10:00',
  date: '2026-10-18',
  paymentMethod: 'Espèces',
  amount: 2500,
  status: 'Validé',
  itemsCount: 2,
};

const TAB_MARKERS: { tab: TabType; text: string }[] = [
  { tab: 'accueil', text: t.dashboard.greeting(personDisplayName('Mamadou', 'Konaté')) },
  { tab: 'ventes', text: t.pos.catalogTitle },
  { tab: 'stock', text: t.stock.audit.title },
  { tab: 'credits', text: t.credits.listTitle },
  { tab: 'bilan', text: t.bilan.exports.title },
];

describe('App — smoke de rendu', () => {
  let consoleError: ReturnType<typeof vi.spyOn>;

  // Les vues sont découpées (React.lazy) : on précharge leurs chunks pour que la
  // résolution soit synchrone au rendu, sinon chaque assertion attend le réseau.
  beforeAll(async () => {
    await Promise.all([
      import('@/features/accueil'),
      import('@/features/ventes'),
      import('@/features/stock'),
      import('@/features/credits'),
      import('@/features/bilan'),
    ]);
  });

  beforeEach(async () => {
    localStorage.clear();
    useUiStore.setState({ tab: 'accueil', modal: null, receipt: null });
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await act(async () => {
      await logout();
    });
  });

  afterEach(() => {
    cleanup();
    consoleError.mockRestore();
  });

  it('affiche l’écran de connexion sans session', () => {
    render(<App />);
    // Par défaut, la connexion par téléphone (OTP WhatsApp, D2) est masquée :
    // seuls e-mail/mot de passe et Google sont proposés (VITE_AUTH_PHONE=on la réactive).
    expect(screen.getAllByText(t.auth.loginTitle).length).toBeGreaterThan(0);
  });

  it('monte les 5 onglets du propriétaire et ouvre/ferme le reçu sans boucle de rendu', async () => {
    await act(async () => {
      await login({ email: 'mamadou@boutique-etoile.sn', password: DEMO_PASSWORD });
    });
    useUiStore.setState({ tab: 'accueil' });
    await act(async () => {
      render(<App />);
    });

    for (const { tab, text } of TAB_MARKERS) {
      // Les vues sont découpées : on laisse React résoudre la promesse du chunk
      // dans une mise à jour `act` avant d'interroger le DOM.
      await act(async () => {
        useUiStore.getState().setTab(tab);
      });
      expect(screen.getAllByText(text).length).toBeGreaterThan(0);
    }

    act(() => {
      useUiStore.getState().openReceipt(SALE, []);
    });
    expect(screen.getByText(t.receipt.title)).toBeTruthy();
    act(() => {
      useUiStore.getState().closeReceipt();
    });
    expect(screen.queryByText(t.receipt.title)).toBeNull();

    const errors = (consoleError.mock.calls as unknown[][]).map((call) => call.map(String).join(' ')).join('\n');
    expect(errors).not.toMatch(/Maximum update depth exceeded/);
    expect(errors).not.toMatch(/not wrapped in act/);
  });

  it('change d’organisation et adapte le rôle', async () => {
    await act(async () => {
      await login({ email: 'mamadou@boutique-etoile.sn', password: DEMO_PASSWORD });
    });
    expect(useSessionStore.getState().session?.role).toBe('owner');
    await act(async () => {
      await switchOrganization('org-baobab');
    });
    const session = useSessionStore.getState().session;
    expect(session?.business.name).toBe('Supérette Le Baobab');
    expect(session?.role).toBe('manager');
  });

  it('refuse le bilan à un caissier', async () => {
    await act(async () => {
      await login({ email: 'awa@boutique-etoile.sn', password: DEMO_PASSWORD });
    });
    useUiStore.setState({ tab: 'bilan' });
    await act(async () => {
      render(<App />);
    });
    // Redirection automatique vers la caisse à l'ouverture de l'organisation…
    expect(useUiStore.getState().tab).toBe('ventes');
    // …et écran « Accès réservé » si l'onglet est forcé.
    act(() => {
      useUiStore.getState().setTab('bilan');
    });
    expect(screen.getByText(t.access.title)).toBeTruthy();
    expect(screen.queryByText(t.bilan.exports.title)).toBeNull();
  });
});
