import { useMemo, useState } from 'react';
import type { SeriesPoint } from '@/types';
import { addDays, parseDate } from '@/domain/dates';
import {
  cashFlowSeries,
  channelSplit,
  computeKpis,
  dailyRevenueSeries,
  expenseBreakdown,
} from '@/domain/finances';
import { formatFCFA } from '@/domain/money';
import { retailValue } from '@/domain/stock';
import { exportToCSV, exportToPDF } from '@/lib/export';
import { expensesInRange, useExpensesStore } from '@/store/useExpensesStore';
import { useCreditsStore } from '@/store/useCreditsStore';
import { useProductsStore } from '@/store/useProductsStore';
import { useSalesStore } from '@/store/useSalesStore';
import { useUiStore } from '@/store/useUiStore';
import { CashFlowChart } from './CashFlowChart';
import { ChannelSplit } from './ChannelSplit';
import { ExpenseBreakdown } from './ExpenseBreakdown';
import { RevenueChart } from './RevenueChart';

/**
 * BilanView — rapport financier. Aucune donnée métier en props : séries, KPI et
 * répartitions sont dérivés des stores via `@/domain/finances`, et l'export
 * passe par `@/lib/export`.
 */
type Period = 'today' | '7d' | '30d';

const PERIOD_DAYS: Record<Period, number> = { today: 1, '7d': 7, '30d': 30 };
const PERIOD_LABEL: Record<Period, string> = {
  today: "Aujourd'hui",
  '7d': '7 jours',
  '30d': '30 jours',
};
const PERIOD_TABS: { id: Period; label: string }[] = [
  { id: 'today', label: "Aujourd'hui" },
  { id: '7d', label: '7 jours' },
  { id: '30d', label: '30 jours' },
];

function withDayLabels(points: SeriesPoint[]): SeriesPoint[] {
  return points.map((point) => {
    const date = parseDate(point.date);
    return {
      ...point,
      label: date ? date.toLocaleDateString('fr-FR', { weekday: 'short' }) : point.date,
    };
  });
}

function growthRate(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

export function BilanView() {
  const [period, setPeriod] = useState<Period>('30d');
  const now = useMemo(() => new Date(), []);

  const sales = useSalesStore((state) => state.sales);
  const expenses = useExpensesStore((state) => state.expenses);
  const credits = useCreditsStore((state) => state.credits);
  const products = useProductsStore((state) => state.products);
  const showToast = useUiStore((state) => state.showToast);
  const openModal = useUiStore((state) => state.openModal);

  const days = PERIOD_DAYS[period];
  const from = useMemo(() => addDays(now, -(days - 1)), [now, days]);

  const revenueSeries = useMemo(
    () => withDayLabels(dailyRevenueSeries(sales, days, now)),
    [sales, days, now],
  );
  const cashFlow = useMemo(
    () => withDayLabels(cashFlowSeries(sales, expenses, days, now)),
    [sales, expenses, days, now],
  );
  const expenseSlices = useMemo(
    () => expenseBreakdown(expenses, from, now),
    [expenses, from, now],
  );
  const channels = useMemo(() => channelSplit(sales), [sales]);

  const stats = useMemo(() => {
    const series = dailyRevenueSeries(sales, days * 2, now);
    const revenue = series.slice(days).reduce((sum, point) => sum + point.value, 0);
    const previous = series.slice(0, days).reduce((sum, point) => sum + point.value, 0);
    const rangeExpenses = expensesInRange(expenses, from, now);
    const expenseTotal = rangeExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const margin = computeKpis({ sales, expenses, credits, products }, now).margin;
    const retail = retailValue(products);
    return {
      revenue,
      previous,
      expenses: expenseTotal,
      net: revenue - expenseTotal,
      marginRate: retail > 0 ? (margin / retail) * 100 : 0,
    };
  }, [sales, expenses, credits, products, days, from, now]);

  const growth = growthRate(stats.revenue, stats.previous);

  const handleExportCSV = () => {
    exportToCSV('all', sales, expenses);
    showToast('Fichier CSV comptable complet téléchargé.', 'success');
  };

  const handleExportPDF = () => {
    exportToPDF('all', sales, expenses);
    showToast('Rapport PDF comptable officiel téléchargé.', 'success');
  };

  return (
    <div className="flex flex-col w-full px-4 space-y-4 pb-28 pt-2">
      {/* En-tête */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="font-display text-lg font-bold text-slate-900">Bilan Financier</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
              Temps réel
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            Synthèse comptable &amp; performance commerciale
          </p>
        </div>

        <button
          type="button"
          onClick={() => openModal('export')}
          className="w-9 h-9 rounded-xl bg-white hover:bg-slate-50 flex items-center justify-center text-slate-700 shadow-2xs border border-slate-200/80 active:scale-95 transition-all cursor-pointer"
          title="Exporter le rapport comptable (CSV / PDF)"
        >
          <span className="material-symbols-outlined text-[18px]">download</span>
        </button>
      </div>

      {/* Filtre de période */}
      <div className="flex p-1 bg-slate-100 rounded-xl w-full gap-1 border border-slate-200/80">
        {PERIOD_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setPeriod(tab.id)}
            className={`flex-1 py-1.5 rounded-lg text-center text-xs font-semibold transition-all ${
              period === tab.id
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* KPI principal */}
      <div className="relative overflow-hidden bg-white p-4 rounded-2xl shadow-2xs border border-slate-200/80">
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
              Bénéfice Net Réalisé ({PERIOD_LABEL[period]})
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="font-display font-bold text-3xl text-slate-900 tracking-tight font-num">
                {stats.net >= 0 ? '+' : ''}
                {formatFCFA(stats.net)}
              </span>
            </div>
            <div
              className={`flex items-center gap-1 text-xs font-bold mt-1 ${
                growth === null || growth >= 0 ? 'text-emerald-700' : 'text-rose-600'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">
                {growth === null || growth >= 0 ? 'trending_up' : 'trending_down'}
              </span>
              <span>
                {growth === null
                  ? 'Historique insuffisant'
                  : `${growth >= 0 ? '+' : ''}${growth.toFixed(1)}% vs période précédente`}
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white">
            <span className="material-symbols-outlined text-[20px] text-emerald-400">insights</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 font-medium">Chiffre d'Affaires</span>
            <span className="font-display font-bold text-xs text-slate-900 mt-0.5 font-num">
              {formatFCFA(stats.revenue)}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 font-medium">Dépenses Op.</span>
            <span className="font-display font-bold text-xs text-rose-700 mt-0.5 font-num">
              {formatFCFA(stats.expenses)}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-slate-500 font-medium">Marge potentielle</span>
            <span className="font-display font-bold text-xs text-emerald-700 mt-0.5 font-num">
              {stats.marginRate.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Revenus quotidiens (recharts) */}
      <RevenueChart data={revenueSeries} />

      {/* Flux de trésorerie net */}
      <CashFlowChart data={cashFlow} />

      {/* Répartition par canal */}
      <ChannelSplit data={channels} />

      {/* Postes de dépenses */}
      <ExpenseBreakdown data={expenseSlices} onOpenDetails={() => openModal('depenses')} />

      {/* Traçabilité & export comptable */}
      <div className="bg-white p-4 rounded-2xl shadow-2xs border border-slate-200/80 flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-emerald-600">
                cloud_download
              </span>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Traçabilité &amp; Export Comptable
              </h2>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Générez vos journaux de ventes et de dépenses pour votre comptable externe ou
              archivage fiscal.
            </p>
          </div>
          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            CSV &amp; PDF
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <div
            onClick={handleExportCSV}
            role="button"
            tabIndex={0}
            className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="material-symbols-outlined text-[20px] text-emerald-600 group-hover:scale-110 transition-transform">
                  table_view
                </span>
                <span className="text-[9px] font-semibold bg-white text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200">
                  Excel UTF-8
                </span>
              </div>
              <h3 className="font-bold text-xs text-slate-900">Export CSV Complet</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Ventes &amp; dépenses avec séparateur compatible Excel et Google Sheets.
              </p>
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] font-semibold text-emerald-700">
              <span>Télécharger CSV</span>
              <span className="material-symbols-outlined text-[14px]">download</span>
            </div>
          </div>

          <div
            onClick={handleExportPDF}
            role="button"
            tabIndex={0}
            className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="material-symbols-outlined text-[20px] text-rose-600 group-hover:scale-110 transition-transform">
                  picture_as_pdf
                </span>
                <span className="text-[9px] font-semibold bg-white text-rose-700 px-1.5 py-0.5 rounded border border-rose-200">
                  Officiel A4
                </span>
              </div>
              <h3 className="font-bold text-xs text-slate-900">Rapport PDF Certifié</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Document A4 paginé avec en-tête magasin, totaux et cadre de visa.
              </p>
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] font-semibold text-rose-700">
              <span>Générer PDF</span>
              <span className="material-symbols-outlined text-[14px]">download</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => openModal('export')}
          className="w-full py-2 bg-white hover:bg-slate-50 border border-dashed border-slate-300 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">tune</span>
          <span>Personnaliser le périmètre de l'export (Ventes seules / Dépenses seules)</span>
        </button>
      </div>

      {/* CTA export */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleExportPDF}
          className="flex-1 h-11 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xs cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px] text-rose-400">
            picture_as_pdf
          </span>
          <span>Rapport PDF Officiel</span>
        </button>

        <button
          type="button"
          onClick={handleExportCSV}
          className="flex-1 h-11 bg-white hover:bg-slate-50 text-slate-900 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all shadow-2xs border border-slate-200/80 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px] text-emerald-600">table_view</span>
          <span>Fichier Tableur CSV</span>
        </button>
      </div>
    </div>
  );
}
