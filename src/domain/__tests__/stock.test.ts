import { describe, expect, it } from 'vitest';
import type { Product } from '../../types';
import {
  computeStockStatus,
  filterProducts,
  isLowStock,
  retailValue,
  sortProducts,
  stockValue,
} from '../stock';

function makeProduct(overrides: Partial<Product>): Product {
  return {
    id: 'p',
    name: 'Produit',
    sku: '#SKU',
    category: 'Épicerie',
    price: 1000,
    costPrice: 700,
    stock: 10,
    minStockAlert: 5,
    imageUrl: '',
    unit: 'unité',
    ...overrides,
  };
}

describe('computeStockStatus', () => {
  it('détecte la rupture quand le stock est nul ou négatif', () => {
    expect(computeStockStatus(0, 5)).toBe('rupture');
    expect(computeStockStatus(-3, 5)).toBe('rupture');
  });

  it('détecte le stock faible sur les bornes du seuil', () => {
    expect(computeStockStatus(4, 5)).toBe('faible'); // minStockAlert - 1
    expect(computeStockStatus(5, 5)).toBe('faible'); // == minStockAlert
  });

  it('détecte le stock disponible au-delà du seuil', () => {
    expect(computeStockStatus(6, 5)).toBe('disponible'); // minStockAlert + 1
  });
});

describe('isLowStock', () => {
  it('est vrai uniquement pour le statut faible (rupture exclue)', () => {
    expect(isLowStock(makeProduct({ stock: 5, minStockAlert: 5 }))).toBe(true);
    expect(isLowStock(makeProduct({ stock: 0, minStockAlert: 5 }))).toBe(false);
    expect(isLowStock(makeProduct({ stock: 50, minStockAlert: 5 }))).toBe(false);
  });
});

describe('stockValue / retailValue', () => {
  const products = [
    makeProduct({ id: 'a', stock: 2, costPrice: 700, price: 1000 }),
    makeProduct({ id: 'b', stock: 3, costPrice: 100, price: 500 }),
  ];

  it('valorise le stock au prix d’achat', () => {
    expect(stockValue(products)).toBe(2 * 700 + 3 * 100);
  });

  it('valorise le stock au prix de vente', () => {
    expect(retailValue(products)).toBe(2 * 1000 + 3 * 500);
  });

  it('renvoie 0 pour une liste vide', () => {
    expect(stockValue([])).toBe(0);
    expect(retailValue([])).toBe(0);
  });
});

describe('filterProducts', () => {
  const products = [
    makeProduct({ id: 'a', name: 'Lait Demi-Écrémé', sku: '#LAI-018', category: 'Frais', stock: 24 }),
    makeProduct({ id: 'b', name: 'Riz Parfumé', sku: '#RIZ-052', category: 'Épicerie', stock: 3, minStockAlert: 5 }),
    makeProduct({ id: 'c', name: 'Huile Végétale', sku: '#HUI-001', category: 'Épicerie', stock: 0, minStockAlert: 10 }),
  ];

  it('filtre par catégorie', () => {
    const result = filterProducts(products, { category: 'Frais' });
    expect(result.map((p) => p.id)).toEqual(['a']);
  });

  it('filtre par statut dérivé', () => {
    expect(filterProducts(products, { status: 'faible' }).map((p) => p.id)).toEqual(['b']);
    expect(filterProducts(products, { status: 'rupture' }).map((p) => p.id)).toEqual(['c']);
    expect(filterProducts(products, { status: 'disponible' }).map((p) => p.id)).toEqual(['a']);
  });

  it('recherche sans tenir compte de la casse sur nom, SKU et catégorie', () => {
    expect(filterProducts(products, { query: 'lait' }).map((p) => p.id)).toEqual(['a']);
    expect(filterProducts(products, { query: '#riz' }).map((p) => p.id)).toEqual(['b']);
    expect(filterProducts(products, { query: 'épicerie' }).map((p) => p.id)).toEqual(['b', 'c']);
    expect(filterProducts(products, { query: '  ' })).toHaveLength(3);
  });

  it('combine recherche et catégorie', () => {
    expect(filterProducts(products, { query: 'e', category: 'Frais' }).map((p) => p.id)).toEqual(['a']);
  });
});

describe('sortProducts', () => {
  const products = [
    makeProduct({ id: 'a', name: 'Banane', stock: 5, price: 300, costPrice: 100 }),
    makeProduct({ id: 'b', name: 'Avocat', stock: 5, price: 500, costPrice: 200 }),
    makeProduct({ id: 'c', name: 'Cerise', stock: 1, price: 100, costPrice: 100 }),
  ];

  it('trie par nom', () => {
    expect(sortProducts(products, 'name').map((p) => p.id)).toEqual(['b', 'a', 'c']);
    expect(sortProducts(products, 'name', 'desc').map((p) => p.id)).toEqual(['c', 'a', 'b']);
  });

  it('trie par stock', () => {
    expect(sortProducts(products, 'stock').map((p) => p.id)).toEqual(['c', 'a', 'b']);
    expect(sortProducts(products, 'stock', 'desc').map((p) => p.id)).toEqual(['a', 'b', 'c']);
  });

  it('trie par prix', () => {
    expect(sortProducts(products, 'price').map((p) => p.id)).toEqual(['c', 'a', 'b']);
  });

  it('trie par valeur de stock (stock × prix d’achat)', () => {
    expect(sortProducts(products, 'value').map((p) => p.id)).toEqual(['c', 'a', 'b']);
    expect(sortProducts(products, 'value', 'desc').map((p) => p.id)).toEqual(['b', 'a', 'c']);
  });

  it('conserve l’ordre d’origine à clé égale (tri stable)', () => {
    // a et b ont le même stock : l'ordre initial a, b est conservé.
    expect(sortProducts(products, 'stock').slice(1).map((p) => p.id)).toEqual(['a', 'b']);
  });
});
