// Store des ventes. La validation d'une vente et la décrémentation du stock sont
// calculées par `@/domain/sales` ; ce store ne fait qu'orchestrer les stores.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartLine, PaymentMethod, SaleTransaction } from '@/types';
import { nextSaleNumber } from '@/domain/ids';
import { creditFromSale } from '@/domain/credits';
import {
  assessCancellation,
  cancelSale as buildCancellation,
  completeSale as buildSale,
  type CancelDenial,
} from '@/domain/sales';
import { personDisplayName } from '@/domain/users';
import { t } from '@/content';
import { formatFCFA } from '@/domain/money';
import { SEED_SALES } from '@/mocks';
import { api, syncRemote } from '@/services';
import { useCartStore } from './useCartStore';
import { useCreditsStore } from './useCreditsStore';
import { useNotificationsStore } from './useNotificationsStore';
import { useProductsStore } from './useProductsStore';
import { useSessionStore } from './useSessionStore';
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
  /**
   * Annule une vente (EF-15) : motif obligatoire, auteur et date tracés, stock
   * remis, crédit lié supprimé. La vente reste dans l'historique. En mode `http`
   * le serveur arbitre d'abord ; en cas de refus, rien n'est modifié localement.
   * Rejette (exception française) un refus de règle ou une erreur serveur.
   */
  cancelSale: (saleId: string, reason: string) => Promise<SaleTransaction>;
}

const CANCEL_DENIAL_MESSAGES: Record<CancelDenial, string> = {
  'already-cancelled': t.sales.cancel.errors.alreadyCancelled,
  role: t.sales.cancel.errors.role,
  window: t.sales.cancel.errors.window,
  'credit-repaid': t.sales.cancel.errors.creditRepaid,
};

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
        // l'insertion locale sans synchronisation propre. Elle garde l'id de la
        // vente pour pouvoir être traitée si la vente est annulée (EF-16).
        const credit =
          sale.remainingAmount !== undefined && sale.remainingAmount > 0
            ? useCreditsStore.getState().addCredit(
                creditFromSale({
                  clientName: sale.clientName ?? '',
                  amount: sale.remainingAmount,
                  date: now,
                  place: t.credits.form.defaultPlace,
                  saleId: sale.id,
                }),
                { remote: false }
              )
            : undefined;

        // Écriture atomique du stock (un seul set).
        useProductsStore.getState().setProducts(updatedProducts);
        useCartStore.getState().clear();

        // Événements métier : on ne notifie que les transitions (pas chaque vente).
        const notifications = useNotificationsStore.getState();
        if (credit) {
          notifications.push({
            title: t.notifications.feed.creditCreated(sale.clientName ?? ''),
            description: t.notifications.feed.creditCreatedText(
              formatFCFA(sale.remainingAmount ?? 0)
            ),
            type: 'info',
            relatedTab: 'credits',
          });
        }
        for (const updated of updatedProducts) {
          const before = products.find((product) => product.id === updated.id);
          if (before && before.stock > 0 && updated.stock === 0) {
            notifications.push({
              title: t.notifications.feed.stockOut(updated.name),
              description: t.notifications.feed.stockOutText,
              type: 'alert',
              relatedTab: 'stock',
            });
          }
        }
        const stored: SaleTransaction = credit ? { ...sale, creditId: credit.id } : sale;
        set((state) => ({ sales: [stored, ...state.sales], sequence }));
        // Le détail des lignes part dans `lines` ; la copie locale n'est pas dupliquée.
        const wireSale: SaleTransaction = { ...stored };
        delete wireSale.lines;
        syncRemote(
          (client) => client.sales.create(credit ? { sale: wireSale, lines, credit } : { sale: wireSale, lines }),
          'Vente non synchronisée.'
        );

        return stored;
      },

      cancelSale: async (saleId, reason) => {
        const sale = get().sales.find((item) => item.id === saleId);
        if (!sale) throw new Error(t.sales.cancel.errors.notFound);

        const session = useSessionStore.getState().session;
        if (!session) throw new Error(t.sales.cancel.errors.role);
        const credits = useCreditsStore.getState().credits;
        const credit =
          credits.find((item) => item.id === sale.creditId) ?? credits.find((item) => item.saleId === sale.id);

        // 1. Règles métier (droits, jour, crédit remboursé) : refus avant tout effet.
        const assessment = assessCancellation({ sale, credit, role: session.role });
        if (!assessment.allowed && assessment.denial) {
          throw new Error(CANCEL_DENIAL_MESSAGES[assessment.denial]);
        }

        // 2. Calcul local complet (valide aussi le motif) AVANT toute mutation.
        const by = personDisplayName(session.user.firstName, session.user.lastName);
        const result = buildCancellation({
          sale,
          products: useProductsStore.getState().products,
          reason,
          by,
        });

        // 3. Mode http : le serveur arbitre d'abord (aucune annulation optimiste,
        //    la vente est une écriture sensible). Un refus remonte à l'écran.
        if (api.mode === 'http') {
          await api.sales.cancel(saleId, result.sale.cancelReason ?? reason);
        }

        // 4. Application locale : stock, crédit lié, vente.
        useProductsStore.getState().setProducts(result.products);
        if (api.mode === 'http' && !result.stockRestored) {
          // Détail des lignes inconnu côté client : le serveur a remis le stock, on le relit.
          useProductsStore.getState().setProducts(await api.products.list());
        }
        if (credit) {
          useCreditsStore.setState((state) => ({
            credits: state.credits.filter((item) => item.id !== credit.id),
          }));
        }
        set((state) => ({
          sales: state.sales.map((item) => (item.id === saleId ? result.sale : item)),
        }));
        useNotificationsStore.getState().push({
          title: t.notifications.feed.saleCancelled(sale.saleNumber),
          description: t.notifications.feed.saleCancelledText(by),
          type: 'info',
          relatedTab: 'ventes',
        });
        return result.sale;
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

  const creditId = coerceString(value.creditId);
  if (creditId.length > 0) sale.creditId = creditId;

  const lines = toCartLines(value.lines);
  if (lines) sale.lines = lines;

  if (sale.status === 'Annulée') {
    sale.cancelledAt = coerceString(value.cancelledAt);
    sale.cancelledBy = coerceString(value.cancelledBy);
    sale.cancelReason = coerceString(value.cancelReason);
  }

  return sale;
}

function toCartLines(value: unknown): CartLine[] | null {
  if (!Array.isArray(value)) return null;
  const lines: CartLine[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) return null;
    const productId = coerceId(entry.productId);
    if (!productId) return null;
    lines.push({
      productId,
      name: coerceString(entry.name),
      price: coerceNumber(entry.price),
      quantity: coerceNumber(entry.quantity),
      unit: coerceString(entry.unit),
    });
  }
  return lines;
}
