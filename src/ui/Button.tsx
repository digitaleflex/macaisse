import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';
import { Icon } from './Icon';
import { Spinner } from './Spinner';

/**
 * Button — action principale du design system.
 * - primary : encre (CTA par défaut) ;
 * - accent  : citron « zest » (action phare : encaisser, nouvelle vente) ;
 * - brand   : vert de marque (validation positive) ;
 * - secondary : surface blanche bordée ;
 * - ghost : transparent ;
 * - danger / danger-soft : actions destructives.
 */

export type ButtonVariant =
  | 'primary'
  | 'accent'
  | 'brand'
  | 'secondary'
  | 'ghost'
  | 'danger'
  | 'danger-soft';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  icon?: string;
  iconRight?: string;
  children?: ReactNode;
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'bg-ink-900 text-white hover:bg-ink-800 shadow-sm',
  accent: 'bg-zest-400 text-ink-950 hover:bg-zest-300 shadow-glow',
  brand: 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm',
  secondary: 'bg-white text-ink-900 border border-line hover:border-line-strong hover:bg-slate-50 shadow-card',
  ghost: 'text-slate-600 hover:text-ink-900 hover:bg-slate-100',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm',
  'danger-soft': 'bg-rose-50 text-rose-700 hover:bg-rose-100',
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-5 text-sm gap-2 rounded-xl',
  xl: 'h-14 px-6 text-base gap-2.5 rounded-2xl',
};

const ICON_SIZE: Record<ButtonSize, number> = { sm: 16, md: 18, lg: 20, xl: 22 };

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled = false,
  type = 'button',
  icon,
  iconRight,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer select-none',
        'active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
        VARIANT_CLASS[variant],
        SIZE_CLASS[size],
        fullWidth && 'w-full',
        className
      )}
    >
      {loading ? <Spinner size="sm" /> : icon && <Icon name={icon} size={ICON_SIZE[size]} />}
      {children}
      {iconRight && <Icon name={iconRight} size={ICON_SIZE[size]} />}
    </button>
  );
}

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: string;
  label: string;
  variant?: 'ghost' | 'secondary' | 'primary' | 'danger-soft' | 'brand-soft';
  size?: 'sm' | 'md' | 'lg';
  badge?: boolean;
  filled?: boolean;
}

const ICON_BTN_VARIANT: Record<NonNullable<IconButtonProps['variant']>, string> = {
  ghost: 'text-slate-500 hover:text-ink-900 hover:bg-slate-100',
  secondary: 'bg-white text-slate-700 border border-line hover:border-line-strong hover:text-ink-900 shadow-card',
  primary: 'bg-ink-900 text-white hover:bg-ink-800',
  'danger-soft': 'text-rose-600 hover:bg-rose-50',
  'brand-soft': 'bg-brand-50 text-brand-700 hover:bg-brand-100',
};

const ICON_BTN_SIZE = { sm: 'size-8 rounded-lg', md: 'size-10 rounded-xl', lg: 'size-12 rounded-xl' };
const ICON_BTN_ICON = { sm: 18, md: 20, lg: 22 };

/** Bouton icône seul — `label` obligatoire (accessibilité). */
export function IconButton({
  icon,
  label,
  variant = 'ghost',
  size = 'md',
  badge = false,
  filled = false,
  type = 'button',
  className,
  ...rest
}: IconButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'relative inline-flex items-center justify-center shrink-0 transition-all cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed',
        ICON_BTN_VARIANT[variant],
        ICON_BTN_SIZE[size],
        className
      )}
    >
      <Icon name={icon} size={ICON_BTN_ICON[size]} filled={filled} />
      {badge && (
        <span className="absolute top-2 right-2 size-2 rounded-full bg-rose-500 ring-2 ring-white" />
      )}
    </button>
  );
}
