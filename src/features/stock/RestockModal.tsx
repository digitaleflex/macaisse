import { useState, type FormEvent } from 'react';
import type { Product } from '@/types';
import { t } from '@/content';
import { QUICK_RESTOCK_STEPS } from '@/config/reference';
import { validateRestock, type ValidationCode } from '@/domain/validation';
import { Button, FormError, Input, Modal, cn } from '@/ui';
import { ProductThumb } from '@/features/shared/ProductThumb';

/** Saisie d'une quantité de réapprovisionnement (validation déléguée au parent). */
export interface RestockModalProps {
  open: boolean;
  onClose: () => void;
  product: Product | null;
  onSubmit: (quantity: number) => void;
}

const DEFAULT_QUANTITY = 20;

export function RestockModal({ open, onClose, product, onSubmit }: RestockModalProps) {
  const [quantity, setQuantity] = useState(DEFAULT_QUANTITY);
  const [error, setError] = useState<ValidationCode | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const code = validateRestock(quantity);
    if (code !== null) {
      setError(code);
      return;
    }
    setError(null);
    onSubmit(quantity);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t.stock.restockModal.title}
      icon="local_shipping"
      size="sm"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {product && (
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-line">
            <ProductThumb product={product} className="size-12 rounded-xl" />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-ink-900 truncate">{product.name}</div>
              <div className="text-xs text-slate-500">
                {t.stock.restockModal.current(t.stock.units(product.stock, product.unit))}
              </div>
            </div>
          </div>
        )}
        <Input
          label={t.stock.restockModal.quantity}
          name="restock-quantity"
          type="number"
          inputMode="numeric"
          value={quantity}
          min={1}
          step={1}
          onChange={(event) => {
            setQuantity(Number(event.target.value));
            setError(null);
          }}
          hint={
            product
              ? t.stock.restockModal.after(
                  t.stock.units(product.stock + Math.max(0, quantity), product.unit),
                )
              : undefined
          }
        />
        <FormError message={error !== null ? t.validation[error] : null} />
        <div className="grid grid-cols-3 gap-2">
          {QUICK_RESTOCK_STEPS.map((step) => (
            <button
              key={step}
              type="button"
              onClick={() => setQuantity(step)}
              className={cn(
                'h-9 rounded-xl text-sm font-bold border transition-colors cursor-pointer font-num',
                quantity === step
                  ? 'bg-ink-900 border-ink-900 text-white'
                  : 'bg-white border-line hover:border-line-strong',
              )}
            >
              {t.stock.quickRestock(step)}
            </button>
          ))}
        </div>
        <Button type="submit" variant="brand" size="lg" fullWidth icon="inventory">
          {t.stock.restockModal.submit}
        </Button>
      </form>
    </Modal>
  );
}
