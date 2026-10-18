import type { Product, StockStatus } from '@/types';
import { formatFCFA } from '@/domain/money';
import { computeStockStatus } from '@/domain/stock';

/**
 * Carte produit du catalogue POS : image, nom, prix, pastille de stock et
 * compteur d'articles déjà présents au panier. Un clic (carte ou bouton « + »)
 * remonte au parent via `onAdd` ; aucune règle métier ici.
 */

export interface ProductCardProps {
  product: Product;
  /** Quantité déjà au panier pour ce produit (badge sur l'image). */
  quantityInCart: number;
  onAdd: (product: Product) => void;
}

const STOCK_PILL_CLASS: Record<StockStatus, string> = {
  rupture: 'bg-rose-50/95 text-rose-700 border-rose-200',
  faible: 'bg-amber-50/95 text-amber-700 border-amber-200',
  disponible: 'bg-white/95 text-emerald-800 border-emerald-200/80',
};

export function ProductCard({ product, quantityInCart, onAdd }: ProductCardProps) {
  const status = product.status ?? computeStockStatus(product.stock, product.minStockAlert);
  const stockLabel =
    status === 'rupture'
      ? 'Rupture'
      : status === 'faible'
        ? `Stock faible (${product.stock})`
        : `En stock (${product.stock})`;

  return (
    <div
      onClick={() => onAdd(product)}
      role="button"
      tabIndex={0}
      className="product-card flex flex-col justify-between bg-white p-2.5 rounded-2xl shadow-2xs border border-slate-200/80 active:scale-[0.98] transition-all cursor-pointer relative overflow-hidden group hover:border-slate-300 hover:shadow-xs"
    >
      <div className="flex flex-col">
        <div className="w-full h-28 rounded-xl overflow-hidden relative mb-2 bg-slate-100">
          <img
            src={product.imageUrl}
            alt={product.imageAlt ?? product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            referrerPolicy="no-referrer"
          />

          {/* Pastille de stock */}
          <span
            className={`absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold backdrop-blur-xs shadow-2xs border ${STOCK_PILL_CLASS[status]}`}
          >
            {stockLabel}
          </span>

          {/* Compteur au panier */}
          {quantityInCart > 0 && (
            <span className="absolute bottom-1.5 right-1.5 w-6 h-6 rounded-full bg-slate-900 text-emerald-400 text-xs font-display font-bold flex items-center justify-center shadow-md ring-2 ring-white">
              {quantityInCart}
            </span>
          )}
        </div>

        <span className="font-display font-bold text-xs text-slate-900 leading-tight line-clamp-2">
          {product.name}
        </span>
        <span className="text-[10px] text-slate-500 mt-0.5">{product.category}</span>
      </div>

      <div className="flex items-center justify-between mt-3 pt-1.5 border-t border-slate-100">
        <div className="flex flex-col">
          <span className="font-display font-bold text-sm text-slate-900 font-num">
            {formatFCFA(product.price, { withSuffix: false })}
          </span>
          <span className="text-[10px] text-slate-400 leading-none">FCFA</span>
        </div>

        <button
          type="button"
          aria-label={`Ajouter ${product.name} au panier`}
          onClick={(event) => {
            event.stopPropagation();
            onAdd(product);
          }}
          className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-900 hover:text-emerald-400 text-slate-800 flex items-center justify-center transition-colors active:scale-90 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
        </button>
      </div>
    </div>
  );
}
