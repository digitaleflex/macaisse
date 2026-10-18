import { useMemo, useState } from 'react';
import { addDays, isSameDay, parseDate } from '@/domain/dates';
import { computeKpis, dailyRevenueSeries } from '@/domain/finances';
import { retailValue } from '@/domain/stock';
import { expensesInRange, useExpensesStore } from '@/store/useExpensesStore';
import { useCreditsStore } from '@/store/useCreditsStore';
import { useProductsStore } from '@/store/useProductsStore';
import { useSalesStore } from '@/store/useSalesStore';
import { useUiStore } from '@/store/useUiStore';
import { KpiCard } from './KpiCard';
import { RecentSales } from './RecentSales';
import { StockAlerts } from './StockAlerts';

/**
 * AccueilView — tableau de bord. Aucune donnée métier n'est reçue en props :
 * tout est dérivé des stores (`useSalesStore`, `useExpensesStore`,
 * `useCreditsStore`, `useProductsStore`) et du domaine (`@/domain/finances`).
 * Le reçu d'une vente est ouvert via `useUiStore.openReceipt` : la modale est
 * globale (montée par le shell), cette vue ne détient donc plus de callback prop.
 */
type Period = 'today' | '7d' | 'month';

const PERIOD_DAYS: Record<Period, number> = { today: 1, '7d': 7, month: 30 };
const PERIOD_LABEL: Record<Period, string> = { today: 'du Jour', '7d': '(7j)', month: '(30j)' };
const PERIODS: { id: Period; label: string }[] = [
  { id: 'today', label: "Aujourd'hui" },
  { id: '7d', label: '7 jours' },
  { id: 'month', label: 'Ce mois' },
];

export function AccueilView() {
  const [period, setPeriod] = useState<Period>('today');
  const [clotureDone, setClotureDone] = useState(false);
  const now = useMemo(() => new Date(), []);

  const sales = useSalesStore((state) => state.sales);
  const expenses = useExpensesStore((state) => state.expenses);
  const credits = useCreditsStore((state) => state.credits);
  const products = useProductsStore((state) => state.products);
  const setTab = useUiStore((state) => state.setTab);
  const openModal = useUiStore((state) => state.openModal);
  const openReceipt = useUiStore((state) => state.openReceipt);
  const showToast = useUiStore((state) => state.showToast);

  const kpis = useMemo(
    () => computeKpis({ sales, expenses, credits, products }, now),
    [sales, expenses, credits, products, now],
  );

  const stats = useMemo(() => {
    const days = PERIOD_DAYS[period];
    if (period === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const previousMonthNow = new Date(now.getFullYear(), now.getMonth() - 1, 15);
      const previous = computeKpis(
        { sales, expenses, credits, products },
        previousMonthNow,
      ).monthlyRevenue;
      const rangeExpenses = expensesInRange(expenses, startOfMonth, now);
      return {
        revenue: kpis.monthlyRevenue,
        previous,
        expenses: kpis.monthlyExpenses,
        expensesCount: rangeExpenses.length,
      };
    }
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

  const marginRate = useMemo(() => {
    const retail = retailValue(products);
    return retail > 0 ? (kpis.margin / retail) * 100 : 0;
  }, [products, kpis.margin]);

  const todayCount = useMemo(
    () =>
      sales.filter((sale) => {
        const date = parseDate(sale.date);
        return date !== null && isSameDay(date, now);
      }).length,
    [sales, now],
  );
  const recentSales = useMemo(() => sales.slice(0, 4), [sales]);

  const todayLabel = useMemo(() => {
    const label = now.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }, [now]);

  const handleToggleCloture = () => {
    const next = !clotureDone;
    setClotureDone(next);
    showToast(
      next ? 'Caisse clôturée avec succès.' : 'Caisse réouverte.',
      next ? 'success' : 'info',
    );
  };

  const quickActions = [
    {
      label: 'Dépense',
      icon: 'remove_circle',
      iconClass: 'bg-rose-50 text-rose-600',
      onClick: () => openModal('depenses'),
    },
    {
      label: 'Article',
      icon: 'add_box',
      iconClass: 'bg-emerald-50 text-emerald-600',
      onClick: () => setTab('stock'),
    },
    {
      label: 'Crédit',
      icon: 'person_add',
      iconClass: 'bg-sky-50 text-sky-600',
      onClick: () => setTab('credits'),
    },
  ];

  return (
    <div className="flex flex-col w-full px-4 space-y-4 pb-24 pt-2">
      {/* En-tête & statut de caisse */}
      <div className="flex items-start justify-between gap-2 pt-1">
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <h1 className="font-display text-xl font-bold text-slate-900 tracking-tight truncate">
              Bonjour, Mamadou
            </h1>
            <span aria-hidden="true" className="text-lg select-none">
              👋
            </span>
          </div>
          <p className="text-xs text-slate-500 capitalize font-medium">{todayLabel}</p>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 shadow-2xs shrink-0 border border-emerald-200/80">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
          </span>
          <span className="text-[11px] text-emerald-900 font-semibold tracking-tight font-num">
            Caisse Ouverte
          </span>
        </div>
      </div>

      {/* Action POS & raccourcis */}
      <div className="flex flex-col gap-2">
        <button
          id="btn-nouvelle-vente"
          type="button"
          onClick={() => setTab('ventes')}
          className="group relative w-full h-15 bg-slate-900 hover:bg-slate-800 active:scale-[0.99] transition-all rounded-2xl flex items-center justify-between px-4 shadow-sm border border-slate-800 cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-slate-950 shadow-xs font-bold shrink-0">
              <span className="material-symbols-outlined text-[22px]">add_shopping_cart</span>
            </div>
            <div className="flex flex-col items-start text-left">
              <div className="flex items-center gap-1.5">
                <span className="font-display font-bold text-base text-white leading-tight">
                  Nouvelle Vente
                </span>
                <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-extrabold uppercase">
                  POS
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">
                Encaisser un client ou scanner un code-barres
              </span>
            </div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-colors">
            <span className="material-symbols-outlined text-[18px] group-hover:translate-x-0.5 transition-transform">
              arrow_forward
            </span>
          </div>
        </button>

        <div className="grid grid-cols-3 gap-2">
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={action.onClick}
              type="button"
              className="h-11 bg-white hover:bg-slate-50 active:scale-95 transition-all rounded-xl flex items-center justify-center gap-1.5 px-2 shadow-2xs border border-slate-200/80 text-slate-800 cursor-pointer"
            >
              <span
                className={`w-5 h-5 rounded-md flex items-center justify-center ${action.iconClass}`}
              >
                <span className="material-symbols-outlined text-[15px]">{action.icon}</span>
              </span>
              <span className="text-[11px] font-semibold truncate">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Sélecteur de période */}
      <div className="flex p-1 bg-slate-100 rounded-xl w-full gap-1 border border-slate-200/70">
        {PERIODS.map((option) => (
          <button
            key={option.id}
            onClick={() => setPeriod(option.id)}
            type="button"
            className={`flex-1 py-1.5 rounded-lg text-center text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              period === option.id
                ? 'bg-white text-slate-900 font-bold shadow-xs border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900 font-medium'
            }`}
          >
            {period === option.id && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            )}
            <span>{option.label}</span>
          </button>
        ))}
      </div>

      {/* Indicateurs financiers */}
      <KpiCard
        periodLabel={PERIOD_LABEL[period]}
        net={stats.revenue - stats.expenses}
        revenue={stats.revenue}
        previousRevenue={stats.previous}
        expenses={stats.expenses}
        expensesCount={stats.expensesCount}
        marginRate={marginRate}
        onOpenExpenses={() => openModal('depenses')}
      />

      {/* Alertes prioritaires */}
      <StockAlerts />

      {/* Dernières ventes */}
      <RecentSales
        sales={recentSales}
        todayCount={todayCount}
        // `SaleTransaction` ne transporte pas le détail des lignes : on ouvre le
        // reçu avec des items vides et la modale retombe sur son affichage
        // `itemsCount`. Aucun panier n'est fabriqué (donnée inventée interdite).
        onSelect={(sale) => openReceipt(sale, [])}
        onViewAll={() => setTab('ventes')}
      />

      {/* Clôture journalière */}
      <div className="rounded-2xl bg-slate-900 text-white p-3.5 flex items-center justify-between gap-2.5 border border-slate-800 shadow-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-emerald-400 shrink-0 border border-slate-700/60">
            <span className="material-symbols-outlined text-[18px]">
              {clotureDone ? 'check_circle' : 'lock_clock'}
            </span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs text-white font-bold truncate">
              {clotureDone ? 'Caisse clôturée avec succès' : 'Clôture journalière'}
            </span>
            <span className="text-[11px] text-slate-400 truncate">
              {clotureDone
                ? 'Journal archivé et synchronisé'
                : 'Rapprochement de caisse recommandé à 20:00'}
            </span>
          </div>
        </div>
        <button
          onClick={handleToggleCloture}
          type="button"
          className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 shadow-xs active:scale-95 transition-all shrink-0 cursor-pointer"
        >
          {clotureDone ? 'Rouvrir' : 'Clôturer'}
        </button>
      </div>
    </div>
  );
}
