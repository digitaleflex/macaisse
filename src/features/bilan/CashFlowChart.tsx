import type { SeriesPoint } from '@/types';
import { formatFCFA } from '@/domain/money';
import { EmptyState } from '@/ui';

/**
 * CashFlowChart — flux de trésorerie net quotidien (recettes − dépenses).
 * Composant présentationnel pur (aucun store) : reçoit une `SeriesPoint[]` déjà
 * calculée par `@/domain/finances.cashFlowSeries`.
 */
export interface CashFlowChartProps {
  /** Série du solde net journalier (la plus ancienne en premier). */
  data: SeriesPoint[];
}

export function CashFlowChart({ data }: CashFlowChartProps) {
  const maxAbs = Math.max(...data.map((point) => Math.abs(point.value)), 1);

  return (
    <div className="bg-white p-4 rounded-2xl shadow-2xs border border-slate-200/80">
      <div className="flex items-center justify-between mb-3">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-slate-900">
            Évolution des Flux ({data.length} derniers jours)
          </span>
          <span className="text-[10px] text-slate-500">
            Solde net quotidien (recettes − dépenses)
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-semibold">
          <span className="flex items-center gap-1 text-slate-800">
            <span className="w-2 h-2 rounded-sm bg-emerald-500" />
            Excédent
          </span>
          <span className="flex items-center gap-1 text-slate-500">
            <span className="w-2 h-2 rounded-sm bg-rose-500" />
            Déficit
          </span>
        </div>
      </div>

      {data.length === 0 ? (
        <EmptyState
          icon="bar_chart"
          title="Aucun flux"
          description="Aucune recette ou dépense sur la période."
        />
      ) : (
        <div className="w-full h-36 flex items-end justify-between gap-2 pt-4 px-1">
          {data.map((point) => (
            <div
              key={point.date}
              className="flex-1 flex flex-col items-center gap-1 h-full justify-end group"
            >
              <div className="w-full flex items-end justify-center h-28">
                <div
                  className={`w-2.5 rounded-t-sm transition-all ${
                    point.value >= 0 ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-rose-400 hover:bg-rose-500'
                  }`}
                  style={{
                    height: `${Math.max((Math.abs(point.value) / maxAbs) * 100, point.value === 0 ? 0 : 4)}%`,
                  }}
                  title={`${point.label ?? point.date} : ${formatFCFA(point.value)}`}
                />
              </div>
              <span className="text-[10px] text-slate-500 font-semibold group-hover:text-slate-900">
                {point.label ?? point.date}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
