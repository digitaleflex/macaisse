import { useState } from 'react';
import type { PaymentMethod } from '@/types';
import { t } from '@/content';
import { PAYMENT_METHODS } from '@/config/reference';
import { formatFCFA, parseMontant } from '@/domain/money';
import { useUiStore } from '@/store/useUiStore';
import { Button, Icon, Input, Modal, cn } from '@/ui';

/**
 * Pavé d'encaissement : mode de règlement, client optionnel, clavier numérique
 * (montant reçu ou mis à crédit). Ne calcule aucune règle de vente : il remonte
 * le mode et les montants via `onValidate` (validation par `useSalesStore`).
 */

export interface PaymentPayload {
  paymentMethod: PaymentMethod;
  clientName?: string;
  creditAmount?: number;
}

export interface PaymentPadProps {
  open: boolean;
  total: number;
  onClose: () => void;
  onValidate: (payload: PaymentPayload) => void;
}

const KEYPAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', 'backspace'] as const;

export function PaymentPad({ open, total, onClose, onValidate }: PaymentPadProps) {
  const showToast = useUiStore((state) => state.showToast);
  const [method, setMethod] = useState<PaymentMethod>('Espèces');
  const [clientName, setClientName] = useState('');
  const [amountText, setAmountText] = useState(() => String(total));

  const isCredit = method === 'Crédit Partiel';
  const needsAmount = method === 'Espèces' || isCredit;
  const amount = parseMontant(amountText);
  const change = method === 'Espèces' ? Math.max(0, amount - total) : 0;
  const rounded1000 = Math.ceil(total / 1000) * 1000;
  const rounded5000 = Math.max(10000, Math.ceil(total / 5000) * 5000);
  const presets = [...new Set([total, rounded1000, rounded5000])];

  const selectMethod = (next: PaymentMethod) => {
    setMethod(next);
    setAmountText(next === 'Espèces' ? String(total) : '');
  };

  const handleKey = (key: string) => {
    if (key === 'backspace') {
      setAmountText((previous) => previous.slice(0, -1));
      return;
    }
    setAmountText((previous) => `${previous === '0' ? '' : previous}${key}`);
  };

  const handleValidate = () => {
    if (isCredit && amount <= 0) {
      showToast(t.pos.payment.creditRequired, 'error');
      return;
    }
    const trimmed = clientName.trim();
    if (isCredit && trimmed.length === 0) {
      showToast(t.pos.payment.clientRequired, 'error');
      return;
    }
    onValidate({
      paymentMethod: method,
      clientName: trimmed.length > 0 ? trimmed : undefined,
      creditAmount: isCredit ? amount : undefined,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t.pos.payment.title}
      subtitle={t.pos.cart.total}
      icon="point_of_sale"
      size="xl"
      footer={
        <Button id="final-confirm-btn" variant="accent" size="xl" fullWidth icon="verified" onClick={handleValidate}>
          {t.pos.payment.confirm} · {formatFCFA(total)}
        </Button>
      }
    >
      <div className="rounded-2xl bg-ink-900 text-white p-5 bg-grid-ink flex items-end justify-between gap-4">
        <div>
          <div className="text-xs text-slate-400">{t.pos.payment.amountDue}</div>
          <div className="font-num font-extrabold text-3xl sm:text-4xl leading-tight mt-1">{formatFCFA(total)}</div>
        </div>
        {needsAmount && amount > 0 && (
          <div className="text-right">
            <div className="text-xs text-slate-400">{isCredit ? t.pos.payment.creditRemaining : t.pos.payment.change}</div>
            <div className={cn('font-num font-bold text-xl', isCredit ? 'text-amber-300' : 'text-zest-400')}>
              {formatFCFA(isCredit ? amount : change)}
            </div>
          </div>
        )}
      </div>

      <div className={cn('grid gap-5', needsAmount && 'sm:grid-cols-2')}>
        <div className="space-y-5">
          <div>
            <div className="text-[13px] font-medium text-slate-700 mb-2">{t.pos.payment.method}</div>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={t.pos.payment.method}>
              {PAYMENT_METHODS.map((option) => {
                const active = method === option.method;
                return (
                  <button
                    key={option.method}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => selectMethod(option.method)}
                    className={cn(
                      'flex flex-col items-center justify-center gap-1 h-[72px] rounded-2xl border transition-all cursor-pointer active:scale-95',
                      active
                        ? 'bg-ink-900 border-ink-900 text-white shadow-raised'
                        : 'bg-white border-line text-slate-700 hover:border-line-strong'
                    )}
                  >
                    <Icon name={option.icon} size={22} className={active ? 'text-zest-400' : 'text-slate-500'} />
                    <span className="text-xs font-semibold">{option.short}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <Input
            label={t.pos.payment.client}
            name="payment-client"
            icon="person"
            value={clientName}
            onChange={(event) => setClientName(event.target.value)}
            placeholder={t.pos.payment.clientPlaceholder}
            hint={t.common.optional}
          />
        </div>

        {needsAmount && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-slate-700">
                {isCredit ? t.pos.payment.onCredit : t.pos.payment.received}
              </span>
              <span className="font-num font-bold text-lg text-ink-900">{formatFCFA(amount)}</span>
            </div>

            {!isCredit && (
              <div className="grid grid-cols-3 gap-2">
                {presets.map((preset, index) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAmountText(String(preset))}
                    className={cn(
                      'h-9 rounded-xl text-xs font-bold border transition-colors cursor-pointer font-num',
                      amount === preset ? 'bg-zest-400 border-zest-400 text-ink-950' : 'bg-white border-line hover:border-line-strong'
                    )}
                  >
                    {index === 0 ? t.pos.payment.exact : formatFCFA(preset, { withSuffix: false })}
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              {KEYPAD_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  aria-label={key === 'backspace' ? t.pos.payment.erase : key}
                  onClick={() => handleKey(key)}
                  className="h-12 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-ink-900 text-lg font-bold font-num flex items-center justify-center transition-all cursor-pointer"
                >
                  {key === 'backspace' ? <Icon name="backspace" size={22} /> : key}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
