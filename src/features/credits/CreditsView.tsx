import { useMemo, useState } from 'react';
import type { ClientCredit, CreditStatus } from '@/types';
import { t } from '@/content';
import { computeCreditStatus, creditProgress, creditSummary, daysLate } from '@/domain/credits';
import { formatFCFA } from '@/domain/money';
import { useCreditsStore, type CreditInput } from '@/store/useCreditsStore';
import { useUiStore } from '@/store/useUiStore';
import { Button, EmptyState, Icon, PageHeader, ProgressBar, SectionTitle } from '@/ui';
import { CreditDetailCard } from './CreditDetailCard';
import { CreditFilters, type CreditFilterKey } from './CreditFilters';
import { CreditFormModal } from './CreditFormModal';
import { CreditPaymentModal } from './CreditPaymentModal';

/**
 * Carnet de crédits clients. Données et actions : `useCreditsStore` ; statut,
 * retard, progression et synthèse : `@/domain/credits`.
 */

const FILTER_STATUS: Record<Exclude<CreditFilterKey, 'all'>, CreditStatus> = {
  retard: 'En retard',
  partiel: 'Partiel',
  attente: 'En attente',
};

interface CreditRow {
  credit: ClientCredit;
  status: CreditStatus;
  late: number;
}

export function CreditsView() {
  const credits = useCreditsStore((state) => state.credits);
  const addCredit = useCreditsStore((state) => state.addCredit);
  const payCredit = useCreditsStore((state) => state.payCredit);
  const markSettled = useCreditsStore((state) => state.markSettled);
  const showToast = useUiStore((state) => state.showToast);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<CreditFilterKey>('all');
  const [selectedCredit, setSelectedCredit] = useState<ClientCredit | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formInstance, setFormInstance] = useState(0);

  const now = useMemo(() => new Date(), []);
  const summary = useMemo(() => creditSummary(credits, now), [credits, now]);

  // Créances actives, enrichies et triées par urgence (retards d'abord).
  const activeRows = useMemo<CreditRow[]>(
    () =>
      credits
        .map((credit) => ({
          credit,
          status: computeCreditStatus(credit.remainingAmount, credit.totalInitial, credit.dueDate, now),
          late: daysLate(credit.dueDate, now),
        }))
        .filter((row) => row.status !== 'Réglé')
        .sort((a, b) => b.late - a.late || a.credit.dueDate.localeCompare(b.credit.dueDate)),
    [credits, now]
  );

  const counts = useMemo(() => {
    const count = (status: CreditStatus) => activeRows.filter((row) => row.status === status).length;
    return { overdue: count('En retard'), partial: count('Partiel'), pending: count('En attente') };
  }, [activeRows]);

  const term = search.trim().toLowerCase();
  const visibleRows = activeRows.filter((row) => {
    const matchesFilter = filter === 'all' || row.status === FILTER_STATUS[filter];
    const matchesSearch =
      term.length === 0 ||
      row.credit.clientName.toLowerCase().includes(term) ||
      row.credit.phone.replace(/\s+/g, '').includes(term.replace(/\s+/g, '')) ||
      row.credit.shopOrLocation.toLowerCase().includes(term);
    return matchesFilter && matchesSearch;
  });

  const recoveredRatio = summary.total > 0 ? summary.settled / summary.total : 0;

  const openForm = () => {
    setFormInstance((instance) => instance + 1);
    setFormOpen(true);
  };

  const handlePay = (credit: ClientCredit, amount: number) => {
    try {
      if (amount >= credit.remainingAmount) markSettled(credit.id);
      else payCredit(credit.id, amount);
      setSelectedCredit(null);
      showToast(t.credits.toasts.paid(formatFCFA(amount), credit.clientName), 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : t.credits.toasts.payFailed, 'error');
    }
  };

  const handleAddCredit = (input: CreditInput) => {
    addCredit(input);
    setFormOpen(false);
    showToast(t.credits.toasts.created(input.clientName), 'success');
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t.nav.credits.title}
        description={t.nav.credits.description}
        actions={
          <Button id="btnNewCredit" variant="primary" icon="person_add" onClick={openForm}>
            {t.credits.newCredit}
          </Button>
        }
      />

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 relative overflow-hidden rounded-card bg-ink-900 text-white p-6 bg-grid-ink shadow-raised">
          <div className="absolute -right-10 -bottom-20 size-64 rounded-full bg-zest-400/15 blur-3xl pointer-events-none" />
          <div className="relative h-full flex flex-col justify-between gap-8">
            <div>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Icon name="account_balance_wallet" size={18} />
                {t.credits.summary.outstanding}
              </div>
              <div className="font-num font-extrabold text-4xl sm:text-5xl mt-2 tracking-tight">{formatFCFA(summary.outstanding)}</div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">{t.credits.summary.recovered}</span>
                <span className="font-num font-bold text-zest-400">{formatFCFA(summary.settled)}</span>
              </div>
              <ProgressBar value={recoveredRatio} tone="zest" className="bg-white/10 h-2" label={t.credits.summary.recovered} />
              <div className="text-xs text-slate-500">
                {summary.total > 0
                  ? t.credits.summary.recoveredHint(Math.round(recoveredRatio * 100))
                  : t.credits.summary.noCredits}
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
          <div className="rounded-card bg-surface border border-line shadow-card p-5">
            <div className="flex items-center justify-between text-sm text-slate-500">
              {t.credits.summary.debtors}
              <Icon name="group" size={20} className="text-slate-400" />
            </div>
            <div className="font-num font-bold text-2xl text-ink-900 mt-2">{activeRows.length}</div>
            <div className="text-xs text-slate-500">{t.credits.summary.debtorsHint(activeRows.length)}</div>
          </div>
          <div className="rounded-card bg-rose-50 border border-rose-200 p-5">
            <div className="flex items-center justify-between text-sm font-semibold text-rose-700">
              {t.credits.summary.overdue}
              <Icon name="warning" size={20} />
            </div>
            <div className="font-num font-bold text-xl sm:text-2xl text-rose-700 mt-2 whitespace-nowrap">{formatFCFA(summary.overdue)}</div>
            <div className="text-xs text-rose-600">{t.credits.summary.overdueHint(counts.overdue)}</div>
          </div>
        </div>
      </section>

      <CreditFilters
        search={search}
        onSearchChange={setSearch}
        filter={filter}
        onFilterChange={setFilter}
        totalCount={activeRows.length}
        overdueCount={counts.overdue}
        partialCount={counts.partial}
        pendingCount={counts.pending}
      />

      <div className="flex flex-col gap-3">
        <SectionTitle action={<span className="text-xs text-slate-500">{t.credits.listHint}</span>}>
          {t.credits.listTitle}
        </SectionTitle>

        {credits.length === 0 ? (
          <div className="bg-surface rounded-card border border-line">
            <EmptyState
              icon="account_balance_wallet"
              title={t.credits.emptyTitle}
              description={t.credits.emptyText}
              action={
                <Button icon="person_add" onClick={openForm}>
                  {t.credits.newCredit}
                </Button>
              }
            />
          </div>
        ) : visibleRows.length === 0 ? (
          <div className="bg-surface rounded-card border border-line">
            <EmptyState icon="search_off" title={t.credits.noResultTitle} description={t.credits.noResultText} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
            {visibleRows.map((row) => (
              <CreditDetailCard
                key={row.credit.id}
                credit={row.credit}
                status={row.status}
                daysLateCount={row.late}
                progress={creditProgress(row.credit)}
                onPay={setSelectedCredit}
                onWhatsAppReminder={(credit) => showToast(t.credits.toasts.reminder(credit.clientName), 'info')}
              />
            ))}
          </div>
        )}
      </div>

      <CreditFormModal
        key={`credit-form-${formInstance}`}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleAddCredit}
      />
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
