import type { SaleTransaction } from '@/types';
import { formatFCFA } from '@/domain/money';
import { EmptyState } from '@/ui';

/**
 * RecentSales — flux des dernières ventes encaissées. Composant présentationnel :
 * la liste et le compteur du jour proviennent du store des ventes (via le parent).
 */
export interface RecentSalesProps {
  /** Ventes récentes à afficher (déjà limitées, plus récentes en tête). */
  sales: SaleTransaction[];
  /** Nombre de ventes du jour (badge d'en-tête). */
  todayCount: number;
  /** Ouvre le détail (reçu) d'une vente. */
  onSelect: (sale: SaleTransaction) => void;
  /** Bascule vers l'onglet des ventes. */
  onViewAll: () => void;
}

export function RecentSales({ sales, todayCount, onSelect, onViewAll }: RecentSalesProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between px-0.5">
        <div className="flex items-center gap-1.5">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Dernières ventes
          </h2>
          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold border border-slate-200/60">
            {todayCount} aujourd'hui
          </span>
        </div>
        <button
          onClick={onViewAll}
          type="button"
          className="text-[11px] text-emerald-700 hover:text-emerald-800 hover:underline font-bold cursor-pointer"
        >
          Tout afficher
        </button>
      </div>

      {sales.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-2xs border border-slate-200/80">
          <EmptyState
            icon="receipt_long"
            title="Aucune vente récente"
            description="Les ventes encaissées apparaîtront ici."
          />
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-2xs border border-slate-200/80 overflow-hidden divide-y divide-slate-100">
          {sales.map((sale) => (
            <div
              key={sale.id}
              onClick={() => onSelect(sale)}
              role="button"
              tabIndex={0}
              className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors active:bg-slate-100/80 cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200/60 flex items-center justify-center text-slate-900 shrink-0 font-display font-bold text-xs font-num">
                  {sale.saleNumber}
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900 truncate">
                      Vente {sale.saleNumber}
                    </span>
                    <span
                      className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold border ${
                        sale.status === 'Validé'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {sale.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                    <span>{sale.paymentMethod}</span>
                    <span>•</span>
                    <span className="font-num">{sale.time}</span>
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span
                  className={`block font-display font-bold text-sm tracking-tight font-num ${
                    sale.status === 'Partiel' ? 'text-rose-600' : 'text-slate-900'
                  }`}
                >
                  {formatFCFA(sale.amount)}
                </span>
                <span
                  className={`text-[10px] font-medium ${
                    sale.status === 'Partiel' ? 'text-rose-600 font-bold' : 'text-emerald-600'
                  }`}
                >
                  {sale.status === 'Partiel'
                    ? `Reste : ${formatFCFA(sale.remainingAmount ?? 0)}`
                    : 'Reçu émis'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
