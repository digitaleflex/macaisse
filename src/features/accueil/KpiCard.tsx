import { formatFCFA } from '@/domain/money';

/**
 * KpiCard — bloc d'indicateurs financiers de l'accueil (résultat net, ventes,
 * dépenses, marge potentielle). Composant purement présentationnel : toutes les
 * valeurs sont dérivées par le parent à partir des stores et du domaine.
 */
export interface KpiCardProps {
  /** Libellé de période affiché à côté de « Résultat Net ». */
  periodLabel: string;
  /** Résultat net de la période (CA − dépenses). */
  net: number;
  /** Chiffre d'affaires de la période. */
  revenue: number;
  /** Chiffre d'affaires de la période précédente (croissance). */
  previousRevenue: number;
  /** Dépenses de la période. */
  expenses: number;
  /** Nombre d'écritures de dépenses de la période. */
  expensesCount: number;
  /** Taux de marge potentielle du stock courant (0–100). */
  marginRate: number;
  /** Ouvre la modale de gestion des dépenses. */
  onOpenExpenses: () => void;
}

function growthLabel(growth: number | null): string {
  if (growth === null || !Number.isFinite(growth)) return 'Historique insuffisant';
  return `${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%`;
}

export function KpiCard({
  periodLabel,
  net,
  revenue,
  previousRevenue,
  expenses,
  expensesCount,
  marginRate,
  onOpenExpenses,
}: KpiCardProps) {
  const growth = previousRevenue > 0 ? ((revenue - previousRevenue) / previousRevenue) * 100 : null;
  const isCashPositive = net >= 0;

  return (
    <div className="flex flex-col gap-2.5">
      {/* Résultat net (hero) */}
      <div className="relative overflow-hidden bg-white p-4 rounded-2xl shadow-2xs border border-slate-200/90">
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 text-slate-500">
              <span className="material-symbols-outlined text-[16px] text-emerald-600">
                account_balance
              </span>
              <span className="text-[11px] uppercase tracking-wider font-semibold">
                Résultat Net {periodLabel}
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-display font-bold text-2xl text-slate-900 tracking-tight font-num">
                {net >= 0 ? '+' : ''}
                {formatFCFA(net)}
              </span>
            </div>
          </div>
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-bold shadow-2xs ${
              isCashPositive
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}
          >
            <span className="material-symbols-outlined text-[14px]">
              {isCashPositive ? 'trending_up' : 'trending_down'}
            </span>
            Cashflow {isCashPositive ? '+' : '−'}
          </span>
        </div>

        <div className="mt-3 pt-2.5 flex items-center justify-between border-t border-slate-100 bg-slate-50/70 -mx-4 -mb-4 px-4 py-2 rounded-b-2xl">
          <span className="text-[11px] text-slate-500">Rentabilité commerciale</span>
          <span className="text-[11px] text-emerald-700 font-bold">
            {marginRate.toFixed(1)}% de marge potentielle
          </span>
        </div>
      </div>

      {/* Ventes / Dépenses */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white p-3 rounded-xl shadow-2xs border border-slate-200/80 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase text-slate-500 font-semibold">Ventes</span>
            <span className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[15px]">payments</span>
            </span>
          </div>
          <div className="mt-2">
            <span className="font-display font-bold text-lg text-slate-900 tracking-tight font-num">
              {formatFCFA(revenue)}
            </span>
            <div
              className={`mt-1 flex items-center gap-1 text-[11px] ${
                growth === null || growth >= 0 ? 'text-emerald-700' : 'text-rose-600'
              }`}
            >
              <span className="material-symbols-outlined text-[13px]">
                {growth === null || growth >= 0 ? 'arrow_upward' : 'arrow_downward'}
              </span>
              <span className="font-bold">{growthLabel(growth)}</span>
              <span className="text-slate-400 font-normal text-[10px]">vs période préc.</span>
            </div>
          </div>
        </div>

        <div
          onClick={onOpenExpenses}
          role="button"
          tabIndex={0}
          className="bg-white p-3 rounded-xl shadow-2xs border border-slate-200/80 flex flex-col justify-between cursor-pointer hover:bg-slate-50/80 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase text-slate-500 font-semibold">Dépenses</span>
            <span className="w-6 h-6 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[15px]">receipt_long</span>
            </span>
          </div>
          <div className="mt-2">
            <span className="font-display font-bold text-lg text-rose-600 tracking-tight font-num">
              {formatFCFA(expenses)}
            </span>
            <div className="mt-1 flex items-center gap-1 text-slate-500 text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              <span>
                {expensesCount} sortie{expensesCount > 1 ? 's' : ''} caisse
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
