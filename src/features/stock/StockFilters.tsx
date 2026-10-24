import type { Category, StockStatus } from '@/types';
import type { SortKey } from '@/domain/stock';
import { t } from '@/content';
import { PRODUCT_CATEGORIES } from '@/config/reference';
import { Chip, SearchField, SegmentedControl, Select } from '@/ui';

/** Contrôles de l'inventaire (composant contrôlé : l'état vit dans `StockView`). */
export type StockStatusFilter = 'all' | StockStatus;
export type StockCategoryFilter = 'all' | Category;
export type StockSortKey = Extract<SortKey, 'name' | 'stock' | 'price'>;

export interface StockFiltersProps {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  categoryFilter: StockCategoryFilter;
  onCategoryFilterChange: (value: StockCategoryFilter) => void;
  statusFilter: StockStatusFilter;
  onStatusFilterChange: (value: StockStatusFilter) => void;
  sortBy: StockSortKey;
  onSortChange: (value: StockSortKey) => void;
  totalCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  inStockCount: number;
}

const CATEGORY_OPTIONS = [
  { value: 'all', label: t.stock.allCategories },
  ...PRODUCT_CATEGORIES.map((category) => ({ value: category, label: category })),
];

const SORT_OPTIONS: { value: StockSortKey; label: string }[] = [
  { value: 'stock', label: t.stock.sort.stock },
  { value: 'name', label: t.stock.sort.name },
  { value: 'price', label: t.stock.sort.price },
];

function isCategoryFilter(value: string): value is StockCategoryFilter {
  return value === 'all' || (PRODUCT_CATEGORIES as readonly string[]).includes(value);
}

export function StockFilters(props: StockFiltersProps) {
  const statusChips: {
    value: StockStatusFilter;
    label: string;
    count: number;
    dot?: 'success' | 'warning' | 'danger';
  }[] = [
    { value: 'all', label: t.stock.statusAll, count: props.totalCount },
    {
      value: 'disponible',
      label: t.stock.statusInStock,
      count: props.inStockCount,
      dot: 'success',
    },
    { value: 'faible', label: t.stock.statusLow, count: props.lowStockCount, dot: 'warning' },
    { value: 'rupture', label: t.stock.statusOut, count: props.outOfStockCount, dot: 'danger' },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col md:flex-row gap-2">
        <SearchField
          id="stock-search-input"
          value={props.searchTerm}
          onChange={props.onSearchTermChange}
          placeholder={t.stock.searchPlaceholder}
          className="flex-1"
        />
        <div className="flex gap-2">
          <Select
            name="stock-category"
            value={props.categoryFilter}
            onChange={(event) => {
              if (isCategoryFilter(event.target.value))
                props.onCategoryFilterChange(event.target.value);
            }}
            options={CATEGORY_OPTIONS}
            className="flex-1 md:w-48"
          />
        </div>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
          {statusChips.map((chip) => (
            <Chip
              key={chip.value}
              active={props.statusFilter === chip.value}
              onClick={() => props.onStatusFilterChange(chip.value)}
              count={chip.count}
              dot={chip.dot}
            >
              {chip.label}
            </Chip>
          ))}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-slate-500">{t.stock.sort.label}</span>
          <SegmentedControl
            label={t.stock.sort.label}
            size="sm"
            value={props.sortBy}
            onChange={props.onSortChange}
            options={SORT_OPTIONS}
          />
        </div>
      </div>
    </div>
  );
}
