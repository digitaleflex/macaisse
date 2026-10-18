/**
 * CreditsView — carnet de crédits clients (onglet « Crédits »).
 *
 * Composant de fonctionnalité : il ne prend AUCUNE prop métier. Toutes les
 * données et actions proviennent de `useCreditsStore`, le toast de `useUiStore`,
 * et le statut / retard / progression de `@/domain/credits`.
 */

import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import type { ClientCredit } from '@/types';
import {
  selectActiveCredits,
  selectCreditSummary,
  selectOverdueCredits,
  selectTotalOutstanding,
  useCreditsStore,
  type CreditInput,
} from '@/store/useCreditsStore';
import { useUiStore } from '@/store/useUiStore';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { computeCreditStatus, creditProgress, daysLate } from '@/domain/credits';
import { formatFCFA } from '@/domain/money';
import { CreditDetailCard } from './CreditDetailCard';
import { CreditFilters, type CreditFilterKey } from './CreditFilters';
import { CreditFormModal } from './CreditFormModal';
import { CreditPaymentModal } from './CreditPaymentModal';

export function CreditsView() {
  const credits = useCreditsStore((state) => state.credits);
  // Sélecteurs dérivés frais (tableau/objet neuf par appel) : `useShallow` les
  // stabilise — les éléments viennent tels quels de `state.credits` et les champs
  // agrégés sont des primitives, la comparaison superficielle suffit donc.
  const activeCredits = useCreditsStore(useShallow(selectActiveCredits));
  const overdueCredits = useCreditsStore(useShallow(selectOverdueCredits));
  const summary = useCreditsStore(useShallow(selectCreditSummary));
  const totalOutstanding = useCreditsStore(selectTotalOutstanding);
  const addCredit = useCreditsStore((state) => state.addCredit);
  const payCredit = useCreditsStore((state) => state.payCredit);
  const markSettled = useCreditsStore((state) => state.markSettled);
  const showToast = useUiStore((state) => state.showToast);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<CreditFilterKey>('all');
  const [selectedCredit, setSelectedCredit] = useState<ClientCredit | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const term = search.trim().toLowerCase();
  const filteredCredits = activeCredits.filter((credit) => {
    const status = computeCreditStatus(
      credit.remainingAmount,
      credit.totalInitial,
      credit.dueDate
    );
    const matchesFilter =
      filter === 'retard'
        ? status === 'En retard'
        : filter === 'partiel'
          ? status === 'Partiel'
          : true;
    const matchesSearch =
      term.length === 0 ||
      credit.clientName.toLowerCase().includes(term) ||
      credit.phone.includes(term) ||
      credit.shopOrLocation.toLowerCase().includes(term);
    return matchesFilter && matchesSearch;
  });

  const partialCount = activeCredits.filter(
    (credit) =>
      computeCreditStatus(credit.remainingAmount, credit.totalInitial, credit.dueDate) === 'Partiel'
  ).length;
  const overdueCount = overdueCredits.length;
  // Taux de recouvrement cumulé (toutes créances confondues), garde anti division par zéro.
  const recoveredPercent =
    summary.total > 0 ? Math.round((summary.settled / summary.total) * 100) : 0;

  const handlePay = (credit: ClientCredit, amount: number) => {
    try {
      if (amount >= credit.remainingAmount) {
        // Solder : délègue à l'action dédiée du store (aucun sur-paiement possible).
        markSettled(credit.id);
      } else {
        payCredit(credit.id, amount);
      }
      setSelectedCredit(null);
      showToast(`Paiement de ${formatFCFA(amount)} validé pour ${credit.clientName} !`, 'success');
    } catch (error) {
      // `payCredit` lève des erreurs françaises (montant ≤ 0, sur-paiement).
      showToast(error instanceof Error ? error.message : 'Le paiement a été refusé.', 'error');
    }
  };

  const handleAddCredit = (input: CreditInput) => {
    addCredit(input);
    setIsFormOpen(false);
    showToast(`Nouveau crédit client enregistré pour ${input.clientName} !`, 'success');
  };

  const handleWhatsAppReminder = (credit: ClientCredit) => {
    // Aucun envoi réel : le message l'indique honnêtement (pas de faux succès).
    showToast(
      `Rappel WhatsApp non envoyé à ${credit.clientName} : l'envoi de messages n'est pas disponible dans cette version.`,
      'info'
    );
  };

  return (
    <div className="flex flex-col w-full pb-28 pt-2">
      {/* Sticky Subheader */}
      <div className="px-4 pb-2 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="font-display text-lg font-bold text-slate-900 tracking-tight">
              Crédits Clients
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/80">
              Actifs
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            Suivi des dettes et recouvrement • Caisse Principale
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200/80">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>Sync auto</span>
        </div>
      </div>

      {/* Hero KPI Section: Total à Recevoir & Velocity */}
      <div className="px-4">
        <div className="p-4 rounded-2xl bg-white shadow-2xs border border-slate-200/80 flex flex-col gap-3">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                Total à recevoir
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="font-display font-bold text-2xl text-slate-900 tracking-tight font-num">
                  {formatFCFA(totalOutstanding, { withSuffix: false })}
                </span>
                <span className="text-xs text-slate-500 font-bold">FCFA</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
              <span className="material-symbols-outlined text-[22px]">account_balance_wallet</span>
            </div>
          </div>

          {/* Quick Metrics Ribbon */}
          <div className="grid grid-cols-2 gap-2 pt-0.5">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500">Débiteurs</span>
                <span className="material-symbols-outlined text-[16px] text-slate-400">group</span>
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="font-display font-bold text-base text-slate-900 font-num">
                  {summary.count}
                </span>
                <span className="text-[10px] text-slate-500">clients</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-rose-50/70 flex flex-col justify-between border border-rose-200/80">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-rose-700 font-semibold">En retard</span>
                <span className="material-symbols-outlined text-[16px] text-rose-600">
                  warning
                </span>
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="font-display font-bold text-base text-rose-700 font-num">
                  {formatFCFA(summary.overdue, { withSuffix: false })}
                </span>
                <span className="text-[10px] text-rose-600 font-semibold">
                  FCFA ({overdueCount})
                </span>
              </div>
            </div>
          </div>

          {/* Progress / Cash Collected Banner — valeurs réelles issues de selectCreditSummary */}
          <div className="flex items-center justify-between rounded-xl p-2.5 bg-emerald-50/80 border border-emerald-200/80">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-slate-900 font-bold">Total recouvré</span>
                <span className="text-[10px] text-slate-500">
                  {summary.total > 0
                    ? `${recoveredPercent}% du total des créances`
                    : 'Aucune créance enregistrée'}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="font-display font-bold text-sm text-emerald-700 font-num">
                {formatFCFA(summary.settled, { withSuffix: false })}
              </span>
              <span className="text-[10px] text-slate-500 block">FCFA</span>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Action: Nouveau Crédit Client */}
      <div className="px-4 mt-3">
        <Button
          id="btnNewCredit"
          variant="secondary"
          size="md"
          fullWidth
          onClick={() => setIsFormOpen(true)}
        >
          <span className="material-symbols-outlined text-[18px] text-emerald-400">person_add</span>
          <span>Nouveau Crédit Client</span>
        </Button>
      </div>

      {/* Search, filters & sort header */}
      <CreditFilters
        search={search}
        onSearchChange={setSearch}
        filter={filter}
        onFilterChange={setFilter}
        totalCount={activeCredits.length}
        overdueCount={overdueCount}
        partialCount={partialCount}
      />

      {/* Debtors List Section */}
      <div className="px-4 mt-2.5 flex flex-col gap-2.5">
        {credits.length === 0 ? (
          <EmptyState
            icon="account_balance_wallet"
            title="Aucun crédit client"
            description="Enregistrez un premier crédit pour suivre les dettes de vos clients."
            action={
              <Button variant="secondary" size="md" onClick={() => setIsFormOpen(true)}>
                <span className="material-symbols-outlined text-[18px] text-emerald-400">
                  person_add
                </span>
                <span>Nouveau Crédit Client</span>
              </Button>
            }
          />
        ) : filteredCredits.length === 0 ? (
          <EmptyState
            icon="search_off"
            title="Aucun résultat"
            description="Aucun crédit ne correspond à votre recherche ou à ce filtre."
          />
        ) : (
          filteredCredits.map((credit) => (
            <CreditDetailCard
              key={credit.id}
              credit={credit}
              status={computeCreditStatus(
                credit.remainingAmount,
                credit.totalInitial,
                credit.dueDate
              )}
              daysLateCount={daysLate(credit.dueDate)}
              progress={creditProgress(credit)}
              onPay={(target) => setSelectedCredit(target)}
              onWhatsAppReminder={handleWhatsAppReminder}
            />
          ))
        )}
      </div>

      {/* Modals */}
      <CreditFormModal open={isFormOpen} onClose={() => setIsFormOpen(false)} onSubmit={handleAddCredit} />
      <CreditPaymentModal
        key={selectedCredit ? selectedCredit.id : 'credit-payment-none'}
        credit={selectedCredit}
        open={selectedCredit !== null}
        onClose={() => setSelectedCredit(null)}
        onSubmit={handlePay}
      />
    </div>
  );
}
