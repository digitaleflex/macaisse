import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import type { SeriesPoint } from '@/types';
import { t } from '@/content';
import { formatFCFA } from '@/domain/money';
import { Card, EmptyState } from '@/ui';

/** Solde net quotidien (recettes − dépenses), barres positives / négatives. */
export interface CashFlowChartProps {
  data: SeriesPoint[];
}

export function CashFlowChart({ data }: CashFlowChartProps) {
  const hasData = data.some((point) => point.value !== 0);
  return (
    <Card
      title={t.bilan.cashflow.title}
      description={t.bilan.cashflow.subtitle}
      action={
        <div className="flex items-center gap-3 text-xs font-medium text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-brand-500" />
            {t.bilan.cashflow.surplus}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-rose-400" />
            {t.bilan.cashflow.deficit}
          </span>
        </div>
      }
    >
      {!hasData ? (
        <EmptyState icon="bar_chart" title={t.bilan.cashflow.emptyTitle} description={t.bilan.cashflow.emptyText} compact />
      ) : (
        <div className="h-52 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={8} />
              <ReferenceLine y={0} stroke="#cbd5e1" />
              <Tooltip
                cursor={{ fill: '#f1f5f9' }}
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const point = payload[0].payload as SeriesPoint;
                  return (
                    <div className="rounded-xl bg-ink-900 text-white px-3 py-2 text-xs shadow-overlay">
                      <div className="text-slate-400">{point.label}</div>
                      <div className="font-num font-bold">{formatFCFA(point.value)}</div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="value" radius={[4, 4, 4, 4]} maxBarSize={28}>
                {data.map((point) => (
                  <Cell key={point.date} fill={point.value >= 0 ? '#10b981' : '#fb7185'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
