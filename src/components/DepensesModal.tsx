import React, { useState } from 'react';
import { Expense } from '../types';
import { formatFCFA } from '../data/initialData';
import { exportToCSV, exportToPDF } from '../utils/exportUtils';

interface DepensesModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenses: Expense[];
  onAddExpense: (expense: Omit<Expense, 'id'>) => void;
  onShowToast: (msg: string) => void;
}

export const DepensesModal: React.FC<DepensesModalProps> = ({
  isOpen,
  onClose,
  expenses,
  onAddExpense,
  onShowToast,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('Tous');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newAmount, setNewAmount] = useState<number>(5000);
  const [newCategory, setNewCategory] = useState<
    'Achat Stock' | 'Transport' | 'Factures' | 'Salaires' | 'Divers'
  >('Divers');
  const [newMethod, setNewMethod] = useState<'Espèces' | 'Wave' | 'Orange Money'>('Espèces');
  const [hasReceipt, setHasReceipt] = useState(true);

  if (!isOpen) return null;

  const categories = ['Tous', 'Achat Stock', 'Transport', 'Factures', 'Divers'];

  const filteredExpenses = expenses.filter((e) => {
    return activeCategory === 'Tous' || e.category === activeCategory;
  });

  const totalSpent = expenses.reduce((acc, e) => acc + e.amount, 0);

  const handleSubmitNewExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || newAmount <= 0) return;

    onAddExpense({
      title: newTitle.trim(),
      category: newCategory,
      amount: Number(newAmount),
      date: "Aujourd'hui",
      paymentMethod: newMethod,
      hasReceipt,
    });

    onShowToast(`Dépense de ${newAmount.toLocaleString('fr-FR')} FCFA enregistrée !`);
    setShowAddForm(false);
    setNewTitle('');
    setNewAmount(5000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200/80">
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-[18px]">receipt_long</span>
            </div>
            <div>
              <h2 className="font-display font-bold text-sm text-slate-900">
                Dépenses &amp; Sorties de Caisse
              </h2>
              <p className="text-[11px] text-slate-500">Gestion des charges opérationnelles</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                exportToCSV('expenses', [], expenses);
                onShowToast('Journal des dépenses exporté en CSV !');
              }}
              title="Exporter les dépenses en CSV"
              className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-emerald-700 text-[11px] font-semibold flex items-center gap-1 hover:bg-slate-50 cursor-pointer shadow-2xs active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[15px]">table_view</span>
              <span>CSV</span>
            </button>
            <button
              type="button"
              onClick={() => {
                exportToPDF('expenses', [], expenses);
                onShowToast('Rapport PDF des dépenses généré !');
              }}
              title="Générer le PDF des dépenses"
              className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-rose-700 text-[11px] font-semibold flex items-center gap-1 hover:bg-slate-50 cursor-pointer shadow-2xs active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[15px]">picture_as_pdf</span>
              <span>PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-500 hover:text-slate-900 shadow-2xs border border-slate-200 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 flex-1 overflow-y-auto space-y-3.5">
          {/* Total Spent Hero */}
          <div className="bg-slate-50 p-3.5 rounded-xl flex items-center justify-between border border-slate-200/80">
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold">
                Total décaissé (Ce mois)
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="font-display font-bold text-2xl text-rose-700 font-num">
                  -{totalSpent.toLocaleString('fr-FR')}
                </span>
                <span className="text-xs text-slate-500 font-bold">FCFA</span>
              </div>
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                {expenses.length} dépenses enregistrées
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="h-9 px-3.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 active:scale-95 transition-all shadow-xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px] text-emerald-400">add</span>
              <span>+ Dépense</span>
            </button>
          </div>

          {/* Form to add a new expense */}
          {showAddForm && (
            <form
              onSubmit={handleSubmitNewExpense}
              className="bg-white p-3.5 rounded-xl border border-slate-300 shadow-sm flex flex-col gap-2.5 animate-fadeIn"
            >
              <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-900">
                  Nouvelle sortie de caisse
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-slate-500 text-xs hover:text-slate-900 cursor-pointer"
                >
                  Annuler
                </button>
              </div>

              <div>
                <label className="text-[10px] text-slate-500 uppercase font-semibold block mb-0.5">
                  Motif de la dépense *
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex: Taxi livraison gros, Facture Eau..."
                  className="w-full h-9 px-3 rounded-lg bg-slate-50 text-xs text-slate-900 outline-none border border-slate-200 focus:border-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-semibold block mb-0.5">
                    Montant (FCFA) *
                  </label>
                  <input
                    type="number"
                    required
                    min={100}
                    step={100}
                    value={newAmount}
                    onChange={(e) => setNewAmount(Number(e.target.value))}
                    className="w-full h-9 px-3 rounded-lg bg-slate-50 text-xs text-slate-900 font-bold outline-none border border-slate-200 focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-semibold block mb-0.5">
                    Catégorie
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full h-9 px-2 rounded-lg bg-slate-50 text-xs text-slate-900 outline-none border border-slate-200"
                  >
                    <option value="Achat Stock">Achat Stock</option>
                    <option value="Transport">Transport</option>
                    <option value="Factures">Factures</option>
                    <option value="Salaires">Salaires</option>
                    <option value="Divers">Divers</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    id="hasReceipt"
                    checked={hasReceipt}
                    onChange={(e) => setHasReceipt(e.target.checked)}
                    className="accent-slate-900"
                  />
                  <label htmlFor="hasReceipt" className="cursor-pointer">
                    Justificatif / Reçu joint
                  </label>
                </div>

                <button
                  type="submit"
                  className="h-8 px-4 bg-slate-900 text-white text-xs font-semibold rounded-lg active:scale-95 transition-transform cursor-pointer"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          )}

          {/* Category Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  activeCategory === cat
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Expenses List */}
          <div className="divide-y divide-slate-100 bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-2xs">
            {filteredExpenses.map((expense) => (
              <div
                key={expense.id}
                className="p-3 flex items-center justify-between hover:bg-slate-50/60 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 border border-rose-100 shrink-0">
                    <span className="material-symbols-outlined text-[18px]">
                      {expense.category === 'Achat Stock'
                        ? 'shopping_cart'
                        : expense.category === 'Transport'
                        ? 'local_shipping'
                        : expense.category === 'Factures'
                        ? 'electric_bolt'
                        : 'payments'}
                    </span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold text-slate-900 truncate">
                      {expense.title}
                    </span>
                    <div className="flex items-center gap-1 text-[10px] text-slate-500">
                      <span>{expense.category}</span>
                      <span>•</span>
                      <span>{expense.paymentMethod}</span>
                      <span>•</span>
                      <span>{expense.date}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-display font-bold text-xs text-rose-700 font-num">
                    -{expense.amount.toLocaleString('fr-FR')} F
                  </span>
                  {expense.hasReceipt && (
                    <span className="text-[9px] text-emerald-700 block font-semibold">Reçu OK</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
