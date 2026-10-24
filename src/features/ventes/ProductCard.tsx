import type { Product } from '@/types';
import { t } from '@/content';
import { formatFCFA } from '@/domain/money';
import { computeStockStatus } from '@/domain/stock';
import { Icon, cn } from '@/ui';
import { ProductThumb } from '@/features/shared/ProductThumb';

export interface ProductCardProps {
  product: Product;
  quantityInCart: number;
  onAdd: (product: Product) => void;
}

/** Carte produit du catalogue POS — un clic ajoute au panier. */
export function ProductCard({ product, quantityInCart, onAdd }: ProductCardProps) {
  const status = product.status ?? computeStockStatus(product.stock, product.minStockAlert);
  const soldOut = status === 'rupture';
  const stockLabel = soldOut
    ? t.pos.soldOut
    : status === 'faible'
      ? t.pos.lowStock(product.stock)
      : t.pos.inStock(product.stock);

  return (
    <button
      type="button"
      onClick={() => onAdd(product)}
      aria-label={t.pos.add(product.name)}
      className={cn(
        'product-card group relative flex flex-col text-left bg-surface rounded-2xl border shadow-card overflow-hidden transition-all cursor-pointer',
        'hover:shadow-raised hover:-translate-y-0.5 active:scale-[0.98]',
        quantityInCart > 0 ? 'border-ink-900 ring-1 ring-ink-900' : 'border-line hover:border-line-strong',
        soldOut && 'opacity-60'
      )}
    >
      <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
        <ProductThumb product={product} className="size-full group-hover:scale-105 transition-transform duration-300" />
        <span
          className={cn(
            'absolute top-2 left-2 px-2 py-0.5 rounded-md text-[11px] font-semibold backdrop-blur-sm',
            soldOut ? 'bg-rose-600 text-white' : status === 'faible' ? 'bg-amber-400 text-ink-950' : 'bg-white/90 text-ink-900'
          )}
        >
          {stockLabel}
        </span>
        {quantityInCart > 0 && (
          <span className="absolute top-2 right-2 min-w-7 h-7 px-1.5 rounded-full bg-ink-900 text-zest-400 text-sm font-bold flex items-center justify-center shadow-raised font-num animate-pop">
            {quantityInCart}
          </span>
        )}
      </div>
      <div className="p-3 flex flex-col gap-2 flex-1">
        <span className="text-[13px] font-semibold text-ink-900 leading-snug line-clamp-2 min-h-[2.4em]">{product.name}</span>
        <div className="flex items-end justify-between gap-2 mt-auto">
          <span className="font-num font-bold text-[15px] text-ink-900">
            {formatFCFA(product.price, { withSuffix: false })}
            <span className="text-[11px] font-semibold text-slate-400 ml-1">{t.common.currencyShort}</span>
          </span>
          <span className="size-8 rounded-lg bg-slate-100 text-ink-900 flex items-center justify-center group-hover:bg-ink-900 group-hover:text-zest-400 transition-colors">
            <Icon name="add" size={20} />
          </span>
        </div>
      </div>
    </button>
  );
}
