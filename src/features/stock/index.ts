/**
 * Barrel de la feature « stock ».
 * Surface publique consommée par le shell (`app/App.tsx`) et les autres lanes.
 */

export { StockView } from './StockView';
export { StockFilters } from './StockFilters';
export { StockMetrics } from './StockMetrics';
export { ProductFormModal } from './ProductFormModal';
export { RestockModal } from './RestockModal';

export type {
  StockFiltersProps,
  StockStatusFilter,
  StockCategoryFilter,
  StockSortKey,
} from './StockFilters';
export type { StockMetricsProps } from './StockMetrics';
export type { ProductFormModalProps } from './ProductFormModal';
export type { RestockModalProps } from './RestockModal';
