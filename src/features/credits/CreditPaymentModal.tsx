import { useState } from 'react';
import type { ClientCredit } from '@/types';
import { t } from '@/content';
import { QUICK_CREDIT_PAYMENTS } from '@/config/reference';
import { formatFCFA } from '@/domain/money';
import { Button, Icon, Input, Modal, Switch, cn } from '@/ui';

/** Encaissement d'un règlement de crédit (appel au store fait par le parent). */
export type PaymentChannel = 'especes' | 'wave' | 'orange_money';

export interface CreditPaymentModalProps {
  credit: ClientCredit | null;
  open: boolean;
  onClose: () => void;
  onSubmit: (credit: ClientCredit, amount: number) => void;
}

const DEFAULT_PAY_AMOUNT = 20000;
const CHANNELS: { id: PaymentChannel; icon: string }[] = [
  { id: 'especes', icon: 'payments' },
  { id: 'wave', icon: 'waves' },
  { id: 'orange_money', icon: 'phone_iphone' },
];

export function CreditPaymentModal({ credit, open, onClose, onSubmit }: CreditPaymentModalProps) {
  const [amount, setAmount] = useState<number>(() =>
    credit ? Math.min(DEFAULT_PAY_AMOUNT, credit.remainingAmount) : DEFAULT_PAY_AMOUNT
  );
  const [channel, setChannel] = useState<PaymentChannel>('especes');
  const [sendReceipt, setSendReceipt] = useState(false);

  if (!credit) return null;
  const newBalance = Math.max(0, credit.remainingAmount - amount);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t.credits.payment.title}
      subtitle={credit.clientName}
      icon="payments"
      footer={
        <Button variant="primary" size="lg" fullWidth icon="check_circle" onClick={() => onSubmit(credit, amount)}>
          {t.credits.payment.submit} · {formatFCFA(amount)}
        </Button>
      }
    >
      <div className="rounded-2xl bg-ink-900 text-white p-5 bg-grid-ink flex items-center justify-between gap-3">
        <div>
          <div className="text-xs text-slate-400">{t.credits.payment.remaining}</div>
          <div className="font-num font-extrabold text-2xl mt-0.5">{formatFCFA(credit.remainingAmount)}</div>
        </div>
        <Button variant="accent" size="sm" onClick={() => setAmount(credit.remainingAmount)}>
          {t.credits.payment.settleAll}
        </Button>
      </div>

      <div className="space-y-2">
        <Input
          label={t.credits.payment.amount}
          name="credit-payment-amount"
          type="number"
          inputMode="numeric"
          suffix={t.common.currency}
          value={amount}
          onChange={(event) => setAmount(Math.min(credit.remainingAmount, Number(event.target.value) || 0))}
          hint={
            <span>
              {t.credits.payment.newBalance} : <strong className="text-brand-600 font-num">{formatFCFA(newBalance)}</strong>
            </span>
          }
        />
        <div className="grid grid-cols-3 gap-2">
          {QUICK_CREDIT_PAYMENTS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setAmount(Math.min(credit.remainingAmount, preset))}
              className="h-9 rounded-xl bg-white border border-line hover:border-line-strong text-xs font-bold font-num cursor-pointer"
            >
              {formatFCFA(preset, { withSuffix: false })}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="text-[13px] font-medium text-slate-700 mb-2">{t.credits.payment.channel}</div>
        <div className="grid grid-cols-3 gap-2">
          {CHANNELS.map((entry) => {
            const active = channel === entry.id;
            return (
              <button
                key={entry.id}
                type="button"
                aria-pressed={active}
                onClick={() => setChannel(entry.id)}
                className={cn(
                  'h-16 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer',
                  active ? 'bg-ink-900 border-ink-900 text-white' : 'bg-white border-line text-slate-700 hover:border-line-strong'
                )}
              >
                <Icon name={entry.icon} size={20} className={active ? 'text-zest-400' : 'text-slate-500'} />
                <span className="text-xs font-semibold">{t.credits.payment.channels[entry.id]}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 border border-line">
        <Icon name="send_to_mobile" size={22} className="text-brand-600" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-ink-900">{t.credits.payment.receipt}</div>
          <div className="text-xs text-slate-500">{t.credits.payment.receiptHint}</div>
        </div>
        <Switch checked={sendReceipt} onChange={setSendReceipt} label={t.credits.payment.receipt} />
      </div>
    </Modal>
  );
}
