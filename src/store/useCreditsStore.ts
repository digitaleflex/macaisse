// Store des crédits clients. Statut, paiements et synthèse sont calculés par
// `@/domain/credits`.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ClientCredit } from '@/types';
import { createId } from '@/domain/ids';
import { applyPayment, computeCreditStatus, creditSummary, daysLate } from '@/domain/credits';
import type { CreditSummary } from '@/domain/credits';
import { SEED_CREDITS } from '@/data/seed';
import {
  coerceId,
  coerceNumber,
  coerceString,
  isCreditStatus,
  isRecord,
  migrateList,
  PERSIST_NAMES,
  persistOptions,
} from './storeUtils';

/** Entrée de création : le statut et le retard sont dérivés par le domaine. */
export type CreditInput = Omit<ClientCredit, 'id' | 'status' | 'daysLate'>;

export interface CreditsState {
  credits: ClientCredit[];
  addCredit: (input: CreditInput) => void;
  /** Rejette (exception française) un montant ≤ 0 ou un sur-paiement. */
  payCredit: (id: string, amount: number) => void;
  markSettled: (id: string) => void;
  removeCredit: (id: string) => void;
}

export const useCreditsStore = create<CreditsState>()(
  persist(
    (set) => ({
      credits: SEED_CREDITS.map((credit) => ({ ...credit })),

      addCredit: (input) => {
        const late = daysLate(input.dueDate);
        const credit: ClientCredit = {
          ...input,
          id: createId('credit'),
          status: computeCreditStatus(input.remainingAmount, input.totalInitial, input.dueDate),
        };
        if (late > 0) credit.daysLate = late;
        set((state) => ({ credits: [credit, ...state.credits] }));
      },

      payCredit: (id, amount) =>
        set((state) => ({
          credits: state.credits.map((credit) =>
            credit.id === id ? applyPayment(credit, amount) : credit
          ),
        })),

      markSettled: (id) =>
        set((state) => ({
          credits: state.credits.map((credit) => {
            if (credit.id !== id || credit.remainingAmount <= 0) return credit;
            return applyPayment(credit, credit.remainingAmount);
          }),
        })),

      removeCredit: (id) =>
        set((state) => ({ credits: state.credits.filter((credit) => credit.id !== id) })),
    }),
    persistOptions<CreditsState, { credits: ClientCredit[] }>(
      PERSIST_NAMES.credits,
      (state) => ({ credits: state.credits }),
      (persisted) => ({
        credits: migrateList(persisted, 'credits', toCredit, SEED_CREDITS),
      })
    )
  )
);

// ---------------------------------------------------------------------------
// Sélecteurs
// ---------------------------------------------------------------------------

/** Crédits non soldés. */
export const selectActiveCredits = (state: CreditsState, now: Date = new Date()): ClientCredit[] =>
  state.credits.filter(
    (credit) =>
      computeCreditStatus(credit.remainingAmount, credit.totalInitial, credit.dueDate, now) !==
      'Réglé'
  );

/** Crédits échus. */
export const selectOverdueCredits = (state: CreditsState, now: Date = new Date()): ClientCredit[] =>
  state.credits.filter(
    (credit) =>
      computeCreditStatus(credit.remainingAmount, credit.totalInitial, credit.dueDate, now) ===
      'En retard'
  );

/** Synthèse agrégée du carnet de crédits (délègue à `@/domain/credits`). */
export const selectCreditSummary = (state: CreditsState, now: Date = new Date()): CreditSummary =>
  creditSummary(state.credits, now);

/** Total des restes dus. */
export const selectTotalOutstanding = (state: CreditsState): number =>
  state.credits.reduce((sum, credit) => sum + Math.max(0, credit.remainingAmount), 0);

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
