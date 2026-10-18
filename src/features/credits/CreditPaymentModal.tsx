/**
 * CreditPaymentModal — encaissement d'un règlement de crédit.
 *
 * Construit avec les primitives `Modal`, `Input` et `Button` (en-tête clair).
 * L'appel au store (`payCredit` / `markSettled`) est fait par le parent via
 * `onSubmit` : les erreurs françaises remontées par `@/domain/credits` y sont
 * interceptées et affichées par toast.
 */

import { useState } from 'react';
import type { ClientCredit } from '@/types';
import { formatFCFA } from '@/domain/money';
import { Modal } from '@/ui/Modal';
import { Input } from '@/ui/Input';
import { Button } from '@/ui/Button';

export type PaymentChannel = 'especes' | 'wave' | 'orange_money';

export interface CreditPaymentModalProps {
  /** Crédit à encaisser ; `null` ferme la modale. */
  credit: ClientCredit | null;
  open: boolean;
  onClose: () => void;
  onSubmit: (credit: ClientCredit, amount: number) => void;
}

const DEFAULT_PAY_AMOUNT = 20000;
const QUICK_AMOUNTS = [10000, 20000, 30000];

const channelButtonClass = (active: boolean): string =>
  `flex flex-col items-center justify-center p-2 rounded-xl border cursor-pointer transition-colors ${
    active
      ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
  }`;

export function CreditPaymentModal({
  credit,
  open,
  onClose,
  onSubmit,
}: CreditPaymentModalProps) {
  // Le parent remonte ce composant par `key` à chaque crédit : l'état est
  // réinitialisé à l'ouverture, sans `useEffect` (pas de setState dans un effet).
  const [amount, setAmount] = useState<number>(() =>
    credit ? Math.min(DEFAULT_PAY_AMOUNT, credit.remainingAmount) : DEFAULT_PAY_AMOUNT
  );
  const [channel, setChannel] = useState<PaymentChannel>('especes');
  const [sendReceipt, setSendReceipt] = useState(true);

  if (!credit) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <span className="flex flex-col">
          <span>Encaisser un règlement de crédit</span>
          <span className="text-[11px] font-normal text-slate-500">{credit.clientName}</span>
        </span>
      }
    >
      {/* Debt summary card */}
      <div className="p-3 rounded-2xl bg-slate-50 flex items-center justify-between border border-slate-100">
        <div>
          <span className="text-[10px] text-slate-500 uppercase font-semibold">
            Montant restant dû
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="font-display font-bold text-base text-slate-900 font-num">
              {formatFCFA(credit.remainingAmount, { withSuffix: false })}
            </span>
            <span className="text-[10px] text-slate-500 font-bold">FCFA</span>
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setAmount(credit.remainingAmount)}>
          Tout solder
        </Button>
      </div>

      {/* Amount input */}
      <div className="mt-3 flex flex-col gap-1">
        <Input
          label="Montant perçu (FCFA)"
          type="number"
          value={amount}
          onChange={(event) =>
            setAmount(Math.min(credit.remainingAmount, Number(event.target.value) || 0))
          }
        />
        <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 mt-0.5">
          <span>Nouveau solde après règlement :</span>
          <span className="font-bold text-emerald-700 font-num">
            {formatFCFA(Math.max(0, credit.remainingAmount - amount), { withSuffix: false })} FCFA
          </span>
        </div>
      </div>

      {/* Quick Presets */}
      <div className="mt-2.5 flex items-center gap-2">
        {QUICK_AMOUNTS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => setAmount(Math.min(credit.remainingAmount, preset))}
            className="flex-1 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-200/80 cursor-pointer transition-colors"
          >
            {formatFCFA(preset, { withSuffix: false })}
          </button>
        ))}
      </div>

      {/* Payment Channel Selector */}
      <div className="mt-3 flex flex-col gap-1.5">
        <span className="text-xs font-bold text-slate-900">Canal de réception</span>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setChannel('especes')}
            className={channelButtonClass(channel === 'especes')}
          >
            <span
              className={`material-symbols-outlined text-[20px] ${
                channel === 'especes' ? 'text-emerald-400' : 'text-slate-600'
              }`}
            >
              payments
            </span>
            <span className="text-[11px] font-semibold mt-0.5">Espèces</span>
          </button>

          <button
            type="button"
            onClick={() => setChannel('wave')}
            className={channelButtonClass(channel === 'wave')}
          >
            <span
              className={`material-symbols-outlined text-[20px] ${
                channel === 'wave' ? 'text-sky-400' : 'text-sky-600'
              }`}
            >
              smartphone
            </span>
            <span className="text-[11px] font-semibold mt-0.5">Wave</span>
          </button>

          <button
            type="button"
            onClick={() => setChannel('orange_money')}
            className={channelButtonClass(channel === 'orange_money')}
          >
            <span
              className={`material-symbols-outlined text-[20px] ${
                channel === 'orange_money' ? 'text-orange-400' : 'text-orange-600'
              }`}
            >
              account_balance
            </span>
            <span className="text-[11px] font-semibold mt-0.5">Orange M.</span>
          </button>
        </div>
      </div>

      {/* Receipt toggle (fonctionnalité non disponible — aucune preuve n'est envoyée) */}
      <div className="mt-3 p-2.5 rounded-2xl bg-slate-50 flex items-center justify-between border border-slate-100">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-emerald-600 text-[20px]">
            send_to_mobile
          </span>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-900">Reçu instantané WhatsApp</span>
            <span className="text-[10px] text-slate-500">
              Envoi automatique non disponible — aucune preuve n'est transmise
            </span>
          </div>
        </div>
        <input
          type="checkbox"
          checked={sendReceipt}
          onChange={(event) => setSendReceipt(event.target.checked)}
          className="w-4 h-4 accent-emerald-600 cursor-pointer"
        />
      </div>

      {/* Confirm CTA */}
      <div className="mt-4">
        <Button variant="secondary" size="md" fullWidth onClick={() => onSubmit(credit, amount)}>
          <span className="material-symbols-outlined text-[18px] text-emerald-400">check_circle</span>
          <span>Valider l'encaissement</span>
        </Button>
      </div>
    </Modal>
  );
}
