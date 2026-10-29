import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { SeriesPoint } from '@/types';
import { t } from '@/content';
import { DAILY_REVENUE_TARGET } from '@/config/reference';
import { parseDate } from '@/domain/dates';
import { formatFCFA } from '@/domain/money';
import { Card, EmptyState, cn } from '@/ui';
import { chartColors } from '@/design/tokens';

/** Histogramme des recettes journalières (Recharts) + objectif indicatif. */
export interface RevenueChartProps {
  data: SeriesPoint[];
}

function formatFullDate(iso: string): string {
  const date = parseDate(iso);
  return date ? date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' }) : iso;
}

export function RevenueChart({ data }: RevenueChartProps) {
  const [showTarget, setShowTarget] = useState(true);
  const total = data.reduce((sum, point) => sum + point.value, 0);
  const average = data.length > 0 ? Math.round(total / data.length) : 0;
  const peak = data.reduce<SeriesPoint | null>((best, point) => (best === null || point.value > best.value ? point : best), null);
  const targetK = Math.round(DAILY_REVENUE_TARGET / 1000);

  return (
    <Card
      title={t.bilan.revenueChart.title}
      description={t.bilan.revenueChart.subtitle(data.length)}
      action={
        <button
          type="button"
          onClick={() => setShowTarget((previous) => !previous)}
          aria-pressed={showTarget}
          title={t.bilan.revenueChart.targetToggle}
          className={cn(
            'h-8 px-3 rounded-lg text-xs font-semibold border flex items-center gap-1.5 cursor-pointer transition-colors',
            showTarget ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-white border-line text-slate-500'
          )}
        >
          <span className="w-3 border-t-2 border-dashed border-current" />
          {t.bilan.revenueChart.target(targetK)}
        </button>
      }
    >
      {total === 0 ? (
        <EmptyState icon="bar_chart" title={t.bilan.revenueChart.emptyTitle} description={t.bilan.revenueChart.emptyText} compact />
      ) : (
        <>
          <dl className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: t.bilan.revenueChart.total, value: formatFCFA(total) },
              { label: t.bilan.revenueChart.average, value: formatFCFA(average) },
              { label: `${t.bilan.revenueChart.peak}${peak?.label ? ` (${peak.label})` : ''}`, value: formatFCFA(peak?.value ?? 0) },
            ].map((item) => (
              <div key={item.label} className="rounded-xl bg-slate-50 px-3 py-2.5 min-w-0">
                <dt className="text-[11px] text-slate-500 truncate">{item.label}</dt>
                <dd className="font-num font-bold text-sm text-ink-900 truncate">{item.value}</dd>
              </div>
            ))}
          </dl>
          <div className="h-64 -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                <XAxis dataKey="label" stroke={chartColors.axis} fontSize={11} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={8} />
                <YAxis
                  stroke={chartColors.axis}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                  tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`}
                />
                <Tooltip
                  cursor={{ fill: chartColors.cursor }}
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const point = payload[0].payload as SeriesPoint;
                    return (
                      <div className="rounded-xl bg-ink-900 text-white px-3 py-2 text-xs shadow-overlay">
                        <div className="text-zest-400 font-semibold">{formatFullDate(point.date)}</div>
                        <div className="text-slate-300">
                          {t.bilan.revenueChart.tooltip} : <span className="font-num font-bold text-white">{formatFCFA(point.value)}</span>
                        </div>
                      </div>
                    );
                  }}
                />
                {showTarget && <ReferenceLine y={DAILY_REVENUE_TARGET} stroke={chartColors.target} strokeDasharray="5 5" strokeWidth={1.5} />}
                <Bar dataKey="value" fill={chartColors.positiveStrong} radius={[6, 6, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </Card>
  );
}
