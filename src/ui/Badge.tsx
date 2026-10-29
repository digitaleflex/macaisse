import type { ReactNode } from 'react';
import { cn } from './cn';
import { Icon } from './Icon';

export type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'dark' | 'zest' | 'zest-soft';

export interface BadgeProps {
  tone?: BadgeTone;
  dot?: boolean;
  icon?: string;
  size?: 'sm' | 'md';
  className?: string;
  children: ReactNode;
}

const TONE_CLASS: Record<BadgeTone, string> = {
  success: 'bg-brand-50 text-brand-700 ring-brand-600/15',
  warning: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  danger: 'bg-rose-50 text-rose-700 ring-rose-600/15',
  info: 'bg-sky-50 text-sky-700 ring-sky-600/15',
  neutral: 'bg-slate-100 text-slate-600 ring-slate-500/10',
  dark: 'bg-ink-900 text-white ring-ink-900',
  zest: 'bg-zest-400/15 text-zest-300 ring-zest-400/30',
  'zest-soft': 'bg-zest-400/25 text-ink-900 ring-zest-500/30',
};

const DOT_CLASS: Record<BadgeTone, string> = {
  success: 'bg-brand-500',
  warning: 'bg-amber-500',
  danger: 'bg-rose-500',
  info: 'bg-sky-500',
  neutral: 'bg-slate-400',
  dark: 'bg-zest-400',
  zest: 'bg-zest-400',
  'zest-soft': 'bg-zest-500',
};

export function Badge({ tone = 'neutral', dot = false, icon, size = 'sm', className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-semibold ring-1 ring-inset whitespace-nowrap',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
        TONE_CLASS[tone],
        className
      )}
    >
      {dot && <span className={cn('size-1.5 rounded-full', DOT_CLASS[tone])} />}
      {icon && <Icon name={icon} size={13} />}
      {children}
    </span>
  );
}
