import { useState } from 'react';
import type { Product, StockAdjustmentInput } from '@/types';
import { t } from '@/content';
import { STOCK_REASON_SUGGESTIONS } from '@/config/reference';
import { normalizeStockReason } from '@/domain/stockMovements';
import { errorText } from '@/services';
import { adjustStock } from '@/store/stockActions';
import { useUiStore } from '@/store/useUiStore';
import { Button, FormError, Input, Modal, SegmentedControl } from '@/ui';
import { ProductThumb } from '@/features/shared/ProductThumb';
import { ReasonField } from '@/features/shared/ReasonField';

export interface StockAdjustModalProps {
  product: Product;
  onClose: () => void;
}

type Kind = StockAdjustmentInput['kind'];

/**
 * Correction manuelle du stock (EF-19) : écart d'inventaire (quantité comptée) ou casse
 * (quantité retirée). Le motif est obligatoire ; la correction est tracée au journal.
 */
export function StockAdjustModal({ product, onClose }: StockAdjustModalProps) {
  const showToast = useUiStore((state) => state.showToast);
  const [kind, setKind] = useState<Kind>('count');
  const [quantityText, setQuantityText] = useState('');
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const quantity = quantityText.trim() === '' ? Number.NaN : Number(quantityText);
  const quantityValid = Number.isInteger(quantity) && quantity >= (kind === 'loss' ? 1 : 0);
  const reasonValid = normalizeStockReason(reason) !== null;

  const delta = !quantityValid ? null : kind === 'count' ? quantity - product.stock : -quantity;
  const after = delta === null ? null : product.stock + delta;

  const switchKind = (next: Kind) => {
    setKind(next);
    setQuantityText('');
    setFailure(null);
  };

  const submit = async () => {
    setTouched(true);
    setFailure(null);
    if (!quantityValid || !reasonValid || busy) return;
    setBusy(true);
    try {
      const movement = await adjustStock(product.id, { kind, quantity, reason });
      showToast(t.stock.adjust.done(product.name, movement.quantityAfter), 'success');
      onClose();
    } catch (error) {
      setFailure(errorText(error));
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={busy ? () => undefined : onClose}
      title={t.stock.adjust.title}
      subtitle={product.name}
      icon="fact_check"
      size="sm"
      footer={
        <Button fullWidth onClick={() => void submit()} disabled={busy}>
          {busy ? t.stock.adjust.working : t.stock.adjust.submit}
        </Button>
      }
    >
      <div className="flex items-center gap-3">
        <ProductThumb product={product} className="size-12 rounded-xl" />
        <div className="min-w-0">
          <div className="text-sm font-semibold text-ink-900 truncate">{product.name}</div>
          <div className="text-xs text-slate-500 font-num">{t.stock.adjust.current(product.stock, product.unit)}</div>
        </div>
      </div>

      <SegmentedControl<Kind>
        label={t.stock.adjust.kindLabel}
        value={kind}
        onChange={switchKind}
        fullWidth
        options={[
          { value: 'count', label: t.stock.adjust.kinds.count },
          { value: 'loss', label: t.stock.adjust.kinds.loss },
        ]}
      />

      <Input
        label={kind === 'count' ? t.stock.adjust.quantityCount : t.stock.adjust.quantityLoss}
        name="adjust-quantity"
        type="number"
        inputMode="numeric"
        min={kind === 'loss' ? 1 : 0}
        step={1}
        value={quantityText}
        hint={kind === 'count' ? t.stock.adjust.hintCount : t.stock.adjust.hintLoss}
        error={touched && !quantityValid ? t.stock.adjust.quantityError : undefined}
        onChange={(event) => setQuantityText(event.target.value)}
      />

      {after !== null && delta !== null && (
        <p className="text-sm font-semibold text-ink-900 font-num" aria-live="polite">
          {t.stock.adjust.preview(after, delta)}
        </p>
      )}

      <ReasonField
        label={t.stock.adjust.reasonLabel}
        hint={t.stock.adjust.reasonHint}
        placeholder={t.stock.adjust.reasonPlaceholder}
        error={touched && !reasonValid ? t.stock.adjust.reasonError : undefined}
        value={reason}
        onChange={setReason}
        onBlur={() => setTouched(true)}
        required
        suggestions={STOCK_REASON_SUGGESTIONS[kind]}
        suggestionsLabel={t.stock.adjust.suggestions}
      />

      {failure !== null && <FormError message={failure} />}
    </Modal>
  );
}
