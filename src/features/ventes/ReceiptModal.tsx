import { useState } from 'react';
import { t } from '@/content';
import { formatFCFA } from '@/domain/money';
import { formatTime, parseDate } from '@/domain/dates';
import { can } from '@/domain/permissions';
import { paymentLabel } from '@/config/reference';
import { assessCancellation, type CancelDenial } from '@/domain/sales';
import { personDisplayName } from '@/domain/users';
import { useCreditsStore } from '@/store/useCreditsStore';
import { useSalesStore } from '@/store/useSalesStore';
import { useCurrentSession } from '@/store/useSessionStore';
import { useUiStore } from '@/store/useUiStore';
import { Badge, BrandMark, Button, Icon, Modal } from '@/ui';
import { CancelSaleModal } from './CancelSaleModal';

const DENIAL_TEXT: Record<CancelDenial, string> = {
  'already-cancelled': t.sales.cancel.errors.alreadyCancelled,
  role: t.sales.cancel.errors.role,
  window: t.sales.cancel.errors.window,
  'credit-repaid': t.sales.cancel.errors.creditRepaid,
};

/**
 * Reçu (ticket de caisse numérique) piloté par `useUiStore.receipt`. Les valeurs
 * de transaction sont dérivées de la `SaleTransaction` ; l'identité du commerce
 * et le caissier viennent de la session (`services/`). Impression et partage
 * WhatsApp sont simulés (toast explicite).
 */

const BARCODE_WIDTHS = [3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 3, 1, 2, 3, 1, 4, 2, 1, 3, 2, 1, 3, 2, 4];

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-slate-500">{label}</span>
      <span className={strong ? 'font-bold text-ink-900 text-right' : 'text-ink-900 text-right'}>{value}</span>
    </div>
  );
}

export function ReceiptModal() {
  const receipt = useUiStore((state) => state.receipt);
  const closeReceipt = useUiStore((state) => state.closeReceipt);
  const showToast = useUiStore((state) => state.showToast);
  const { user, business, role } = useCurrentSession();
  const storedSale = useSalesStore((state) =>
    state.sales.find((item) => item.id === receipt?.sale.id),
  );
  const credits = useCreditsStore((state) => state.credits);
  const [cancelling, setCancelling] = useState(false);

  if (!receipt) return null;
  // La vente du store prime sur l'instantané : elle reflète une annulation récente.
  const sale = storedSale ?? receipt.sale;
  const items = receipt.items.length > 0 ? receipt.items : (sale.lines ?? []);
  const cancelled = sale.status === 'cancelled';
  const credit =
    credits.find((item) => item.id === sale.creditId) ??
    credits.find((item) => item.saleId === sale.id);
  const assessment = assessCancellation({ sale, credit, role });
  const canCancel = !cancelled && can(role, 'sales.cancel');

  const parsedDate = parseDate(sale.date);
  const dateLabel = parsedDate
    ? parsedDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : sale.date;
  const timeLabel = sale.time !== '' ? sale.time : parsedDate ? formatTime(parsedDate) : '';
  const barcodeToken = sale.saleNumber.replace('#', '');
  const barcodeText = parsedDate ? `*POS-${barcodeToken}-${parsedDate.getFullYear()}*` : `*POS-${barcodeToken}*`;

  return (
    <Modal
      open
      onClose={closeReceipt}
      title={t.receipt.title}
      subtitle={t.receipt.subtitle(sale.saleNumber)}
      icon="receipt"
      headerVariant="dark"
      size="sm"
      bodyClassName="bg-slate-100"
      footer={
        <div className="grid grid-cols-2 gap-2 w-full">
          {canCancel && (
            <Button
              variant="danger"
              icon="cancel"
              className="col-span-2"
              disabled={!assessment.allowed}
              onClick={() => setCancelling(true)}
            >
              {t.sales.cancel.action}
            </Button>
          )}
          <Button variant="secondary" icon="print" onClick={() => showToast(t.receipt.printToast(sale.saleNumber))}>
            {t.receipt.print}
          </Button>
          <Button variant="brand" icon="share" onClick={() => showToast(t.receipt.shareToast(sale.saleNumber))}>
            {t.receipt.share}
          </Button>
        </div>
      }
    >
      {cancelled && (
        <div role="status" className="mb-3 rounded-2xl bg-rose-50 border border-rose-200 px-4 py-3 text-[13px] text-rose-900">
          <div className="flex items-center gap-2 font-semibold">
            <Icon name="cancel" size={18} />
            <span>{t.sales.cancel.banner.title}</span>
            <Badge tone="danger">{t.labels.saleStatus.cancelled}</Badge>
          </div>
          {sale.cancelledAt && (
            <div className="mt-1">
              {t.sales.cancel.banner.detail(
                new Date(sale.cancelledAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }),
                sale.cancelledBy ?? ''
              )}
            </div>
          )}
          {sale.cancelReason && <div className="mt-0.5">{t.sales.cancel.banner.reason(sale.cancelReason)}</div>}
        </div>
      )}
      {canCancel && !assessment.allowed && assessment.denial && (
        <p className="mb-3 text-xs text-slate-600">{DENIAL_TEXT[assessment.denial]}</p>
      )}
      <article className={'bg-white rounded-2xl shadow-card px-5 py-6 text-[13px] relative' + (cancelled ? ' opacity-70' : '')}>
        <header className="text-center pb-4 border-b border-dashed border-line-strong flex flex-col items-center">
          <BrandMark className="size-10 mb-2" />
          <h3 className="font-display font-extrabold text-base text-ink-900 uppercase tracking-wide">{business.name}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{business.activity}</p>
          <p className="text-xs text-slate-500">
            {business.address}, {business.city}
          </p>
          <p className="text-xs text-slate-500">
            {t.receipt.phone(business.phone)} · {t.receipt.taxId(business.taxId)}
          </p>
        </header>

        <div className="py-3 border-b border-dashed border-line-strong space-y-1">
          <Row label={t.receipt.ticket} value={sale.saleNumber} strong />
          <Row label={t.receipt.dateTime} value={timeLabel ? `${dateLabel} · ${timeLabel}` : dateLabel} />
          <Row label={t.receipt.cashier} value={`${sale.sellerName ?? personDisplayName(user.firstName, user.lastName)} (${business.registerLabel})`} />
          {sale.clientName && <Row label={t.receipt.client} value={sale.clientName} strong />}
        </div>

        <div className="py-3 border-b border-dashed border-line-strong space-y-2">
          <div className="flex justify-between text-xs uppercase font-semibold tracking-wider text-muted">
            <span>{t.receipt.item}</span>
            <span>{t.receipt.total}</span>
          </div>
          {items.length > 0 ? (
            items.map((line) => (
              <div key={line.productId} className="flex justify-between items-start gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-ink-900 truncate">{line.name}</div>
                  <div className="text-xs text-slate-500 font-num">
                    {line.quantity} × {formatFCFA(line.price)}
                  </div>
                </div>
                <span className="font-num font-semibold shrink-0">{formatFCFA(line.price * line.quantity)}</span>
              </div>
            ))
          ) : (
            <div className="flex justify-between">
              <span>{t.receipt.miscItems(sale.itemsCount)}</span>
              <span className="font-num font-semibold">{formatFCFA(sale.amount)}</span>
            </div>
          )}
        </div>

        <div className="py-3 border-b border-dashed border-line-strong space-y-1">
          <Row label={t.receipt.subtotal} value={formatFCFA(sale.amount)} />
          <Row label={t.receipt.vat} value={formatFCFA(0)} />
          <div className="flex justify-between items-baseline pt-2">
            <span className="font-display font-bold text-ink-900 uppercase">{t.receipt.netTotal}</span>
            <span className="font-num font-extrabold text-xl text-ink-900">{formatFCFA(sale.amount)}</span>
          </div>
          <Row label={t.receipt.payment} value={paymentLabel(sale.paymentMethod)} />
          {sale.remainingAmount !== undefined && (
            <Row label={t.receipt.remaining} value={formatFCFA(sale.remainingAmount)} strong />
          )}
        </div>

        <footer className="pt-4 flex flex-col items-center text-center">
          <div className="flex items-stretch justify-center gap-[2px] h-10" aria-hidden="true">
            {BARCODE_WIDTHS.map((width, index) => (
              <span key={index} className="bg-ink-900" style={{ width: `${width * 1.5}px` }} />
            ))}
          </div>
          <span className="text-[10px] tracking-[0.25em] text-slate-500 font-num mt-1">{barcodeText}</span>
          <p className="text-xs text-slate-500 mt-3">{t.receipt.thanks}</p>
        </footer>
      </article>
      {cancelling && (
        <CancelSaleModal
          sale={sale}
          credit={credit}
          onClose={() => setCancelling(false)}
          onCancelled={() => setCancelling(false)}
        />
      )}
    </Modal>
  );
}
