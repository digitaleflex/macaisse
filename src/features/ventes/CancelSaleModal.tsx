import { useId, useState } from 'react';
import type { ClientCredit, SaleTransaction } from '@/types';
import { t } from '@/content';
import { formatFCFA } from '@/domain/money';
import { normalizeCancelReason } from '@/domain/sales';
import { errorText } from '@/services';
import { useSalesStore } from '@/store/useSalesStore';
import { useUiStore } from '@/store/useUiStore';
import { Button, FieldShell, Icon, Modal } from '@/ui';

export interface CancelSaleModalProps {
  sale: SaleTransaction;
  /** Crédit né de la vente, supprimé avec elle. */
  credit?: ClientCredit;
  onClose: () => void;
  /** Appelé après une annulation réussie, avec la vente mise à jour. */
  onCancelled: (sale: SaleTransaction) => void;
}

/**
 * Annulation d'une vente (EF-15, RG-09) : le motif est obligatoire, les effets
 * sont annoncés avant confirmation, la vente n'est jamais supprimée.
 */
export function CancelSaleModal({ sale, credit, onClose, onCancelled }: CancelSaleModalProps) {
  const reasonId = useId();
  const cancelSale = useSalesStore((state) => state.cancelSale);
  const showToast = useUiStore((state) => state.showToast);
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const reasonInvalid = normalizeCancelReason(reason) === null;
  const reasonError = touched && reasonInvalid ? t.sales.cancel.reasonError : undefined;
  const stockKnown = (sale.lines?.length ?? 0) > 0;

  const submit = async () => {
    setTouched(true);
    if (reasonInvalid || busy) return;
    setBusy(true);
    setFailure(null);
    try {
      const cancelled = await cancelSale(sale.id, reason);
      showToast(t.sales.cancel.done(sale.saleNumber), 'success');
      onCancelled(cancelled);
    } catch (error) {
      setFailure(errorText(error));
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={busy ? () => undefined : onClose}
      title={t.sales.cancel.title}
      subtitle={t.sales.cancel.subtitle(sale.saleNumber)}
      icon="cancel"
      size="sm"
      footer={
        <div className="grid grid-cols-2 gap-2 w-full">
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {t.sales.cancel.back}
          </Button>
          <Button variant="danger" onClick={() => void submit()} disabled={busy}>
            {busy ? t.sales.cancel.working : t.sales.cancel.confirm}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <FieldShell
          id={reasonId}
          label={t.sales.cancel.reasonLabel}
          hint={t.sales.cancel.reasonHint}
          error={reasonError}
          required
        >
          <textarea
            id={reasonId}
            value={reason}
            rows={3}
            maxLength={200}
            placeholder={t.sales.cancel.reasonPlaceholder}
            aria-invalid={reasonError !== undefined}
            onChange={(event) => setReason(event.target.value)}
            onBlur={() => setTouched(true)}
            className={
              'w-full rounded-xl bg-white text-sm text-ink-900 placeholder:text-slate-500 border px-3.5 py-2.5 outline-none ' +
              'transition-all focus:border-ink-900 focus:ring-4 focus:ring-ink-900/5 ' +
              (reasonError ? 'border-rose-300' : 'border-line hover:border-line-strong')
            }
          />
        </FieldShell>

        <div className="rounded-xl bg-slate-50 px-4 py-3 text-[13px] text-slate-700">
          <div className="font-semibold text-ink-900 mb-1.5">{t.sales.cancel.effectsTitle}</div>
          <ul className="space-y-1.5">
            <li className="flex gap-2">
              <Icon
                name={stockKnown ? 'inventory_2' : 'warning'}
                size={16}
                className="mt-0.5 shrink-0"
              />
              <span>
                {stockKnown ? t.sales.cancel.effectStock : t.sales.cancel.effectStockUnknown}
              </span>
            </li>
            {credit && (
              <li className="flex gap-2">
                <Icon name="account_balance_wallet" size={16} className="mt-0.5 shrink-0" />
                <span>{t.sales.cancel.effectCredit(formatFCFA(credit.totalInitial))}</span>
              </li>
            )}
            <li className="flex gap-2">
              <Icon name="history" size={16} className="mt-0.5 shrink-0" />
              <span>{t.sales.cancel.effectKept}</span>
            </li>
          </ul>
        </div>

        {failure !== null && (
          <p role="alert" className="text-sm text-rose-600">
            {failure}
          </p>
        )}
      </div>
    </Modal>
  );
}
