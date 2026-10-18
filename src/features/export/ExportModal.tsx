import { useState } from 'react';
import { Button, EmptyState, Modal } from '@/ui';
import { useUiStore } from '@/store/useUiStore';
import { useSalesStore } from '@/store/useSalesStore';
import { useExpensesStore } from '@/store/useExpensesStore';
import { exportToCSV, exportToPDF, type ExportFilterType } from '@/lib/export';
import { ExportOptions, type ExportFormat } from './ExportOptions';

/**
 * Modale globale d'export comptable. Aucune prop métier : l'ouverture est pilotée
 * par `useUiStore` (`modal === 'export'`) ; ventes et dépenses viennent des stores.
 */
export function ExportModal() {
  const open = useUiStore((state) => state.modal === 'export');
  const closeModal = useUiStore((state) => state.closeModal);
  const showToast = useUiStore((state) => state.showToast);

  const sales = useSalesStore((state) => state.sales);
  const expenses = useExpensesStore((state) => state.expenses);

  const [format, setFormat] = useState<ExportFormat>('PDF');
  const [filterType, setFilterType] = useState<ExportFilterType>('all');
  const [isExporting, setIsExporting] = useState(false);

  const totalSales = sales.reduce((sum, sale) => sum + sale.amount, 0);
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  const salesCount = filterType === 'expenses' ? 0 : sales.length;
  const expensesCount = filterType === 'sales' ? 0 : expenses.length;
  const totalRecords = salesCount + expensesCount;
  const hasAnyData = sales.length > 0 || expenses.length > 0;

  const handleDownload = () => {
    setIsExporting(true);
    try {
      if (format === 'CSV') {
        exportToCSV(filterType, sales, expenses);
        showToast('Fichier CSV comptable exporté avec succès !', 'success');
      } else {
        exportToPDF(filterType, sales, expenses);
        showToast('Rapport PDF comptable officiel téléchargé !', 'success');
      }
      window.setTimeout(() => {
        setIsExporting(false);
        closeModal();
      }, 500);
    } catch (error) {
      console.error("Erreur lors de l'exportation:", error);
      showToast("Erreur lors de la génération de l'export.", 'error');
      setIsExporting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={closeModal}
      title="Export Comptable & Traçabilité"
      subtitle="Générez vos écritures pour votre comptabilité externe"
      icon="file_download"
      headerVariant="dark"
      footer={
        <>
          <Button variant="ghost" size="md" onClick={closeModal}>
            Annuler
          </Button>
          <Button
            variant="secondary"
            size="md"
            className="flex-1"
            loading={isExporting}
            disabled={!hasAnyData || totalRecords === 0}
            onClick={handleDownload}
          >
            <span className="material-symbols-outlined text-[18px] text-emerald-400">
              {format === 'PDF' ? 'picture_as_pdf' : 'download'}
            </span>
            <span>
              {isExporting
                ? 'Génération en cours...'
                : `Télécharger ${format} (${totalRecords} lignes)`}
            </span>
          </Button>
        </>
      }
    >
      {hasAnyData ? (
        <ExportOptions
          format={format}
          onFormatChange={setFormat}
          filterType={filterType}
          onFilterTypeChange={setFilterType}
          totalRecords={totalRecords}
          totalSales={totalSales}
          totalExpenses={totalExpenses}
        />
      ) : (
        <EmptyState
          icon="file_download"
          title="Aucune donnée à exporter"
          description="Enregistrez des ventes ou des dépenses pour générer un export comptable."
        />
      )}

      <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200/80 text-[11px] text-emerald-800">
        <span className="material-symbols-outlined text-[16px] text-emerald-600 shrink-0">
          verified
        </span>
        <span>
          Export certifié conforme avec horodatage pour l&apos;administration fiscale et votre
          expert-comptable.
        </span>
      </div>
    </Modal>
  );
}
