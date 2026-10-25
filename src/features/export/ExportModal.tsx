import { useMemo, useState } from 'react';
import { t } from '@/content';
import { addDays, toIsoDate } from '@/domain/dates';
import { exportToCSV, type ExportFilterType } from '@/lib/export';
import { useExpensesStore } from '@/store/useExpensesStore';
import { useSalesStore } from '@/store/useSalesStore';
import { useCurrentSession, usePermission } from '@/store/useSessionStore';
import { useUiStore } from '@/store/useUiStore';
import { Button, EmptyState, Icon, Modal, SegmentedControl } from '@/ui';
import { ExportOptions, type ExportFormat } from './ExportOptions';

type ExportPeriod = 'all' | '7d' | '30d';

const PERIOD_DAYS: Record<Exclude<ExportPeriod, 'all'>, number> = { '7d': 7, '30d': 30 };

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
  const [period, setPeriod] = useState<ExportPeriod>('all');
  const [isExporting, setIsExporting] = useState(false);

  const now = useMemo(() => new Date(), []);
  // La période est appliquée aux compteurs ET au fichier : ce que l'on voit est
  // ce qui est exporté (issue #9).
  const range = useMemo(() => {
    if (period === 'all') return {};
    return { from: addDays(now, -(PERIOD_DAYS[period] - 1)), to: now };
  }, [period, now]);

  const scopedSales = useMemo(() => {
    if (period === 'all') return sales;
    const fromKey = range.from ? toIsoDate(range.from) : '';
    const toKey = range.to ? toIsoDate(range.to) : '';
    return sales.filter((sale) => sale.date >= fromKey && sale.date <= toKey);
  }, [sales, period, range]);

  const scopedExpenses = useMemo(() => {
    if (period === 'all') return expenses;
    const fromKey = range.from ? toIsoDate(range.from) : '';
    const toKey = range.to ? toIsoDate(range.to) : '';
    return expenses.filter((expense) => expense.date >= fromKey && expense.date <= toKey);
  }, [expenses, period, range]);

  const totalSales = scopedSales.reduce((sum, sale) => sum + sale.amount, 0);
  const totalExpenses = scopedExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const totalRecords =
    (filterType === 'expenses' ? 0 : scopedSales.length) +
    (filterType === 'sales' ? 0 : scopedExpenses.length);
  const hasAnyData = scopedSales.length > 0 || scopedExpenses.length > 0;

  const periodOptions = [
    { value: 'all', label: t.exportModal.periodAll },
    { value: '7d', label: t.periods['7d'] },
    { value: '30d', label: t.periods['30d'] },
  ];

  const handleDownload = async () => {
    setIsExporting(true);
    try {
      if (format === 'CSV') {
        exportToCSV(filterType, sales, expenses, range);
        showToast(t.exportModal.csvDone, 'success');
      } else {
        // jsPDF est chargé uniquement au moment de l'export.
        const { exportToPDF } = await import('@/lib/export/pdf');
        exportToPDF(filterType, sales, expenses, business, range);
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
      <SegmentedControl
        label={t.exportModal.period}
        value={period}
        onChange={(value) => setPeriod(value === '7d' || value === '30d' ? value : 'all')}
        options={periodOptions}
      />

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
