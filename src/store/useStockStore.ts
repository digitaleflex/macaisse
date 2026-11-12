// Journal des mouvements de stock (EF-19, RG-05). En mode `mock` ce store fait foi ; en mode
// `http` le serveur tient le journal et l'écran le relit (voir `features/stock`).
// Ce store ne dépend d'aucun autre store métier : les stores produits et ventes l'alimentent.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { StockMovement, StockMovementType } from '@/types';
import { STOCK_MOVEMENT_TYPES } from '@/config/reference';
import {
  coerceId,
  coerceNumber,
  coerceString,
  isRecord,
  migrateList,
  PERSIST_NAMES,
  persistOptions,
} from './storeUtils';

/** Plafond local : au-delà, les mouvements les plus anciens sortent du navigateur (le serveur garde tout). */
export const MAX_LOCAL_MOVEMENTS = 1000;

/** Dernier inventaire réalisé (affiché sur la carte « Inventaire »). */
export interface InventorySummary {
  /** ISO 8601. */
  at: string;
  by: string;
  /** Produits comptés. */
  counted: number;
  /** Produits dont le stock a été corrigé. */
  variances: number;
}

export interface StockState {
  movements: StockMovement[];
  lastInventory: InventorySummary | null;
  /** Ajoute des mouvements (les plus récents d'abord). */
  record: (movements: readonly StockMovement[]) => void;
  setLastInventory: (summary: InventorySummary) => void;
}

export const useStockStore = create<StockState>()(
  persist(
    (set) => ({
      movements: [],
      lastInventory: null,

      record: (movements) => {
        if (movements.length === 0) return;
        set((state) => ({
          movements: [...[...movements].reverse(), ...state.movements].slice(0, MAX_LOCAL_MOVEMENTS),
        }));
      },

      setLastInventory: (lastInventory) => set({ lastInventory }),
    }),
    persistOptions<StockState, Pick<StockState, 'movements' | 'lastInventory'>>(
      PERSIST_NAMES.stockMovements,
      (state) => ({ movements: state.movements, lastInventory: state.lastInventory }),
      (persisted) => ({
        movements: migrateList(persisted, 'movements', toMovement, []),
        lastInventory: toInventorySummary(isRecord(persisted) ? persisted.lastInventory : null),
      })
    )
  )
);

const TYPE_SET: ReadonlySet<string> = new Set(STOCK_MOVEMENT_TYPES);

function toMovement(value: unknown): StockMovement | null {
  if (!isRecord(value)) return null;
  const id = coerceId(value.id);
  const productId = coerceId(value.productId);
  const quantity = coerceNumber(value.quantity, Number.NaN);
  if (!id || !productId || !TYPE_SET.has(String(value.type)) || !Number.isInteger(quantity) || quantity === 0) {
    return null;
  }
  const movement: StockMovement = {
    id,
    type: value.type as StockMovementType,
    productId,
    productName: coerceString(value.productName),
    quantity,
    quantityAfter: coerceNumber(value.quantityAfter),
    userName: coerceString(value.userName),
    createdAt: coerceString(value.createdAt),
  };
  for (const key of ['reason', 'saleId', 'saleNumber', 'userId'] as const) {
    const text = coerceString(value[key]).trim();
    if (text.length > 0) movement[key] = text;
  }
  return movement;
}

function toInventorySummary(value: unknown): InventorySummary | null {
  if (!isRecord(value)) return null;
  const at = coerceString(value.at);
  if (at.length === 0) return null;
  return {
    at,
    by: coerceString(value.by),
    counted: coerceNumber(value.counted),
    variances: coerceNumber(value.variances),
  };
}
