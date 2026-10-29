import type { ReactNode } from 'react';
import { cn } from './cn';
import { Icon } from './Icon';

export interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
  className?: string;
}

/** État vide centré. */
export function EmptyState({ icon, title, description, action, compact = false, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center px-6',
        compact ? 'py-8' : 'py-12',
        className
      )}
    >
      {icon && (
        <div className="size-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mb-3 ring-8 ring-slate-50">
          <Icon name={icon} size={24} />
        </div>
      )}
      <h3 className="font-display font-bold text-sm text-ink-900">{title}</h3>
      {description && <p className="text-[13px] text-slate-500 mt-1 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export interface ProgressBarProps {
  value: number;
  tone?: 'brand' | 'warning' | 'danger' | 'zest';
  className?: string;
  label?: string;
}

const BAR_TONE = {
  brand: 'bg-brand-500',
  warning: 'bg-amber-500',
  danger: 'bg-rose-500',
  zest: 'bg-zest-400',
};

/** Barre de progression (valeur entre 0 et 1). */
export function ProgressBar({ value, tone = 'brand', className, label }: ProgressBarProps) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn('h-1.5 w-full rounded-full bg-slate-100 overflow-hidden', className)}
    >
      <div className={cn('h-full rounded-full transition-all duration-500', BAR_TONE[tone])} style={{ width: `${pct}%` }} />
    </div>
  );
}

export interface AvatarProps {
  initials: string;
  tone?: 'ink' | 'zest' | 'danger' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const AVATAR_TONE = {
  ink: 'bg-ink-900 text-zest-400',
  zest: 'bg-zest-400 text-ink-950',
  danger: 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200',
  neutral: 'bg-slate-100 text-slate-700',
};
const AVATAR_SIZE = { sm: 'size-8 text-xs rounded-lg', md: 'size-10 text-sm rounded-xl', lg: 'size-14 text-lg rounded-2xl' };

export function Avatar({ initials, tone = 'neutral', size = 'md', className }: AvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex items-center justify-center font-display font-bold shrink-0 uppercase',
        AVATAR_TONE[tone],
        AVATAR_SIZE[size],
        className
      )}
    >
      {initials.slice(0, 2)}
    </span>
  );
}

/** Bloc de chargement animé. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-xl bg-shimmer-surface animate-shimmer',
        className
      )}
    />
  );
}

export interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

/** En-tête de page : sur-titre, titre, description, actions. */
export function PageHeader({ title, description, eyebrow, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        {eyebrow && <div className="mb-2">{eyebrow}</div>}
        <h1 className="font-display font-extrabold text-2xl sm:text-[28px] text-ink-900 leading-tight tracking-tight">
          {title}
        </h1>
        {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}

/** Titre de section secondaire (au-dessus d'une liste). */
export function SectionTitle({ children, action, className }: { children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center justify-between gap-3', className)}>
      <h2 className="font-display font-bold text-[15px] text-ink-900 flex items-center gap-2">{children}</h2>
      {action}
    </div>
  );
}

export interface FormErrorProps {
  /** Message déjà traduit (voir `t.validation`). */
  message: string | null;
  className?: string;
}

/** Erreur de formulaire annoncée aux lecteurs d'écran (`role="alert"`). */
export function FormError({ message, className }: FormErrorProps) {
  if (message === null) return null;
  return (
    <p role="alert" className={cn('text-xs font-medium text-rose-600', className)}>
      {message}
    </p>
  );
}
