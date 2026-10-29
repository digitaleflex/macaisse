import { useMemo, useState } from 'react';
import type { SeriesPoint } from '@/types';
import { t } from '@/content';
import { addDays, parseDate } from '@/domain/dates';
import { cashFlowSeries, channelSplit, computeKpis, dailyRevenueSeries, expenseBreakdown } from '@/domain/finances';
import { formatFCFA } from '@/domain/money';
import { marginRatePercent, retailValue } from '@/domain/stock';
import { exportToCSV } from '@/lib/export';
import { expensesInRange, useExpensesStore } from '@/store/useExpensesStore';
import { useCreditsStore } from '@/store/useCreditsStore';
import { useProductsStore } from '@/store/useProductsStore';
import { useSalesStore } from '@/store/useSalesStore';
import { useCurrentSession } from '@/store/useSessionStore';
import { useUiStore } from '@/store/useUiStore';
import { Badge, Button, Card, Icon, PageHeader, SegmentedControl, cn } from '@/ui';
import { CashFlowChart } from './CashFlowChart';
import { ChannelSplit } from './ChannelSplit';
import { ExpenseBreakdown } from './ExpenseBreakdown';
import { RevenueChart } from './RevenueChart';

/**
 * Bilan financier : KPI, séries et répartitions dérivés des stores via
 * `@/domain/finances` ; export via `@/lib/export`.
 */
type Period = '7d' | '14d' | '30d';

const PERIOD_DAYS: Record<Period, number> = { '7d': 7, '14d': 14, '30d': 30 };
const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: '7d', label: t.periods['7d'] },
  { value: '14d', label: t.periods['14d'] },
  { value: '30d', label: t.periods['30d'] },
];

function withDayLabels(points: SeriesPoint[], days: number): SeriesPoint[] {
  return points.map((point) => {
    const date = parseDate(point.date);
    const label = date
      ? days <= 7
        ? date.toLocaleDateString('fr-FR', { weekday: 'short' })
        : date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
      : point.date;
    return { ...point, label };
  });
}

export function BilanView() {
  const [period, setPeriod] = useState<Period>('14d');
  const now = useMemo(() => new Date(), []);
  const { business } = useCurrentSession();

  const sales = useSalesStore((state) => state.sales);
  const expenses = useExpensesStore((state) => state.expenses);
  const credits = useCreditsStore((state) => state.credits);
  const products = useProductsStore((state) => state.products);
  const showToast = useUiStore((state) => state.showToast);
  const openModal = useUiStore((state) => state.openModal);

  const days = PERIOD_DAYS[period];
  const from = useMemo(() => addDays(now, -(days - 1)), [now, days]);

  const revenueSeries = useMemo(() => withDayLabels(dailyRevenueSeries(sales, days, now), days), [sales, days, now]);
  const cashFlow = useMemo(() => withDayLabels(cashFlowSeries(sales, expenses, days, now), days), [sales, expenses, days, now]);
  const expenseSlices = useMemo(() => expenseBreakdown(expenses, from, now), [expenses, from, now]);
  const channels = useMemo(() => channelSplit(sales), [sales]);

  const stats = useMemo(() => {
    const series = dailyRevenueSeries(sales, days * 2, now);
    const revenue = series.slice(days).reduce((sum, point) => sum + point.value, 0);
    const previous = series.slice(0, days).reduce((sum, point) => sum + point.value, 0);
    const expenseTotal = expensesInRange(expenses, from, now).reduce((sum, expense) => sum + expense.amount, 0);
    const margin = computeKpis({ sales, expenses, credits, products }, now).margin;
    const retail = retailValue(products);
    return {
      revenue,
      previous,
      expenses: expenseTotal,
      net: revenue - expenseTotal,
      marginRate: marginRatePercent(margin, retail),
    };
  }, [sales, expenses, credits, products, days, from, now]);

  const growth = stats.previous > 0 ? ((stats.revenue - stats.previous) / stats.previous) * 100 : null;
  const periodLabel = PERIOD_OPTIONS.find((option) => option.value === period)?.label ?? '';

  // L'export reprend exactement la période affichée à l'écran (issue #9).
  const exportRange = useMemo(() => ({ from, to: now }), [from, now]);

  const handleExportCSV = () => {
    exportToCSV('all', sales, expenses, exportRange);
    showToast(t.bilan.exports.csvDone, 'success');
  };
  const handleExportPDF = async () => {
    const { exportToPDF } = await import('@/lib/export/pdf');
    exportToPDF('all', sales, expenses, business, exportRange);
    showToast(t.bilan.exports.pdfDone, 'success');
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t.nav.bilan.title}
        description={t.nav.bilan.description}
        actions={
          <>
            <SegmentedControl label={t.nav.bilan.title} value={period} onChange={setPeriod} options={PERIOD_OPTIONS} />
            <Button variant="secondary" icon="download" onClick={() => openModal('export')}>
              {t.bilan.exportButton}
            </Button>
          </>
        }
      />

      <section className="relative overflow-hidden rounded-card bg-ink-900 text-white p-6 sm:p-7 bg-grid-ink shadow-raised">
        <div className="absolute -left-10 -top-24 size-72 rounded-full bg-brand-500/20 blur-3xl pointer-events-none" />
        <div className="relative grid lg:grid-cols-[1.4fr_1fr_1fr_1fr] gap-6 lg:gap-0 lg:divide-x lg:divide-white/10">
          <div className="lg:pr-6">
            <div className="text-sm text-slate-400">{t.bilan.netTitle(periodLabel)}</div>
            <div className="font-num font-extrabold text-4xl mt-2 tracking-tight">
              {stats.net >= 0 ? '+' : ''}
              {formatFCFA(stats.net)}
            </div>
            <div className="mt-3">
              {growth === null ? (
                <Badge tone="zest">{t.common.insufficientHistory}</Badge>
              ) : (
                <Badge tone={growth >= 0 ? 'zest' : 'danger'} icon={growth >= 0 ? 'trending_up' : 'trending_down'}>
                  {t.bilan.growth(`${growth >= 0 ? '+' : ''}${growth.toFixed(1)} %`)}
                </Badge>
              )}
            </div>
          </div>
          {[
            { label: t.bilan.revenue, value: formatFCFA(stats.revenue), icon: 'payments', tone: 'text-white' },
            { label: t.bilan.expenses, value: formatFCFA(stats.expenses), icon: 'receipt_long', tone: 'text-rose-300' },
            { label: t.bilan.margin, value: `${stats.marginRate.toFixed(1)} %`, icon: 'percent', tone: 'text-zest-400' },
          ].map((item) => (
            <div key={item.label} className="lg:px-6 flex lg:flex-col items-center lg:items-start justify-between gap-2">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Icon name={item.icon} size={18} />
                {item.label}
              </div>
              <div className={cn('font-num font-bold text-lg sm:text-xl lg:mt-2 whitespace-nowrap', item.tone)}>{item.value}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5">
        <div className="lg:col-span-2">
          <RevenueChart data={revenueSeries} />
        </div>
        <ChannelSplit data={channels} />
        <div className="lg:col-span-2">
          <CashFlowChart data={cashFlow} />
        </div>
        <ExpenseBreakdown data={expenseSlices} onOpenDetails={() => openModal('depenses')} />
      </div>

      <Card
        title={t.bilan.exports.title}
        description={t.bilan.exports.subtitle}
        icon="cloud_download"
        action={
          <Button variant="ghost" size="sm" icon="tune" onClick={() => openModal('export')}>
            <span className="hidden sm:inline">{t.bilan.exports.customize}</span>
          </Button>
        }
      >
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { title: t.bilan.exports.pdfTitle, text: t.bilan.exports.pdfText, badge: t.bilan.exports.pdfBadge, icon: 'picture_as_pdf', tone: 'bg-rose-50 text-rose-600', onClick: handleExportPDF },
            { title: t.bilan.exports.csvTitle, text: t.bilan.exports.csvText, badge: t.bilan.exports.csvBadge, icon: 'table_view', tone: 'bg-brand-50 text-brand-700', onClick: handleExportCSV },
          ].map((item) => (
            <button
              key={item.title}
              type="button"
              onClick={item.onClick}
              className="group flex items-center gap-4 p-4 rounded-2xl border border-line hover:border-line-strong hover:shadow-raised transition-all text-left cursor-pointer"
            >
              <span className={cn('size-12 rounded-2xl flex items-center justify-center shrink-0', item.tone)}>
                <Icon name={item.icon} size={24} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-ink-900">{item.title}</span>
                  <Badge>{item.badge}</Badge>
                </span>
                <span className="block text-xs text-slate-500 mt-1">{item.text}</span>
              </span>
              <Icon name="download" size={20} className="text-slate-500 group-hover:text-ink-900 transition-colors" />
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
