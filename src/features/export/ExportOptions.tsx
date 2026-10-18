import { Button, Select } from '@/ui';
import type { SelectOption } from '@/ui';
import { formatFCFA } from '@/domain/money';
import type { ExportFilterType } from '@/lib/export';

export type ExportFormat = 'CSV' | 'PDF';

export interface ExportOptionsProps {
  format: ExportFormat;
  onFormatChange: (format: ExportFormat) => void;
  filterType: ExportFilterType;
  onFilterTypeChange: (filterType: ExportFilterType) => void;
  totalRecords: number;
  totalSales: number;
  totalExpenses: number;
}

const FILTER_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'Journal complet (Ventes & Dépenses)' },
  { value: 'sales', label: 'Ventes & Recettes uniquement' },
  { value: 'expenses', label: 'Dépenses & Charges uniquement' },
];

function isExportFilterType(value: string): value is ExportFilterType {
  return value === 'all' || value === 'sales' || value === 'expenses';
}

/** Sélection du format et du périmètre + aperçu de synthèse de l'export. */
export function ExportOptions({
  format,
  onFormatChange,
  filterType,
  onFilterTypeChange,
  totalRecords,
  totalSales,
  totalExpenses,
}: ExportOptionsProps) {
  const soldeNet = totalSales - totalExpenses;
  const showSales = filterType === 'all' || filterType === 'sales';
  const showExpenses = filterType === 'all' || filterType === 'expenses';

  return (
    <>
      <div>
        <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block mb-1.5">
          1. Format d&apos;exportation
        </span>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={format === 'PDF' ? 'secondary' : 'ghost'}
            size="sm"
            fullWidth
            onClick={() => onFormatChange('PDF')}
          >
            <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
            <span>Rapport PDF</span>
          </Button>
          <Button
            variant={format === 'CSV' ? 'secondary' : 'ghost'}
            size="sm"
            fullWidth
            onClick={() => onFormatChange('CSV')}
          >
            <span className="material-symbols-outlined text-[16px]">table_view</span>
            <span>Tableur CSV</span>
          </Button>
        </div>
      </div>

      <Select
        label="2. Périmètre des données"
        name="export-scope"
        value={filterType}
        onChange={(event) => {
          if (isExportFilterType(event.target.value)) onFilterTypeChange(event.target.value);
        }}
        options={FILTER_OPTIONS}
      />

      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-2">
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
          <span>Écritures à inclure :</span>
          <span className="text-slate-900 font-bold font-num">{totalRecords} opérations</span>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-200/60">
          {showSales && (
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-500 uppercase font-semibold">
                Recettes (Ventes)
              </span>
              <span className="font-bold text-xs text-emerald-700 font-num">
                +{formatFCFA(totalSales, { withSuffix: false })} F
              </span>
            </div>
          )}

          {showExpenses && (
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-500 uppercase font-semibold">
                Charges (Dépenses)
              </span>
              <span className="font-bold text-xs text-rose-700 font-num">
                -{formatFCFA(totalExpenses, { withSuffix: false })} F
              </span>
            </div>
          )}

          {filterType === 'all' && (
            <div className="flex flex-col items-end">
              <span className="text-[9px] text-slate-500 uppercase font-semibold">Solde Net</span>
              <span
                className={`font-bold text-xs font-num ${
                  soldeNet >= 0 ? 'text-slate-900' : 'text-rose-700'
                }`}
              >
                {soldeNet >= 0 ? '+' : ''}
                {formatFCFA(soldeNet, { withSuffix: false })} F
              </span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
