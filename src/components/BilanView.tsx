import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { Expense, SaleTransaction } from '../types';
import { formatFCFA } from '../data/initialData';
import { ExportModal } from './ExportModal';
import { exportToCSV, exportToPDF } from '../utils/exportUtils';

interface BilanViewProps {
  expenses: Expense[];
  sales?: SaleTransaction[];
  onOpenExpenseModal: () => void;
  onShowToast: (msg: string) => void;
}

export const BilanView: React.FC<BilanViewProps> = ({
  expenses,
  sales = [],
  onOpenExpenseModal,
  onShowToast,
}) => {
  const [period, setPeriod] = useState<'today' | '7d' | '30d'>('30d');
  const [showTargetLine, setShowTargetLine] = useState(true);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportInitialFormat, setExportInitialFormat] = useState<'CSV' | 'PDF'>('PDF');

  // Dynamic daily revenue for the last 7 days
  const todaySalesTotal = sales.reduce((sum, s) => sum + s.amount, 0);

  const dailyRevenueData = [
    { day: 'Mer', fullDate: 'Mercredi 18 Oct', revenue: 120000, orders: 14 },
    { day: 'Jeu', fullDate: 'Jeudi 19 Oct', revenue: 145000, orders: 18 },
    { day: 'Ven', fullDate: 'Vendredi 20 Oct', revenue: 190000, orders: 24 },
    { day: 'Sam', fullDate: 'Samedi 21 Oct', revenue: 240000, orders: 32 },
    { day: 'Dim', fullDate: 'Dimanche 22 Oct', revenue: 160000, orders: 19 },
    { day: 'Lun', fullDate: 'Lundi 23 Oct', revenue: 135000, orders: 16 },
    {
      day: 'Mar',
      fullDate: 'Mardi 24 Oct (Aujourd\'hui)',
      revenue: todaySalesTotal > 0 ? 142500 + Math.max(0, todaySalesTotal - 42500) : 180000,
      orders: 22,
    },
  ];

  const total7d = dailyRevenueData.reduce((acc, curr) => acc + curr.revenue, 0);
  const avgRevenue = Math.round(total7d / dailyRevenueData.length);
  const peakDay = [...dailyRevenueData].sort((a, b) => b.revenue - a.revenue)[0];

  const stats = {
    today: {
      net: 114500,
      trend: '+14%',
      ca: 142500,
      depenses: 28000,
      margin: '80.3%',
    },
    '7d': {
      net: 485200,
      trend: '+8.2%',
      ca: 640000,
      depenses: 154800,
      margin: '76%',
    },
    '30d': {
      net: 1420500,
      trend: '+18.4%',
      ca: 2150000,
      depenses: 729500,
      margin: '34%',
    },
  }[period];

  const handleOpenExport = (format: 'PDF' | 'CSV') => {
    setExportInitialFormat(format);
    setIsExportModalOpen(true);
  };

  const handleDirectCSV = () => {
    exportToCSV('all', sales, expenses);
    onShowToast('Fichier CSV comptable complet téléchargé avec succès !');
  };

  const handleDirectPDF = () => {
    exportToPDF('all', sales, expenses);
    onShowToast('Rapport PDF comptable officiel téléchargé avec succès !');
  };

  return (
    <div className="flex flex-col w-full px-4 space-y-4 pb-28 pt-2">
      {/* Header */}
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
          onClick={() => handleOpenExport('PDF')}
          className="w-9 h-9 rounded-xl bg-white hover:bg-slate-50 flex items-center justify-center text-slate-700 shadow-2xs border border-slate-200/80 active:scale-95 transition-all cursor-pointer"
          title="Exporter le rapport comptable (CSV / PDF)"
        >
          <span className="material-symbols-outlined text-[18px]">download</span>
        </button>
      </div>

      {/* Period Filter Tabs */}
      <div className="flex p-1 bg-slate-100 rounded-xl w-full gap-1 border border-slate-200/80">
        <button
          type="button"
          onClick={() => setPeriod('today')}
          className={`flex-1 py-1.5 rounded-lg text-center text-xs font-semibold transition-all ${
            period === 'today'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Aujourd'hui
        </button>
        <button
          type="button"
          onClick={() => setPeriod('7d')}
          className={`flex-1 py-1.5 rounded-lg text-center text-xs font-semibold transition-all ${
            period === '7d'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          7 jours
        </button>
        <button
          type="button"
          onClick={() => setPeriod('30d')}
          className={`flex-1 py-1.5 rounded-lg text-center text-xs font-semibold transition-all ${
            period === '30d'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          30 jours
        </button>
      </div>

      {/* Hero Financial KPI */}
      <div className="relative overflow-hidden bg-white p-4 rounded-2xl shadow-2xs border border-slate-200/80">
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
              Bénéfice Net Réalisé ({period === 'today' ? 'Aujourd’hui' : period})
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="font-display font-bold text-3xl text-slate-900 tracking-tight font-num">
                +{stats.net.toLocaleString('fr-FR')}
              </span>
              <span className="text-xs text-slate-500 font-bold">FCFA</span>
            </div>
            <div className="flex items-center gap-1 text-emerald-700 text-xs font-bold mt-1">
              <span className="material-symbols-outlined text-[16px]">trending_up</span>
              <span>{stats.trend} vs période précédente</span>
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
              {stats.ca.toLocaleString('fr-FR')} F
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 font-medium">Dépenses Op.</span>
            <span className="font-display font-bold text-xs text-rose-700 mt-0.5 font-num">
              {stats.depenses.toLocaleString('fr-FR')} F
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-slate-500 font-medium">Marge Brute</span>
            <span className="font-display font-bold text-xs text-emerald-700 mt-0.5 font-num">
              {stats.margin}
            </span>
          </div>
        </div>
      </div>

      {/* Recharts Daily Revenue Line Chart (7 derniers jours) */}
      <div className="bg-white p-4 rounded-2xl shadow-2xs border border-slate-200/80 flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-emerald-600">
                show_chart
              </span>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Revenus Quotidiens (7 jours)
              </h2>
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5">
              Courbe Recharts des recettes journalières
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowTargetLine((prev) => !prev)}
            className={`px-2 py-1 rounded-lg text-[10px] font-semibold border transition-all flex items-center gap-1 cursor-pointer ${
              showTargetLine
                ? 'bg-slate-100 text-slate-800 border-slate-200'
                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
            }`}
            title="Afficher/Masquer la ligne d'objectif journalier"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                showTargetLine ? 'bg-emerald-600' : 'bg-slate-400'
              }`}
            />
            <span>Obj. 150k F</span>
          </button>
        </div>

        {/* 3 Quick KPI Chips */}
        <div className="grid grid-cols-3 gap-2 py-2 px-3 bg-slate-50 rounded-xl border border-slate-100">
          <div className="flex flex-col">
            <span className="text-[9px] text-slate-500 uppercase font-semibold">Total 7j</span>
            <span className="font-display font-bold text-xs text-slate-900 font-num">
              {total7d.toLocaleString('fr-FR')} F
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-[9px] text-slate-500 uppercase font-semibold">Moyenne / j</span>
            <span className="font-display font-bold text-xs text-emerald-700 font-num">
              {avgRevenue.toLocaleString('fr-FR')} F
            </span>
          </div>

          <div className="flex flex-col items-end">
            <span className="text-[9px] text-slate-500 uppercase font-semibold">Pic ({peakDay.day})</span>
            <span className="font-display font-bold text-xs text-slate-900 font-num">
              {peakDay.revenue.toLocaleString('fr-FR')} F
            </span>
          </div>
        </div>

        {/* Recharts Component */}
        <div className="w-full h-52 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={dailyRevenueData}
              margin={{ top: 10, right: 12, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="day"
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
              />
              <YAxis
                stroke="#94a3b8"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `${Math.round(val / 1000)}k`}
                domain={[80000, 260000]}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload;
                    return (
                      <div className="bg-slate-900 text-white p-2.5 rounded-xl shadow-xl border border-slate-800 text-xs">
                        <p className="font-semibold text-[10px] text-emerald-400">{item.fullDate}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-slate-300 text-[10px]">Recette :</span>
                          <span className="font-bold text-xs text-white font-num">
                            {Number(item.revenue).toLocaleString('fr-FR')} FCFA
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {item.orders} transactions
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              {showTargetLine && (
                <ReferenceLine
                  y={150000}
                  stroke="#e11d48"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: 'Obj. 150k',
                    position: 'insideTopRight',
                    fill: '#e11d48',
                    fontSize: 9,
                    fontWeight: 600,
                  }}
                />
              )}
              <Line
                type="monotone"
                dataKey="revenue"
                name="Revenus"
                stroke="#10b981"
                strokeWidth={2.5}
                dot={{ fill: '#ffffff', stroke: '#10b981', strokeWidth: 2, r: 3.5 }}
                activeDot={{ r: 6, fill: '#10b981', stroke: '#0f172a', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-emerald-500" />
            <span>Revenus réels quotidiens</span>
          </div>
          {showTargetLine && (
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-rose-500 border-b border-dashed border-rose-500" />
              <span>Objectif seuil (150k F)</span>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Bar Chart (Visual Flow) */}
      <div className="bg-white p-4 rounded-2xl shadow-2xs border border-slate-200/80">
        <div className="flex items-center justify-between mb-3">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-900">Évolution des Flux (7 derniers jours)</span>
            <span className="text-[10px] text-slate-500">Comparatif Ventes vs Dépenses</span>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-semibold">
            <span className="flex items-center gap-1 text-slate-800">
              <span className="w-2 h-2 rounded-sm bg-emerald-500" />
              Ventes
            </span>
            <span className="flex items-center gap-1 text-slate-500">
              <span className="w-2 h-2 rounded-sm bg-rose-500" />
              Dépenses
            </span>
          </div>
        </div>

        {/* SVG Daily Chart */}
        <div className="w-full h-36 flex items-end justify-between gap-2 pt-4 px-1">
          {[
            { day: 'Mer', sales: 120, exp: 20 },
            { day: 'Jeu', sales: 145, exp: 40 },
            { day: 'Ven', sales: 190, exp: 70 },
            { day: 'Sam', sales: 240, exp: 85 },
            { day: 'Dim', sales: 160, exp: 30 },
            { day: 'Lun', sales: 135, exp: 25 },
            { day: 'Mar', sales: 180, exp: 35 },
          ].map((bar, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group">
              <div className="w-full flex items-end justify-center gap-1 h-28">
                {/* Sales bar */}
                <div
                  className="w-2.5 bg-emerald-500 hover:bg-emerald-600 rounded-t-sm transition-all"
                  style={{ height: `${(bar.sales / 250) * 100}%` }}
                  title={`Ventes: ${bar.sales * 1000} FCFA`}
                />
                {/* Expense bar */}
                <div
                  className="w-2.5 bg-rose-400 hover:bg-rose-500 rounded-t-sm transition-all"
                  style={{ height: `${(bar.exp / 250) * 100}%` }}
                  title={`Dépenses: ${bar.exp * 1000} FCFA`}
                />
              </div>
              <span className="text-[10px] text-slate-500 font-semibold group-hover:text-slate-900">
                {bar.day}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Encaissements par Canal */}
      <div className="bg-white p-4 rounded-2xl shadow-2xs border border-slate-200/80 flex flex-col gap-3">
        <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
          Répartition des encaissements
        </span>

        {/* Channels distribution bar */}
        <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-100">
          <div className="h-full bg-slate-900" style={{ width: '62%' }} title="Espèces : 62%" />
          <div className="h-full bg-emerald-500" style={{ width: '28%' }} title="Wave / OM : 28%" />
          <div className="h-full bg-amber-400" style={{ width: '10%' }} title="Crédits : 10%" />
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs pt-1">
          <div className="flex flex-col">
            <div className="flex items-center gap-1 text-[11px] text-slate-500">
              <span className="w-2 h-2 rounded-full bg-slate-900" />
              <span>Espèces</span>
            </div>
            <span className="font-bold text-slate-900 mt-0.5 font-num">62%</span>
            <span className="text-[10px] text-slate-500">1 333 000 F</span>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-1 text-[11px] text-slate-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Wave / OM</span>
            </div>
            <span className="font-bold text-slate-900 mt-0.5 font-num">28%</span>
            <span className="text-[10px] text-slate-500">602 000 F</span>
          </div>

          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1 text-[11px] text-slate-500">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Crédits</span>
            </div>
            <span className="font-bold text-slate-900 mt-0.5 font-num">10%</span>
            <span className="text-[10px] text-slate-500">215 000 F</span>
          </div>
        </div>
      </div>

      {/* Dépenses summary with trigger to detailed Dépenses modal */}
      <div className="bg-white p-4 rounded-2xl shadow-2xs border border-slate-200/80 flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-rose-600 text-[18px]">receipt_long</span>
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Postes de Dépenses
            </span>
          </div>
          <button
            type="button"
            onClick={onOpenExpenseModal}
            className="text-xs text-slate-700 hover:text-slate-900 font-bold flex items-center gap-0.5 cursor-pointer"
          >
            <span>Détail complet</span>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          </button>
        </div>

        <div className="flex flex-col gap-2 pt-1">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500">Achats Stock / Marchandises</span>
            <span className="font-bold text-slate-900 font-num">510 650 F (70%)</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500">Transport &amp; Logistique</span>
            <span className="font-bold text-slate-900 font-num">94 835 F (13%)</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500">Factures (Senelec, Eau, Loyer)</span>
            <span className="font-bold text-slate-900 font-num">72 950 F (10%)</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500">Divers &amp; Menues dépenses</span>
            <span className="font-bold text-slate-900 font-num">51 065 F (7%)</span>
          </div>
        </div>
      </div>

      {/* Section Traçabilité & Export Comptable Externe */}
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
              Générez vos journaux de ventes et de dépenses pour votre comptable externe ou archivage fiscal.
            </p>
          </div>
          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            CSV &amp; PDF
          </span>
        </div>

        {/* Quick format cards */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div
            onClick={handleDirectCSV}
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
            onClick={handleDirectPDF}
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
          onClick={() => handleOpenExport('PDF')}
          className="w-full py-2 bg-white hover:bg-slate-50 border border-dashed border-slate-300 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">tune</span>
          <span>Personnaliser le périmètre de l'export (Ventes seules / Dépenses seules)</span>
        </button>
      </div>

      {/* Export & Actions CTA */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => handleOpenExport('PDF')}
          className="flex-1 h-11 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xs cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px] text-rose-400">picture_as_pdf</span>
          <span>Rapport PDF Officiel</span>
        </button>

        <button
          type="button"
          onClick={() => handleOpenExport('CSV')}
          className="flex-1 h-11 bg-white hover:bg-slate-50 text-slate-900 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all shadow-2xs border border-slate-200/80 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px] text-emerald-600">table_view</span>
          <span>Fichier Tableur CSV</span>
        </button>
      </div>

      {/* Export Configuration Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        sales={sales}
        expenses={expenses}
        onShowToast={onShowToast}
        initialFormat={exportInitialFormat}
      />
    </div>
  );
};
