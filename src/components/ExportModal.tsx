import React, { useState } from 'react';
import { SaleTransaction, Expense } from '../types';
import { exportToCSV, exportToPDF } from '../utils/exportUtils';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  sales: SaleTransaction[];
  expenses: Expense[];
  onShowToast: (msg: string) => void;
  initialFormat?: 'CSV' | 'PDF';
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  sales,
  expenses,
  onShowToast,
  initialFormat = 'PDF',
}) => {
  const [dataScope, setDataScope] = useState<'all' | 'sales' | 'expenses'>('all');
  const [format, setFormat] = useState<'CSV' | 'PDF'>(initialFormat);
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  // Calculs de synthèse
  const totalSalesAmount = sales.reduce((acc, s) => acc + s.amount, 0);
  const totalExpensesAmount = expenses.reduce((acc, e) => acc + e.amount, 0);
  const soldeNet = totalSalesAmount - totalExpensesAmount;

  const filteredSalesCount = dataScope === 'expenses' ? 0 : sales.length;
  const filteredExpensesCount = dataScope === 'sales' ? 0 : expenses.length;
  const totalRecords = filteredSalesCount + filteredExpensesCount;

  const handleDownload = () => {
    setIsExporting(true);
    try {
      if (format === 'CSV') {
        exportToCSV(dataScope, sales, expenses);
        onShowToast('Fichier CSV comptable exporté avec succès !');
      } else {
        exportToPDF(dataScope, sales, expenses);
        onShowToast('Rapport PDF comptable officiel téléchargé !');
      }
      setTimeout(() => {
        setIsExporting(false);
        onClose();
      }, 500);
    } catch (err) {
      console.error('Erreur lors de l\'exportation:', err);
      onShowToast('Erreur lors de la génération de l\'export.');
      setIsExporting(false);
    }
  };

  return (
    <div
      id="export-modal-backdrop"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#0b1c30]/70 backdrop-blur-xs p-3 animate-fadeIn"
      onClick={(e) => {
        if ((e.target as HTMLElement).id === 'export-modal-backdrop') {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-slate-200/80 max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">file_download</span>
            </div>
            <div>
              <h2 className="font-display font-bold text-sm text-white">
                Export Comptable &amp; Traçabilité
              </h2>
              <p className="text-[10px] text-slate-300">
                Générez vos écritures pour votre comptabilité externe
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-4 overflow-y-auto">
          {/* Format Selector */}
          <div>
            <label className="text-xs font-bold text-slate-900 uppercase tracking-wider block mb-1.5">
              1. Format d'exportation
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormat('PDF')}
                className={`p-3 rounded-xl border flex flex-col items-start gap-1 text-left transition-all cursor-pointer ${
                  format === 'PDF'
                    ? 'bg-slate-50 border-slate-900 text-slate-900 shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <span className="material-symbols-outlined text-[18px] text-rose-600">
                      picture_as_pdf
                    </span>
                    <span>Rapport PDF</span>
                  </div>
                  {format === 'PDF' && (
                    <span className="w-2 h-2 rounded-full bg-slate-900" />
                  )}
                </div>
                <p className="text-[10px] text-slate-500">
                  Mise en page certifiée, en-tête d'entreprise, totaux et visa
                </p>
              </button>

              <button
                type="button"
                onClick={() => setFormat('CSV')}
                className={`p-3 rounded-xl border flex flex-col items-start gap-1 text-left transition-all cursor-pointer ${
                  format === 'CSV'
                    ? 'bg-slate-50 border-slate-900 text-slate-900 shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <span className="material-symbols-outlined text-[18px] text-emerald-600">
                      table_view
                    </span>
                    <span>Tableur CSV</span>
                  </div>
                  {format === 'CSV' && (
                    <span className="w-2 h-2 rounded-full bg-slate-900" />
                  )}
                </div>
                <p className="text-[10px] text-slate-500">
                  Compatible Excel, Google Sheets, logiciels comptables (UTF-8)
                </p>
              </button>
            </div>
          </div>

          {/* Scope Selector */}
          <div>
            <label className="text-xs font-bold text-slate-900 uppercase tracking-wider block mb-1.5">
              2. Périmètre des données
            </label>
            <div className="flex flex-col gap-1.5">
              {[
                {
                  id: 'all',
                  label: 'Journal complet (Ventes & Dépenses)',
                  desc: 'Bilan chronologique global pour suivi de trésorerie',
                  count: `${sales.length} ventes + ${expenses.length} dépenses`,
                },
                {
                  id: 'sales',
                  label: 'Ventes & Recettes uniquement',
                  desc: 'Détail de tous les encaissements, tickets et règlements',
                  count: `${sales.length} tickets de vente`,
                },
                {
                  id: 'expenses',
                  label: 'Dépenses & Charges uniquement',
                  desc: 'Grand-livre des décaissements, achats stock et frais',
                  count: `${expenses.length} justificatifs`,
                },
              ].map((scope) => (
                <div
                  key={scope.id}
                  onClick={() => setDataScope(scope.id as any)}
                  className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                    dataScope === scope.id
                      ? 'bg-slate-50 border-slate-900/40 ring-1 ring-slate-900/10'
                      : 'bg-white border-slate-200/80 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div
                      className={`w-4 h-4 rounded-full mt-0.5 border flex items-center justify-center shrink-0 ${
                        dataScope === scope.id
                          ? 'border-slate-900 bg-slate-900'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {dataScope === scope.id && (
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      )}
                    </div>
                    <div>
                      <span className="font-bold text-xs text-slate-900 block">
                        {scope.label}
                      </span>
                      <span className="text-[10px] text-slate-500">{scope.desc}</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-600 shrink-0 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/60">
                    {scope.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Summary Preview */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
              <span>Écritures à inclure :</span>
              <span className="text-slate-900 font-bold font-num">{totalRecords} opérations</span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-200/60">
              {(dataScope === 'all' || dataScope === 'sales') && (
                <div className="flex flex-col">
                  <span className="text-[9px] text-slate-500 uppercase font-semibold">
                    Recettes (Ventes)
                  </span>
                  <span className="font-bold text-xs text-emerald-700 font-num">
                    +{totalSalesAmount.toLocaleString('fr-FR')} F
                  </span>
                </div>
              )}

              {(dataScope === 'all' || dataScope === 'expenses') && (
                <div className="flex flex-col">
                  <span className="text-[9px] text-slate-500 uppercase font-semibold">
                    Charges (Dépenses)
                  </span>
                  <span className="font-bold text-xs text-rose-700 font-num">
                    -{totalExpensesAmount.toLocaleString('fr-FR')} F
                  </span>
                </div>
              )}

              {dataScope === 'all' && (
                <div className="flex flex-col items-end">
                  <span className="text-[9px] text-slate-500 uppercase font-semibold">
                    Solde Net
                  </span>
                  <span
                    className={`font-bold text-xs font-num ${
                      soldeNet >= 0 ? 'text-slate-900' : 'text-rose-700'
                    }`}
                  >
                    {soldeNet >= 0 ? '+' : ''}
                    {soldeNet.toLocaleString('fr-FR')} F
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Compliance notice */}
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200/80 text-[11px] text-emerald-800">
            <span className="material-symbols-outlined text-[16px] text-emerald-600 shrink-0">
              verified
            </span>
            <span>
              Export certifié conforme avec horodatage pour l'administration fiscale et votre expert-comptable.
            </span>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-3 bg-slate-50 border-t border-slate-200/80 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 h-11 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200/80 transition-colors cursor-pointer"
          >
            Annuler
          </button>

          <button
            type="button"
            disabled={isExporting}
            onClick={handleDownload}
            className="flex-1 h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px] text-emerald-400">
              {format === 'PDF' ? 'picture_as_pdf' : 'download'}
            </span>
            <span>
              {isExporting
                ? 'Génération en cours...'
                : `Télécharger ${format} (${totalRecords} lignes)`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
