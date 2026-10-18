import { formatFCFA } from '@/domain/money';

/**
 * StockMetrics — en-tête de l'inventaire : titre, compteur de références et
 * cartes de synthèse (valeur du stock, stock faible, ruptures).
 *
 * Purement présentationnel : toutes les valeurs sont dérivées par `StockView`
 * (via le domaine et le store) et passées en props. Aucun chiffre inventé, tout
 * est calculé à partir du catalogue réel.
 */

export interface StockMetricsProps {
  /** Nombre de références suivies (`products.length`). */
  productCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  /** Valeur du stock au prix d'achat. */
  totalStockValue: number;
  /** Marge moyenne estimée (%), dérivée de la valeur d'achat vs valeur de vente. */
  averageMarginPercent: number;
  onShowLowStock: () => void;
  onShowOutOfStock: () => void;
}

export function StockMetrics({
  productCount,
  lowStockCount,
  outOfStockCount,
  totalStockValue,
  averageMarginPercent,
  onShowLowStock,
  onShowOutOfStock,
}: StockMetricsProps) {
  return (
    <section className="flex flex-col gap-2 pt-1">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="font-display text-lg font-bold text-slate-900">Inventaire &amp; Réserves</h1>
          <p className="text-[11px] text-slate-500">Mise à jour en temps réel • Boutique Étoile</p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200/80">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          {productCount} réf.
        </span>
      </div>

      {/* Bento Metric Cards */}
      <div className="grid grid-cols-3 gap-2.5 pt-1">
        {/* Total Value Card */}
        <div className="col-span-3 bg-white p-4 rounded-2xl shadow-2xs border border-slate-200/80 flex items-center justify-between relative overflow-hidden">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="material-symbols-outlined text-[16px] text-emerald-700">
                account_balance_wallet
              </span>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                Valeur totale du stock
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-display font-bold text-2xl text-slate-900 font-num">
                {formatFCFA(totalStockValue, { withSuffix: false })}
              </span>
              <span className="text-xs text-slate-500 font-bold">FCFA</span>
            </div>
            <span className="text-[11px] text-emerald-700 mt-0.5 flex items-center gap-1 font-semibold">
              <span className="material-symbols-outlined text-[14px]">trending_up</span> Marge moyenne
              estimée : {averageMarginPercent >= 0 ? '+' : ''}
              {averageMarginPercent}%
            </span>
          </div>
          <div className="h-11 w-11 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600 border border-slate-200/60">
            <span className="material-symbols-outlined text-[22px]">inventory</span>
          </div>
        </div>

        {/* Low Stock Alert Card */}
        <div
          onClick={onShowLowStock}
          role="button"
          tabIndex={0}
          className="col-span-2 bg-white p-3 rounded-2xl shadow-2xs border border-amber-200/80 hover:border-amber-300 flex flex-col justify-between cursor-pointer active:scale-95 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-600 font-medium">Stock faible</span>
            <span className="px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[10px] font-bold flex items-center gap-0.5 border border-amber-200">
              <span className="material-symbols-outlined text-[12px]">warning</span>
              Alerte
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="font-display font-bold text-lg text-slate-900 font-num">
              {lowStockCount}
            </span>
            <span className="text-xs text-slate-500 font-medium">articles</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">Seuil minimal atteint</p>
        </div>

        {/* Out of Stock Warning Card */}
        <div
          onClick={onShowOutOfStock}
          role="button"
          tabIndex={0}
          className="col-span-1 bg-white p-3 rounded-2xl shadow-2xs border border-rose-200/80 hover:border-rose-300 flex flex-col justify-between cursor-pointer active:scale-95 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-rose-700 font-bold">Ruptures</span>
            <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="font-display font-bold text-lg text-rose-700 font-num">
              {outOfStockCount}
            </span>
            <span className="text-xs text-rose-700 font-medium">critiques</span>
          </div>
          <p className="text-[10px] text-rose-700 font-semibold mt-0.5">À commander</p>
        </div>
      </div>
    </section>
  );
}
