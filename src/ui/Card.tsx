import type { ReactNode } from 'react';
import { cn } from './cn';
import { Icon } from './Icon';

/** Card — surface blanche du design system, en-tête optionnel. */
export interface CardProps {
  title?: ReactNode;
  description?: ReactNode;
  icon?: string;
  action?: ReactNode;
  padding?: 'none' | 'sm' | 'md';
  className?: string;
  bodyClassName?: string;
  children?: ReactNode;
}

const PADDING = { none: '', sm: 'p-4', md: 'p-5 sm:p-6' };

export function Card({
  title,
  description,
  icon,
  action,
  padding = 'md',
  className,
  bodyClassName,
  children,
}: CardProps) {
  const hasHeader = title !== undefined || action !== undefined;
  return (
    <section className={cn('bg-surface rounded-card border border-line shadow-card', className)}>
      {hasHeader && (
        <header
          className={cn(
            'flex items-start justify-between gap-3',
            padding === 'none' ? 'px-5 pt-5 pb-3' : padding === 'sm' ? 'px-4 pt-4' : 'px-5 pt-5 sm:px-6 sm:pt-6'
          )}
        >
          <div className="flex items-start gap-3 min-w-0">
            {icon && (
              <span className="size-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                <Icon name={icon} size={19} />
              </span>
            )}
            <div className="min-w-0">
              {title && <h2 className="font-display font-bold text-[15px] text-ink-900 leading-tight">{title}</h2>}
              {description && <p className="text-xs text-slate-500 mt-1">{description}</p>}
            </div>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      {children !== undefined && (
        <div className={cn(PADDING[padding], hasHeader && padding !== 'none' && 'pt-4 sm:pt-4', bodyClassName)}>
          {children}
        </div>
      )}
    </section>
  );
}
