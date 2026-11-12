// Store des produits (catalogue + stock).
// Orchestration seule : le statut de stock est toujours calculé par `@/domain/stock`.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product, ProductInput } from '@/types';
import { createId } from '@/domain/ids';
import { computeStockStatus, isActiveProduct, isLowStock, retailValue, stockValue } from '@/domain/stock';
import { createMovement, receiveStock } from '@/domain/stockMovements';
import { SEED_PRODUCTS } from '@/mocks';
import { syncRemote } from '@/services';
import { t } from '@/content';
import { currentActor } from './actor';
import { useStockStore } from './useStockStore';
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

/** Champs modifiables d'une fiche produit. Le stock en est exclu : il ne change que par un mouvement tracé (RG-05). */
export type ProductPatch = Partial<Omit<ProductInput, 'stock'>>;

export interface ProductsState {
  products: Product[];
  /** Le stock initial, s'il est positif, est enregistré comme une réception. */
  addProduct: (input: ProductInput) => void;
  updateProduct: (id: string, patch: ProductPatch) => void;
  /**
   * Désactive un produit (EF-08, RG-07) : il quitte la caisse, les alertes et les indicateurs, mais
   * son historique reste lisible. Un produit n'est jamais supprimé. Idempotent.
   */
  deactivateProduct: (id: string) => void;
  /** Réactive un produit. Exception française si un produit actif porte déjà le même nom. */
  reactivateProduct: (id: string) => void;
  /** Réception de marchandise, tracée. Exception française si l'id est inconnu ou la quantité ≤ 0. */
  restock: (id: string, quantity: number, reason?: string) => void;
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
  const withAlt = product.imageAlt === undefined ? base : { ...base, imageAlt: product.imageAlt };
  return product.deactivatedAt === undefined
    ? withAlt
    : {
        ...withAlt,
        deactivatedAt: product.deactivatedAt,
        ...(product.deactivatedBy === undefined ? {} : { deactivatedBy: product.deactivatedBy }),
      };
}

export const useProductsStore = create<ProductsState>()(
  persist(
    (set, get) => ({
      products: seedFallback(SEED_PRODUCTS).map(sanitizeProduct),

      addProduct: (input) => {
        const product = sanitizeProduct({ ...input, id: createId('product') });
        set((state) => ({ products: [product, ...state.products] }));
        if (product.stock > 0) {
          // Stock initial : une réception comme une autre, pas un stock « tombé du ciel ».
          useStockStore.getState().record([
            createMovement({
              type: 'purchase',
              product: { id: product.id, name: product.name, stock: 0 },
              delta: product.stock,
              reason: 'Stock initial',
              by: currentActor(),
            }),
          ]);
        }
        syncRemote((api) => api.products.create(product), 'Produit non synchronisé.');
      },

      updateProduct: (id, patch) => {
        // Défense en profondeur : même si un appelant glisse `stock` dans le patch (le type l'interdit),
        // une fiche ne modifie jamais le stock (RG-05).
        const safe: ProductPatch & { stock?: number } = { ...patch };
        delete safe.stock;
        set((state) => ({
          products: state.products.map((product) =>
            product.id === id ? sanitizeProduct({ ...product, ...safe, id }) : product
          ),
        }));
        syncRemote((api) => api.products.update(id, safe), 'Modification non synchronisée.');
      },

      deactivateProduct: (id) => {
        const target = get().products.find((product) => product.id === id);
        if (!target) throw new Error(`Produit introuvable (${id}).`);
        if (target.deactivatedAt !== undefined) return;
        const stamped: Product = {
          ...target,
          deactivatedAt: new Date().toISOString(),
          deactivatedBy: currentActor().name,
        };
        set((state) => ({
          products: state.products.map((product) => (product.id === id ? sanitizeProduct(stamped) : product)),
        }));
        syncRemote((api) => api.products.deactivate(id), 'Désactivation non synchronisée.');
      },

      reactivateProduct: (id) => {
        const target = get().products.find((product) => product.id === id);
        if (!target) throw new Error(`Produit introuvable (${id}).`);
        if (target.deactivatedAt === undefined) return;
        const taken = get().products.some(
          (product) =>
            product.id !== id &&
            product.deactivatedAt === undefined &&
            product.name.trim().toLowerCase() === target.name.trim().toLowerCase()
        );
        if (taken) throw new Error(t.stock.deactivate.nameTaken(target.name));
        const restored: Product = { ...target };
        delete restored.deactivatedAt;
        delete restored.deactivatedBy;
        set((state) => ({
          products: state.products.map((product) => (product.id === id ? sanitizeProduct(restored) : product)),
        }));
        syncRemote((api) => api.products.reactivate(id), 'Réactivation non synchronisée.');
      },

      restock: (id, quantity, reason) => {
        if (!Number.isFinite(quantity) || quantity <= 0) {
          throw new Error('La quantité à réapprovisionner doit être supérieure à zéro.');
        }
        const target = get().products.find((product) => product.id === id);
        if (!target) throw new Error(`Produit introuvable (${id}).`);
        const { product: received, movement } = receiveStock(target, quantity, currentActor(), reason);
        set((state) => ({
          products: state.products.map((product) => (product.id === id ? sanitizeProduct(received) : product)),
        }));
        useStockStore.getState().record([movement]);
        syncRemote((api) => api.products.restock(id, quantity, reason), 'Réapprovisionnement non synchronisé.');
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
  products.filter(
    (product) =>
      isActiveProduct(product) && computeStockStatus(product.stock, product.minStockAlert) === 'rupture'
  );

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
  if (typeof value.imageAlt === 'string') product.imageAlt = value.imageAlt;
  const deactivatedAt = coerceString(value.deactivatedAt).trim();
  if (deactivatedAt.length > 0) {
    product.deactivatedAt = deactivatedAt;
    const by = coerceString(value.deactivatedBy).trim();
    if (by.length > 0) product.deactivatedBy = by;
  }
  return product;
}
