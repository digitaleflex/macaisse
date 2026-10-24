import type { CartLine } from '@/types';
import type { CartTotals } from '@/domain/sales';
import { t } from '@/content';
import { formatFCFA } from '@/domain/money';
import { Button, EmptyState, Icon, cn } from '@/ui';

/**
 * Contenu du panier (lignes, quantités, totaux, encaissement). Réutilisé par le
 * panneau latéral desktop et la feuille mobile. Aucun calcul : `totals` vient du domaine.
 */
export interface CartPanelProps {
  lines: CartLine[];
  totals: CartTotals;
  onChangeQuantity: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
  onClear: () => void;
  onCheckout: () => void;
  className?: string;
}

export function CartPanel({ lines, totals, onChangeQuantity, onRemove, onClear, onCheckout, className }: CartPanelProps) {
  const decrement = (line: CartLine) => {
    if (line.quantity <= 1) onRemove(line.productId);
    else onChangeQuantity(line.productId, line.quantity - 1);
  };

  return (
    <div className={cn('flex flex-col min-h-0', className)}>
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-2.5">
          <h2 className="font-display font-bold text-base text-ink-900">{t.pos.cart.title}</h2>
          <span className="px-2 h-6 rounded-full bg-slate-100 text-xs font-bold text-slate-600 flex items-center font-num">
            {t.pos.cart.items(totals.itemCount)}
          </span>
        </div>
        {lines.length > 0 && (
          <Button variant="ghost" size="sm" icon="delete_sweep" onClick={onClear} className="text-slate-500 hover:text-rose-600">
            {t.pos.cart.clear}
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 min-h-0">
        {lines.length === 0 ? (
          <EmptyState icon="shopping_basket" title={t.pos.cart.emptyTitle} description={t.pos.cart.emptyText} compact />
        ) : (
          <ul className="flex flex-col gap-1">
            {lines.map((line) => (
              <li key={line.productId} className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-slate-50 animate-fade-in">
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-ink-900 truncate">{line.name}</div>
                  <div className="text-xs text-slate-500 font-num">
                    {t.pos.cart.unitPrice(formatFCFA(line.price))}
                  </div>
                </div>
                <div className="flex items-center rounded-xl border border-line bg-white">
                  <button
                    type="button"
                    aria-label={t.pos.cart.decrease(line.name)}
                    onClick={() => decrement(line)}
                    className="size-8 flex items-center justify-center text-slate-500 hover:text-ink-900 cursor-pointer"
                  >
                    <Icon name={line.quantity <= 1 ? 'delete' : 'remove'} size={16} />
                  </button>
                  <span className="w-7 text-center text-sm font-bold font-num">{line.quantity}</span>
                  <button
                    type="button"
                    aria-label={t.pos.cart.increase(line.name)}
                    onClick={() => onChangeQuantity(line.productId, line.quantity + 1)}
                    className="size-8 flex items-center justify-center text-slate-500 hover:text-ink-900 cursor-pointer"
                  >
                    <Icon name="add" size={16} />
                  </button>
                </div>
                <span className="w-20 text-right font-num font-bold text-sm text-ink-900">
                  {formatFCFA(line.price * line.quantity, { withSuffix: false })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="p-5 border-t border-line mt-auto space-y-4 bg-white pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="space-y-1.5">
          <div className="flex justify-between text-sm text-slate-500">
            <span>{t.pos.cart.subtotal}</span>
            <span className="font-num">{formatFCFA(totals.subtotal)}</span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-sm font-semibold text-ink-900">{t.pos.cart.total}</span>
            <span className="font-num font-extrabold text-2xl text-ink-900">{formatFCFA(totals.subtotal)}</span>
          </div>
        </div>
        <Button
          id="checkout-cta-btn"
          variant="accent"
          size="xl"
          fullWidth
          icon="payments"
          disabled={lines.length === 0}
          onClick={onCheckout}
        >
          {t.pos.cart.checkout}
        </Button>
      </div>
    </div>
  );
}

/** Barre flottante mobile : résumé du panier et ouverture de la feuille. */
export function MobileCartBar({ totals, onOpen }: { totals: CartTotals; onOpen: () => void }) {
  if (totals.itemCount === 0) return null;
  return (
    <div className="lg:hidden fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 px-4 animate-slide-up">
      <button
        type="button"
        id="toggle-cart-details"
        onClick={onOpen}
        aria-label={t.pos.cart.open}
        className="w-full max-w-xl mx-auto flex items-center gap-3 h-16 pl-3 pr-4 rounded-2xl bg-ink-900 text-white shadow-overlay cursor-pointer active:scale-[0.99] transition-transform"
      >
        <span className="relative size-11 rounded-xl bg-zest-400 text-ink-950 flex items-center justify-center">
          <Icon name="shopping_basket" size={22} />
          <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-white text-ink-900 text-[11px] font-bold flex items-center justify-center font-num">
            {totals.itemCount}
          </span>
        </span>
        <span className="flex-1 text-left">
          <span className="block text-xs text-slate-400">{t.pos.cart.total}</span>
          <span className="block font-num font-bold text-lg leading-tight">{formatFCFA(totals.subtotal)}</span>
        </span>
        <span className="flex items-center gap-1 text-sm font-semibold text-zest-400">
          {t.pos.cart.checkout}
          <Icon name="arrow_forward" size={18} />
        </span>
      </button>
    </div>
  );
}
