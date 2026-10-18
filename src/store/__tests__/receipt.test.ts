import { beforeEach, describe, expect, it } from 'vitest';
import type { CartLine, SaleTransaction } from '@/types';
import { PERSIST_NAMES } from '../storeUtils';
import { selectReceipt, useUiStore } from '../useUiStore';

const SALE: SaleTransaction = {
  id: 'sale-1',
  saleNumber: '#V-001',
  time: '10:00',
  date: '2026-10-18',
  paymentMethod: 'Espèces',
  amount: 2500,
  status: 'Validé',
  itemsCount: 2,
};

const ITEMS: CartLine[] = [
  { productId: 'p1', name: 'Lait', price: 1000, quantity: 2, unit: 'brique' },
];

beforeEach(() => {
  useUiStore.setState({ tab: 'accueil', modal: null, isOnline: true, receipt: null });
  localStorage.removeItem(PERSIST_NAMES.ui);
});

describe('useUiStore — reçu global', () => {
  it('openReceipt expose la vente et le snapshot de lignes', () => {
    useUiStore.getState().openReceipt(SALE, ITEMS);

    expect(useUiStore.getState().receipt).toEqual({ sale: SALE, items: ITEMS });
    expect(selectReceipt(useUiStore.getState())).toEqual({ sale: SALE, items: ITEMS });
  });

  it('openReceipt retombe sur des items vides quand le détail est inconnu', () => {
    useUiStore.getState().openReceipt(SALE);

    expect(useUiStore.getState().receipt).toEqual({ sale: SALE, items: [] });
  });

  it('closeReceipt remet le reçu à null', () => {
    useUiStore.getState().openReceipt(SALE, ITEMS);
    useUiStore.getState().closeReceipt();

    expect(useUiStore.getState().receipt).toBeNull();
  });

  it('reçu et modale ne se superposent jamais', () => {
    useUiStore.getState().openModal('depenses');
    useUiStore.getState().openReceipt(SALE, ITEMS);
    expect(useUiStore.getState().modal).toBeNull();

    useUiStore.getState().openModal('export');
    expect(useUiStore.getState().receipt).toBeNull();
    expect(useUiStore.getState().modal).toBe('export');
  });

  it('le reçu n’est jamais persisté dans localStorage', () => {
    useUiStore.getState().openReceipt(SALE, ITEMS);

    const raw = localStorage.getItem(PERSIST_NAMES.ui);
    expect(raw).not.toBeNull();
    expect(raw).not.toContain('receipt');
    expect(raw).not.toContain('saleNumber');
  });
});
