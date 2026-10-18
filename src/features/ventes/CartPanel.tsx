import { useState } from 'react';
import type { CartLine } from '@/types';
import type { CartTotals } from '@/domain/sales';
import { formatFCFA } from '@/domain/money';

/**
 * Panneau panier flottant du POS : récapitulatif, détail dépliable (pas à pas
 * de quantité + retrait de ligne), totaux, vidage et CTA d'encaissement.
 * Ne détient aucun calcul de montant : `totals` vient du domaine (store).
 */

export interface CartPanelProps {
  lines: CartLine[];
  totals: CartTotals;
  onChangeQuantity: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
  onClear: () => void;
  onCheckout: () => void;
}

export function CartPanel({
  lines,
  totals,
  onChangeQuantity,
  onRemove,
  onClear,
  onCheckout,
}: CartPanelProps) {
  const [showDetails, setShowDetails] = useState(false);

  if (lines.length === 0) return null;

  const decrement = (line: CartLine) => {
    if (line.quantity <= 1) {
      onRemove(line.productId);
      return;
    }
    onChangeQuantity(line.productId, line.quantity - 1);
  };

  return (
    <div className="fixed bottom-20 left-0 right-0 z-30 px-4 pointer-events-none">
      <div className="pointer-events-auto max-w-md mx-auto bg-slate-900/95 backdrop-blur-md text-white rounded-2xl p-3.5 shadow-2xl transition-all duration-300 border border-slate-700/80">
        {/* Ligne récapitulative */}
        <div className="flex items-center justify-between pb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <span className="material-symbols-outlined text-[20px]">shopping_cart</span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white font-num">
                  {totals.itemCount} article{totals.itemCount > 1 ? 's' : ''}
                </span>
                <span className="text-slate-500 text-[10px]">•</span>
                <span className="text-[11px] text-slate-300 font-medium">Panier Actif</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-[11px] text-slate-400">Total :</span>
                <span className="font-display font-bold text-sm text-white font-num">
                  {formatFCFA(totals.subtotal)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label="Vider le panier"
              onClick={onClear}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
              title="Vider le panier"
            >
              <span className="material-symbols-outlined text-[18px]">delete_sweep</span>
            </button>
            <button
              type="button"
              id="toggle-cart-details"
              aria-label="Détail du panier"
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-0.5 px-2.5 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white transition-colors text-xs font-medium cursor-pointer border border-slate-700/60"
            >
              <span>Détail</span>
              <span className="material-symbols-outlined text-[16px]">
                {showDetails ? 'expand_more' : 'expand_less'}
              </span>
            </button>
          </div>
        </div>

        {/* Détail dépliable des lignes */}
        {showDetails && (
          <div className="flex flex-col gap-1 py-2 border-t border-slate-800 mb-2 max-h-48 overflow-y-auto pr-1">
            {lines.map((line) => (
              <div
                key={line.productId}
                className="flex justify-between items-center text-xs text-slate-300 py-1.5 bg-slate-800/60 px-2.5 rounded-xl border border-slate-800"
              >
                <div className="flex flex-col min-w-0 pr-2">
                  <span className="text-white font-medium truncate">{line.name}</span>
                  <span className="text-[10px] text-slate-400 font-num">
                    {formatFCFA(line.price, { withSuffix: false })} F / unité
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1 bg-slate-700/80 rounded-lg px-1">
                    <button
                      type="button"
                      aria-label={`Retirer un ${line.name}`}
                      onClick={() => decrement(line)}
                      className="w-5 h-5 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
                    >
                      -
                    </button>
                    <span className="font-bold text-white px-1 font-num">{line.quantity}</span>
                    <button
                      type="button"
                      aria-label={`Ajouter un ${line.name}`}
                      onClick={() => onChangeQuantity(line.productId, line.quantity + 1)}
                      className="w-5 h-5 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
                    >
                      +
                    </button>
                  </div>

                  <span className="font-bold text-white font-num min-w-[70px] text-right">
                    {formatFCFA(line.price * line.quantity, { withSuffix: false })} F
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CTA principal : Encaisser */}
        <button
          id="checkout-cta-btn"
          type="button"
          onClick={onCheckout}
          className="w-full h-12 bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-between px-4 rounded-xl font-display font-bold text-sm shadow-md active:scale-[0.98] transition-all cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[22px]">payments</span>
            <span className="text-xs font-extrabold uppercase tracking-wide">Encaisser</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-display font-bold text-sm font-num">
              {formatFCFA(totals.subtotal)}
            </span>
            <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
          </div>
        </button>
      </div>
    </div>
  );
}
