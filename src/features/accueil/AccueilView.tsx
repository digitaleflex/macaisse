import { useMemo, useState } from 'react';
import type { SeriesPoint } from '@/types';
import { t } from '@/content';
import { addDays, isSameDay, parseDate, toIsoDate } from '@/domain/dates';
import { activeCredits } from '@/domain/credits';
import { computeKpis, dailyRevenueSeries } from '@/domain/finances';
import { formatFCFA } from '@/domain/money';
import { marginRatePercent, retailValue } from '@/domain/stock';
import { expensesInRange, useExpensesStore } from '@/store/useExpensesStore';
import { useCreditsStore } from '@/store/useCreditsStore';
import { useProductsStore } from '@/store/useProductsStore';
import { useSalesStore } from '@/store/useSalesStore';
import { useCurrentSession, usePermission } from '@/store/useSessionStore';
import { useUiStore } from '@/store/useUiStore';
import { Badge, PageHeader, SegmentedControl, StatCard } from '@/ui';
import { ClosingCard } from './ClosingCard';
import { DashboardHero } from './DashboardHero';
import { RecentSales } from './RecentSales';
import { SalesTrend } from './SalesTrend';
import { StockAlerts } from './StockAlerts';

/**
 * AccueilView — tableau de bord. Tout est dérivé des stores et du domaine
 * (`@/domain/finances`) ; les textes viennent de `@/content`.
 */
type Period = 'today' | '7d' | 'month';

const PERIOD_DAYS: Record<Period, number> = { today: 1, '7d': 7, month: 30 };
const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: 'today', label: t.periods.today },
  { value: '7d', label: t.periods['7d'] },
  { value: 'month', label: t.periods.month },
];
const TREND_DAYS = 14;

function growth(current: number, previous: number): { value: string; positive: boolean } | null {
  if (previous <= 0) return null;
  const rate = ((current - previous) / previous) * 100;
  return { value: `${rate >= 0 ? '+' : ''}${rate.toFixed(1)} %`, positive: rate >= 0 };
}

function withShortLabels(points: SeriesPoint[]): SeriesPoint[] {
  return points.map((point) => {
    const date = parseDate(point.date);
    return { ...point, label: date ? date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : point.date };
  });
}

export function AccueilView() {
  const [period, setPeriod] = useState<Period>('today');
  const now = useMemo(() => new Date(), []);
  const { user } = useCurrentSession();
  const canSeeFinance = usePermission('finance.view');

  const sales = useSalesStore((state) => state.sales);
  const expenses = useExpensesStore((state) => state.expenses);
  const credits = useCreditsStore((state) => state.credits);
  const products = useProductsStore((state) => state.products);
  const setTab = useUiStore((state) => state.setTab);
  const registerClosedAt = useUiStore((state) => state.registerClosedAt);
  const toggleRegisterClosed = useUiStore((state) => state.toggleRegisterClosed);
  const closed = registerClosedAt === toIsoDate(now);
  const openModal = useUiStore((state) => state.openModal);
  const openReceipt = useUiStore((state) => state.openReceipt);
  const showToast = useUiStore((state) => state.showToast);

  const kpis = useMemo(() => computeKpis({ sales, expenses, credits, products }, now), [sales, expenses, credits, products, now]);

  const stats = useMemo(() => {
    if (period === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const previousMonthNow = new Date(now.getFullYear(), now.getMonth() - 1, 15);
      const previous = computeKpis({ sales, expenses, credits, products }, previousMonthNow).monthlyRevenue;
      const rangeExpenses = expensesInRange(expenses, startOfMonth, now);
      return { revenue: kpis.monthlyRevenue, previous, expenses: kpis.monthlyExpenses, expensesCount: rangeExpenses.length };
    }
    const days = PERIOD_DAYS[period];
    const series = dailyRevenueSeries(sales, days * 2, now);
    const revenue = series.slice(days).reduce((sum, point) => sum + point.value, 0);
    const previous = series.slice(0, days).reduce((sum, point) => sum + point.value, 0);
    const rangeExpenses = expensesInRange(expenses, addDays(now, -(days - 1)), now);
    return {
      revenue,
      previous,
      expenses: rangeExpenses.reduce((sum, expense) => sum + expense.amount, 0),
      expensesCount: rangeExpenses.length,
    };
  }, [period, sales, expenses, credits, products, kpis, now]);

  const marginRate = useMemo(
    () => marginRatePercent(kpis.margin, retailValue(products)),
    [products, kpis.margin]
  );

  const debtors = useMemo(() => activeCredits(credits, now).length, [credits, now]);
  const todaySales = useMemo(
    () =>
      sales.filter((sale) => {
        const date = parseDate(sale.date);
        return date !== null && isSameDay(date, now);
      }),
    [sales, now]
  );
  const todayCount = todaySales.length;
  const averageTicket = todayCount > 0 ? todaySales.reduce((sum, sale) => sum + sale.amount, 0) / todayCount : 0;
  const recentSales = useMemo(() => sales.slice(0, 5), [sales]);
  const trend = useMemo(() => withShortLabels(dailyRevenueSeries(sales, TREND_DAYS, now)), [sales, now]);

  const todayLabel = useMemo(() => {
    const label = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }, [now]);

  const net = stats.revenue - stats.expenses;

  const toggleClosing = () => {
    const next = registerClosedAt !== toIsoDate(now);
    toggleRegisterClosed();
    showToast(
      next ? t.dashboard.closing.closedToast : t.dashboard.closing.reopenedToast,
      next ? 'success' : 'info'
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={
          <Badge tone={closed ? 'neutral' : 'success'} dot size="md">
            {closed ? t.dashboard.registerClosed : t.dashboard.registerOpen}
          </Badge>
        }
        title={t.dashboard.greeting(user.firstName)}
        description={todayLabel}
        actions={
          <SegmentedControl label={t.nav.accueil.title} value={period} onChange={setPeriod} options={PERIOD_OPTIONS} />
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 lg:gap-5">
        <div className="xl:col-span-4 order-first">
          <DashboardHero todayCount={todayCount} averageTicket={averageTicket} />
        </div>
        <div className="xl:col-span-8 grid grid-cols-2 gap-3 lg:gap-4">
          <StatCard
            label={t.dashboard.kpi.revenue}
            value={formatFCFA(stats.revenue)}
            icon="payments"
            tone="brand"
            trend={growth(stats.revenue, stats.previous)}
            hint={growth(stats.revenue, stats.previous) ? t.common.vsPrevious : t.common.insufficientHistory}
          />
          {canSeeFinance && (
            <>
              <StatCard
                label={t.dashboard.kpi.expenses}
                value={formatFCFA(stats.expenses)}
                icon="receipt_long"
                tone="danger"
                hint={t.dashboard.kpi.expensesCount(stats.expensesCount)}
                onClick={() => openModal('depenses')}
              />
              <StatCard
                label={t.dashboard.kpi.net}
                value={`${net >= 0 ? '+' : ''}${formatFCFA(net)}`}
                icon="account_balance"
                tone={net >= 0 ? 'brand' : 'danger'}
                hint={t.dashboard.kpi.margin(marginRate.toFixed(1))}
              />
            </>
          )}
          <StatCard
            label={t.dashboard.kpi.receivables}
            value={formatFCFA(kpis.outstandingCredits)}
            icon="account_balance_wallet"
            tone="warning"
            hint={t.dashboard.kpi.debtors(debtors)}
            onClick={() => setTab('credits')}
          />
        </div>

        <div className="xl:col-span-8">
          <SalesTrend data={trend} />
        </div>
        <div className="xl:col-span-4 flex flex-col gap-4 lg:gap-5">
          <StockAlerts />
          <ClosingCard closed={closed} onToggle={toggleClosing} />
        </div>

        <div className="xl:col-span-12">
          <RecentSales
            sales={recentSales}
            todayCount={todayCount}
            // Les ventes historiques ne portent pas le détail des lignes : le reçu
            // retombe sur l'affichage « articles divers ».
            onSelect={(sale) => openReceipt(sale, [])}
            onViewAll={canSeeFinance ? () => setTab('bilan') : undefined}
          />
        </div>
      </div>
    </div>
  );
}
