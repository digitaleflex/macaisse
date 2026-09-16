import React, { useState } from 'react';
import { ClientCredit } from '../types';
import { formatFCFA } from '../data/initialData';

interface CreditsViewProps {
  credits: ClientCredit[];
  onPayCredit: (creditId: number, amountPaid: number, channel: string) => void;
  onAddCredit: (credit: Omit<ClientCredit, 'id'>) => void;
  onShowToast: (msg: string) => void;
}

export const CreditsView: React.FC<CreditsViewProps> = ({
  credits,
  onPayCredit,
  onAddCredit,
  onShowToast,
}) => {
  const [filter, setFilter] = useState<'all' | 'retard' | 'partiel' | 'recents'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCredit, setSelectedCredit] = useState<ClientCredit | null>(null);
  const [payAmount, setPayAmount] = useState<number>(20000);
  const [payChannel, setPayChannel] = useState<'especes' | 'wave' | 'orange_money'>('especes');
  const [sendWhatsAppReceipt, setSendWhatsAppReceipt] = useState(true);

  // New credit modal state
  const [showNewCreditModal, setShowNewCreditModal] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('+221 ');
  const [newShopLocation, setNewShopLocation] = useState('');
  const [newCreditAmount, setNewCreditAmount] = useState<number>(30000);
  const [newDueDate, setNewDueDate] = useState('30 Novembre 2024');

  const filteredCredits = credits.filter((c) => {
    const matchesFilter =
      filter === 'all'
        ? true
        : filter === 'retard'
        ? c.status === 'En retard'
        : filter === 'partiel'
        ? c.status === 'Partiel'
        : true;

    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !term ||
      c.clientName.toLowerCase().includes(term) ||
      c.phone.includes(term) ||
      c.shopOrLocation.toLowerCase().includes(term);

    return matchesFilter && matchesSearch;
  });

  const totalDue = credits.reduce((acc, c) => acc + c.remainingAmount, 0);
  const overdueTotal = credits
    .filter((c) => c.status === 'En retard')
    .reduce((acc, c) => acc + c.remainingAmount, 0);
  const overdueCount = credits.filter((c) => c.status === 'En retard').length;

  const handleOpenPayModal = (credit: ClientCredit) => {
    setSelectedCredit(credit);
    setPayAmount(Math.min(20000, credit.remainingAmount));
  };

  const handleConfirmPayment = () => {
    if (!selectedCredit) return;
    onPayCredit(selectedCredit.id, payAmount, payChannel);
    onShowToast(
      `Paiement de ${payAmount.toLocaleString('fr-FR')} FCFA validé pour ${
        selectedCredit.clientName
      } !${sendWhatsAppReceipt ? ' (Reçu WhatsApp envoyé)' : ''}`
    );
    setSelectedCredit(null);
  };

  const handleCreateCredit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim() || newCreditAmount <= 0) return;

    const initials = newClientName
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    onAddCredit({
      clientName: newClientName.trim(),
      initials: initials || 'CL',
      shopOrLocation: newShopLocation.trim() || 'Client comptoir',
      phone: newClientPhone.trim() || '+221 77 000 00 00',
      remainingAmount: newCreditAmount,
      totalInitial: newCreditAmount,
      dueDate: newDueDate,
      status: 'En attente',
    });

    onShowToast(`Nouveau crédit client enregistré pour ${newClientName} !`);
    setShowNewCreditModal(false);
    setNewClientName('');
    setNewCreditAmount(30000);
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
                  {totalDue.toLocaleString('fr-FR')}
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
                  {credits.length}
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
                  {overdueTotal.toLocaleString('fr-FR')}
                </span>
                <span className="text-[10px] text-rose-600 font-semibold">FCFA ({overdueCount})</span>
              </div>
            </div>
          </div>

          {/* Progress / Cash Collected Banner */}
          <div className="flex items-center justify-between rounded-xl p-2.5 bg-emerald-50/80 border border-emerald-200/80">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-slate-900 font-bold">Recouvré ce mois</span>
                <span className="text-[10px] text-slate-500">66% de l'objectif mensuel</span>
              </div>
            </div>
            <div className="text-right">
              <span className="font-display font-bold text-sm text-emerald-700 font-num">
                +215 000
              </span>
              <span className="text-[10px] text-slate-500 block">FCFA</span>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Action: Nouveau Crédit Client */}
      <div className="px-4 mt-3">
        <button
          id="btnNewCredit"
          type="button"
          onClick={() => setShowNewCreditModal(true)}
          className="w-full h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-display font-semibold text-xs flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-xs cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px] text-emerald-400">person_add</span>
          <span>Nouveau Crédit Client</span>
        </button>
      </div>

      {/* Search and Filter Bar */}
      <div className="px-4 mt-3 flex flex-col gap-2">
        <div className="relative w-full">
          <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
            <span className="material-symbols-outlined text-[18px]">search</span>
          </span>
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher un client, contact..."
            className="w-full h-11 pl-9 pr-4 rounded-xl bg-white text-xs text-slate-900 placeholder:text-slate-400 outline-none shadow-2xs border border-slate-200/80 focus:border-slate-400 transition-colors"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`filter-pill px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all ${
              filter === 'all'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
            }`}
          >
            <span>Tous</span>
            <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px]">
              {credits.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilter('retard')}
            className={`filter-pill px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all ${
              filter === 'retard'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            <span>En retard</span>
            <span className="px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">
              {overdueCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilter('partiel')}
            className={`filter-pill px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all ${
              filter === 'partiel'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>Partiel</span>
            <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
              {credits.filter((c) => c.status === 'Partiel').length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilter('recents')}
            className={`filter-pill px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all ${
              filter === 'recents'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
            }`}
          >
            <span>Récents</span>
          </button>
        </div>
      </div>

      {/* Debtors List Section */}
      <div className="px-4 mt-2 flex flex-col gap-2.5">
        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
            Créances en cours
          </span>
          <span className="text-[11px] text-slate-700 font-bold">Trier par urgence</span>
        </div>

        {filteredCredits.map((credit) => {
          const paidAmount = credit.totalInitial - credit.remainingAmount;
          const paidRatio = Math.round((paidAmount / credit.totalInitial) * 100);

          return (
            <div
              key={credit.id}
              className="p-3.5 rounded-2xl bg-white shadow-2xs border border-slate-200/80 flex flex-col gap-2.5 transition-transform active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl font-display font-bold text-xs flex items-center justify-center shrink-0 border ${
                      credit.status === 'En retard'
                        ? 'bg-rose-50 text-rose-700 border-rose-200/80'
                        : 'bg-slate-100 text-slate-800 border-slate-200'
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
                    credit.status === 'En retard'
                      ? 'bg-rose-50 text-rose-700 border-rose-200/80'
                      : credit.status === 'Partiel'
                      ? 'bg-amber-50 text-amber-700 border-amber-200/80'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  <span className="material-symbols-outlined text-[12px]">
                    {credit.status === 'En retard' ? 'alarm' : 'schedule'}
                  </span>
                  {credit.status === 'En retard'
                    ? `En retard (+${credit.daysLate || 3}j)`
                    : credit.status === 'Partiel'
                    ? `Partiel (${paidRatio}%)`
                    : 'En attente'}
                </span>
              </div>

              {/* Financial Details & Progress */}
              <div className="p-2.5 rounded-xl bg-slate-50 flex flex-col gap-1.5 border border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-500 block font-medium">
                      Reste à payer
                    </span>
                    <div className="flex items-baseline gap-1">
                      <span
                        className={`font-display font-bold text-base font-num ${
                          credit.status === 'En retard' ? 'text-rose-700' : 'text-slate-900'
                        }`}
                      >
                        {credit.remainingAmount.toLocaleString('fr-FR')}
                      </span>
                      <span className="text-[10px] text-slate-500">FCFA</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block font-medium">
                      {credit.status === 'En retard' ? 'Échéance dépassée' : 'Échéance'}
                    </span>
                    <span
                      className={`text-xs font-semibold ${
                        credit.status === 'En retard' ? 'text-rose-700 font-bold' : 'text-slate-800'
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
                      <span>Réglé : {paidAmount.toLocaleString('fr-FR')} FCFA</span>
                      <span>Total initial : {credit.totalInitial.toLocaleString('fr-FR')} FCFA</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => handleOpenPayModal(credit)}
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
                  onClick={() =>
                    onShowToast(
                      `Rappel de relance WhatsApp envoyé à ${credit.clientName} (${credit.remainingAmount.toLocaleString(
                        'fr-FR'
                      )} FCFA)`
                    )
                  }
                  className="w-9 h-9 rounded-xl bg-emerald-50 hover:bg-emerald-100 flex items-center justify-center text-emerald-700 transition-colors border border-emerald-200/80 cursor-pointer"
                  title="Envoyer un rappel de paiement sur WhatsApp"
                >
                  <span className="material-symbols-outlined text-[18px]">chat</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Slide-Up Modal: Encaisser un paiement */}
      {selectedCredit && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-t-3xl p-5 shadow-2xl border-t border-slate-200 max-h-[85vh] overflow-y-auto">
            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-3" />

            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-display font-bold text-sm text-slate-900">
                  Encaisser un règlement de crédit
                </h3>
                <p className="text-[11px] text-slate-500">{selectedCredit.clientName}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCredit(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Debt summary card */}
            <div className="mt-3 p-3 rounded-2xl bg-slate-50 flex items-center justify-between border border-slate-100">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold">
                  Montant restant dû
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="font-display font-bold text-base text-slate-900 font-num">
                    {selectedCredit.remainingAmount.toLocaleString('fr-FR')}
                  </span>
                  <span className="text-[10px] text-slate-500 font-bold">FCFA</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPayAmount(selectedCredit.remainingAmount)}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold active:scale-95 transition-all cursor-pointer shadow-2xs"
              >
                Tout solder
              </button>
            </div>

            {/* Amount input */}
            <div className="mt-3 flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-900">Montant perçu (FCFA)</label>
              <div className="relative">
                <input
                  type="number"
                  value={payAmount}
                  max={selectedCredit.remainingAmount}
                  onChange={(e) =>
                    setPayAmount(
                      Math.min(selectedCredit.remainingAmount, Number(e.target.value) || 0)
                    )
                  }
                  className="w-full h-11 px-3 rounded-xl bg-slate-50 text-base font-display font-bold text-slate-900 outline-none border border-slate-200 focus:bg-white focus:border-slate-400 transition-colors"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-500 font-bold">
                  FCFA
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 mt-0.5">
                <span>Nouveau solde après règlement :</span>
                <span className="font-bold text-emerald-700 font-num">
                  {(selectedCredit.remainingAmount - payAmount).toLocaleString('fr-FR')} FCFA
                </span>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="mt-2.5 flex items-center gap-2">
              {[10000, 20000, 30000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setPayAmount(Math.min(selectedCredit.remainingAmount, amt))}
                  className="flex-1 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-200/80 cursor-pointer transition-colors"
                >
                  {amt.toLocaleString('fr-FR')}
                </button>
              ))}
            </div>

            {/* Payment Channel Selector */}
            <div className="mt-3 flex flex-col gap-1.5">
              <span className="text-xs font-bold text-slate-900">Canal de réception</span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPayChannel('especes')}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl border cursor-pointer transition-colors ${
                    payChannel === 'especes'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-[20px] ${
                      payChannel === 'especes' ? 'text-emerald-400' : 'text-slate-600'
                    }`}
                  >
                    payments
                  </span>
                  <span className="text-[11px] font-semibold mt-0.5">Espèces</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPayChannel('wave')}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl border cursor-pointer transition-colors ${
                    payChannel === 'wave'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-[20px] ${
                      payChannel === 'wave' ? 'text-sky-400' : 'text-sky-600'
                    }`}
                  >
                    smartphone
                  </span>
                  <span className="text-[11px] font-semibold mt-0.5">Wave</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPayChannel('orange_money')}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl border cursor-pointer transition-colors ${
                    payChannel === 'orange_money'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-[20px] ${
                      payChannel === 'orange_money' ? 'text-orange-400' : 'text-orange-600'
                    }`}
                  >
                    account_balance
                  </span>
                  <span className="text-[11px] font-semibold mt-0.5">Orange M.</span>
                </button>
              </div>
            </div>

            {/* Receipt toggle */}
            <div className="mt-3 p-2.5 rounded-2xl bg-slate-50 flex items-center justify-between border border-slate-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-600 text-[20px]">
                  send_to_mobile
                </span>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-900">Reçu instantané WhatsApp</span>
                  <span className="text-[10px] text-slate-500">
                    Preuve numérique envoyée au client
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={sendWhatsAppReceipt}
                onChange={(e) => setSendWhatsAppReceipt(e.target.checked)}
                className="w-4 h-4 accent-emerald-600 cursor-pointer"
              />
            </div>

            {/* Confirm CTA */}
            <button
              type="button"
              onClick={handleConfirmPayment}
              className="mt-4 w-full h-11 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-display font-semibold text-xs flex items-center justify-center gap-2 shadow-xs active:scale-98 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px] text-emerald-400">check_circle</span>
              <span>Valider l'encaissement</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal: Nouveau Crédit Client */}
      {showNewCreditModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-t-3xl p-5 shadow-2xl border-t border-slate-200 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center text-white">
                  <span className="material-symbols-outlined text-[18px] text-emerald-400">person_add</span>
                </div>
                <h3 className="font-display font-bold text-sm text-slate-900">
                  Enregistrer un nouveau crédit client
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNewCreditModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateCredit} className="flex flex-col gap-3 mt-3">
              <div>
                <label className="text-[11px] text-slate-500 uppercase font-semibold block mb-1">
                  Nom complet du client *
                </label>
                <input
                  type="text"
                  required
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="Ex: M. Ba Ousmane, Mme Ndiaye..."
                  className="w-full h-10 px-3 rounded-xl bg-slate-50 text-xs text-slate-900 outline-none border border-slate-200 focus:bg-white focus:border-slate-400 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-500 uppercase font-semibold block mb-1">
                    Numéro de téléphone
                  </label>
                  <input
                    type="text"
                    value={newClientPhone}
                    onChange={(e) => setNewClientPhone(e.target.value)}
                    placeholder="+221 77 ..."
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 text-xs text-slate-900 outline-none border border-slate-200 focus:bg-white focus:border-slate-400 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 uppercase font-semibold block mb-1">
                    Commerce / Repère
                  </label>
                  <input
                    type="text"
                    value={newShopLocation}
                    onChange={(e) => setNewShopLocation(e.target.value)}
                    placeholder="Boutique en face..."
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 text-xs text-slate-900 outline-none border border-slate-200 focus:bg-white focus:border-slate-400 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-500 uppercase font-semibold block mb-1">
                    Montant de la créance (FCFA) *
                  </label>
                  <input
                    type="number"
                    required
                    min={500}
                    step={500}
                    value={newCreditAmount}
                    onChange={(e) => setNewCreditAmount(Number(e.target.value))}
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 text-xs text-slate-900 outline-none border border-slate-200 font-bold focus:bg-white focus:border-slate-400 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 uppercase font-semibold block mb-1">
                    Date d'échéance convenue
                  </label>
                  <input
                    type="text"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    placeholder="Ex: 30 Novembre 2024"
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 text-xs text-slate-900 outline-none border border-slate-200 focus:bg-white focus:border-slate-400 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="mt-2 w-full h-11 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-display font-semibold text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-98 transition-all"
              >
                <span className="material-symbols-outlined text-[18px] text-emerald-400">check</span>
                <span>Valider le carnet de crédit</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

