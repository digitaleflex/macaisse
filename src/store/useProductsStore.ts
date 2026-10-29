// Store des produits (catalogue + stock).
// Orchestration seule : le statut de stock est toujours calculé par `@/domain/stock`.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product, ProductInput } from '@/types';
import { createId } from '@/domain/ids';
import { computeStockStatus, isLowStock, retailValue, stockValue } from '@/domain/stock';
import { SEED_PRODUCTS } from '@/mocks';
import { syncRemote } from '@/services';
import {
  coerceId,
  coerceNumber,
  coerceString,
  isCategory,
  isRecord,
  migrateList,
  PERSIST_NAMES,
  persistOptions,
  seedFallback,
} from './storeUtils';

export interface ProductsState {
  products: Product[];
  addProduct: (input: ProductInput) => void;
  updateProduct: (id: string, patch: Partial<ProductInput>) => void;
  removeProduct: (id: string) => void;
  /** Exception française si l'id est inconnu ou la quantité ≤ 0. */
  restock: (id: string, quantity: number) => void;
  setProducts: (products: Product[]) => void;
}

/** Retire le statut dérivé : il n'est jamais conservé en état. */
function sanitizeProduct(product: Product): Product {
  const base: Product = {
    id: product.id,
    name: product.name,
    sku: product.sku,
    category: product.category,
    price: product.price,
    costPrice: product.costPrice,
    stock: product.stock,
    minStockAlert: product.minStockAlert,
    imageUrl: product.imageUrl,
    unit: product.unit,
  };
  return product.imageAlt === undefined ? base : { ...base, imageAlt: product.imageAlt };
}

export const useProductsStore = create<ProductsState>()(
  persist(
    (set, get) => ({
      products: seedFallback(SEED_PRODUCTS).map(sanitizeProduct),

      addProduct: (input) => {
        const product = sanitizeProduct({ ...input, id: createId('product') });
        set((state) => ({ products: [product, ...state.products] }));
        syncRemote((api) => api.products.create(product), 'Produit non synchronisé.');
      },

      updateProduct: (id, patch) => {
        set((state) => ({
          products: state.products.map((product) =>
            product.id === id ? sanitizeProduct({ ...product, ...patch, id }) : product
          ),
        }));
        syncRemote((api) => api.products.update(id, patch), 'Modification non synchronisée.');
      },

      removeProduct: (id) => {
        set((state) => ({
          products: state.products.filter((product) => product.id !== id),
        }));
        syncRemote((api) => api.products.remove(id), 'Suppression non synchronisée.');
      },

      restock: (id, quantity) => {
        if (!Number.isFinite(quantity) || quantity <= 0) {
          throw new Error('La quantité à réapprovisionner doit être supérieure à zéro.');
        }
        if (!get().products.some((product) => product.id === id)) {
          throw new Error(`Produit introuvable (${id}).`);
        }
        set((state) => ({
          products: state.products.map((product) =>
            product.id === id ? sanitizeProduct({ ...product, stock: product.stock + quantity }) : product
          ),
        }));
        syncRemote((api) => api.products.restock(id, quantity), 'Réapprovisionnement non synchronisé.');
      },

      setProducts: (products) => set({ products: products.map(sanitizeProduct) }),
    }),
    persistOptions<ProductsState, { products: Product[] }>(
      PERSIST_NAMES.products,
      (state) => ({ products: state.products }),
      (persisted) => ({
        products: migrateList(persisted, 'products', toProduct, seedFallback(SEED_PRODUCTS)),
      })
    )
  )
);

// ---------------------------------------------------------------------------
// Sélecteurs
// ---------------------------------------------------------------------------

/** Produits en stock faible (seuil atteint mais non nul). */
export const selectLowStockProducts = (products: Product[]): Product[] =>
  products.filter(isLowStock);

/** Produits en rupture de stock. */
export const selectOutOfStockProducts = (products: Product[]): Product[] =>
  products.filter((product) => computeStockStatus(product.stock, product.minStockAlert) === 'rupture');

export const selectLowStock = (state: ProductsState): Product[] =>
  selectLowStockProducts(state.products);

export const selectOutOfStock = (state: ProductsState): Product[] =>
  selectOutOfStockProducts(state.products);

/** Liste destinée à l'UI : hydrate le champ dérivé `status` (jamais stocké). */
export const productsWithStatus = (products: Product[]): Product[] =>
  products.map((product) => ({
    ...product,
    status: computeStockStatus(product.stock, product.minStockAlert),
  }));

/**
 * Variante sélecteur de `productsWithStatus` : conservée pour les tests et les
 * usages ponctuels, mais NE PAS passer directement à `useStore` (elle renvoie un
 * tableau neuf à chaque appel — voir la règle en tête de `storeUtils.ts`).
 */
export const selectProductsWithStatus = (state: ProductsState): Product[] =>
  productsWithStatus(state.products);

/** Valeur du stock au prix d'achat (délègue à `@/domain/stock`). */
export const stockValueOf = (products: Product[]): number => stockValue(products);

/** Valeur du stock au prix de vente (délègue à `@/domain/stock`). */
export const retailValueOf = (products: Product[]): number => retailValue(products);

// ---------------------------------------------------------------------------
// Migration v1 (ids numériques) → v2
// ---------------------------------------------------------------------------

function toProduct(value: unknown): Product | null {
  if (!isRecord(value)) return null;
  const id = coerceId(value.id);
  const name = coerceString(value.name).trim();
  if (!id || name.length === 0 || !isCategory(value.category)) return null;
  const product: Product = {
    id,
    name,
    sku: coerceString(value.sku),
    category: value.category,
    price: coerceNumber(value.price),
    costPrice: coerceNumber(value.costPrice),
    stock: coerceNumber(value.stock),
    minStockAlert: coerceNumber(value.minStockAlert),
    imageUrl: coerceString(value.imageUrl),
    unit: coerceString(value.unit),
  };
  return typeof value.imageAlt === 'string' ? { ...product, imageAlt: value.imageAlt } : product;
}
