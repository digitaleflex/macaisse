import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import type { SeriesPoint } from '@/types';
import { t } from '@/content';
import { formatFCFA } from '@/domain/money';
import { Card } from '@/ui';
import { chartColors, palette, themeColors } from '@/design/tokens';

export interface SalesTrendProps {
  data: SeriesPoint[];
}

/** Aire des recettes journalières récentes (accueil). */
export function SalesTrend({ data }: SalesTrendProps) {
  const total = data.reduce((sum, point) => sum + point.value, 0);
  const average = data.length > 0 ? total / data.length : 0;

  return (
    <Card
      title={t.dashboard.trend.title}
      description={t.dashboard.trend.subtitle(data.length)}
      action={
        <div className="text-right">
          <div className="text-[11px] text-slate-500">{t.dashboard.trend.average}</div>
          <div className="font-num font-bold text-sm text-ink-900">{formatFCFA(average)}</div>
        </div>
      }
      className="h-full flex flex-col"
      bodyClassName="flex-1 flex flex-col"
    >
      <div className="font-num font-bold text-2xl text-ink-900">{formatFCFA(total)}</div>
      <div className="text-xs text-slate-500 mb-3">{t.dashboard.trend.total}</div>
      <div className="flex-1 min-h-44 -mx-2">
        <ResponsiveContainer width="100%" height="100%" minHeight={176}>
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={chartColors.positive} stopOpacity={0.28} />
                <stop offset="100%" stopColor={chartColors.positive} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              fontSize={11}
              stroke={chartColors.axis}
              interval="preserveStartEnd"
              minTickGap={16}
            />
            <Tooltip
              cursor={{ stroke: palette.slate300, strokeDasharray: 4 }}
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const point = payload[0].payload as SeriesPoint;
                return (
                  <div className="rounded-xl bg-ink-900 text-white px-3 py-2 text-xs shadow-overlay">
                    <div className="text-slate-500">{point.label}</div>
                    <div className="font-num font-bold">{formatFCFA(point.value)}</div>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={chartColors.positiveStrong}
              strokeWidth={2.5}
              fill="url(#trendFill)"
              activeDot={{ r: 5, fill: chartColors.positiveStrong, stroke: themeColors.surface, strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
