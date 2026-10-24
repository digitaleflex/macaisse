import { useState } from 'react';
import type { BillingCycle } from '@/types';
import { t } from '@/content';
import { parseDate } from '@/domain/dates';
import { formatFCFA } from '@/domain/money';
import { useCurrentSession } from '@/store/useSessionStore';
import { selectModal, useUiStore } from '@/store/useUiStore';
import { Badge, Button, Icon, Modal, SegmentedControl } from '@/ui';
import { PlanCard } from './PlanCard';

/** Abonnement (démonstratif) — données issues de la session, actions signalées par toast. */
export function AbonnementModal() {
  const open = useUiStore(selectModal) === 'abonnement';
  const closeModal = useUiStore((state) => state.closeModal);
  const showToast = useUiStore((state) => state.showToast);
  const { subscription } = useCurrentSession();
  const [cycle, setCycle] = useState<BillingCycle>(subscription.cycle);

  const formatDate = (iso: string) => parseDate(iso)?.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) ?? iso;

  return (
    <Modal open={open} onClose={closeModal} title={t.subscription.title} icon="workspace_premium" size="lg">
      <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-50 text-xs text-amber-800">
        <Icon name="info" size={18} className="text-amber-600" />
        {t.subscription.demoNotice}
      </div>

      <SegmentedControl
        label={t.subscription.title}
        value={cycle}
        onChange={setCycle}
        fullWidth
        options={[
          { value: 'monthly', label: t.subscription.monthly },
          {
            value: 'yearly',
            label: (
              <>
                {t.subscription.yearly}
                <Badge tone="success">{t.subscription.yearlyDiscount}</Badge>
              </>
            ),
          },
        ]}
      />

      <PlanCard subscription={subscription} cycle={cycle} />
      <p className="text-xs text-slate-500 -mt-2">{t.subscription.preview}</p>

      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 px-1">{t.subscription.invoices}</h3>
        <ul className="rounded-2xl border border-line divide-y divide-line">
          {subscription.invoices.map((invoice) => (
            <li key={invoice.id} className="flex items-center gap-3 px-4 py-3">
              <span className="size-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                <Icon name="description" size={19} />
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-ink-900">{t.subscription.invoice(invoice.id)}</div>
                <div className="text-xs text-slate-500">
                  {t.subscription.invoiceMeta(formatDate(invoice.date), invoice.paymentMethod, formatFCFA(invoice.amount))}
                </div>
              </div>
              <Badge tone={invoice.status === 'Payée' ? 'success' : 'warning'}>{invoice.status}</Badge>
              <Button variant="ghost" size="sm" icon="download" onClick={() => showToast(t.common.unavailable, 'info')}>
                <span className="hidden sm:inline">{t.subscription.download}</span>
              </Button>
            </li>
          ))}
        </ul>
      </section>
    </Modal>
  );
}
