import { describe, expect, it } from 'vitest';
import type { CartLine, Product } from '../../types';
import { computeKpis } from '../finances';
import { completeSale } from '../sales';
import { activeProducts, filterProducts, isActiveProduct, isLowStock, retailValue, stockValue } from '../stock';
import { adjustProduct, receiveStock } from '../stockMovements';

const BY = { id: 'u1', name: 'Awa Fall' };

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
const inactive = (overrides: Partial<Product> = {}) =>
  product({ deactivatedAt: '2026-11-10T09:00:00Z', deactivatedBy: 'Awa Fall', ...overrides });

describe('produit actif ou désactivé (EF-08, RG-07)', () => {
  it('un produit est actif tant qu’il n’a pas de date de désactivation', () => {
    expect(isActiveProduct(product())).toBe(true);
    expect(isActiveProduct(inactive())).toBe(false);
    expect(activeProducts([product({ id: 'a' }), inactive({ id: 'b' })]).map((p) => p.id)).toEqual(['a']);
  });

  it('la liste exclut les désactivés par défaut et ne montre qu’eux avec le filtre « inactive »', () => {
    const all = [product({ id: 'a' }), inactive({ id: 'b' }), product({ id: 'c', stock: 0 })];
    expect(filterProducts(all).map((p) => p.id)).toEqual(['a', 'c']);
    expect(filterProducts(all, { status: 'inactive' }).map((p) => p.id)).toEqual(['b']);
    // Les filtres de stock ne rapportent jamais un produit désactivé.
    expect(filterProducts([inactive({ stock: 0 })], { status: 'rupture' })).toEqual([]);
  });

  it('combine le filtre « désactivés » avec la recherche et le rayon', () => {
    const all = [inactive({ id: 'b', name: 'Riz', category: 'Épicerie' }), inactive({ id: 'c', name: 'Lait' })];
    expect(filterProducts(all, { status: 'inactive', query: 'riz' }).map((p) => p.id)).toEqual(['b']);
    expect(filterProducts(all, { status: 'inactive', category: 'Frais' }).map((p) => p.id)).toEqual(['c']);
  });

  it('un produit désactivé n’est ni en stock faible, ni compté dans la valeur du stock', () => {
    expect(isLowStock(inactive({ stock: 3 }))).toBe(false);
    expect(isLowStock(product({ stock: 3 }))).toBe(true);

    const mixed = [product({ id: 'a', stock: 2 }), inactive({ id: 'b', stock: 100 })];
    expect(stockValue(mixed)).toBe(2 * 700);
    expect(retailValue(mixed)).toBe(2 * 1000);
  });

  it('les indicateurs de l’accueil ignorent les produits désactivés', () => {
    const products = [product({ id: 'a', stock: 0 }), inactive({ id: 'b', stock: 0 }), inactive({ id: 'c', stock: 1000 })];
    const kpis = computeKpis({ sales: [], expenses: [], credits: [], products });
    expect(kpis.stockAlerts).toBe(1);
    expect(kpis.margin).toBe(0);
  });
});

describe('un produit désactivé ne se vend ni ne se réapprovisionne', () => {
  const line = (productId: string): CartLine => ({ productId, name: 'Lait', price: 1000, quantity: 1, unit: 'brique' });

  it('refuse la vente avec un message nommant le produit', () => {
    expect(() =>
      completeSale({ lines: [line('p1')], products: [inactive({ name: 'Lait' })], paymentMethod: 'cash' })
    ).toThrow(/« Lait » est désactivé/);
  });

  it('refuse toute la vente si une seule ligne est désactivée, sans toucher au stock', () => {
    const products = [product({ id: 'a' }), inactive({ id: 'b' })];
    expect(() => completeSale({ lines: [line('a'), line('b')], products, paymentMethod: 'cash' })).toThrow(/désactivé/);
    expect(products[0]?.stock).toBe(10);
  });

  it('refuse la réception de marchandise', () => {
    expect(() => receiveStock(inactive(), 5, BY)).toThrow(/réactivez-le/);
  });

  it('autorise pourtant d’écouler le stock restant : une casse ou un écart restent possibles', () => {
    const loss = adjustProduct(inactive({ stock: 4 }), { kind: 'loss', quantity: 4, reason: 'Fin de série' }, BY);
    expect(loss.product.stock).toBe(0);
    expect(loss.movement.type).toBe('loss');
    const count = adjustProduct(inactive({ stock: 4 }), { kind: 'count', quantity: 2, reason: 'Inventaire' }, BY);
    expect(count.product.stock).toBe(2);
  });

  it('conserve la désactivation après un ajustement de stock', () => {
    const { product: updated } = adjustProduct(inactive({ stock: 4 }), { kind: 'loss', quantity: 1, reason: 'Casse' }, BY);
    expect(updated.deactivatedAt).toBe('2026-11-10T09:00:00Z');
  });
});
