import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import type { SaleTransaction, TabType } from '@/types';
import App from '@/app/App';
import { useUiStore } from '@/store/useUiStore';

/**
 * Smoke test de rendu — garde-fou contre les boucles `useSyncExternalStore`
 * (zustand v5) et les warnings `act()` lors de la navigation entre onglets.
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

const TAB_MARKERS: { tab: TabType; text: RegExp }[] = [
  { tab: 'accueil', text: /Bonjour, Mamadou/ },
  { tab: 'ventes', text: /Articles Fréquents/ },
  { tab: 'stock', text: /Inventaire tournant/ },
  { tab: 'credits', text: /Suivi des dettes et recouvrement/ },
  { tab: 'bilan', text: /Synthèse comptable/ },
];

describe('App — smoke de rendu', () => {
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    useUiStore.setState({ tab: 'accueil', modal: null, receipt: null });
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    cleanup();
    consoleError.mockRestore();
  });

  it('monte les 5 onglets et ouvre/ferme le reçu sans boucle de rendu', () => {
    render(<App />);
    expect(screen.getByText(/Bonjour, Mamadou/)).toBeTruthy();

    for (const { tab, text } of TAB_MARKERS) {
      act(() => {
        useUiStore.getState().setTab(tab);
      });
      expect(screen.getByText(text)).toBeTruthy();
    }

    act(() => {
      useUiStore.getState().openReceipt(SALE, []);
    });
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText(/Ticket de Caisse Numérique/)).toBeTruthy();

    act(() => {
      useUiStore.getState().closeReceipt();
    });
    expect(screen.queryByRole('dialog')).toBeNull();

    const errors = (consoleError.mock.calls as unknown[][])
      .map((call) => call.map(String).join(' '))
      .join('\n');
    expect(errors).not.toMatch(/Maximum update depth exceeded/);
    expect(errors).not.toMatch(/not wrapped in act/);
  });
});
