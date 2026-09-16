import React, { useState } from 'react';

interface AbonnementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (msg: string) => void;
}

export const AbonnementModal: React.FC<AbonnementModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
}) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200/80">
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-600 text-[22px]">
              workspace_premium
            </span>
            <h2 className="font-display font-bold text-sm text-slate-900">Mon Abonnement Ma Caisse</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-500 hover:text-slate-900 shadow-2xs border border-slate-200 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 flex-1 overflow-y-auto space-y-4">
          {/* Active Plan Card */}
          <div className="p-4 rounded-xl bg-slate-900 text-white shadow-md relative overflow-hidden border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-400/30">
                Plan Actif
              </span>
              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Renouvellement auto
              </span>
            </div>

            <div className="mt-2.5">
              <h3 className="font-display font-bold text-xl text-white">Forfait Pro Commerçant</h3>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="font-display font-bold text-2xl text-emerald-400 font-num">
                  15 000
                </span>
                <span className="text-xs text-slate-300">FCFA / mois</span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Prochaine échéance le 24 Novembre 2024 via Wave
              </p>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-2 gap-2 text-[11px] text-slate-300">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-emerald-400">check</span>
                <span>Ventes illimitées</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-emerald-400">check</span>
                <span>Jusqu'à 3 caissiers</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-emerald-400">check</span>
                <span>Reçus WhatsApp inclus</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-emerald-400">check</span>
                <span>Export comptable Excel</span>
              </div>
            </div>
          </div>

          {/* Billing Cycle Switch */}
          <div className="flex p-1 bg-slate-100 rounded-xl text-xs font-semibold border border-slate-200/80">
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              className={`flex-1 py-1.5 rounded-lg text-center transition-all cursor-pointer ${
                billingCycle === 'monthly'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Mensuel (15 000 F)
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('yearly')}
              className={`flex-1 py-1.5 rounded-lg text-center transition-all flex items-center justify-center gap-1 cursor-pointer ${
                billingCycle === 'yearly'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <span>Annuel (2 mois offerts)</span>
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-bold border border-emerald-200">
                -17%
              </span>
            </button>
          </div>

          {/* Invoices History */}
          <div className="space-y-2">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block px-1">
              Historique des Factures
            </span>

            <div className="bg-white rounded-xl border border-slate-200/80 divide-y divide-slate-100 shadow-2xs">
              <div className="p-3 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-900 block">
                    Facture #INV-2024-10
                  </span>
                  <span className="text-[10px] text-slate-500">
                    24 Oct 2024 • Payé par Wave • 15 000 F
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onShowToast('Téléchargement de la facture PDF en cours...')}
                  className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-900 text-[11px] font-semibold transition-colors cursor-pointer"
                >
                  Télécharger
                </button>
              </div>

              <div className="p-3 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-900 block">
                    Facture #INV-2024-09
                  </span>
                  <span className="text-[10px] text-slate-500">
                    24 Sep 2024 • Payé par Wave • 15 000 F
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onShowToast('Téléchargement de la facture PDF en cours...')}
                  className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-900 text-[11px] font-semibold transition-colors cursor-pointer"
                >
                  Télécharger
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
