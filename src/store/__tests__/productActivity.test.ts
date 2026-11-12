import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CartLine, Product, Session } from '@/types';
import { selectLowStockProducts, selectOutOfStockProducts, useProductsStore } from '../useProductsStore';
import { useCartStore } from '../useCartStore';
import { useCreditsStore } from '../useCreditsStore';
import { useNotificationsStore } from '../useNotificationsStore';
import { useSalesStore } from '../useSalesStore';
import { useSessionStore } from '../useSessionStore';
import { useStockStore } from '../useStockStore';

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p1',
    name: 'Lait',
    sku: '#LAI',
    category: 'Frais',
    price: 1000,
    costPrice: 700,
    stock: 10,
    minStockAlert: 5,
    imageUrl: '',
    unit: 'brique',
    ...overrides,
  };
}
const find = (id = 'p1') => useProductsStore.getState().products.find((p) => p.id === id);

beforeEach(() => {
  useSessionStore.setState({
    session: { role: 'manager', user: { id: 'u1', firstName: 'Awa', lastName: 'Fall' } } as unknown as Session,
    status: 'ready',
  });
  useProductsStore.setState({ products: [product(), product({ id: 'p2', name: 'Riz', stock: 3 })] });
  useStockStore.setState({ movements: [], lastInventory: null });
  useSalesStore.setState({ sales: [], sequence: 0 });
  useCartStore.setState({ lines: [] });
  useCreditsStore.setState({ credits: [] });
  useNotificationsStore.setState({ notifications: [] });
});

describe('désactivation', () => {
  it('date et signe la désactivation sans toucher au reste de la fiche ni au stock', () => {
    const before = find() as Product;
    useProductsStore.getState().deactivateProduct('p1');

    const after = find() as Product;
    expect(after.deactivatedBy).toBe('Awa Fall');
    expect(new Date(after.deactivatedAt ?? '').getTime()).toBeGreaterThan(0);
    expect({ ...after, deactivatedAt: undefined, deactivatedBy: undefined }).toMatchObject({
      ...before,
      deactivatedAt: undefined,
      deactivatedBy: undefined,
    });
    expect(after.stock).toBe(10);
  });

  it('conserve le produit dans le catalogue : rien n’est supprimé', () => {
    useProductsStore.getState().deactivateProduct('p1');
    expect(useProductsStore.getState().products).toHaveLength(2);
  });

  it('est idempotent : une seconde désactivation ne change pas la date', () => {
    useProductsStore.getState().deactivateProduct('p1');
    const first = find()?.deactivatedAt;
    useProductsStore.getState().deactivateProduct('p1');
    expect(find()?.deactivatedAt).toBe(first);
  });

  it('refuse un produit inconnu', () => {
    expect(() => useProductsStore.getState().deactivateProduct('inconnu')).toThrow(/introuvable/);
  });

  it('un produit désactivé sort des alertes de stock', () => {
    useProductsStore.setState({ products: [product({ id: 'a', stock: 2 }), product({ id: 'b', stock: 0 })] });
    expect(selectLowStockProducts(useProductsStore.getState().products)).toHaveLength(1);
    expect(selectOutOfStockProducts(useProductsStore.getState().products)).toHaveLength(1);

    useProductsStore.getState().deactivateProduct('a');
    useProductsStore.getState().deactivateProduct('b');

    expect(selectLowStockProducts(useProductsStore.getState().products)).toEqual([]);
    expect(selectOutOfStockProducts(useProductsStore.getState().products)).toEqual([]);
  });

  it('ne peut plus être ajouté au panier ni réapprovisionné', () => {
    useProductsStore.getState().deactivateProduct('p1');
    const inactive = find() as Product;
    expect(() => useCartStore.getState().addItem(inactive)).toThrow(/désactivé/);
    expect(() => useProductsStore.getState().restock('p1', 5)).toThrow(/désactivé/);
    expect(find()?.stock).toBe(10);
  });
});

describe('historique conservé (RG-07)', () => {
  const lines: CartLine[] = [{ productId: 'p1', name: 'Lait', price: 1000, quantity: 3, unit: 'brique' }];

  it('les ventes et le journal de stock du produit restent lisibles après désactivation', () => {
    useCartStore.setState({ lines });
    const sale = useSalesStore.getState().completeSale({ paymentMethod: 'cash' });
    useProductsStore.getState().deactivateProduct('p1');

    expect(useSalesStore.getState().sales.find((s) => s.id === sale.id)?.lines).toEqual(lines);
    const movements = useStockStore.getState().movements.filter((m) => m.productId === 'p1');
    expect(movements.length).toBeGreaterThan(0);
    expect(movements[0]?.productName).toBe('Lait');
  });

  it('annuler une vente d’un produit désactivé remet quand même son stock en place', async () => {
    useCartStore.setState({ lines });
    const sale = useSalesStore.getState().completeSale({ paymentMethod: 'cash' });
    useProductsStore.getState().deactivateProduct('p1');

    await useSalesStore.getState().cancelSale(sale.id, 'erreur de produit');

    expect(find()?.stock).toBe(10);
    expect(find()?.deactivatedAt).toBeDefined();
  });
});

describe('réactivation', () => {
  it('rend le produit actif et efface la trace de désactivation', () => {
    useProductsStore.getState().deactivateProduct('p1');
    useProductsStore.getState().reactivateProduct('p1');

    expect(find()?.deactivatedAt).toBeUndefined();
    expect(find()?.deactivatedBy).toBeUndefined();
    expect(selectLowStockProducts([find() as Product])).toEqual([]); // stock 10 > seuil 5 : pas d'alerte
  });

  it('refuse si un produit actif porte déjà le même nom (sans tenir compte de la casse)', () => {
    useProductsStore.getState().deactivateProduct('p1');
    useProductsStore.getState().addProduct({ ...(product() as Product), id: 'x', name: ' lait ' });

    expect(() => useProductsStore.getState().reactivateProduct('p1')).toThrow(/s’appelle déjà « Lait »/);
    expect(find()?.deactivatedAt).toBeDefined();
  });

  it('autorise le même nom entre deux produits désactivés', () => {
    useProductsStore.setState({
      products: [product({ id: 'a', name: 'Sucre', deactivatedAt: '2026-01-01T00:00:00Z' }), product({ id: 'b', name: 'Sucre' })],
    });
    useProductsStore.getState().deactivateProduct('b');
    expect(find('b')?.deactivatedAt).toBeDefined();
  });

  it('est idempotent sur un produit déjà actif', () => {
    useProductsStore.getState().reactivateProduct('p1');
    expect(find()?.deactivatedAt).toBeUndefined();
  });
});

describe('persistance', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it('relit la désactivation d’un stockage local et laisse actifs les anciens produits', async () => {
    localStorage.setItem(
      'ma-caisse/products',
      JSON.stringify({
        version: 3,
        state: {
          products: [
            { ...product({ id: 'old' }) },
            { ...product({ id: 'off', name: 'Retiré' }), deactivatedAt: '2026-11-01T08:00:00Z', deactivatedBy: 'Awa Fall' },
          ],
        },
      })
    );
    const { useProductsStore: fresh } = await import('../useProductsStore');
    const products = fresh.getState().products;

    expect(products.find((p) => p.id === 'old')?.deactivatedAt).toBeUndefined();
    expect(products.find((p) => p.id === 'off')).toMatchObject({
      deactivatedAt: '2026-11-01T08:00:00Z',
      deactivatedBy: 'Awa Fall',
    });
  });
});
