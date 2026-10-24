import { t } from '@/content';
import { formatFCFA } from '@/domain/money';
import { StatCard } from '@/ui';

/** Indicateurs de l'inventaire — valeurs dérivées par `StockView`. */
export interface StockMetricsProps {
  productCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalStockValue: number;
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
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 lg:gap-4">
      <StatCard
        label={t.stock.metrics.value}
        value={formatFCFA(totalStockValue)}
        icon="account_balance_wallet"
        tone="brand"
        trend={{ value: t.stock.metrics.margin(averageMarginPercent), positive: averageMarginPercent >= 0 }}
        className="col-span-2 xl:col-span-1"
      />
      <StatCard
        label={t.stock.metrics.references}
        value={productCount}
        icon="inventory_2"
        hint={t.stock.metrics.referencesHint}
      />
      <StatCard
        label={t.stock.metrics.low}
        value={lowStockCount}
        icon="trending_down"
        tone="warning"
        hint={t.stock.metrics.lowHint}
        onClick={onShowLowStock}
      />
      <StatCard
        label={t.stock.metrics.out}
        value={outOfStockCount}
        icon="production_quantity_limits"
        tone="danger"
        hint={t.stock.metrics.outHint}
        onClick={onShowOutOfStock}
        className="col-span-2 sm:col-span-1"
      />
    </div>
  );
}
