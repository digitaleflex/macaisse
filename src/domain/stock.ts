// Règles métier du stock : statuts, valorisation, filtrage et tri.

import type { Category, Product, StockStatus } from '../types';

/**
 * Détermine le statut d'un produit à partir du stock et du seuil d'alerte.
 * Logique reprise à l'identique de App.tsx et StockView.tsx.
 */
export function computeStockStatus(stock: number, minStockAlert: number): StockStatus {
  if (stock <= 0) return 'rupture';
  if (stock <= minStockAlert) return 'faible';
  return 'disponible';
}

/** Vrai si le produit est en stock faible (seuil atteint mais non nul). */
export function isLowStock(product: Product): boolean {
  return computeStockStatus(product.stock, product.minStockAlert) === 'faible';
}

/**
 * Marge unitaire en pourcentage du prix de vente, arrondie au point
 * (0 si le prix est nul). Source unique : formulaires, tableau et KPI.
 */
export function marginPercent(price: number, costPrice: number): number {
  if (price <= 0) return 0;
  return Math.round(((price - costPrice) / price) * 100);
}

/** Marge potentielle en pourcentage du chiffre d'affaires (KPI accueil/bilan). */
export function marginRatePercent(margin: number, retail: number): number {
  return retail > 0 ? (margin / retail) * 100 : 0;
}

/** Valeur du stock au prix d'achat (somme stock × costPrice). */
export function stockValue(products: Product[]): number {
  return products.reduce((sum, p) => sum + p.stock * p.costPrice, 0);
}

/** Valeur du stock au prix de vente (somme stock × price). */
export function retailValue(products: Product[]): number {
  return products.reduce((sum, p) => sum + p.stock * p.price, 0);
}

export interface ProductFilter {
  /** Recherche insensible à la casse sur nom, SKU et catégorie. */
  query?: string;
  category?: Category;
  status?: StockStatus;
}

/**
 * Filtre les produits (reprend le filtrage inline de StockView.tsx).
 * La recherche est insensible à la casse et porte sur le nom, le SKU et la catégorie.
 */
export function filterProducts(products: Product[], filter: ProductFilter = {}): Product[] {
  const { category, status } = filter;
  const term = filter.query?.trim().toLowerCase() ?? '';

  return products.filter((product) => {
    if (category && product.category !== category) return false;
    if (status && computeStockStatus(product.stock, product.minStockAlert) !== status) return false;
    if (!term) return true;
    return (
      product.name.toLowerCase().includes(term) ||
      product.sku.toLowerCase().includes(term) ||
      product.category.toLowerCase().includes(term)
    );
  });
}

export type SortKey = 'name' | 'stock' | 'price' | 'value';
export type SortDirection = 'asc' | 'desc';

function compareProducts(a: Product, b: Product, key: SortKey): number {
  switch (key) {
    case 'name':
      return a.name.localeCompare(b.name);
    case 'stock':
      return a.stock - b.stock;
    case 'price':
      return a.price - b.price;
    case 'value':
      return a.stock * a.costPrice - b.stock * b.costPrice;
    default:
      return 0;
  }
}

/**
 * Trie les produits selon une clé et une direction explicites.
 * Le tri est stable (les éléments égaux conservent leur ordre d'origine).
 */
export function sortProducts(
  products: Product[],
  key: SortKey,
  direction: SortDirection = 'asc'
): Product[] {
  const dir = direction === 'desc' ? -1 : 1;
  return products
    .map((product, index) => ({ product, index }))
    .sort((a, b) => {
      const cmp = compareProducts(a.product, b.product, key);
      return cmp !== 0 ? cmp * dir : a.index - b.index;
    })
    .map((entry) => entry.product);
}
