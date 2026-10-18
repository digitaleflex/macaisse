/**
 * CreditDetailCard — une ligne / carte de débiteur du carnet de crédits.
 *
 * Purement présentationnel : le statut, les jours de retard et la progression
 * sont calculés en amont par `@/domain/credits` et reçus en props.
 */

import type { ClientCredit, CreditStatus } from '@/types';
import { formatFCFA } from '@/domain/money';

export interface CreditDetailCardProps {
  credit: ClientCredit;
  /** Statut courant (dérivé par `@/domain/credits`). */
  status: CreditStatus;
  /** Jours de retard (0 si non échu). */
  daysLateCount: number;
  /** Progression du remboursement entre 0 et 1. */
  progress: number;
  onPay: (credit: ClientCredit) => void;
  onWhatsAppReminder: (credit: ClientCredit) => void;
}

export function CreditDetailCard({
  credit,
  status,
  daysLateCount,
  progress,
  onPay,
  onWhatsAppReminder,
}: CreditDetailCardProps) {
  const isOverdue = status === 'En retard';
  const isPartial = status === 'Partiel';
  const paidAmount = credit.totalInitial - credit.remainingAmount;
  const paidRatio = Math.round(progress * 100);

  return (
    <div className="p-3.5 rounded-2xl bg-white shadow-2xs border border-slate-200/80 flex flex-col gap-2.5 transition-transform active:scale-[0.99]">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-10 h-10 rounded-xl font-display font-bold text-xs flex items-center justify-center shrink-0 border ${
              isOverdue ? 'bg-rose-50 text-rose-700 border-rose-200/80' : 'bg-slate-100 text-slate-800 border-slate-200'
            }`}
          >
            {credit.initials}
          </div>
          <div className="min-w-0">
            <h2 className="font-display font-bold text-xs text-slate-900 truncate">
              {credit.clientName}
            </h2>
            <p className="text-[11px] text-slate-500 truncate">
              {credit.shopOrLocation} • {credit.phone}
            </p>
          </div>
        </div>

        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap flex items-center gap-1 border ${
            isOverdue
              ? 'bg-rose-50 text-rose-700 border-rose-200/80'
              : isPartial
                ? 'bg-amber-50 text-amber-700 border-amber-200/80'
                : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}
        >
          <span className="material-symbols-outlined text-[12px]">
            {isOverdue ? 'alarm' : 'schedule'}
          </span>
          {isOverdue
            ? `En retard (+${daysLateCount}j)`
            : isPartial
              ? `Partiel (${paidRatio}%)`
              : 'En attente'}
        </span>
      </div>

      {/* Financial Details & Progress */}
      <div className="p-2.5 rounded-xl bg-slate-50 flex flex-col gap-1.5 border border-slate-100">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 block font-medium">Reste à payer</span>
            <div className="flex items-baseline gap-1">
              <span
                className={`font-display font-bold text-base font-num ${
                  isOverdue ? 'text-rose-700' : 'text-slate-900'
                }`}
              >
                {formatFCFA(credit.remainingAmount, { withSuffix: false })}
              </span>
              <span className="text-[10px] text-slate-500">FCFA</span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-500 block font-medium">
              {isOverdue ? 'Échéance dépassée' : 'Échéance'}
            </span>
            <span
              className={`text-xs font-semibold ${
                isOverdue ? 'text-rose-700 font-bold' : 'text-slate-800'
              }`}
            >
              {credit.dueDate}
            </span>
          </div>
        </div>

        {/* Progress bar for partial payments */}
        {credit.totalInitial > credit.remainingAmount && (
          <div className="w-full mt-1">
            <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-full bg-emerald-600 rounded-full transition-all"
                style={{ width: `${paidRatio}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[9px] text-slate-500 mt-0.5">
              <span>Réglé : {formatFCFA(paidAmount, { withSuffix: false })} FCFA</span>
              <span>Total initial : {formatFCFA(credit.totalInitial, { withSuffix: false })} FCFA</span>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-0.5">
        <button
          type="button"
          onClick={() => onPay(credit)}
          className="flex-1 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-all border border-slate-200/80 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px] text-slate-700">payments</span>
          <span>Encaisser règlement</span>
        </button>

        <a
          href={`tel:${credit.phone}`}
          aria-label={`Appeler ${credit.clientName}`}
          className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 hover:text-slate-900 transition-colors border border-slate-200/80 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">call</span>
        </a>

        <button
          type="button"
          aria-label="Rappel WhatsApp"
          onClick={() => onWhatsAppReminder(credit)}
          className="w-9 h-9 rounded-xl bg-emerald-50 hover:bg-emerald-100 flex items-center justify-center text-emerald-700 transition-colors border border-emerald-200/80 cursor-pointer"
          title="Rappel de paiement WhatsApp (non disponible dans cette version)"
        >
          <span className="material-symbols-outlined text-[18px]">chat</span>
        </button>
      </div>
    </div>
  );
}
