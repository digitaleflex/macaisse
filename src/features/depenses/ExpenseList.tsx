import type { Expense } from '@/types';
import { t } from '@/content';
import { EXPENSE_CATEGORY_ICON } from '@/config/reference';
import { parseDate } from '@/domain/dates';
import { formatFCFA } from '@/domain/money';
import { Badge, EmptyState, Icon, IconButton } from '@/ui';

export interface ExpenseListProps {
  expenses: Expense[];
  onDelete: (id: string) => void;
}

function formatDay(iso: string): string {
  const date = parseDate(iso);
  return date ? date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : iso;
}

/** Liste des dépenses avec suppression. */
export function ExpenseList({ expenses, onDelete }: ExpenseListProps) {
  if (expenses.length === 0) {
    return <EmptyState icon="receipt_long" title={t.expenses.emptyTitle} description={t.expenses.emptyText} compact />;
  }
  return (
    <ul className="divide-y divide-line rounded-2xl border border-line overflow-hidden">
      {expenses.map((expense) => (
        <li key={expense.id} className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-slate-50/70 transition-colors">
          <span className="size-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <Icon name={EXPENSE_CATEGORY_ICON[expense.category] ?? 'payments'} size={20} />
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-ink-900 truncate">{expense.title}</div>
            <div className="text-xs text-slate-500 truncate">
              {expense.category} · {expense.paymentMethod} · {formatDay(expense.date)}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="font-num font-bold text-sm text-rose-600">−{formatFCFA(expense.amount)}</div>
            {expense.hasReceipt === true && <Badge tone="success">{t.expenses.receiptOk}</Badge>}
          </div>
          <IconButton icon="delete" label={t.expenses.remove(expense.title)} variant="danger-soft" size="sm" onClick={() => onDelete(expense.id)} />
        </li>
      ))}
    </ul>
  );
}
