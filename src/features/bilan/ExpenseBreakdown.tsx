import type { BreakdownSlice } from '@/types';
import { t } from '@/content';
import { EXPENSE_CATEGORY_ICON } from '@/config/reference';
import { formatFCFA } from '@/domain/money';
import { Button, Card, EmptyState, Icon, ProgressBar } from '@/ui';

/** Postes de dépenses agrégés par catégorie, avec part relative. */
export interface ExpenseBreakdownProps {
  data: BreakdownSlice[];
  onOpenDetails: () => void;
}

export function ExpenseBreakdown({ data, onOpenDetails }: ExpenseBreakdownProps) {
  const total = data.reduce((sum, slice) => sum + slice.amount, 0);
  return (
    <Card
      title={t.bilan.expenseBreakdown.title}
      description={t.bilan.expenseBreakdown.subtitle}
      action={
        <Button variant="ghost" size="sm" iconRight="chevron_right" onClick={onOpenDetails}>
          {t.bilan.expenseBreakdown.details}
        </Button>
      }
      className="h-full"
    >
      {data.length === 0 ? (
        <EmptyState icon="receipt_long" title={t.bilan.expenseBreakdown.emptyTitle} description={t.bilan.expenseBreakdown.emptyText} compact />
      ) : (
        <ul className="flex flex-col gap-4">
          {data.map((slice) => {
            const share = total > 0 ? slice.amount / total : 0;
            return (
              <li key={slice.key} className="flex items-center gap-3">
                <span className="size-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                  <Icon name={EXPENSE_CATEGORY_ICON[slice.label] ?? 'payments'} size={18} />
                </span>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex justify-between gap-2 text-sm">
                    <span className="text-ink-900 font-medium truncate">{slice.label}</span>
                    <span className="font-num font-semibold text-ink-900 shrink-0">{formatFCFA(slice.amount)}</span>
                  </div>
                  <ProgressBar value={share} tone="danger" label={slice.label} />
                </div>
                <span className="w-10 text-right text-xs font-semibold text-slate-500 font-num">{Math.round(share * 100)} %</span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
