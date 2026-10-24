import { useState } from 'react';
import type { Product } from '@/types';
import { CATEGORY_STYLE } from '@/config/reference';
import { Icon, cn } from '@/ui';

/**
 * Vignette d'un article : image distante, ou pictogramme du rayon si l'article
 * n'a pas d'image ou si son chargement échoue.
 */
export function ProductThumb({ product, className }: { product: Product; className?: string }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const style = CATEGORY_STYLE[product.category];

  if (product.imageUrl && failedUrl !== product.imageUrl) {
    return (
      <img
        src={product.imageUrl}
        alt={product.imageAlt ?? product.name}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailedUrl(product.imageUrl)}
        className={cn('object-cover bg-slate-100', className)}
      />
    );
  }
  return (
    <div className={cn('flex items-center justify-center', style.tone, className)} role="img" aria-label={product.name}>
      <Icon name={style.icon} size={28} />
    </div>
  );
}
