import { t } from '@/content';
import { formatFCFA } from '@/domain/money';
import type { ExportFilterType } from '@/lib/export';
import { Icon, Select, cn } from '@/ui';

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

const SCOPE_OPTIONS = (['all', 'sales', 'expenses'] as const).map((value) => ({ value, label: t.exportModal.scopes[value] }));

function isExportFilterType(value: string): value is ExportFilterType {
  return value === 'all' || value === 'sales' || value === 'expenses';
}

const FORMATS: { id: ExportFormat; label: string; icon: string }[] = [
  { id: 'PDF', label: t.exportModal.pdf, icon: 'picture_as_pdf' },
  { id: 'CSV', label: t.exportModal.csv, icon: 'table_view' },
];

/** Sélection du format et du périmètre + aperçu de synthèse. */
export function ExportOptions(props: ExportOptionsProps) {
  const { format, filterType } = props;
  const net = props.totalSales - props.totalExpenses;
  const showSales = filterType !== 'expenses';
  const showExpenses = filterType !== 'sales';

  return (
    <>
      <div>
        <div className="text-[13px] font-medium text-slate-700 mb-2">{t.exportModal.format}</div>
        <div className="grid grid-cols-2 gap-2">
          {FORMATS.map((option) => {
            const active = format === option.id;
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={active}
                onClick={() => props.onFormatChange(option.id)}
                className={cn(
                  'h-14 rounded-2xl border flex items-center justify-center gap-2 text-sm font-semibold cursor-pointer transition-all',
                  active ? 'bg-ink-900 border-ink-900 text-white' : 'bg-white border-line text-slate-700 hover:border-line-strong'
                )}
              >
                <Icon name={option.icon} size={20} className={active ? 'text-zest-400' : 'text-slate-500'} />
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <Select
        label={t.exportModal.scope}
        name="export-scope"
        value={filterType}
        onChange={(event) => {
          if (isExportFilterType(event.target.value)) props.onFilterTypeChange(event.target.value);
        }}
        options={SCOPE_OPTIONS}
      />

      <div className="rounded-2xl border border-line p-4 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">{t.exportModal.entries}</span>
          <span className="font-num font-bold text-ink-900">{t.exportModal.operations(props.totalRecords)}</span>
        </div>
        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-line">
          {showSales && (
            <div>
              <div className="text-[11px] text-slate-500">{t.exportModal.income}</div>
              <div className="font-num font-bold text-sm text-brand-700">+{formatFCFA(props.totalSales)}</div>
            </div>
          )}
          {showExpenses && (
            <div>
              <div className="text-[11px] text-slate-500">{t.exportModal.charges}</div>
              <div className="font-num font-bold text-sm text-rose-600">−{formatFCFA(props.totalExpenses)}</div>
            </div>
          )}
          {filterType === 'all' && (
            <div className="text-right">
              <div className="text-[11px] text-slate-500">{t.exportModal.balance}</div>
              <div className={cn('font-num font-bold text-sm', net >= 0 ? 'text-ink-900' : 'text-rose-600')}>
                {net >= 0 ? '+' : ''}
                {formatFCFA(net)}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
