import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import type { BreakdownSlice } from '@/types';
import { t } from '@/content';
import { paymentShortLabel } from '@/config/reference';
import { formatFCFA } from '@/domain/money';
import { Card, EmptyState } from '@/ui';
import { chartSeries } from '@/design/tokens';

/** Répartition des encaissements par moyen de paiement (anneau + légende). */
export interface ChannelSplitProps {
  data: BreakdownSlice[];
}

const COLORS = chartSeries;

export function ChannelSplit({ data }: ChannelSplitProps) {
  const total = data.reduce((sum, slice) => sum + slice.amount, 0);
  return (
    <Card title={t.bilan.channels.title} description={t.bilan.channels.subtitle} className="h-full">
      {data.length === 0 || total <= 0 ? (
        <EmptyState icon="donut_small" title={t.bilan.channels.emptyTitle} description={t.bilan.channels.emptyText} compact />
      ) : (
        <div className="flex flex-col sm:flex-row lg:flex-col items-center gap-5">
          <div className="relative size-40 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="amount" nameKey="label" innerRadius="68%" outerRadius="100%" paddingAngle={2} stroke="none">
                  {data.map((slice, index) => (
                    <Cell key={slice.key} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="font-num font-bold text-sm text-ink-900">{formatFCFA(total, { withSuffix: false })}</span>
              <span className="text-[11px] text-muted">{t.common.currency}</span>
            </div>
          </div>
          <ul className="w-full flex flex-col gap-2.5">
            {data.map((slice, index) => (
              <li key={slice.key} className="flex items-center gap-2.5 text-sm">
                <span className="size-2.5 rounded-full shrink-0" style={{ background: COLORS[index % COLORS.length] }} />
                <span className="flex-1 text-slate-600 truncate">{paymentShortLabel(slice.label)}</span>
                <span className="font-num font-semibold text-ink-900">{Math.round((slice.amount / total) * 100)} %</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
