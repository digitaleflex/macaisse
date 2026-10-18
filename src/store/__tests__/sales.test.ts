import { beforeEach, describe, expect, it } from 'vitest';
import type { CartLine, Product, SaleTransaction } from '@/types';
import { useCartStore } from '../useCartStore';
import { useProductsStore } from '../useProductsStore';
import { selectRevenueSeries, selectTodaySales, useSalesStore } from '../useSalesStore';

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p1',
    name: 'Lait demi-écrémé',
    sku: '#LAI-018',
    category: 'Frais',
    price: 1000,
    costPrice: 750,
    stock: 10,
    minStockAlert: 5,
    imageUrl: '',
    unit: 'brique',
    ...overrides,
  };
}

function makeSale(overrides: Partial<SaleTransaction> = {}): SaleTransaction {
  return {
    id: 's',
    saleNumber: 'V-20241018-0001',
    time: '09:00',
    date: '2024-10-18',
    paymentMethod: 'Espèces',
    amount: 1000,
    status: 'Validé',
    itemsCount: 1,
    ...overrides,
  };
}

function line(overrides: Partial<CartLine> = {}): CartLine {
  return {
    productId: 'p1',
    name: 'Lait demi-écrémé',
    price: 1000,
    quantity: 2,
    unit: 'brique',
    ...overrides,
  };
}

beforeEach(() => {
  useSalesStore.setState({ sales: [], sequence: 0 });
  useCartStore.setState({ lines: [] });
  useProductsStore.setState({
    products: [
      makeProduct({ id: 'p1', stock: 10, price: 1000 }),
      makeProduct({ id: 'p2', name: 'Riz Parfumé 5kg', stock: 2, price: 4500, unit: 'sac' }),
    ],
  });
});

describe('useSalesStore.completeSale', () => {
  it('persiste la vente, décrémente le stock, vide le panier et incrémente la séquence', () => {
    useCartStore.setState({ lines: [line()] });

    const sale = useSalesStore.getState().completeSale({ paymentMethod: 'Espèces' });

    expect(sale.amount).toBe(2000);
    expect(sale.status).toBe('Validé');
    expect(sale.saleNumber).toMatch(/^V-\d{8}-0001$/);

    expect(useSalesStore.getState().sales[0]).toBe(sale);
    expect(useSalesStore.getState().sequence).toBe(1);
    expect(useProductsStore.getState().products.find((p) => p.id === 'p1')?.stock).toBe(8);
    expect(useCartStore.getState().lines).toEqual([]);
    // Le statut dérivé n'est pas conservé en état produits.
    expect(useProductsStore.getState().products.every((p) => !('status' in p))).toBe(true);
  });

  it('refuse un stock insuffisant sans rien muter', () => {
    useCartStore.setState({ lines: [line({ productId: 'p2', name: 'Riz Parfumé 5kg', price: 4500, quantity: 3, unit: 'sac' })] });
    const productsBefore = useProductsStore.getState().products;

    expect(() => useSalesStore.getState().completeSale({ paymentMethod: 'Espèces' })).toThrowError(
      /Stock insuffisant/
    );

    expect(useSalesStore.getState().sales).toHaveLength(0);
    expect(useSalesStore.getState().sequence).toBe(0);
    expect(useProductsStore.getState().products).toEqual(productsBefore);
    expect(useCartStore.getState().lines).toHaveLength(1);
  });

  it('refuse un panier vide', () => {
    useCartStore.setState({ lines: [] });
    expect(() => useSalesStore.getState().completeSale({ paymentMethod: 'Espèces' })).toThrowError(
      /sans article/
    );
    expect(useSalesStore.getState().sales).toHaveLength(0);
  });

  it('gère un paiement partiel (crédit)', () => {
    useCartStore.setState({ lines: [line()] });

    const sale = useSalesStore.getState().completeSale({
      paymentMethod: 'Crédit Partiel',
      creditAmount: 500,
      clientName: 'Mme Diallo',
    });

    expect(sale.status).toBe('Partiel');
    expect(sale.remainingAmount).toBe(500);
    expect(sale.clientName).toBe('Mme Diallo');
  });
});

describe('sélecteurs de ventes', () => {
  it('selectTodaySales filtre sur la date locale', () => {
    useSalesStore.setState({
      sales: [
        makeSale({ id: 's1', date: '2024-10-18' }),
        makeSale({ id: 's2', date: '2024-10-17' }),
      ],
      sequence: 0,
    });

    const today = selectTodaySales(useSalesStore.getState(), new Date(2024, 9, 18));
    expect(today.map((s) => s.id)).toEqual(['s1']);
  });

  it('selectRevenueSeries délègue au domaine', () => {
    useSalesStore.setState({
      sales: [makeSale({ id: 's1', date: '2024-10-18', amount: 2000 })],
      sequence: 0,
    });

    const series = selectRevenueSeries(3)(useSalesStore.getState());
    expect(series).toHaveLength(3);
  });
});
