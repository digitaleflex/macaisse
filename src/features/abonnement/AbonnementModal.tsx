import { useState } from 'react';
import { Modal } from '@/ui';
import { selectModal, useUiStore } from '@/store/useUiStore';
import { PlanCard, type SubscriptionPlan } from './PlanCard';

/**
 * AbonnementModal — entièrement démonstrative (forfait, bascule de facturation
 * et historique de factures sont des maquettes). Pilotée par `useUiStore`
 * (`modal === 'abonnement'`). Aucun contrôle ne prétend silencieusement agir :
 * un bandeau signale la démo et les actions non implémentées publient un toast.
 */

const ACTIVE_PLAN: SubscriptionPlan = {
  name: 'Forfait Pro Commerçant',
  priceLabel: '15 000',
  period: 'FCFA / mois',
  nextBilling: 'Prochaine échéance le 24 Novembre 2024 via Wave',
  features: [
    'Ventes illimitées',
    'Jusqu’à 3 caissiers',
    'Reçus WhatsApp inclus',
    'Export comptable Excel',
  ],
};

const INVOICES: { id: string; meta: string }[] = [
  { id: 'INV-2024-10', meta: '24 Oct 2024 • Payé par Wave • 15 000 F' },
  { id: 'INV-2024-09', meta: '24 Sep 2024 • Payé par Wave • 15 000 F' },
];

export function AbonnementModal() {
  const open = useUiStore(selectModal) === 'abonnement';
  const closeModal = useUiStore((state) => state.closeModal);
  const showToast = useUiStore((state) => state.showToast);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const notifyUnavailable = () =>
    showToast('Fonctionnalité de démonstration — non disponible.', 'info');

  const title = (
    <span className="flex items-center gap-2">
      <span className="material-symbols-outlined text-emerald-600 text-[22px]">
        workspace_premium
      </span>
      <span>Mon Abonnement Ma Caisse</span>
    </span>
  );

  return (
    <Modal open={open} onClose={closeModal} title={title}>
      {/* Demo notice */}
      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800">
        <span className="material-symbols-outlined text-[16px] text-amber-600 shrink-0">info</span>
        <span>
          Démonstration : la gestion d’abonnement et la facturation ne sont pas activées. Aucune
          transaction réelle n’est effectuée.
        </span>
      </div>

      {/* Active Plan Card */}
      <PlanCard plan={ACTIVE_PLAN} />

      {/* Billing Cycle Switch (aperçu) */}
      <div className="space-y-1.5">
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
        <span className="text-[10px] text-slate-500 block px-1">
          Aperçu de démonstration — la facturation réelle n’est pas activée.
        </span>
      </div>

      {/* Invoices History */}
      <div className="space-y-2">
        <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block px-1">
          Historique des Factures
        </span>

        <div className="bg-white rounded-xl border border-slate-200/80 divide-y divide-slate-100 shadow-2xs">
          {INVOICES.map((invoice) => (
            <div key={invoice.id} className="p-3 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-900 block">
                  Facture #{invoice.id}
                </span>
                <span className="text-[10px] text-slate-500">{invoice.meta}</span>
              </div>
              <button
                type="button"
                onClick={notifyUnavailable}
                className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-900 text-[11px] font-semibold transition-colors cursor-pointer"
              >
                Télécharger
              </button>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
