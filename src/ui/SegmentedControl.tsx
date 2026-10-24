import type { ReactNode } from 'react';
import { cn } from './cn';

export interface SegmentOption<T extends string> {
  value: T;
  label: ReactNode;
}

export interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: readonly SegmentOption<T>[];
  label: string;
  size?: 'sm' | 'md';
  fullWidth?: boolean;
  className?: string;
}

/** Sélecteur segmenté (périodes, cycles de facturation…). */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  label,
  size = 'md',
  fullWidth = false,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('inline-flex p-1 bg-slate-200/60 rounded-xl gap-1', fullWidth && 'w-full', className)}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap inline-flex items-center justify-center gap-1.5',
              size === 'sm' ? 'px-3 h-7 text-xs' : 'px-4 h-8 text-[13px]',
              fullWidth && 'flex-1',
              active ? 'bg-white text-ink-900 shadow-card' : 'text-slate-500 hover:text-ink-900'
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
