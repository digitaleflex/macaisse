// Store des ventes. La validation d'une vente et la décrémentation du stock sont
// calculées par `@/domain/sales` ; ce store ne fait qu'orchestrer les stores.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PaymentMethod, SaleTransaction, SeriesPoint } from '@/types';
import { nextSaleNumber } from '@/domain/ids';
import { isSameDay, parseDate } from '@/domain/dates';
import { creditFromSale } from '@/domain/credits';
import { completeSale as buildSale } from '@/domain/sales';
import { dailyRevenueSeries } from '@/domain/finances';
import { t } from '@/content';
import { SEED_SALES } from '@/mocks';
import { syncRemote } from '@/services';
import { useCartStore } from './useCartStore';
import { useCreditsStore } from './useCreditsStore';
import { useProductsStore } from './useProductsStore';
import {
  coerceId,
  coerceNumber,
  coerceString,
  isPaymentMethod,
  isRecord,
  isSaleStatus,
  migrateList,
  PERSIST_NAMES,
  persistOptions,
  seedFallback,
} from './storeUtils';

export interface CompleteSaleActionInput {
  paymentMethod: PaymentMethod;
  clientName?: string;
  creditAmount?: number;
}

export interface SalesState {
  sales: SaleTransaction[];
  /** Compteur monotone de numérotation (persisté). */
  sequence: number;
  /**
   * Valide la vente du panier courant : calcule via le domaine, décrémente le
   * stock, ajoute la vente, incrémente la séquence et vide le panier.
   * Refuse (exception française) un panier vide ou un stock insuffisant.
   */
  completeSale: (input: CompleteSaleActionInput) => SaleTransaction;
}

export const useSalesStore = create<SalesState>()(
  persist(
    (set, get) => ({
      sales: seedFallback(SEED_SALES).map((sale) => ({ ...sale })),
      sequence: 0,

      completeSale: (input) => {
        const { lines } = useCartStore.getState();
        const { products } = useProductsStore.getState();
        const sequence = get().sequence + 1;
        const now = new Date();

        // Le domaine valide le stock et calcule la vente AVANT toute mutation.
        const { sale, products: updatedProducts } = buildSale({
          lines,
          products,
          paymentMethod: input.paymentMethod,
          clientName: input.clientName,
          creditAmount: input.creditAmount,
          date: now,
          saleNumber: nextSaleNumber(sequence, now),
        });

        // Règlement partiel : la créance naît de la vente, dans le même mouvement.
        // Elle est transmise au serveur avec la vente (transaction unique) d'où
        // l'insertion locale sans synchronisation propre.
        const credit =
          sale.remainingAmount !== undefined && sale.remainingAmount > 0
            ? useCreditsStore.getState().addCredit(
                creditFromSale({
                  clientName: sale.clientName ?? '',
                  amount: sale.remainingAmount,
                  date: now,
                  place: t.credits.form.defaultPlace,
                }),
                { remote: false }
              )
            : undefined;

        // Écriture atomique du stock (un seul set).
        useProductsStore.getState().setProducts(updatedProducts);
        useCartStore.getState().clear();
        set((state) => ({ sales: [sale, ...state.sales], sequence }));
        syncRemote(
          (api) => api.sales.create(credit ? { sale, lines, credit } : { sale, lines }),
          'Vente non synchronisée.'
        );

        return sale;
      },
    }),
    persistOptions<SalesState, { sales: SaleTransaction[]; sequence: number }>(
      PERSIST_NAMES.sales,
      (state) => ({ sales: state.sales, sequence: state.sequence }),
      (persisted) => {
        const record = isRecord(persisted) ? persisted : {};
        const rawSequence = coerceNumber(record.sequence, 0);
        return {
          sales: migrateList(persisted, 'sales', toSale, seedFallback(SEED_SALES)),
          sequence: rawSequence >= 0 ? Math.trunc(rawSequence) : 0,
        };
      }
    )
  )
);

// ---------------------------------------------------------------------------
// Sélecteurs
// ---------------------------------------------------------------------------

/** Ventes du jour (comparaison de date locale via le domaine). */
export const selectTodaySales = (state: SalesState, now: Date = new Date()): SaleTransaction[] =>
  state.sales.filter((sale) => {
    const date = parseDate(sale.date);
    return date !== null && isSameDay(date, now);
  });

/** Fabrique de sélecteur : série des revenus journaliers sur `days` jours. */
export const selectRevenueSeries =
  (days: number) =>
  (state: SalesState): SeriesPoint[] =>
    dailyRevenueSeries(state.sales, days);

/** Ventes les plus récentes (tête de liste, la plus récente en premier). */
export const selectRecentSales = (state: SalesState, limit: number): SaleTransaction[] =>
  state.sales.slice(0, Math.max(0, limit));

// ---------------------------------------------------------------------------
// Migration v1 (ids numériques) → v2
// ---------------------------------------------------------------------------

function toSale(value: unknown): SaleTransaction | null {
  if (!isRecord(value)) return null;
  const id = coerceId(value.id);
  if (!id || !isPaymentMethod(value.paymentMethod)) return null;

  const sale: SaleTransaction = {
    id,
    saleNumber: coerceString(value.saleNumber),
    time: coerceString(value.time),
    date: coerceString(value.date),
    paymentMethod: value.paymentMethod,
    amount: coerceNumber(value.amount),
    status: isSaleStatus(value.status) ? value.status : 'Validé',
    itemsCount: coerceNumber(value.itemsCount),
  };

  const clientName = coerceString(value.clientName).trim();
  if (clientName.length > 0) sale.clientName = clientName;

  const remainingAmount = coerceNumber(value.remainingAmount, Number.NaN);
  if (Number.isFinite(remainingAmount)) sale.remainingAmount = remainingAmount;

  return sale;
}
