import { useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { SeriesPoint } from '@/types';
import { parseDate } from '@/domain/dates';
import { formatFCFA } from '@/domain/money';
import { EmptyState } from '@/ui';

/**
 * RevenueChart — courbe Recharts des revenus journaliers.
 * Composant présentationnel pur : ne reçoit qu'une `SeriesPoint[]` et n'importe
 * aucun store. Le seul recharts de la feature est isolé ici.
 */
export interface RevenueChartProps {
  /** Série des revenus journaliers (la plus ancienne en premier). */
  data: SeriesPoint[];
}

/** Objectif journalier indicatif (non dérivable des données, volontairement illustratif). */
const DAILY_TARGET = 150000;

function formatFullDate(iso: string): string {
  const date = parseDate(iso);
  return date
    ? date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })
    : iso;
}

export function RevenueChart({ data }: RevenueChartProps) {
  const [showTargetLine, setShowTargetLine] = useState(true);

  const total = data.reduce((sum, point) => sum + point.value, 0);
  const average = data.length > 0 ? Math.round(total / data.length) : 0;
  const peak = data.reduce<SeriesPoint | null>(
    (best, point) => (best === null || point.value > best.value ? point : best),
    null,
  );
  const max = Math.max(
    ...data.map((point) => point.value),
    showTargetLine ? DAILY_TARGET : 0,
    1,
  );

  return (
    <div className="bg-white p-4 rounded-2xl shadow-2xs border border-slate-200/80 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px] text-emerald-600">
              show_chart
            </span>
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Revenus Quotidiens ({data.length} j)
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
          title="Afficher/Masquer la ligne d'objectif journalier (indicatif)"
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              showTargetLine ? 'bg-emerald-600' : 'bg-slate-400'
            }`}
          />
          <span>Obj. {Math.round(DAILY_TARGET / 1000)}k F</span>
        </button>
      </div>

      {data.length === 0 ? (
        <EmptyState
          icon="show_chart"
          title="Aucune donnée"
          description="Aucune recette enregistrée sur la période."
        />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 py-2 px-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-500 uppercase font-semibold">
                Total {data.length}j
              </span>
              <span className="font-display font-bold text-xs text-slate-900 font-num">
                {formatFCFA(total)}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-500 uppercase font-semibold">Moyenne / j</span>
              <span className="font-display font-bold text-xs text-emerald-700 font-num">
                {formatFCFA(average)}
              </span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[9px] text-slate-500 uppercase font-semibold">
                Pic ({peak?.label ?? '—'})
              </span>
              <span className="font-display font-bold text-xs text-slate-900 font-num">
                {formatFCFA(peak?.value ?? 0)}
              </span>
            </div>
          </div>

          <div className="w-full h-52 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 10, right: 12, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="label"
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
                  tickFormatter={(val) => `${Math.round(Number(val) / 1000)}k`}
                  domain={[0, Math.ceil(max * 1.1)]}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const point = payload[0].payload as SeriesPoint;
                    return (
                      <div className="bg-slate-900 text-white p-2.5 rounded-xl shadow-xl border border-slate-800 text-xs">
                        <p className="font-semibold text-[10px] text-emerald-400">
                          {formatFullDate(point.date)}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-slate-300 text-[10px]">Recette :</span>
                          <span className="font-bold text-xs text-white font-num">
                            {formatFCFA(point.value)}
                          </span>
                        </div>
                      </div>
                    );
                  }}
                />
                {showTargetLine && (
                  <ReferenceLine
                    y={DAILY_TARGET}
                    stroke="#e11d48"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      value: `Obj. ${Math.round(DAILY_TARGET / 1000)}k`,
                      position: 'insideTopRight',
                      fill: '#e11d48',
                      fontSize: 9,
                      fontWeight: 600,
                    }}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="value"
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
                <span>Objectif indicatif ({Math.round(DAILY_TARGET / 1000)}k F)</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
