import type { ReactNode } from 'react';

/**
 * Card — conteneur de surface du design system.
 * Utilise la classe `.pos-card` définie dans `src/index.css`
 * (surface card + border + radius 14px + `--shadow-card`).
 * En-tête optionnel : `title` et/ou `action`.
 */

export interface CardProps {
  title?: ReactNode;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function Card({ title, action, className, children }: CardProps) {
  const hasTitle = title !== undefined && title !== null;
  const hasHeader = hasTitle || (action !== undefined && action !== null);

  return (
    <section className={`pos-card p-3.5 ${className ?? ''}`}>
      {hasHeader && (
        <div className="flex items-center justify-between mb-2.5">
          {hasTitle ? (
            <h3 className="font-display font-bold text-xs text-slate-900">{title}</h3>
          ) : (
            <span />
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
