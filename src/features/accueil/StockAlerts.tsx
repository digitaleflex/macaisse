import { useMemo } from 'react';
import type { Product } from '@/types';
import { computeCreditStatus } from '@/domain/credits';
import { computeStockStatus } from '@/domain/stock';
import { formatFCFA } from '@/domain/money';
import {
  selectLowStockProducts,
  selectOutOfStockProducts,
  useProductsStore,
} from '@/store/useProductsStore';
import { useCreditsStore } from '@/store/useCreditsStore';
import { useUiStore } from '@/store/useUiStore';
import { EmptyState } from '@/ui';

/**
 * StockAlerts — section « Alertes prioritaires » : ruptures/faibles stocks
 * (store produits) puis crédits échus (store crédits). Lit les stores
 * directement et route vers les onglets via `useUiStore.setTab`.
 */
function describeProduct(product: Product): string {
  const status = computeStockStatus(product.stock, product.minStockAlert);
  return status === 'rupture' ? `${product.name} (0)` : `${product.name} (reste ${product.stock})`;
}

export function StockAlerts() {
  const products = useProductsStore((state) => state.products);
  const credits = useCreditsStore((state) => state.credits);
  const setTab = useUiStore((state) => state.setTab);
  const now = useMemo(() => new Date(), []);

  const outOfStock = selectOutOfStockProducts(products);
  const lowStock = selectLowStockProducts(products);
  const stockTotal = outOfStock.length + lowStock.length;
  const details = [...outOfStock, ...lowStock].slice(0, 2).map(describeProduct).join(', ');

  const overdue = credits.filter(
    (credit) =>
      computeCreditStatus(credit.remainingAmount, credit.totalInitial, credit.dueDate, now) ===
      'En retard',
  );
  const overdueTotal = overdue.reduce((sum, credit) => sum + credit.remainingAmount, 0);
  const totalAlerts = stockTotal + overdue.length;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between px-0.5">
        <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
          <span className="material-symbols-outlined text-rose-600 text-[17px]">
            notifications_active
          </span>
          Alertes prioritaires
        </h2>
        {totalAlerts > 0 && (
          <span className="text-[11px] text-slate-500 font-medium">
            {totalAlerts} active{totalAlerts > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {totalAlerts === 0 ? (
        <div className="bg-white rounded-xl shadow-2xs border border-slate-200/80">
          <EmptyState
            icon="check_circle"
            title="Aucune alerte"
            description="Stock et crédits clients sous contrôle."
          />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {stockTotal > 0 && (
            <div className="bg-white p-3 rounded-xl shadow-2xs border border-rose-200/80 flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200/50">
                  <span className="material-symbols-outlined text-[18px]">warning</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {stockTotal} article{stockTotal > 1 ? 's' : ''} en rupture ou critique
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">{details}</p>
                </div>
              </div>
              <button
                onClick={() => setTab('stock')}
                type="button"
                className="shrink-0 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-900 text-[11px] rounded-lg transition-all font-semibold cursor-pointer border border-slate-200/60"
              >
                Voir
              </button>
            </div>
          )}

          {overdue.length > 0 && (
            <div
              onClick={() => setTab('credits')}
              role="button"
              tabIndex={0}
              className="bg-white p-3 rounded-xl flex items-center justify-between gap-2.5 cursor-pointer hover:bg-slate-50/80 transition-colors border border-amber-200/80 shadow-2xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200/50">
                  <span className="material-symbols-outlined text-[18px]">schedule</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {overdue.length} crédit{overdue.length > 1 ? 's' : ''} en retard
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    Total : {formatFCFA(overdueTotal)} à recouvrer
                  </p>
                </div>
              </div>
              <span className="text-amber-700 p-1 shrink-0">
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
