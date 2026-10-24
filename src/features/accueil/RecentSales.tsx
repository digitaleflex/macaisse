import type { SaleTransaction } from '@/types';
import { t } from '@/content';
import { paymentShortLabel, PAYMENT_METHODS } from '@/config/reference';
import { formatFCFA } from '@/domain/money';
import { Badge, Button, Card, EmptyState, Icon } from '@/ui';

export interface RecentSalesProps {
  sales: SaleTransaction[];
  todayCount: number;
  onSelect: (sale: SaleTransaction) => void;
  onViewAll: () => void;
}

function methodIcon(method: string): string {
  return PAYMENT_METHODS.find((option) => option.method === method)?.icon ?? 'payments';
}

/** Flux des dernières ventes encaissées. */
export function RecentSales({ sales, todayCount, onSelect, onViewAll }: RecentSalesProps) {
  return (
    <Card
      title={t.dashboard.recent.title}
      description={t.dashboard.recent.today(todayCount)}
      action={
        <Button variant="ghost" size="sm" iconRight="chevron_right" onClick={onViewAll}>
          {t.common.seeAll}
        </Button>
      }
      padding="none"
    >
      {sales.length === 0 ? (
        <EmptyState icon="receipt_long" title={t.dashboard.recent.emptyTitle} description={t.dashboard.recent.emptyText} compact />
      ) : (
        <ul className="divide-y divide-line">
          {sales.map((sale) => {
            const partial = sale.status === 'Partiel';
            return (
              <li key={sale.id}>
                <button
                  type="button"
                  onClick={() => onSelect(sale)}
                  className="w-full px-5 py-3.5 flex items-center gap-3.5 text-left hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <span className="size-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                    <Icon name={methodIcon(sale.paymentMethod)} size={20} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-ink-900 truncate">
                        {sale.clientName ?? t.dashboard.recent.sale(sale.saleNumber)}
                      </span>
                      <Badge tone={partial ? 'warning' : 'success'}>{sale.status}</Badge>
                    </span>
                    <span className="block text-xs text-slate-500 mt-0.5 truncate">
                      {sale.saleNumber} · {paymentShortLabel(sale.paymentMethod)} · <span className="font-num">{sale.time}</span>
                    </span>
                  </span>
                  <span className="text-right shrink-0">
                    <span className="block font-num font-bold text-sm text-ink-900">{formatFCFA(sale.amount)}</span>
                    <span className={partial ? 'text-[11px] font-semibold text-amber-600' : 'text-[11px] text-slate-400'}>
                      {partial
                        ? t.dashboard.recent.remaining(formatFCFA(sale.remainingAmount ?? 0))
                        : t.dashboard.recent.receiptIssued}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
