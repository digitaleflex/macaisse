import { useState } from 'react';
import { t } from '@/content';
import { EXPENSE_CATEGORIES } from '@/config/reference';
import { formatFCFA } from '@/domain/money';
import { toIsoDate } from '@/domain/dates';
import { expensesInRange, useExpensesStore } from '@/store/useExpensesStore';
import { useUiStore } from '@/store/useUiStore';
import { Button, Chip, Modal } from '@/ui';
import { ExpenseForm, type ExpenseFormValues } from './ExpenseForm';
import { ExpenseList } from './ExpenseList';

/** Modale globale des dépenses (pilotée par `useUiStore.modal === 'depenses'`). */
export function DepensesModal() {
  const open = useUiStore((state) => state.modal === 'depenses');
  const closeModal = useUiStore((state) => state.closeModal);
  const showToast = useUiStore((state) => state.showToast);
  const expenses = useExpensesStore((state) => state.expenses);
  const addExpense = useExpensesStore((state) => state.addExpense);
  const removeExpense = useExpensesStore((state) => state.removeExpense);

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [showAddForm, setShowAddForm] = useState(false);

  // Les données historiques utilisent « Stock » pour « Achat Stock ».
  const matches = (category: string) =>
    activeCategory === 'all' || category === activeCategory || (activeCategory === 'Achat Stock' && category === 'Stock');
  const filteredExpenses = expenses.filter((expense) => matches(expense.category));

  const now = new Date();
  const monthly = expensesInRange(expenses, new Date(now.getFullYear(), now.getMonth(), 1), new Date(now.getFullYear(), now.getMonth() + 1, 0));
  const monthlyTotal = monthly.reduce((sum, expense) => sum + expense.amount, 0);

  const handleAddExpense = (values: ExpenseFormValues) => {
    addExpense({
      title: values.title,
      category: values.category,
      amount: values.amount,
      date: toIsoDate(new Date()),
      paymentMethod: t.expenses.form.defaultMethod,
      hasReceipt: values.hasReceipt,
    });
    showToast(t.expenses.added(formatFCFA(values.amount)), 'success');
    setShowAddForm(false);
  };

  return (
    <Modal open={open} onClose={closeModal} title={t.expenses.title} subtitle={t.expenses.subtitle} icon="receipt_long" size="lg">
      <div className="flex items-center justify-between gap-4 rounded-2xl bg-rose-50 border border-rose-100 p-4">
        <div>
          <div className="text-xs text-rose-700/80">{t.expenses.monthTotal}</div>
          <div className="font-num font-extrabold text-2xl text-rose-700">−{formatFCFA(monthlyTotal)}</div>
          <div className="text-xs text-rose-700/70">{t.expenses.monthCount(monthly.length)}</div>
        </div>
        {!showAddForm && (
          <Button variant="primary" icon="add" onClick={() => setShowAddForm(true)}>
            {t.expenses.add}
          </Button>
        )}
      </div>

      {showAddForm && <ExpenseForm onSubmit={handleAddExpense} onCancel={() => setShowAddForm(false)} />}

      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-5 px-5 sm:-mx-6 sm:px-6">
        <Chip active={activeCategory === 'all'} onClick={() => setActiveCategory('all')}>
          {t.expenses.all}
        </Chip>
        {EXPENSE_CATEGORIES.map((category) => (
          <Chip key={category} active={activeCategory === category} onClick={() => setActiveCategory(category)}>
            {category}
          </Chip>
        ))}
      </div>

      <ExpenseList
        expenses={filteredExpenses}
        onDelete={(id) => {
          removeExpense(id);
          showToast(t.expenses.removed, 'success');
        }}
      />
    </Modal>
  );
}
