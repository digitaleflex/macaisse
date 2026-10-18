import { useState } from 'react';
import { Modal } from '@/ui';
import { useUiStore } from '@/store/useUiStore';
import { expensesInRange, useExpensesStore } from '@/store/useExpensesStore';
import { formatFCFA } from '@/domain/money';
import { toIsoDate } from '@/domain/dates';
import { ExpenseForm, type ExpenseFormValues } from './ExpenseForm';
import { ExpenseList } from './ExpenseList';

const CATEGORY_FILTERS = ['Tous', 'Achat Stock', 'Transport', 'Factures', 'Divers'] as const;

/**
 * Modale globale des dépenses. Aucune prop métier : l'ouverture est pilotée par
 * `useUiStore` (`modal === 'depenses'`) et les données viennent de `useExpensesStore`.
 */
export function DepensesModal() {
  const open = useUiStore((state) => state.modal === 'depenses');
  const closeModal = useUiStore((state) => state.closeModal);
  const showToast = useUiStore((state) => state.showToast);

  const expenses = useExpensesStore((state) => state.expenses);
  const addExpense = useExpensesStore((state) => state.addExpense);
  const removeExpense = useExpensesStore((state) => state.removeExpense);

  const [activeCategory, setActiveCategory] = useState<string>('Tous');
  const [showAddForm, setShowAddForm] = useState(false);

  const filteredExpenses =
    activeCategory === 'Tous'
      ? expenses
      : expenses.filter((expense) => expense.category === activeCategory);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const monthlyExpenses = expensesInRange(expenses, monthStart, monthEnd);
  const monthlyTotal = monthlyExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  const handleAddExpense = (values: ExpenseFormValues) => {
    addExpense({
      title: values.title,
      category: values.category,
      amount: values.amount,
      date: toIsoDate(new Date()),
      paymentMethod: 'Espèces',
      hasReceipt: values.hasReceipt,
    });
    showToast(`Dépense de ${formatFCFA(values.amount)} enregistrée !`, 'success');
    setShowAddForm(false);
  };

  const handleDeleteExpense = (id: string) => {
    removeExpense(id);
    showToast('Dépense supprimée.', 'success');
  };

  return (
    <Modal open={open} onClose={closeModal} title="Dépenses & Sorties de Caisse">
      {/* Total décaissé du mois */}
      <div className="bg-slate-50 p-3.5 rounded-xl flex items-center justify-between border border-slate-200/80">
        <div>
          <span className="text-[10px] text-slate-500 uppercase font-semibold">
            Total décaissé (Ce mois)
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="font-display font-bold text-2xl text-rose-700 font-num">
              -{formatFCFA(monthlyTotal)}
            </span>
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            {monthlyExpenses.length} dépenses ce mois
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="h-9 px-3.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 active:scale-95 transition-all shadow-xs cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px] text-emerald-400">add</span>
          <span>Dépense</span>
        </button>
      </div>

      {showAddForm && (
        <ExpenseForm onSubmit={handleAddExpense} onCancel={() => setShowAddForm(false)} />
      )}

      {/* Filtres par catégorie */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        {CATEGORY_FILTERS.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setActiveCategory(category)}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              activeCategory === category
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      <ExpenseList expenses={filteredExpenses} onDelete={handleDeleteExpense} />
    </Modal>
  );
}
