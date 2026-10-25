import { useState } from 'react';
import { t } from '@/content';
import { exportToCSV, type ExportFilterType } from '@/lib/export';
import { useExpensesStore } from '@/store/useExpensesStore';
import { useSalesStore } from '@/store/useSalesStore';
import { useCurrentSession, usePermission } from '@/store/useSessionStore';
import { useUiStore } from '@/store/useUiStore';
import { Button, EmptyState, Icon, Modal } from '@/ui';
import { ExportOptions, type ExportFormat } from './ExportOptions';

/** Modale globale d'export comptable (pilotée par `useUiStore.modal === 'export'`). */
export function ExportModal() {
  const isOpen = useUiStore((state) => state.modal === 'export');
  const allowed = usePermission('export.run');
  const open = isOpen && allowed;
  const closeModal = useUiStore((state) => state.closeModal);
  const showToast = useUiStore((state) => state.showToast);
  const sales = useSalesStore((state) => state.sales);
  const expenses = useExpensesStore((state) => state.expenses);
  const { business } = useCurrentSession();

  const [format, setFormat] = useState<ExportFormat>('PDF');
  const [filterType, setFilterType] = useState<ExportFilterType>('all');
  const [isExporting, setIsExporting] = useState(false);

  const totalSales = sales.reduce((sum, sale) => sum + sale.amount, 0);
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const totalRecords = (filterType === 'expenses' ? 0 : sales.length) + (filterType === 'sales' ? 0 : expenses.length);
  const hasAnyData = sales.length > 0 || expenses.length > 0;

  const handleDownload = async () => {
    setIsExporting(true);
    try {
      if (format === 'CSV') {
        exportToCSV(filterType, sales, expenses);
        showToast(t.exportModal.csvDone, 'success');
      } else {
        // jsPDF est chargé uniquement au moment de l'export.
        const { exportToPDF } = await import('@/lib/export/pdf');
        exportToPDF(filterType, sales, expenses, business);
        showToast(t.exportModal.pdfDone, 'success');
      }
      window.setTimeout(() => {
        setIsExporting(false);
        closeModal();
      }, 400);
    } catch (error) {
      console.error(error);
      showToast(t.exportModal.failed, 'error');
      setIsExporting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={closeModal}
      title={t.exportModal.title}
      subtitle={t.exportModal.subtitle}
      icon="file_download"
      headerVariant="dark"
      footer={
        <>
          <Button variant="secondary" onClick={closeModal}>
            {t.common.cancel}
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            icon={format === 'PDF' ? 'picture_as_pdf' : 'download'}
            loading={isExporting}
            disabled={!hasAnyData || totalRecords === 0}
            onClick={handleDownload}
          >
            {isExporting ? t.exportModal.generating : t.exportModal.download(format, totalRecords)}
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
        <EmptyState icon="file_download" title={t.exportModal.emptyTitle} description={t.exportModal.emptyText} />
      )}
      <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-brand-50 text-xs text-brand-800">
        <Icon name="verified" size={18} className="text-brand-600" />
        {t.exportModal.note}
      </div>
    </Modal>
  );
}
