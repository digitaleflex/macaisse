import type { PaymentMethodOption } from '@/config/reference';
import { Icon, cn } from '@/ui';

export interface PaymentMethodGroupProps<M extends string> {
  label: string;
  options: readonly (PaymentMethodOption & { method: M })[];
  value: M | null;
  onSelect: (method: M) => void;
}

/**
 * Groupe de boutons radio de moyens de paiement (caisse, paiement d'abonnement).
 * À placer dans un conteneur `role="radiogroup"`.
 */
export function PaymentMethodGroup<M extends string>({ label, options, value, onSelect }: PaymentMethodGroupProps<M>) {
  if (options.length === 0) return null;
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">{label}</div>
      <div className="grid grid-cols-3 gap-2">
        {options.map((option) => {
          const active = value === option.method;
          return (
            <button
              key={option.method}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onSelect(option.method)}
              className={cn(
                'flex flex-col items-center justify-center gap-1 h-[72px] rounded-2xl border transition-all cursor-pointer active:scale-95',
                active
                  ? 'bg-ink-900 border-ink-900 text-white shadow-raised'
                  : 'bg-white border-line text-slate-700 hover:border-line-strong'
              )}
            >
              <Icon name={option.icon} size={22} className={active ? 'text-zest-400' : 'text-slate-500'} />
              <span className="text-xs font-semibold">{option.short}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
