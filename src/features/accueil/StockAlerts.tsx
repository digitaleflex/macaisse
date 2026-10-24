import { useMemo } from 'react';
import type { Product } from '@/types';
import { t } from '@/content';
import { computeCreditStatus } from '@/domain/credits';
import { computeStockStatus } from '@/domain/stock';
import { formatFCFA } from '@/domain/money';
import { selectLowStockProducts, selectOutOfStockProducts, useProductsStore } from '@/store/useProductsStore';
import { useCreditsStore } from '@/store/useCreditsStore';
import { useUiStore } from '@/store/useUiStore';
import { Badge, Card, EmptyState, Icon } from '@/ui';

function describeProduct(product: Product): string {
  return computeStockStatus(product.stock, product.minStockAlert) === 'rupture'
    ? t.dashboard.alerts.stockOut(product.name)
    : t.dashboard.alerts.stockLow(product.name, product.stock);
}

/** Alertes prioritaires : ruptures / stocks faibles puis crédits échus. */
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
    (credit) => computeCreditStatus(credit.remainingAmount, credit.totalInitial, credit.dueDate, now) === 'En retard'
  );
  const overdueTotal = overdue.reduce((sum, credit) => sum + credit.remainingAmount, 0);
  const totalAlerts = stockTotal + overdue.length;

  const items = [
    stockTotal > 0 && {
      key: 'stock',
      icon: 'inventory',
      tone: 'bg-rose-50 text-rose-600',
      title: t.dashboard.alerts.stockTitle(stockTotal),
      text: details,
      onClick: () => setTab('stock'),
    },
    overdue.length > 0 && {
      key: 'credits',
      icon: 'schedule',
      tone: 'bg-amber-50 text-amber-600',
      title: t.dashboard.alerts.creditsTitle(overdue.length),
      text: t.dashboard.alerts.creditsText(formatFCFA(overdueTotal)),
      onClick: () => setTab('credits'),
    },
  ].filter((item): item is Exclude<typeof item, false> => Boolean(item));

  return (
    <Card
      title={t.dashboard.alerts.title}
      action={totalAlerts > 0 ? <Badge tone="danger" dot>{t.dashboard.alerts.active(totalAlerts)}</Badge> : undefined}
      padding="sm"
    >
      {items.length === 0 ? (
        <EmptyState icon="verified" title={t.dashboard.alerts.emptyTitle} description={t.dashboard.alerts.emptyText} compact />
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={item.onClick}
              className="group flex items-center gap-3 p-3 rounded-2xl border border-line hover:border-line-strong hover:bg-slate-50 transition-all text-left cursor-pointer"
            >
              <span className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${item.tone}`}>
                <Icon name={item.icon} size={20} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold text-ink-900 truncate">{item.title}</span>
                <span className="block text-xs text-slate-500 truncate mt-0.5">{item.text}</span>
              </span>
              <Icon name="chevron_right" size={20} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}
