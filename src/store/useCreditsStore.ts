// Store des crédits clients. Statut, paiements et synthèse sont calculés par
// `@/domain/credits`.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ClientCredit } from '@/types';
import { createId } from '@/domain/ids';
import { applyPayment, computeCreditStatus, daysLate } from '@/domain/credits';
import { SEED_CREDITS } from '@/mocks';
import { t } from '@/content';
import { syncRemote } from '@/services';
import { useNotificationsStore } from './useNotificationsStore';
import {
  coerceId,
  coerceNumber,
  coerceString,
  isCreditStatus,
  isRecord,
  migrateList,
  PERSIST_NAMES,
  persistOptions,
  seedFallback,
} from './storeUtils';

/** Entrée de création : le statut et le retard sont dérivés par le domaine. */
export type CreditInput = Omit<ClientCredit, 'id' | 'status' | 'daysLate'>;

export interface CreditsState {
  credits: ClientCredit[];
  /**
   * Ajoute une créance et renvoie l'objet créé (identifiant et statut inclus).
   * `options.remote === false` : insertion locale seule, utilisée par une vente
   * qui transmet déjà la créance au serveur (évite un double POST).
   */
  addCredit: (input: CreditInput, options?: { remote?: boolean }) => ClientCredit;
  /** Rejette (exception française) un montant ≤ 0 ou un sur-paiement. */
  payCredit: (id: string, amount: number) => void;
  markSettled: (id: string) => void;
  removeCredit: (id: string) => void;
}

export const useCreditsStore = create<CreditsState>()(
  persist(
    (set, get) => ({
      credits: seedFallback(SEED_CREDITS).map((credit) => ({ ...credit })),

      addCredit: (input, options = {}) => {
        const late = daysLate(input.dueDate);
        const credit: ClientCredit = {
          ...input,
          id: createId('credit'),
          status: computeCreditStatus(input.remainingAmount, input.totalInitial, input.dueDate),
        };
        if (late > 0) credit.daysLate = late;
        set((state) => ({ credits: [credit, ...state.credits] }));
        if (options.remote !== false) {
          syncRemote((api) => api.credits.create(credit), 'Crédit non synchronisé.');
        }
        return credit;
      },

      payCredit: (id, amount) => {
        const settled = (() => {
          const current = get().credits.find((credit) => credit.id === id);
          return current !== undefined && amount >= current.remainingAmount ? current : null;
        })();
        set((state) => ({
          credits: state.credits.map((credit) =>
            credit.id === id ? applyPayment(credit, amount) : credit
          ),
        }));
        if (settled) {
          useNotificationsStore.getState().push({
            title: t.notifications.feed.creditSettled(settled.clientName),
            description: t.notifications.feed.creditSettledText,
            type: 'success',
            relatedTab: 'credits',
          });
        }
        syncRemote((api) => api.credits.pay(id, amount), 'Règlement non synchronisé.');
      },

      markSettled: (id) => {
        const target = get().credits.find((credit) => credit.id === id);
        if (!target || target.remainingAmount <= 0) return;
        const amount = target.remainingAmount;
        set((state) => ({
          credits: state.credits.map((credit) =>
            credit.id === id ? applyPayment(credit, amount) : credit
          ),
        }));
        syncRemote((api) => api.credits.pay(id, amount), 'Règlement non synchronisé.');
      },

      removeCredit: (id) => {
        set((state) => ({ credits: state.credits.filter((credit) => credit.id !== id) }));
        syncRemote((api) => api.credits.remove(id), 'Suppression non synchronisée.');
      },
    }),
    persistOptions<CreditsState, { credits: ClientCredit[] }>(
      PERSIST_NAMES.credits,
      (state) => ({ credits: state.credits }),
      (persisted) => ({
        credits: migrateList(persisted, 'credits', toCredit, seedFallback(SEED_CREDITS)),
      })
    )
  )
);

// ---------------------------------------------------------------------------
// Migration v1 (ids numériques) → v2
// ---------------------------------------------------------------------------

function toCredit(value: unknown): ClientCredit | null {
  if (!isRecord(value)) return null;
  const id = coerceId(value.id);
  const clientName = coerceString(value.clientName).trim();
  if (!id || clientName.length === 0) return null;

  const remainingAmount = coerceNumber(value.remainingAmount);
  const totalInitial = coerceNumber(value.totalInitial, remainingAmount);
  const dueDate = coerceString(value.dueDate);

  const credit: ClientCredit = {
    id,
    clientName,
    initials: coerceString(value.initials),
    shopOrLocation: coerceString(value.shopOrLocation),
    phone: coerceString(value.phone),
    remainingAmount,
    totalInitial,
    dueDate,
    status: isCreditStatus(value.status)
      ? value.status
      : computeCreditStatus(remainingAmount, totalInitial, dueDate),
  };

  const late = coerceNumber(value.daysLate, Number.NaN);
  if (Number.isFinite(late)) credit.daysLate = Math.max(0, Math.trunc(late));

  return credit;
}

export function alertOverdueCredits(): void {
  const credits = useCreditsStore.getState().credits;
  const push = useNotificationsStore.getState().push;
  for (const credit of credits) {
    if (computeCreditStatus(credit.remainingAmount, credit.totalInitial, credit.dueDate) === 'En retard') {
      push({
        title: t.notifications.feed.creditOverdue(credit.clientName),
        description: t.notifications.feed.creditOverdueText,
        type: 'warning',
        relatedTab: 'credits',
      });
    }
  }
}

