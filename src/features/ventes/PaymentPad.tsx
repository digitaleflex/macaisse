import { useState } from 'react';
import type { PaymentMethod } from '@/types';
import { Input } from '@/ui';
import { useUiStore } from '@/store/useUiStore';
import { formatFCFA, parseMontant } from '@/domain/money';

/**
 * Pavé d'encaissement (bottom sheet) du POS : choix du mode de règlement,
 * clavier numérique de saisie du montant (reçu pour les espèces, mis à crédit
 * pour le crédit partiel), client optionnel et validation.
 *
 * Le composant ne calcule aucune règle de vente : il ne fait que remonter le
 * mode et les montants saisis via `onValidate` (la vente est validée par
 * `useSalesStore.completeSale`).
 */

export interface PaymentPayload {
  paymentMethod: PaymentMethod;
  clientName?: string;
  creditAmount?: number;
}

export interface PaymentPadProps {
  /** Montant total dû du panier courant. */
  total: number;
  onClose: () => void;
  onValidate: (payload: PaymentPayload) => void;
}

interface PaymentMethodOption {
  method: PaymentMethod;
  label: string;
  icon: string;
}

const PAYMENT_METHODS: readonly PaymentMethodOption[] = [
  { method: 'Espèces', label: 'Espèces', icon: 'payments' },
  { method: 'Mobile Money (Wave)', label: 'Wave', icon: 'smartphone' },
  { method: 'Orange Money', label: 'Orange', icon: 'smartphone' },
  { method: 'Carte Bancaire', label: 'Carte', icon: 'credit_card' },
  { method: 'Crédit Partiel', label: 'Crédit', icon: 'account_balance_wallet' },
];

const KEYPAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', 'backspace'] as const;

export function PaymentPad({ total, onClose, onValidate }: PaymentPadProps) {
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

  const selectMethod = (next: PaymentMethod) => {
    setMethod(next);
    // Espèces : montant reçu pré-rempli au total (comportement historique).
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
      showToast('Veuillez saisir le montant à crédit.', 'error');
      return;
    }
    const trimmed = clientName.trim();
    onValidate({
      paymentMethod: method,
      clientName: trimmed.length > 0 ? trimmed : undefined,
      creditAmount: isCredit ? amount : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 backdrop-blur-xs transition-opacity duration-300">
      <div className="w-full max-w-md bg-white rounded-t-3xl p-5 shadow-2xl border-t border-slate-200 max-h-[85vh] overflow-y-auto">
        <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-3" />

        <div className="flex items-center justify-between mb-3">
          <div className="flex flex-col">
            <span className="text-[11px] text-slate-500 uppercase font-semibold">
              Encaissement Client
            </span>
            <span className="font-display font-bold text-2xl text-slate-900 font-num">
              {formatFCFA(total)}
            </span>
          </div>
          <button
            type="button"
            aria-label="Fermer la fenêtre"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-900 active:scale-95 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Sélecteur de mode de règlement */}
        <span className="text-xs text-slate-600 mb-1.5 block font-medium">
          Sélectionnez le mode de règlement :
        </span>
        <div className="grid grid-cols-3 gap-2 mb-3.5">
          {PAYMENT_METHODS.map((option) => {
            const active = method === option.method;
            return (
              <button
                key={option.method}
                type="button"
                onClick={() => selectMethod(option.method)}
                className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all active:scale-95 cursor-pointer border ${
                  active
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-slate-50 text-slate-800 hover:bg-slate-100 border-slate-200/80'
                }`}
              >
                <span
                  className={`material-symbols-outlined text-[24px] mb-1 ${
                    active ? 'text-emerald-400' : 'text-slate-600'
                  }`}
                >
                  {option.icon}
                </span>
                <span className="text-xs font-semibold">{option.label}</span>
              </button>
            );
          })}
        </div>

        {/* Client optionnel */}
        <Input
          className="mb-3"
          label="Client (Optionnel)"
          name="payment-client"
          value={clientName}
          onChange={(event) => setClientName(event.target.value)}
          placeholder="Nom du client ou téléphone pour reçu SMS/WhatsApp..."
        />

        {/* Saisie du montant : clavier numérique */}
        {needsAmount && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] text-slate-500 uppercase font-semibold">
                {isCredit ? 'Montant à crédit :' : 'Montant reçu par le caissier :'}
              </span>
              <span className="font-display font-bold text-base text-slate-900 font-num">
                {formatFCFA(amount)}
              </span>
            </div>

            {!isCredit && (
              <div className="flex items-center justify-between gap-1.5 mb-2">
                <button
                  type="button"
                  onClick={() => setAmountText(String(total))}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold active:scale-95 border cursor-pointer ${
                    amount === total
                      ? 'bg-slate-900 text-emerald-400 border-slate-900'
                      : 'bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  Exact
                </button>
                <button
                  type="button"
                  onClick={() => setAmountText(String(rounded1000))}
                  className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-800 text-xs font-bold active:scale-95 border border-slate-200 hover:bg-slate-200 cursor-pointer font-num"
                >
                  {formatFCFA(rounded1000, { withSuffix: false })}
                </button>
                <button
                  type="button"
                  onClick={() => setAmountText(String(rounded5000))}
                  className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-800 text-xs font-bold active:scale-95 border border-slate-200 hover:bg-slate-200 cursor-pointer font-num"
                >
                  {formatFCFA(rounded5000, { withSuffix: false })}
                </button>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              {KEYPAD_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  aria-label={key === 'backspace' ? 'Effacer' : key}
                  onClick={() => handleKey(key)}
                  className="h-11 rounded-xl bg-slate-100 text-slate-800 text-sm font-bold active:scale-95 border border-slate-200 hover:bg-slate-200 cursor-pointer font-num flex items-center justify-center"
                >
                  {key === 'backspace' ? (
                    <span className="material-symbols-outlined text-[20px]">backspace</span>
                  ) : (
                    key
                  )}
                </button>
              ))}
            </div>

            {!isCredit && change > 0 && (
              <div className="mt-2.5 p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between text-xs text-emerald-800 font-semibold">
                <span>Monnaie à rendre :</span>
                <span className="font-display font-bold text-sm font-num text-emerald-900">
                  {formatFCFA(change)}
                </span>
              </div>
            )}

            {isCredit && (
              <div className="mt-2.5 p-2.5 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between text-xs text-amber-800 font-semibold">
                <span>Reste à crédit (client) :</span>
                <span className="font-display font-bold text-sm font-num text-amber-900">
                  {formatFCFA(amount)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Validation */}
        <button
          id="final-confirm-btn"
          type="button"
          onClick={handleValidate}
          className="w-full h-13 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-display font-bold text-sm flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-transform cursor-pointer"
        >
          <span className="material-symbols-outlined text-[22px]">verified</span>
          <span>Valider la Vente (Reçu Instantané)</span>
        </button>
      </div>
    </div>
  );
}
