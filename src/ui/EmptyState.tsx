import type { ReactNode } from 'react';

/**
 * EmptyState — état vide centré (icône + titre + description + action).
 * `icon` accepte un nom de Material Symbol (string) ou un nœud React.
 */

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  const hasIcon = icon !== undefined && icon !== null;

  return (
    <div className="flex flex-col items-center justify-center text-center py-10 px-6">
      {hasIcon && (
        <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
          {typeof icon === 'string' ? (
            <span className="material-symbols-outlined text-[28px]">{icon}</span>
          ) : (
            icon
          )}
        </div>
      )}
      <h3 className="font-display font-bold text-sm text-slate-900">{title}</h3>
      {description !== undefined && <p className="text-xs text-slate-500 mt-1">{description}</p>}
      {action !== undefined && action !== null && <div className="mt-4">{action}</div>}
    </div>
  );
}
