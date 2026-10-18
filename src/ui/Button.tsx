import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Spinner } from './Spinner';

/**
 * Button — variantes alignées sur la palette déjà présente dans l'app
 * (aucune couleur inventée, uniquement des classes Tailwind existantes).
 *
 * - primary   → CTA POS de `VentesView.tsx` : bg-emerald-500 hover:bg-emerald-400
 *               text-slate-950 shadow-md.
 * - secondary → bouton sombre récurrent (ExportModal « Télécharger », Profil
 *               « Gérer », Depenses « + Dépense ») : bg-slate-900
 *               hover:bg-slate-800 text-white shadow-xs.
 * - ghost     → bouton clair (ExportModal « Annuler ») : bg-white
 *               hover:bg-slate-100 text-slate-700 border border-slate-200/80.
 * - danger    → rose de la palette `--status-danger` (#e11d48 = rose-600) :
 *               bg-rose-600 hover:bg-rose-700 text-white shadow-xs.
 *
 * Tailles : sm = h-8 px-3 text-xs, md = h-11 px-4 text-xs, lg = h-12 px-4 text-sm.
 */

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  children?: ReactNode;
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md',
  secondary: 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs',
  ghost: 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/80',
  danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs',
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-11 px-4 text-xs',
  lg: 'h-12 px-4 text-sm',
};

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled = false,
  type = 'button',
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      disabled={disabled || loading}
      className={`rounded-xl font-display font-semibold inline-flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 ${
        VARIANT_CLASS[variant]
      } ${SIZE_CLASS[size]} ${fullWidth ? 'w-full' : ''} ${className ?? ''}`}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  );
}
