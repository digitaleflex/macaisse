import { beforeEach, describe, expect, it } from 'vitest';
import type { CartLine, Product, Role, Session } from '@/types';
import { adjustStock, applyInventoryCount } from '../stockActions';
import { useCartStore } from '../useCartStore';
import { useCreditsStore } from '../useCreditsStore';
import { useNotificationsStore } from '../useNotificationsStore';
import { useProductsStore } from '../useProductsStore';
import { useSalesStore } from '../useSalesStore';
import { useSessionStore } from '../useSessionStore';
import { MAX_LOCAL_MOVEMENTS, useStockStore } from '../useStockStore';

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

function signIn(role: Role) {
  useSessionStore.setState({
    session: { role, user: { id: 'u-awa', firstName: 'Awa', lastName: 'Fall' } } as unknown as Session,
    status: 'ready',
  });
}

const stockOf = (id = 'p1') => useProductsStore.getState().products.find((p) => p.id === id)?.stock;
const journal = () => useStockStore.getState().movements;

beforeEach(() => {
  signIn('manager');
  useProductsStore.setState({
    products: [product({ id: 'p1', stock: 10 }), product({ id: 'p2', name: 'Riz', stock: 4, costPrice: 500 })],
  });
  useStockStore.setState({ movements: [], lastInventory: null });
  useSalesStore.setState({ sales: [], sequence: 0 });
  useCartStore.setState({ lines: [] });
  useCreditsStore.setState({ credits: [] });
  useNotificationsStore.setState({ notifications: [] });
});

describe('réception (réapprovisionnement)', () => {
  it('trace une entrée avec le stock obtenu, le motif et l’auteur', () => {
    useProductsStore.getState().restock('p1', 20, 'Livraison Adjamé');

    expect(stockOf()).toBe(30);
    expect(journal()).toHaveLength(1);
    expect(journal()[0]).toMatchObject({
      type: 'purchase',
      productId: 'p1',
      productName: 'Lait',
      quantity: 20,
      quantityAfter: 30,
      reason: 'Livraison Adjamé',
      userName: 'Awa Fall',
      userId: 'u-awa',
    });
  });

  it('ne trace rien quand la quantité est refusée', () => {
    expect(() => useProductsStore.getState().restock('p1', 0)).toThrow(/supérieure à zéro/);
    expect(() => useProductsStore.getState().restock('inconnu', 5)).toThrow(/introuvable/);
    expect(stockOf()).toBe(10);
    expect(journal()).toEqual([]);
  });
});

describe('fiche produit (RG-05)', () => {
  const input = (stock: number) => ({
    id: 'ignoré',
    name: 'Savon',
    sku: '#SAV',
    category: 'Hygiène' as const,
    price: 500,
    costPrice: 300,
    stock,
    minStockAlert: 2,
    imageUrl: '',
    unit: 'pièce',
  });

  it('enregistre le stock initial comme une réception tracée', () => {
    useProductsStore.getState().addProduct(input(12));
    const created = useProductsStore.getState().products[0] as Product;

    expect(journal()[0]).toMatchObject({
      type: 'purchase',
      productId: created.id,
      quantity: 12,
      quantityAfter: 12,
      reason: 'Stock initial',
    });
  });

  it('ne trace rien pour un produit créé sans stock', () => {
    useProductsStore.getState().addProduct(input(0));
    expect(journal()).toEqual([]);
  });

  it('une modification de fiche ne change jamais le stock', () => {
    const forged = { price: 1500, ...{ stock: 999 } };
    useProductsStore.getState().updateProduct('p1', forged);

    expect(useProductsStore.getState().products.find((p) => p.id === 'p1')?.price).toBe(1500);
    expect(stockOf()).toBe(10);
    expect(journal()).toEqual([]);
  });
});

describe('ventes et annulations', () => {
  const lines: CartLine[] = [
    { productId: 'p1', name: 'Lait', price: 1000, quantity: 3, unit: 'brique' },
    { productId: 'p2', name: 'Riz', price: 4500, quantity: 1, unit: 'sac' },
  ];

  it('une vente trace une sortie par produit, rattachée au ticket', () => {
    useCartStore.setState({ lines });
    const sale = useSalesStore.getState().completeSale({ paymentMethod: 'cash' });

    const movements = journal().filter((m) => m.type === 'sale');
    expect(movements.map((m) => [m.productId, m.quantity, m.quantityAfter])).toEqual(
      expect.arrayContaining([
        ['p1', -3, 7],
        ['p2', -1, 3],
      ])
    );
    expect(movements.every((m) => m.saleId === sale.id && m.saleNumber === sale.saleNumber)).toBe(true);
  });

  it('l’annulation trace un retour en stock avec le motif', async () => {
    useCartStore.setState({ lines });
    const sale = useSalesStore.getState().completeSale({ paymentMethod: 'cash' });

    await useSalesStore.getState().cancelSale(sale.id, 'erreur de produit');

    const returns = journal().filter((m) => m.type === 'return');
    expect(returns.map((m) => [m.productId, m.quantity, m.quantityAfter])).toEqual(
      expect.arrayContaining([
        ['p1', 3, 10],
        ['p2', 1, 4],
      ])
    );
    expect(returns.every((m) => m.reason === 'Annulation : erreur de produit' && m.saleId === sale.id)).toBe(true);
    expect(stockOf('p1')).toBe(10);
  });

  it('le stock suit exactement la somme des mouvements', async () => {
    useCartStore.setState({ lines });
    const sale = useSalesStore.getState().completeSale({ paymentMethod: 'cash' });
    useProductsStore.getState().restock('p1', 5);
    await useSalesStore.getState().cancelSale(sale.id, 'erreur');

    const delta = journal()
      .filter((m) => m.productId === 'p1')
      .reduce((sum, m) => sum + m.quantity, 0);
    expect(stockOf('p1')).toBe(10 + delta);
  });
});

describe('adjustStock', () => {
  it('trace un écart d’inventaire', async () => {
    const movement = await adjustStock('p1', { kind: 'count', quantity: 7, reason: 'Erreur de comptage' });

    expect(stockOf()).toBe(7);
    expect(movement).toMatchObject({ type: 'adjustment', quantity: -3, quantityAfter: 7 });
    expect(journal()[0]).toEqual(movement);
  });

  it('trace une casse', async () => {
    await adjustStock('p1', { kind: 'loss', quantity: 4, reason: 'Casse au rayon' });
    expect(stockOf()).toBe(6);
    expect(journal()[0]).toMatchObject({ type: 'loss', quantity: -4 });
  });

  it.each([
    ['sans motif', { kind: 'count' as const, quantity: 7, reason: '' }, /motif/i],
    ['sans écart', { kind: 'count' as const, quantity: 10, reason: 'ok ok' }, /Aucun écart/],
    ['au-delà du stock', { kind: 'loss' as const, quantity: 11, reason: 'Casse' }, /dépasse/],
  ])('refuse une correction %s sans rien modifier', async (_label, input, message) => {
    await expect(adjustStock('p1', input)).rejects.toThrow(message);
    expect(stockOf()).toBe(10);
    expect(journal()).toEqual([]);
  });

  it('refuse un produit inconnu', async () => {
    await expect(adjustStock('inconnu', { kind: 'count', quantity: 1, reason: 'abc' })).rejects.toThrow(/introuvable/);
  });

  it('refuse le caissier, même en appelant l’action directement', async () => {
    signIn('cashier');
    await expect(adjustStock('p1', { kind: 'count', quantity: 7, reason: 'Erreur' })).rejects.toThrow(/rôle/);
    expect(stockOf()).toBe(10);
    expect(journal()).toEqual([]);
  });
});

describe('applyInventoryCount', () => {
  it('corrige les écarts, laisse les conformes et mémorise l’inventaire', async () => {
    const outcome = await applyInventoryCount({ p1: 8, p2: 4 });

    expect(outcome.counted).toBe(2);
    expect(outcome.movements.map((m) => [m.productId, m.quantity])).toEqual([['p1', -2]]);
    expect(stockOf('p1')).toBe(8);
    expect(stockOf('p2')).toBe(4);
    expect(journal()[0]?.reason).toMatch(/^Inventaire du /);
    expect(useStockStore.getState().lastInventory).toMatchObject({ by: 'Awa Fall', counted: 2, variances: 1 });
  });

  it('ajoute la note de l’utilisateur au motif', async () => {
    await applyInventoryCount({ p1: 9 }, 'Fin de mois');
    expect(journal()[0]?.reason).toMatch(/Inventaire du .* — Fin de mois$/);
  });

  it('mémorise même un inventaire sans aucun écart', async () => {
    await applyInventoryCount({ p1: 10, p2: 4 });
    expect(journal()).toEqual([]);
    expect(useStockStore.getState().lastInventory).toMatchObject({ counted: 2, variances: 0 });
  });

  it('refuse un inventaire où rien n’est compté, sans rien modifier', async () => {
    await expect(applyInventoryCount({})).rejects.toThrow(/au moins une quantité/);
    expect(useStockStore.getState().lastInventory).toBeNull();
  });

  it('refuse le caissier', async () => {
    signIn('cashier');
    await expect(applyInventoryCount({ p1: 1 })).rejects.toThrow(/rôle/);
    expect(stockOf()).toBe(10);
  });
});

describe('journal local', () => {
  it('conserve les plus récents d’abord et plafonne sa taille', () => {
    const make = (n: number) => ({
      id: `m${n}`,
      type: 'purchase' as const,
      productId: 'p1',
      productName: 'Lait',
      quantity: 1,
      quantityAfter: n,
      userName: 'x',
      createdAt: new Date(2026, 0, 1, 0, 0, n).toISOString(),
    });
    useStockStore.getState().record(Array.from({ length: MAX_LOCAL_MOVEMENTS + 5 }, (_, i) => make(i)));

    expect(journal()).toHaveLength(MAX_LOCAL_MOVEMENTS);
    expect(journal()[0]?.id).toBe(`m${MAX_LOCAL_MOVEMENTS + 4}`);
  });
});
