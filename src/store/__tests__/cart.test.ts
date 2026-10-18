import { beforeEach, describe, expect, it } from 'vitest';
import type { Product } from '@/types';
import { selectCartItemCount, selectCartTotals, useCartStore } from '../useCartStore';

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

beforeEach(() => {
  useCartStore.setState({ lines: [] });
});

describe('useCartStore', () => {
  it('ajoute puis fusionne les lignes du même produit', () => {
    const product = makeProduct({ id: 'p1' });
    useCartStore.getState().addItem(product);
    useCartStore.getState().addItem(product, 2);

    const { lines } = useCartStore.getState();
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      productId: 'p1',
      name: 'Lait demi-écrémé',
      price: 1000,
      quantity: 3,
      unit: 'brique',
    });
  });

  it('fixe la quantité, une quantité à 0 retirant la ligne', () => {
    useCartStore.getState().addItem(makeProduct({ id: 'p1' }), 2);
    useCartStore.getState().setQuantity('p1', 5);
    expect(useCartStore.getState().lines[0].quantity).toBe(5);

    useCartStore.getState().setQuantity('p1', 0);
    expect(useCartStore.getState().lines).toHaveLength(0);
  });

  it('retire un article puis vide le panier', () => {
    useCartStore.getState().addItem(makeProduct({ id: 'p1' }));
    useCartStore.getState().addItem(makeProduct({ id: 'p2' }));
    useCartStore.getState().removeItem('p1');
    expect(useCartStore.getState().lines.map((l) => l.productId)).toEqual(['p2']);

    useCartStore.getState().clear();
    expect(useCartStore.getState().lines).toHaveLength(0);
  });

  it('calcule les totaux via le domaine', () => {
    useCartStore.getState().addItem(makeProduct({ id: 'p1', price: 1000 }), 2);
    useCartStore.getState().addItem(makeProduct({ id: 'p2', price: 500 }), 1);

    expect(selectCartTotals(useCartStore.getState())).toEqual({ subtotal: 2500, itemCount: 3 });
    expect(selectCartItemCount(useCartStore.getState())).toBe(3);
  });

  it('refuse un produit en rupture de stock', () => {
    expect(() => useCartStore.getState().addItem(makeProduct({ id: 'p3', stock: 0 }))).toThrowError(
      /rupture/
    );
    expect(useCartStore.getState().lines).toHaveLength(0);
  });
});
