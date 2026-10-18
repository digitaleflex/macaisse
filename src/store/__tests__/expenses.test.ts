import { beforeEach, describe, expect, it } from 'vitest';
import type { Expense } from '@/types';
import { expensesInRange, selectExpensesInRange, useExpensesStore } from '../useExpensesStore';

function makeExpense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: 'e1',
    title: 'Facture CIE',
    date: '2024-10-18',
    amount: 35000,
    category: 'Factures',
    paymentMethod: 'Espèces',
    ...overrides,
  };
}

beforeEach(() => {
  useExpensesStore.setState({ expenses: [] });
});

describe('useExpensesStore', () => {
  it('ajoute puis supprime une dépense', () => {
    useExpensesStore.getState().addExpense({
      title: 'Achat cartons',
      date: '2024-10-18',
      amount: 180000,
      category: 'Stock',
      paymentMethod: 'Wave',
    });

    const [expense] = useExpensesStore.getState().expenses;
    expect(expense.id).toMatch(/^expense-/);

    useExpensesStore.getState().removeExpense(expense.id);
    expect(useExpensesStore.getState().expenses).toHaveLength(0);
  });

  it('selectExpensesInRange borne la période (bornes incluses)', () => {
    useExpensesStore.setState({
      expenses: [
        makeExpense({ id: 'e1', date: '2024-10-18' }),
        makeExpense({ id: 'e2', date: '2024-10-01' }),
        makeExpense({ id: 'e3', date: '2024-09-30' }),
      ],
    });

    const from = new Date(2024, 9, 1);
    const to = new Date(2024, 9, 18);
    const selected = selectExpensesInRange(from, to)(useExpensesStore.getState());

    expect(selected.map((e) => e.id)).toEqual(['e1', 'e2']);
    expect(
      expensesInRange(useExpensesStore.getState().expenses, from, to).map((e) => e.id)
    ).toEqual(['e1', 'e2']);
  });
});
