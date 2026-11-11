import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import type { SaleTransaction } from '@/types';
import { toIsoDate } from '@/domain/dates';
import { useSalesStore } from '@/store/useSalesStore';
import { useUiStore } from '@/store/useUiStore';
import { SalesHistoryView } from '../SalesHistoryView';

const TODAY = toIsoDate(new Date());

function sale(overrides: Partial<SaleTransaction>): SaleTransaction {
  return {
    id: 's',
    saleNumber: 'V-0',
    time: '10:00',
    date: TODAY,
    paymentMethod: 'Espèces',
    amount: 1000,
    status: 'Validé',
    itemsCount: 1,
    ...overrides,
  };
}

function seed(sales: SaleTransaction[]) {
  useSalesStore.setState({ sales });
}

const rows = () => screen.queryAllByRole('button', { name: /Ouvrir le ticket/ });

beforeEach(() => {
  useUiStore.setState({ receipt: null });
  seed([]);
});

describe('SalesHistoryView', () => {
  it('liste les ventes, annulées comprises, et totalise sans les annulées', () => {
    seed([
      sale({ id: 'a', saleNumber: 'V-1', amount: 1000, time: '09:00', sellerName: 'Awa Fall' }),
      sale({ id: 'b', saleNumber: 'V-2', amount: 2500, time: '10:00' }),
      sale({ id: 'c', saleNumber: 'V-3', amount: 9000, time: '11:00', status: 'Annulée', cancelledBy: 'Awa Fall', cancelReason: 'doublon' }),
    ]);
    render(<SalesHistoryView />);

    expect(rows()).toHaveLength(3);
    // Le total (1 000 + 2 500) ignore la vente annulée de 9 000.
    expect(screen.getByText('Total encaissé').parentElement?.parentElement?.textContent).toMatch(/3\D?500/);
    expect(screen.getByText(/Annulée par Awa Fall — doublon/)).toBeTruthy();
    expect(screen.getByText(/· par Awa Fall$/)).toBeTruthy();
  });

  it('affiche les plus récentes en premier et un seul en-tête par jour', () => {
    seed([
      sale({ id: 'old', saleNumber: 'V-OLD', time: '08:00' }),
      sale({ id: 'new', saleNumber: 'V-NEW', time: '16:00' }),
    ]);
    render(<SalesHistoryView />);

    expect(rows().map((row) => row.getAttribute('aria-label'))).toEqual([
      'Ouvrir le ticket V-NEW',
      'Ouvrir le ticket V-OLD',
    ]);
    expect(screen.getAllByText('Aujourd’hui', { selector: 'li span' })).toHaveLength(1);
  });

  it('filtre par statut', () => {
    seed([
      sale({ id: 'a', saleNumber: 'V-1' }),
      sale({ id: 'b', saleNumber: 'V-2', status: 'Annulée' }),
    ]);
    render(<SalesHistoryView />);

    fireEvent.change(screen.getByLabelText('Statut'), { target: { value: 'Annulée' } });

    expect(rows().map((row) => row.getAttribute('aria-label'))).toEqual(['Ouvrir le ticket V-2']);
  });

  it('filtre par vendeur', () => {
    seed([
      sale({ id: 'a', saleNumber: 'V-1', sellerId: 'u1', sellerName: 'Awa Fall' }),
      sale({ id: 'b', saleNumber: 'V-2', sellerId: 'u2', sellerName: 'Ibou Diop' }),
    ]);
    render(<SalesHistoryView />);

    fireEvent.change(screen.getByLabelText('Vendeur'), { target: { value: 'u2' } });

    expect(rows().map((row) => row.getAttribute('aria-label'))).toEqual(['Ouvrir le ticket V-2']);
  });

  it('filtre par période : une vente ancienne sort de « Aujourd’hui »', () => {
    seed([
      sale({ id: 'a', saleNumber: 'V-1' }),
      sale({ id: 'b', saleNumber: 'V-2', date: '2020-01-01' }),
    ]);
    render(<SalesHistoryView />);
    expect(rows()).toHaveLength(2);

    fireEvent.click(screen.getByRole('radio', { name: 'Aujourd’hui' }));

    expect(rows().map((row) => row.getAttribute('aria-label'))).toEqual(['Ouvrir le ticket V-1']);
  });

  it('recherche par ticket ou client puis réinitialise', () => {
    seed([
      sale({ id: 'a', saleNumber: 'V-1', clientName: 'M. Ba' }),
      sale({ id: 'b', saleNumber: 'V-2' }),
    ]);
    render(<SalesHistoryView />);

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'ba' } });
    expect(rows()).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'Réinitialiser les filtres' }));
    expect(rows()).toHaveLength(2);
  });

  it('ouvre le ticket de la vente cliquée', () => {
    seed([sale({ id: 'a', saleNumber: 'V-1' })]);
    render(<SalesHistoryView />);

    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir le ticket V-1' }));

    expect(useUiStore.getState().receipt?.sale.id).toBe('a');
  });

  it('pagine par 30 ventes', () => {
    seed(Array.from({ length: 35 }, (_, index) => sale({ id: `s${index}`, saleNumber: `V-${index}` })));
    render(<SalesHistoryView />);
    expect(rows()).toHaveLength(30);

    fireEvent.click(screen.getByRole('button', { name: 'Afficher 5 ventes de plus' }));

    expect(rows()).toHaveLength(35);
    expect(screen.queryByRole('button', { name: /de plus/ })).toBeNull();
  });

  it('distingue « aucune vente » de « aucun résultat »', () => {
    const { unmount } = render(<SalesHistoryView />);
    expect(screen.getByText('Aucune vente enregistrée')).toBeTruthy();
    unmount();

    seed([sale({ id: 'a', saleNumber: 'V-1' })]);
    render(<SalesHistoryView />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'zzz' } });
    const empty = screen.getByText('Aucune vente trouvée').closest('div') as HTMLElement;
    expect(within(empty.parentElement as HTMLElement).getByRole('button', { name: 'Réinitialiser les filtres' })).toBeTruthy();
  });
});
