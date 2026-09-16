import React, { useState } from 'react';
import { SaleTransaction, TabType } from '../types';
import { formatFCFA } from '../data/initialData';

interface AccueilViewProps {
  onNavigate: (tab: TabType) => void;
  onOpenExpenseModal: () => void;
  onOpenNewProductModal: () => void;
  onOpenNewCreditModal: () => void;
  sales: SaleTransaction[];
  onOpenSaleDetail: (sale: SaleTransaction) => void;
}

export const AccueilView: React.FC<AccueilViewProps> = ({
  onNavigate,
  onOpenExpenseModal,
  onOpenNewProductModal,
  onOpenNewCreditModal,
  sales,
  onOpenSaleDetail,
}) => {
  const [period, setPeriod] = useState<'today' | '7d' | 'month'>('today');
  const [clotureDone, setClotureDone] = useState(false);

  // Dynamic values based on period
  const kpiData = {
    today: {
      net: 114500,
      margin: '80.3%',
      salesAmount: 142500,
      salesTrend: '+14%',
      expensesAmount: 28000,
      expensesCount: 4,
    },
    '7d': {
      net: 485200,
      margin: '76.8%',
      salesAmount: 640000,
      salesTrend: '+8%',
      expensesAmount: 154800,
      expensesCount: 12,
    },
    month: {
      net: 1420500,
      margin: '34%',
      salesAmount: 2150000,
      salesTrend: '+18.4%',
      expensesAmount: 729500,
      expensesCount: 14,
    },
  }[period];

  return (
    <div className="flex flex-col w-full px-4 space-y-4 pb-24 pt-2">
      {/* Greeting & Active Register Status */}
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
          <p className="text-xs text-slate-500 capitalize font-medium">Mardi 24 Octobre</p>
        </div>

        {/* Active Register Status Pill */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 shadow-2xs shrink-0 border border-emerald-200/80">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
          </span>
          <span className="text-[11px] text-emerald-900 font-semibold tracking-tight font-num">
            Caisse Ouverte (08:30)
          </span>
        </div>
      </div>

      {/* Primary Instant POS Trigger & Quick Shortcuts */}
      <div className="flex flex-col gap-2">
        {/* Pro POS Action Button */}
        <button
          id="btn-nouvelle-vente"
          type="button"
          onClick={() => onNavigate('ventes')}
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

        {/* 3 Secondary Utilities */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={onOpenExpenseModal}
            type="button"
            className="h-11 bg-white hover:bg-slate-50 active:scale-95 transition-all rounded-xl flex items-center justify-center gap-1.5 px-2 shadow-2xs border border-slate-200/80 text-slate-800 cursor-pointer"
          >
            <span className="w-5 h-5 rounded-md bg-rose-50 text-rose-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[15px]">remove_circle</span>
            </span>
            <span className="text-[11px] font-semibold truncate">Dépense</span>
          </button>
          <button
            onClick={onOpenNewProductModal}
            type="button"
            className="h-11 bg-white hover:bg-slate-50 active:scale-95 transition-all rounded-xl flex items-center justify-center gap-1.5 px-2 shadow-2xs border border-slate-200/80 text-slate-800 cursor-pointer"
          >
            <span className="w-5 h-5 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[15px]">add_box</span>
            </span>
            <span className="text-[11px] font-semibold truncate">Article</span>
          </button>
          <button
            onClick={onOpenNewCreditModal}
            type="button"
            className="h-11 bg-white hover:bg-slate-50 active:scale-95 transition-all rounded-xl flex items-center justify-center gap-1.5 px-2 shadow-2xs border border-slate-200/80 text-slate-800 cursor-pointer"
          >
            <span className="w-5 h-5 rounded-md bg-sky-50 text-sky-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[15px]">person_add</span>
            </span>
            <span className="text-[11px] font-semibold truncate">Crédit</span>
          </button>
        </div>
      </div>

      {/* Time Filter Segmented Control */}
      <div className="pt-1">
        <div className="flex p-1 bg-slate-100 rounded-xl w-full gap-1 border border-slate-200/70">
          <button
            onClick={() => setPeriod('today')}
            type="button"
            className={`flex-1 py-1.5 rounded-lg text-center text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              period === 'today'
                ? 'bg-white text-slate-900 font-bold shadow-xs border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900 font-medium'
            }`}
          >
            {period === 'today' && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            )}
            <span>Aujourd'hui</span>
          </button>
          <button
            onClick={() => setPeriod('7d')}
            type="button"
            className={`flex-1 py-1.5 rounded-lg text-center text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              period === '7d'
                ? 'bg-white text-slate-900 font-bold shadow-xs border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900 font-medium'
            }`}
          >
            {period === '7d' && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            )}
            <span>7 jours</span>
          </button>
          <button
            onClick={() => setPeriod('month')}
            type="button"
            className={`flex-1 py-1.5 rounded-lg text-center text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              period === 'month'
                ? 'bg-white text-slate-900 font-bold shadow-xs border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900 font-medium'
            }`}
          >
            {period === 'month' && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            )}
            <span>Ce mois</span>
          </button>
        </div>
      </div>

      {/* Financial KPI Metrics */}
      <div className="flex flex-col gap-2.5">
        {/* Highlight Hero KPI: Résultat Net */}
        <div className="relative overflow-hidden bg-white p-4 rounded-2xl shadow-2xs border border-slate-200/90">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 text-slate-500">
                <span className="material-symbols-outlined text-[16px] text-emerald-600">
                  account_balance
                </span>
                <span className="text-[11px] uppercase tracking-wider font-semibold">
                  Résultat Net {period === 'today' ? 'du Jour' : period === '7d' ? '(7j)' : '(30j)'}
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-display font-bold text-2xl text-slate-900 tracking-tight font-num">
                  +{kpiData.net.toLocaleString('fr-FR')}
                </span>
                <span className="text-xs text-slate-500 font-semibold">FCFA</span>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold shadow-2xs">
              <span className="material-symbols-outlined text-[14px]">trending_up</span>
              Cashflow +
            </span>
          </div>

          {/* Subline Spark-Visual */}
          <div className="mt-3 pt-2.5 flex items-center justify-between border-t border-slate-100 bg-slate-50/70 -mx-4 -mb-4 px-4 py-2 rounded-b-2xl">
            <span className="text-[11px] text-slate-500">Rentabilité commerciale</span>
            <span className="text-[11px] text-emerald-700 font-bold">
              {kpiData.margin} de marge brute
            </span>
          </div>
        </div>

        {/* Dual Sub-KPIs */}
        <div className="grid grid-cols-2 gap-2">
          {/* Ventes */}
          <div className="bg-white p-3 rounded-xl shadow-2xs border border-slate-200/80 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase text-slate-500 font-semibold">Ventes</span>
              <span className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-[15px]">payments</span>
              </span>
            </div>
            <div className="mt-2">
              <div className="flex items-baseline gap-1">
                <span className="font-display font-bold text-lg text-slate-900 tracking-tight font-num">
                  {kpiData.salesAmount.toLocaleString('fr-FR')}
                </span>
                <span className="text-[11px] text-slate-500 font-medium">F</span>
              </div>
              <div className="mt-1 flex items-center gap-1 text-emerald-700 text-[11px]">
                <span className="material-symbols-outlined text-[13px]">arrow_upward</span>
                <span className="font-bold">{kpiData.salesTrend}</span>
                <span className="text-slate-400 font-normal text-[10px]">vs veille</span>
              </div>
            </div>
          </div>

          {/* Dépenses */}
          <div
            onClick={onOpenExpenseModal}
            role="button"
            tabIndex={0}
            className="bg-white p-3 rounded-xl shadow-2xs border border-slate-200/80 flex flex-col justify-between cursor-pointer hover:bg-slate-50/80 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase text-slate-500 font-semibold">Dépenses</span>
              <span className="w-6 h-6 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-[15px]">receipt_long</span>
              </span>
            </div>
            <div className="mt-2">
              <div className="flex items-baseline gap-1">
                <span className="font-display font-bold text-lg text-rose-600 tracking-tight font-num">
                  {kpiData.expensesAmount.toLocaleString('fr-FR')}
                </span>
                <span className="text-[11px] text-slate-500 font-medium">F</span>
              </div>
              <div className="mt-1 flex items-center gap-1 text-slate-500 text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                <span>{kpiData.expensesCount} sorties caisse</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Operational Alerts */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between px-0.5">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <span className="material-symbols-outlined text-rose-600 text-[17px]">
              notifications_active
            </span>
            Alertes prioritaires
          </h2>
          <span className="text-[11px] text-slate-500 font-medium">2 actives</span>
        </div>

        {/* Alert 1: Low stock */}
        <div className="bg-white p-3 rounded-xl shadow-2xs border border-rose-200/80 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200/50">
              <span className="material-symbols-outlined text-[18px]">warning</span>
            </div>
            <div className="flex flex-col min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">
                2 articles en rupture ou critique
              </p>
              <p className="text-[11px] text-slate-500 truncate">
                Huile Dinor 1L (reste 1), Riz Parfumé 5kg (0)
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('stock')}
            type="button"
            className="shrink-0 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-900 text-[11px] rounded-lg transition-all font-semibold cursor-pointer border border-slate-200/60"
          >
            Voir
          </button>
        </div>

        {/* Alert 2: Debts overdue */}
        <div
          onClick={() => onNavigate('credits')}
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
                3 crédits arrivent à échéance
              </p>
              <p className="text-[11px] text-slate-500 truncate">
                Total: 48 500 FCFA à recouvrer d'ici vendredi
              </p>
            </div>
          </div>
          <span className="text-amber-700 p-1 shrink-0">
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </span>
        </div>
      </div>

      {/* Recent Sales Stream */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-1.5">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Dernières ventes
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold border border-slate-200/60">
              {sales.length} aujourd'hui
            </span>
          </div>
          <button
            onClick={() => onNavigate('ventes')}
            type="button"
            className="text-[11px] text-emerald-700 hover:text-emerald-800 hover:underline font-bold cursor-pointer"
          >
            Tout afficher
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-2xs border border-slate-200/80 overflow-hidden divide-y divide-slate-100">
          {sales.slice(0, 4).map((sale) => (
            <div
              key={sale.id}
              onClick={() => onOpenSaleDetail(sale)}
              role="button"
              tabIndex={0}
              className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors active:bg-slate-100/80 cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200/60 flex items-center justify-center text-slate-900 shrink-0 font-display font-bold text-xs font-num">
                  {sale.saleNumber}
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900 truncate">
                      Vente {sale.saleNumber}
                    </span>
                    <span
                      className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold border ${
                        sale.status === 'Validé'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {sale.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                    <span>{sale.paymentMethod}</span>
                    <span>•</span>
                    <span className="font-num">{sale.time}</span>
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span
                  className={`block font-display font-bold text-sm tracking-tight font-num ${
                    sale.status === 'Partiel' ? 'text-rose-600' : 'text-slate-900'
                  }`}
                >
                  {sale.amount.toLocaleString('fr-FR')} F
                </span>
                <span
                  className={`text-[10px] font-medium ${
                    sale.status === 'Partiel' ? 'text-rose-600 font-bold' : 'text-emerald-600'
                  }`}
                >
                  {sale.status === 'Partiel'
                    ? `Reste: ${sale.remainingAmount?.toLocaleString('fr-FR')} F`
                    : 'Reçu émis'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* End of Day Cash Close Banner */}
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
          onClick={() => setClotureDone(!clotureDone)}
          type="button"
          className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 shadow-xs active:scale-95 transition-all shrink-0 cursor-pointer"
        >
          {clotureDone ? 'Rouvrir' : 'Clôturer'}
        </button>
      </div>
    </div>
  );
};
