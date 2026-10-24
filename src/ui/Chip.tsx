import type { ReactNode } from 'react';
import { cn } from './cn';
import { Icon } from './Icon';

export type ChipDot = 'success' | 'warning' | 'danger' | 'info';

export interface ChipProps {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  count?: number;
  dot?: ChipDot;
  icon?: string;
}

const DOT: Record<ChipDot, string> = {
  success: 'bg-brand-500',
  warning: 'bg-amber-500',
  danger: 'bg-rose-500',
  info: 'bg-sky-500',
};

/** Puce de filtre (pressable, état actif). */
export function Chip({ active, onClick, children, count, dot, icon }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-[13px] font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 border',
        active
          ? 'bg-ink-900 text-white border-ink-900 shadow-sm'
          : 'bg-white text-slate-600 border-line hover:border-line-strong hover:text-ink-900'
      )}
    >
      {dot && <span className={cn('size-2 rounded-full', DOT[dot])} />}
      {icon && <Icon name={icon} size={16} />}
      {children}
      {count !== undefined && (
        <span
          className={cn(
            'min-w-5 h-5 px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center font-num',
            active ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-600'
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}
