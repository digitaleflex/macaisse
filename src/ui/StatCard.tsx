import type { ReactNode } from 'react';
import { cn } from './cn';
import { Icon } from './Icon';

/** Tuile d'indicateur clé : libellé, valeur, icône, tendance et indication. */
export type StatTone = 'neutral' | 'brand' | 'danger' | 'warning' | 'info';

export interface StatCardProps {
  label: string;
  value: ReactNode;
  icon: string;
  tone?: StatTone;
  trend?: { value: string; positive: boolean } | null;
  hint?: ReactNode;
  footer?: ReactNode;
  onClick?: () => void;
  className?: string;
}

const ICON_TONE: Record<StatTone, string> = {
  neutral: 'bg-slate-100 text-slate-600',
  brand: 'bg-brand-50 text-brand-700',
  danger: 'bg-rose-50 text-rose-600',
  warning: 'bg-amber-50 text-amber-600',
  info: 'bg-sky-50 text-sky-600',
};

export function StatCard({ label, value, icon, tone = 'neutral', trend, hint, footer, onClick, className }: StatCardProps) {
  const interactive = onClick !== undefined;
  const Tag = interactive ? 'button' : 'div';
  return (
    <Tag
      type={interactive ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'group bg-surface rounded-card border border-line shadow-card p-4 sm:p-5 flex flex-col gap-3 text-left w-full',
        interactive && 'cursor-pointer transition-all hover:shadow-raised hover:-translate-y-0.5 hover:border-line-strong',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-medium text-slate-500 truncate">{label}</span>
        <span className={cn('size-9 rounded-xl flex items-center justify-center shrink-0', ICON_TONE[tone])}>
          <Icon name={icon} size={19} />
        </span>
      </div>
      <div className="font-num font-bold text-lg min-[400px]:text-xl sm:text-2xl text-ink-900 leading-none whitespace-nowrap">{value}</div>
      {(trend || hint) && (
        <div className="flex items-center gap-1.5 text-xs min-w-0">
          {trend && (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 font-semibold shrink-0',
                trend.positive ? 'text-brand-700' : 'text-rose-600'
              )}
            >
              <Icon name={trend.positive ? 'arrow_upward' : 'arrow_downward'} size={14} />
              {trend.value}
            </span>
          )}
          {hint && <span className="text-slate-500 truncate">{hint}</span>}
        </div>
      )}
      {footer}
    </Tag>
  );
}
