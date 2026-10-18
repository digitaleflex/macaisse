import type { Expense } from '@/types';
import { Button, EmptyState } from '@/ui';
import { formatFCFA } from '@/domain/money';

export interface ExpenseListProps {
  expenses: Expense[];
  onDelete: (id: string) => void;
}

const CATEGORY_ICON: Record<string, string> = {
  'Achat Stock': 'shopping_cart',
  Stock: 'shopping_cart',
  Transport: 'local_shipping',
  Factures: 'electric_bolt',
};

function iconForCategory(category: string): string {
  return CATEGORY_ICON[category] ?? 'payments';
}

/** Liste des dépenses avec suppression ; état vide géré par `EmptyState`. */
export function ExpenseList({ expenses, onDelete }: ExpenseListProps) {
  if (expenses.length === 0) {
    return (
      <EmptyState
        icon="receipt_long"
        title="Aucune dépense"
        description="Ajoutez une sortie de caisse pour suivre vos charges opérationnelles."
      />
    );
  }

  return (
    <div className="divide-y divide-slate-100 bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-2xs">
      {expenses.map((expense) => (
        <div
          key={expense.id}
          className="p-3 flex items-center justify-between gap-2 hover:bg-slate-50/60 transition-colors"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 border border-rose-100 shrink-0">
              <span className="material-symbols-outlined text-[18px]">
                {iconForCategory(expense.category)}
              </span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-slate-900 truncate">{expense.title}</span>
              <div className="flex items-center gap-1 text-[10px] text-slate-500">
                <span>{expense.category}</span>
                <span>•</span>
                <span>{expense.paymentMethod}</span>
                <span>•</span>
                <span>{expense.date}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="text-right">
              <span className="font-display font-bold text-xs text-rose-700 font-num">
                -{formatFCFA(expense.amount)}
              </span>
              {expense.hasReceipt === true && (
                <span className="text-[9px] text-emerald-700 block font-semibold">Reçu OK</span>
              )}
            </div>
            <Button
              variant="danger"
              size="sm"
              aria-label={`Supprimer la dépense ${expense.title}`}
              onClick={() => onDelete(expense.id)}
            >
              <span className="material-symbols-outlined text-[16px]">delete</span>
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
