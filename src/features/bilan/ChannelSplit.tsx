import type { BreakdownSlice } from '@/types';
import { formatFCFA } from '@/domain/money';
import { EmptyState } from '@/ui';

/**
 * ChannelSplit — répartition des encaissements par moyen de paiement.
 * Composant présentationnel pur (aucun store) : reçoit une `BreakdownSlice[]`
 * calculée par `@/domain/finances.channelSplit`.
 */
export interface ChannelSplitProps {
  /** Tranches de répartition par canal (montant décroissant). */
  data: BreakdownSlice[];
}

const CHANNEL_COLORS = ['bg-slate-900', 'bg-emerald-500', 'bg-amber-400', 'bg-sky-500', 'bg-rose-500'];

export function ChannelSplit({ data }: ChannelSplitProps) {
  const total = data.reduce((sum, slice) => sum + slice.amount, 0);

  return (
    <div className="bg-white p-4 rounded-2xl shadow-2xs border border-slate-200/80 flex flex-col gap-3">
      <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
        Répartition des encaissements
      </span>

      {data.length === 0 || total <= 0 ? (
        <EmptyState
          icon="donut_small"
          title="Aucun encaissement"
          description="Aucune vente enregistrée pour cette répartition."
        />
      ) : (
        <>
          <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-100">
            {data.map((slice, index) => (
              <div
                key={slice.key}
                className={`h-full ${CHANNEL_COLORS[index % CHANNEL_COLORS.length]}`}
                style={{ width: `${(slice.amount / total) * 100}%` }}
                title={`${slice.label} : ${((slice.amount / total) * 100).toFixed(0)}%`}
              />
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs pt-1">
            {data.slice(0, 3).map((slice, index) => (
              <div
                key={slice.key}
                className={`flex flex-col ${index === 2 ? 'items-end' : ''}`}
              >
                <div className="flex items-center gap-1 text-[11px] text-slate-500">
                  <span
                    className={`w-2 h-2 rounded-full ${CHANNEL_COLORS[index % CHANNEL_COLORS.length]}`}
                  />
                  <span className="truncate">{slice.label}</span>
                </div>
                <span className="font-bold text-slate-900 mt-0.5 font-num">
                  {((slice.amount / total) * 100).toFixed(0)}%
                </span>
                <span className="text-[10px] text-slate-500 font-num">
                  {formatFCFA(slice.amount)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
