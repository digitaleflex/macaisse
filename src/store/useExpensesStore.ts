// Store des dépenses. Le filtrage par période s'appuie sur les utilitaires de
// dates purs de `@/domain/dates`.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Expense } from '@/types';
import { createId } from '@/domain/ids';
import { parseDate, toIsoDate } from '@/domain/dates';
import { SEED_EXPENSES } from '@/data/seed';
import {
  coerceId,
  coerceNumber,
  coerceString,
  isRecord,
  migrateList,
  PERSIST_NAMES,
  persistOptions,
} from './storeUtils';

export type ExpenseInput = Omit<Expense, 'id'>;

export interface ExpensesState {
  expenses: Expense[];
  addExpense: (input: ExpenseInput) => void;
  removeExpense: (id: string) => void;
  setExpenses: (expenses: Expense[]) => void;
}

export const useExpensesStore = create<ExpensesState>()(
  persist(
    (set) => ({
      expenses: SEED_EXPENSES.map((expense) => ({ ...expense })),

      addExpense: (input) =>
        set((state) => ({
          expenses: [{ ...input, id: createId('expense') }, ...state.expenses],
        })),

      removeExpense: (id) =>
        set((state) => ({ expenses: state.expenses.filter((expense) => expense.id !== id) })),

      setExpenses: (expenses) => set({ expenses }),
    }),
    persistOptions<ExpensesState, { expenses: Expense[] }>(
      PERSIST_NAMES.expenses,
      (state) => ({ expenses: state.expenses }),
      (persisted) => ({
        expenses: migrateList(persisted, 'expenses', toExpense, SEED_EXPENSES),
      })
    )
  )
);

// ---------------------------------------------------------------------------
// Sélecteurs
// ---------------------------------------------------------------------------

/** Dépenses dont la date tombe dans l'intervalle [from, to] (bornes incluses). */
export function expensesInRange(expenses: Expense[], from: Date, to: Date): Expense[] {
  const fromKey = toIsoDate(from);
  const toKey = toIsoDate(to);
  return expenses.filter((expense) => {
    const date = parseDate(expense.date);
    if (date === null) return false;
    const key = toIsoDate(date);
    return key >= fromKey && key <= toKey;
  });
}

/** Fabrique de sélecteur bornant les dépenses sur une période. */
export const selectExpensesInRange =
  (from: Date, to: Date) =>
  (state: ExpensesState): Expense[] =>
    expensesInRange(state.expenses, from, to);

// ---------------------------------------------------------------------------
// Migration v1 (ids numériques) → v2
// ---------------------------------------------------------------------------

function toExpense(value: unknown): Expense | null {
  if (!isRecord(value)) return null;
  const id = coerceId(value.id);
  const title = coerceString(value.title).trim();
  if (!id || title.length === 0) return null;

  const expense: Expense = {
    id,
    title,
    date: coerceString(value.date),
    amount: coerceNumber(value.amount),
    category: coerceString(value.category, 'Divers'),
    paymentMethod: coerceString(value.paymentMethod),
  };

  const time = coerceString(value.time).trim();
  if (time.length > 0) expense.time = time;
  if (typeof value.status === 'string') expense.status = value.status;
  if (typeof value.hasReceipt === 'boolean') expense.hasReceipt = value.hasReceipt;

  return expense;
}
