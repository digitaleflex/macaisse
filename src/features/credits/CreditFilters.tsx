import { t } from '@/content';
import { Chip, SearchField } from '@/ui';

/** Recherche + filtres de statut des créances (présentationnel). */
export type CreditFilterKey = 'all' | 'retard' | 'partiel' | 'attente';

export interface CreditFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  filter: CreditFilterKey;
  onFilterChange: (filter: CreditFilterKey) => void;
  totalCount: number;
  overdueCount: number;
  partialCount: number;
  pendingCount: number;
}

export function CreditFilters(props: CreditFiltersProps) {
  const chips: { key: CreditFilterKey; label: string; count: number; dot?: 'danger' | 'warning' | 'info' }[] = [
    { key: 'all', label: t.credits.filters.all, count: props.totalCount },
    { key: 'retard', label: t.credits.filters.overdue, count: props.overdueCount, dot: 'danger' },
    { key: 'partiel', label: t.credits.filters.partial, count: props.partialCount, dot: 'warning' },
    { key: 'attente', label: t.credits.filters.pending, count: props.pendingCount, dot: 'info' },
  ];
  return (
    <div className="flex flex-col lg:flex-row lg:items-center gap-3">
      <SearchField
        value={props.search}
        onChange={props.onSearchChange}
        placeholder={t.credits.searchPlaceholder}
        className="lg:w-96"
      />
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
        {chips.map((chip) => (
          <Chip
            key={chip.key}
            active={props.filter === chip.key}
            onClick={() => props.onFilterChange(chip.key)}
            count={chip.count}
            dot={chip.dot}
          >
            {chip.label}
          </Chip>
        ))}
      </div>
    </div>
  );
}
