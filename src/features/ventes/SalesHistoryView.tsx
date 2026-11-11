import { useMemo, useState } from 'react';
import type { SaleStatus, SaleTransaction } from '@/types';
import { t } from '@/content';
import { PAYMENT_METHODS, SALE_STATUSES, SALE_STATUS_TONE, paymentShortLabel } from '@/config/reference';
import { parseDate, toIsoDate } from '@/domain/dates';
import { formatFCFA } from '@/domain/money';
import {
  DEFAULT_SALES_FILTERS,
  SELLER_UNKNOWN,
  filterSales,
  isActiveSale,
  sellerKey,
  sellerOptions,
  summarizeSales,
  type SalesFilters,
  type SalesPeriod,
} from '@/domain/sales';
import { useSalesStore } from '@/store/useSalesStore';
import { useUiStore } from '@/store/useUiStore';
import { Badge, Button, EmptyState, Icon, Input, SearchField, SegmentedControl, Select, StatCard } from '@/ui';

const PAGE_SIZE = 30;

const PERIOD_OPTIONS = (['today', '7d', '30d', 'all', 'custom'] as const).map((value) => ({
  value,
  label: t.sales.history.periods[value],
}));

function methodIcon(method: string): string {
  return PAYMENT_METHODS.find((option) => option.method === method)?.icon ?? 'payments';
}

/** Jour normalisé « YYYY-MM-DD » d'une vente (clé de regroupement). */
function dayKey(sale: SaleTransaction): string {
  const date = parseDate(sale.date);
  return date ? toIsoDate(date) : sale.date;
}

/** Libellé d'un jour : « Aujourd'hui », « Hier » ou la date en toutes lettres. */
function dayLabel(isoDate: string, now: Date): string {
  const date = parseDate(isoDate);
  if (!date) return isoDate;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (toIsoDate(date) === toIsoDate(today)) return t.sales.history.today;
  if (toIsoDate(date) === toIsoDate(yesterday)) return t.sales.history.yesterday;
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Historique des ventes (EF-13) : filtres par période, vendeur et statut, plus
 * une recherche par ticket ou client. Les ventes annulées restent visibles mais
 * ne comptent pas dans le total. Un clic ouvre le ticket (et son annulation).
 */
export function SalesHistoryView() {
  const sales = useSalesStore((state) => state.sales);
  const openReceipt = useUiStore((state) => state.openReceipt);
  const [filters, setFilters] = useState<SalesFilters>(DEFAULT_SALES_FILTERS);
  const [visible, setVisible] = useState(PAGE_SIZE);

  const patch = (change: Partial<SalesFilters>) => {
    setFilters((current) => ({ ...current, ...change }));
    setVisible(PAGE_SIZE);
  };
  const reset = () => {
    setFilters(DEFAULT_SALES_FILTERS);
    setVisible(PAGE_SIZE);
  };

  const now = new Date();
  const filtered = useMemo(() => filterSales(sales, filters), [sales, filters]);
  const summary = useMemo(() => summarizeSales(filtered), [filtered]);
  const sellers = useMemo(() => sellerOptions(sales), [sales]);
  const hasUnknownSeller = useMemo(() => sales.some((sale) => sellerKey(sale) === ''), [sales]);
  const shown = filtered.slice(0, visible);

  // Total du jour calculé sur toutes les ventes filtrées, pas seulement la page affichée.
  const dayTotals = useMemo(() => {
    const totals = new Map<string, number>();
    for (const sale of filtered) {
      if (!isActiveSale(sale)) continue;
      const key = dayKey(sale);
      totals.set(key, (totals.get(key) ?? 0) + sale.amount);
    }
    return totals;
  }, [filtered]);

  const sellerChoices = [
    { value: 'all', label: t.sales.history.allSellers },
    ...sellers.map((seller) => ({ value: seller.key, label: seller.name })),
    ...(hasUnknownSeller ? [{ value: SELLER_UNKNOWN, label: t.sales.history.unknownSeller }] : []),
  ];
  const statusChoices = [
    { value: 'all', label: t.sales.history.allStatuses },
    ...SALE_STATUSES.map((status) => ({ value: status, label: t.labels.saleStatus[status] })),
  ];

  const filtersActive =
    filters.period !== DEFAULT_SALES_FILTERS.period ||
    filters.seller !== 'all' ||
    filters.status !== 'all' ||
    filters.query.trim() !== '';

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-surface rounded-card border border-line shadow-card p-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <SegmentedControl<SalesPeriod>
            label={t.sales.history.periodLabel}
            size="sm"
            value={filters.period}
            options={PERIOD_OPTIONS}
            onChange={(period) => patch({ period })}
            className="max-w-full overflow-x-auto no-scrollbar"
          />
          {filters.period === 'custom' && (
            <div className="flex items-end gap-2">
              <Input
                id="history-from"
                type="date"
                label={t.sales.history.from}
                value={filters.from}
                max={filters.to || undefined}
                onChange={(event) => patch({ from: event.target.value })}
              />
              <Input
                id="history-to"
                type="date"
                label={t.sales.history.to}
                value={filters.to}
                min={filters.from || undefined}
                onChange={(event) => patch({ to: event.target.value })}
              />
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <SearchField
            id="history-search"
            value={filters.query}
            onChange={(query) => patch({ query })}
            placeholder={t.sales.history.searchPlaceholder}
          />
          <Select
            id="history-seller"
            label={t.sales.history.seller}
            value={filters.seller}
            options={sellerChoices}
            onChange={(event) => patch({ seller: event.target.value })}
          />
          <Select
            id="history-status"
            label={t.sales.history.status}
            value={filters.status}
            options={statusChoices}
            onChange={(event) => patch({ status: event.target.value as SaleStatus | 'all' })}
          />
        </div>
        {filtersActive && (
          <div>
            <Button variant="ghost" size="sm" icon="restart_alt" onClick={reset}>
              {t.sales.history.reset}
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard
          label={t.sales.history.summaryTotal}
          value={formatFCFA(summary.total)}
          icon="payments"
          tone="brand"
          className="col-span-2 sm:col-span-1 sm:order-2"
        />
        <StatCard
          label={t.sales.history.summarySales}
          value={summary.count}
          icon="receipt_long"
          className="sm:order-1"
        />
        <StatCard
          label={t.sales.history.summaryCancelled}
          value={summary.cancelledCount}
          icon="cancel"
          tone={summary.cancelledCount > 0 ? 'danger' : 'neutral'}
          hint={t.sales.history.summaryCancelledHint}
          className="sm:order-3"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-surface rounded-card border border-line">
          {sales.length === 0 ? (
            <EmptyState
              icon="receipt_long"
              title={t.sales.history.emptyNoSalesTitle}
              description={t.sales.history.emptyNoSalesText}
            />
          ) : (
            <EmptyState
              icon="search_off"
              title={t.sales.history.emptyTitle}
              description={t.sales.history.emptyText}
              action={
                <Button variant="secondary" icon="restart_alt" onClick={reset}>
                  {t.sales.history.reset}
                </Button>
              }
            />
          )}
        </div>
      ) : (
        <div className="bg-surface rounded-card border border-line shadow-card overflow-hidden">
          <ul>
            {shown.map((sale, index) => {
              const day = dayKey(sale);
              const startsDay = index === 0 || dayKey(shown[index - 1] as SaleTransaction) !== day;
              return (
                <SaleRow
                  key={sale.id}
                  sale={sale}
                  dayHeader={startsDay ? { label: dayLabel(day, now), total: dayTotals.get(day) ?? 0 } : undefined}
                  onOpen={() => openReceipt(sale, [])}
                />
              );
            })}
          </ul>
          {filtered.length > shown.length && (
            <div className="p-3 border-t border-line text-center">
              <Button variant="secondary" onClick={() => setVisible((count) => count + PAGE_SIZE)}>
                {t.sales.history.showMore(Math.min(PAGE_SIZE, filtered.length - shown.length))}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface SaleRowProps {
  sale: SaleTransaction;
  dayHeader?: { label: string; total: number };
  onOpen: () => void;
}

function SaleRow({ sale, dayHeader, onOpen }: SaleRowProps) {
  const cancelled = sale.status === 'cancelled';
  const partial = sale.status === 'partial';
  const details = [
    sale.saleNumber,
    paymentShortLabel(sale.paymentMethod),
    sale.time,
    sale.sellerName ? t.sales.history.by(sale.sellerName) : null,
  ].filter((part): part is string => part !== null && part !== '');

  return (
    <>
      {dayHeader && (
        <li className="px-5 py-2 bg-slate-50 border-b border-line flex items-center justify-between text-xs font-semibold text-slate-600 capitalize">
          <span>{dayHeader.label}</span>
          <span className="font-num normal-case text-slate-500">{formatFCFA(dayHeader.total)}</span>
        </li>
      )}
      <li className="border-b border-line last:border-b-0">
        <button
          type="button"
          onClick={onOpen}
          aria-label={t.sales.history.openReceipt(sale.saleNumber)}
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
              <Badge tone={SALE_STATUS_TONE[sale.status]}>{t.labels.saleStatus[sale.status]}</Badge>
            </span>
            <span className="block text-xs text-slate-500 mt-0.5 truncate">{details.join(' · ')}</span>
            {cancelled && sale.cancelledBy && (
              <span className="block text-xs text-rose-600 mt-0.5 truncate">
                {t.sales.history.cancelledBy(sale.cancelledBy)}
                {sale.cancelReason ? ` — ${sale.cancelReason}` : ''}
              </span>
            )}
          </span>
          <span className="text-right shrink-0">
            <span
              className={
                cancelled
                  ? 'block font-num font-bold text-sm text-slate-400 line-through'
                  : 'block font-num font-bold text-sm text-ink-900'
              }
            >
              {formatFCFA(sale.amount)}
            </span>
            {partial && (
              <span className="text-[11px] font-semibold text-amber-600">
                {t.dashboard.recent.remaining(formatFCFA(sale.remainingAmount ?? 0))}
              </span>
            )}
          </span>
        </button>
      </li>
    </>
  );
}
