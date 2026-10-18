import type { BreakdownSlice } from '@/types';
import { formatFCFA } from '@/domain/money';
import { EmptyState } from '@/ui';

/**
 * ExpenseBreakdown — postes de dépenses agrégés par catégorie.
 * Composant présentationnel : reçoit une `BreakdownSlice[]` calculée par
 * `@/domain/finances.expenseBreakdown` et un callback vers le détail complet.
 */
export interface ExpenseBreakdownProps {
  /** Tranches de dépenses par poste (montant décroissant). */
  data: BreakdownSlice[];
  /** Ouvre la modale de détail des dépenses. */
  onOpenDetails: () => void;
}

export function ExpenseBreakdown({ data, onOpenDetails }: ExpenseBreakdownProps) {
  const total = data.reduce((sum, slice) => sum + slice.amount, 0);

  return (
    <div className="bg-white p-4 rounded-2xl shadow-2xs border border-slate-200/80 flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-rose-600 text-[18px]">receipt_long</span>
          <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Postes de Dépenses
          </span>
        </div>
        <button
          type="button"
          onClick={onOpenDetails}
          className="text-xs text-slate-700 hover:text-slate-900 font-bold flex items-center gap-0.5 cursor-pointer"
        >
          <span>Détail complet</span>
          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
        </button>
      </div>

      {data.length === 0 ? (
        <EmptyState
          icon="receipt_long"
          title="Aucune dépense"
          description="Aucune dépense enregistrée sur la période."
        />
      ) : (
        <div className="flex flex-col gap-2 pt-1">
          {data.map((slice) => {
            const share = total > 0 ? (slice.amount / total) * 100 : 0;
            return (
              <div key={slice.key} className="flex justify-between items-center text-xs">
                <span className="text-slate-500 truncate">{slice.label}</span>
                <span className="font-bold text-slate-900 font-num shrink-0">
                  {formatFCFA(slice.amount)} ({share.toFixed(0)}%)
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
