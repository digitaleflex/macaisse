// Store du panier. Les calculs et mutations de lignes sont délégués à
// `@/domain/sales` (addToCart, setCartQuantity, removeFromCart, cartTotals).

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartLine, Product } from '@/types';
import { addToCart, cartTotals, removeFromCart, setCartQuantity } from '@/domain/sales';
import type { CartTotals } from '@/domain/sales';
import { computeStockStatus } from '@/domain/stock';
import {
  coerceId,
  coerceNumber,
  coerceString,
  isRecord,
  migrateList,
  PERSIST_NAMES,
  persistOptions,
} from './storeUtils';

export interface CartState {
  lines: CartLine[];
  /** Rejette (exception française) un produit en rupture de stock. */
  addItem: (product: Product, qty?: number) => void;
  setQuantity: (productId: string, qty: number) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      lines: [],

      addItem: (product, qty = 1) => {
        if (computeStockStatus(product.stock, product.minStockAlert) === 'rupture') {
          throw new Error(`« ${product.name} » est en rupture de stock.`);
        }
        set((state) => ({ lines: addToCart(state.lines, product, qty) }));
      },

      setQuantity: (productId, qty) =>
        set((state) => ({ lines: setCartQuantity(state.lines, productId, qty) })),

      removeItem: (productId) =>
        set((state) => ({ lines: removeFromCart(state.lines, productId) })),

      clear: () => set({ lines: [] }),
    }),
    persistOptions<CartState, { lines: CartLine[] }>(
      PERSIST_NAMES.cart,
      (state) => ({ lines: state.lines }),
      (persisted) => ({
        lines: migrateList(persisted, 'lines', toCartLine, []),
      })
    )
  )
);

/** Totaux du panier (sous-total + nombre d'articles), calculés par le domaine. */
export const selectCartTotals = (state: CartState): CartTotals => cartTotals(state.lines);

/** Nombre total d'articles (badge du panier). */
export const selectCartItemCount = (state: CartState): number => cartTotals(state.lines).itemCount;

// ---------------------------------------------------------------------------
// Migration v1 (ids numériques) → v2
// ---------------------------------------------------------------------------

function toCartLine(value: unknown): CartLine | null {
  if (!isRecord(value)) return null;
  const productId = coerceId(value.productId);
  const name = coerceString(value.name);
  const quantity = coerceNumber(value.quantity);
  if (!productId || name.length === 0 || quantity <= 0) return null;
  return {
    productId,
    name,
    price: coerceNumber(value.price),
    quantity,
    unit: coerceString(value.unit),
  };
}
