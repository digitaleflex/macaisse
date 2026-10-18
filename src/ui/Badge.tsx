import type { ReactNode } from 'react';

/**
 * Badge — pastilles de statut, reprenant EXACTEMENT les tons déjà utilisés :
 * - success → stock « disponible » / crédit réglé : bg-emerald-50 text-emerald-700
 *             border-emerald-200 (StockView, CreditsView, tokens.ts).
 * - warning → stock « faible » / crédit « partiel » : bg-amber-50 text-amber-700
 *             border-amber-200.
 * - danger  → stock « rupture » / crédit « en retard » : bg-rose-50 text-rose-700
 *             border-rose-200.
 * - info    → bg-sky-50 text-sky-700 border-sky-200 (tokens.ts status.info).
 * - neutral → bg-slate-100 text-slate-600 border-slate-200 (crédit « En attente »).
 *
 * Forme : pill (rounded-full, text-[10px], font-bold) identique à StockView.
 */

export type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
}

const TONE_CLASS: Record<BadgeTone, string> = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  danger: 'bg-rose-50 text-rose-700 border-rose-200',
  info: 'bg-sky-50 text-sky-700 border-sky-200',
  neutral: 'bg-slate-100 text-slate-600 border-slate-200',
};

export function Badge({ tone = 'neutral', children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
        TONE_CLASS[tone]
      }`}
    >
      {children}
    </span>
  );
}
