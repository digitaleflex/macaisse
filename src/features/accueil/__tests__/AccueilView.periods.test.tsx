import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SaleTransaction, Session } from '@/types';
import { useCreditsStore } from '@/store/useCreditsStore';
import { useExpensesStore } from '@/store/useExpensesStore';
import { useProductsStore } from '@/store/useProductsStore';
import { useSalesStore } from '@/store/useSalesStore';
import { useSessionStore } from '@/store/useSessionStore';
import { AccueilView } from '../AccueilView';

function sale(id: string, date: string, amount: number, status: SaleTransaction['status'] = 'completed'): SaleTransaction {
  return { id, saleNumber: id, time: '10:00', date, paymentMethod: 'cash', amount, status, itemsCount: 1 };
}

beforeEach(() => {
  // 20 novembre 2026 : le mois précédent (octobre) a 31 jours, la comparaison du 1er au 20 est donc nette.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 20, 12, 0));
  useSessionStore.setState({
    session: {
      role: 'owner',
      user: { id: 'u1', firstName: 'Mamadou', lastName: 'Konaté', phone: '+221771234567' },
      business: { phone: '+221338214400' },
    } as unknown as Session,
    status: 'ready',
  });
  useSalesStore.setState({
    sales: [
      sale('today', '2026-11-20', 1000),
      sale('d15', '2026-11-15', 2000),
      sale('d03', '2026-11-03', 4000),
      sale('oct03', '2026-10-03', 3000),
      // Octobre, hors des 20 premiers jours : un mois complet fausserait la comparaison.
      sale('oct25', '2026-10-25', 9000),
      sale('void', '2026-11-20', 8000, 'cancelled'),
    ],
  });
  useExpensesStore.setState({ expenses: [] });
  useCreditsStore.setState({ credits: [] });
  useProductsStore.setState({ products: [] });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

/** Texte de la carte « Chiffre d'affaires ». */
const revenueCard = () => screen.getByText('Chiffre d’affaires').closest('div[class*="rounded-card"]')?.textContent ?? '';
const clean = (text: string) => text.replace(/\s/g, '');

describe('Accueil — sélecteur de période', () => {
  it('« Aujourd’hui » : chiffre d’affaires du jour, ventes annulées exclues', () => {
    render(<AccueilView />);
    expect(clean(revenueCard())).toContain('1000FCFA');
  });

  it('« 7 jours » : les 7 derniers jours', () => {
    render(<AccueilView />);
    fireEvent.click(screen.getByRole('radio', { name: '7 jours' }));
    expect(clean(revenueCard())).toContain('3000FCFA');
  });

  it('« Ce mois » : du 1er à aujourd’hui, comparé aux mêmes jours du mois précédent', () => {
    render(<AccueilView />);
    fireEvent.click(screen.getByRole('radio', { name: 'Ce mois' }));

    const card = clean(revenueCard());
    expect(card).toContain('7000FCFA');
    // 7 000 contre 3 000 (1er au 20 octobre) = +133,3 %. Contre octobre entier (12 000), on aurait
    // affiché une baisse de 41,7 % alors que le mois se passe bien.
    expect(card).toContain('+133.3%');
    expect(card).not.toContain('-41.7%');
  });

  it('le graphique suit la période choisie', () => {
    render(<AccueilView />);
    expect(screen.getByText('Recettes des 14 derniers jours')).toBeTruthy();

    fireEvent.click(screen.getByRole('radio', { name: '7 jours' }));
    expect(screen.getByText('Recettes des 7 derniers jours')).toBeTruthy();

    fireEvent.click(screen.getByRole('radio', { name: 'Ce mois' }));
    expect(screen.getByText('Recettes des 20 derniers jours')).toBeTruthy();
  });
});
