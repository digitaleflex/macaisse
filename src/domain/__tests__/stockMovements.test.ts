import { describe, expect, it } from 'vitest';
import type { Product, StockMovement } from '../../types';
import {
  StockAdjustmentError,
  adjustProduct,
  applyInventory,
  countedProducts,
  createMovement,
  filterMovements,
  inventoryImpact,
  inventoryVariances,
  receiveStock,
  toInventoryCounts,
} from '../stockMovements';

const BY = { id: 'u1', name: 'Awa Fall' };
const DATE = new Date('2026-11-12T10:00:00Z');

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

const refusal = (run: () => unknown) => {
  try {
    run();
  } catch (error) {
    return error instanceof StockAdjustmentError ? error.issue : 'autre erreur';
  }
  return null;
};

describe('createMovement', () => {
  it('calcule le stock obtenu et garde le nom du produit', () => {
    const movement = createMovement({ type: 'sale', product: product({ stock: 10 }), delta: -3, by: BY, date: DATE });
    expect(movement).toMatchObject({
      type: 'sale',
      productId: 'p1',
      productName: 'Lait',
      quantity: -3,
      quantityAfter: 7,
      userName: 'Awa Fall',
      userId: 'u1',
      createdAt: DATE.toISOString(),
    });
    expect(movement.id).toMatch(/^movement-/);
  });

  it('refuse une variation nulle ou non entière', () => {
    expect(() => createMovement({ type: 'purchase', product: product(), delta: 0, by: BY })).toThrow();
    expect(() => createMovement({ type: 'purchase', product: product(), delta: 1.5, by: BY })).toThrow();
  });

  it('rattache le mouvement à la vente et nettoie le motif', () => {
    const movement = createMovement({
      type: 'return',
      product: product({ stock: 7 }),
      delta: 3,
      reason: '  erreur de produit ',
      saleId: 's1',
      saleNumber: 'V-1',
      by: BY,
    });
    expect(movement).toMatchObject({ saleId: 's1', saleNumber: 'V-1', reason: 'erreur de produit' });
  });
});

describe('adjustProduct — écart d’inventaire', () => {
  it('remplace le stock par la quantité comptée et trace l’écart', () => {
    const { product: updated, movement } = adjustProduct(
      product({ stock: 10 }),
      { kind: 'count', quantity: 7, reason: 'Erreur de comptage' },
      BY,
      DATE
    );
    expect(updated.stock).toBe(7);
    expect(movement).toMatchObject({ type: 'adjustment', quantity: -3, quantityAfter: 7, reason: 'Erreur de comptage' });
  });

  it('accepte un surplus et un stock compté à zéro', () => {
    expect(adjustProduct(product({ stock: 2 }), { kind: 'count', quantity: 9, reason: 'surplus' }, BY).movement.quantity).toBe(7);
    const emptied = adjustProduct(product({ stock: 4 }), { kind: 'count', quantity: 0, reason: 'rupture réelle' }, BY);
    expect(emptied.product.stock).toBe(0);
    expect(emptied.product.status).toBe('rupture');
  });

  it('refuse l’absence d’écart', () => {
    expect(refusal(() => adjustProduct(product({ stock: 10 }), { kind: 'count', quantity: 10, reason: 'ok ok' }, BY))).toBe('no_variance');
  });

  it('refuse une quantité négative ou décimale', () => {
    expect(refusal(() => adjustProduct(product(), { kind: 'count', quantity: -1, reason: 'abc' }, BY))).toBe('quantity_invalid');
    expect(refusal(() => adjustProduct(product(), { kind: 'count', quantity: 2.5, reason: 'abc' }, BY))).toBe('quantity_invalid');
  });
});

describe('adjustProduct — casse et perte', () => {
  it('retire la quantité perdue du stock', () => {
    const { product: updated, movement } = adjustProduct(
      product({ stock: 10 }),
      { kind: 'loss', quantity: 4, reason: 'Casse au rayon' },
      BY
    );
    expect(updated.stock).toBe(6);
    expect(movement).toMatchObject({ type: 'loss', quantity: -4, quantityAfter: 6 });
  });

  it('refuse une perte supérieure au stock : jamais de stock négatif', () => {
    expect(refusal(() => adjustProduct(product({ stock: 3 }), { kind: 'loss', quantity: 4, reason: 'Casse' }, BY))).toBe('loss_exceeds_stock');
  });

  it('refuse une perte nulle', () => {
    expect(refusal(() => adjustProduct(product(), { kind: 'loss', quantity: 0, reason: 'Casse' }, BY))).toBe('quantity_invalid');
  });
});

describe('motif obligatoire (écart et casse)', () => {
  it.each(['', '   ', 'ab'])('refuse le motif « %s »', (reason) => {
    expect(refusal(() => adjustProduct(product(), { kind: 'count', quantity: 3, reason }, BY))).toBe('reason_required');
    expect(refusal(() => adjustProduct(product(), { kind: 'loss', quantity: 1, reason }, BY))).toBe('reason_required');
  });
});

describe('receiveStock', () => {
  it('ajoute la quantité reçue et trace une réception', () => {
    const { product: updated, movement } = receiveStock(product({ stock: 2 }), 20, BY, 'Livraison Adjamé', DATE);
    expect(updated.stock).toBe(22);
    expect(movement).toMatchObject({ type: 'purchase', quantity: 20, quantityAfter: 22, reason: 'Livraison Adjamé' });
  });

  it('n’exige pas de motif', () => {
    expect(receiveStock(product(), 5, BY).movement.reason).toBeUndefined();
  });

  it.each([0, -3, Number.NaN])('refuse la quantité %s', (quantity) => {
    expect(() => receiveStock(product(), quantity, BY)).toThrow(/supérieure à zéro/);
  });

  it('refuse une quantité décimale', () => {
    expect(() => receiveStock(product(), 1.5, BY)).toThrow(/nombre entier/);
  });
});

describe('inventaire', () => {
  const stock = [
    product({ id: 'a', name: 'Riz', stock: 10, costPrice: 500 }),
    product({ id: 'b', name: 'Huile', stock: 5, costPrice: 1000 }),
    product({ id: 'c', name: 'Sucre', stock: 8, costPrice: 400 }),
    product({ id: 'd', name: 'Savon', stock: 3, costPrice: 200 }),
  ];

  it('ne retient que les écarts, ignore les produits non comptés et les valeurs invalides', () => {
    const variances = inventoryVariances(stock, { a: 8, b: 5, c: undefined, d: -1 });
    expect(variances.map((v) => [v.product.id, v.delta])).toEqual([['a', -2]]);
  });

  it('compte les produits vérifiés, avec ou sans écart', () => {
    expect(countedProducts(stock, { a: 8, b: 5 })).toBe(2);
    expect(countedProducts(stock, {})).toBe(0);
  });

  it('valorise les écarts au prix d’achat', () => {
    // −2 riz (−1 000) et +3 huile (+3 000)
    expect(inventoryImpact(inventoryVariances(stock, { a: 8, b: 8 }))).toBe(2000);
  });

  it('génère un mouvement par écart et laisse les produits conformes intacts', () => {
    const result = applyInventory(stock, { a: 8, b: 5, c: 9 }, 'Inventaire du 12/11/2026', BY, DATE);

    expect(result.counted).toBe(3);
    expect(result.movements.map((m) => [m.productId, m.quantity, m.type])).toEqual([
      ['a', -2, 'adjustment'],
      ['c', 1, 'adjustment'],
    ]);
    expect(result.movements.every((m) => m.reason === 'Inventaire du 12/11/2026')).toBe(true);
    expect(result.products.map((p) => p.stock)).toEqual([8, 5, 9, 3]);
    expect(result.products[1]).toBe(stock[1]);
  });

  it('sans écart : aucun mouvement mais les produits comptés sont comptabilisés', () => {
    const result = applyInventory(stock, { a: 10, b: 5 }, 'Inventaire', BY, DATE);
    expect(result.movements).toEqual([]);
    expect(result.counted).toBe(2);
  });

  it('produit le format d’API des comptages', () => {
    expect(toInventoryCounts(stock, { a: 8, c: 0, d: 2.5, b: undefined })).toEqual([
      { productId: 'a', counted: 8 },
      { productId: 'c', counted: 0 },
    ]);
  });
});

describe('filterMovements', () => {
  const movement = (id: string, at: string, productId: string, type: StockMovement['type']): StockMovement => ({
    id,
    type,
    productId,
    productName: productId,
    quantity: 1,
    quantityAfter: 1,
    userName: 'x',
    createdAt: at,
  });
  const journal = [
    movement('m1', '2026-11-10T09:00:00Z', 'p1', 'purchase'),
    movement('m2', '2026-11-12T09:00:00Z', 'p2', 'sale'),
    movement('m3', '2026-11-11T09:00:00Z', 'p1', 'loss'),
  ];

  it('trie du plus récent au plus ancien', () => {
    expect(filterMovements(journal).map((m) => m.id)).toEqual(['m2', 'm3', 'm1']);
  });

  it('filtre par produit et par type', () => {
    expect(filterMovements(journal, { productId: 'p1' }).map((m) => m.id)).toEqual(['m3', 'm1']);
    expect(filterMovements(journal, { type: 'sale' }).map((m) => m.id)).toEqual(['m2']);
    expect(filterMovements(journal, { productId: 'p1', type: 'sale' })).toEqual([]);
  });
});
