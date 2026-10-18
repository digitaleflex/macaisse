import type { Category, StockStatus } from '@/types';
import type { SortKey } from '@/domain/stock';

/**
 * StockFilters — contrôles de l'inventaire : recherche, filtre catégorie,
 * filtre statut et tri.
 *
 * Composant contrôlé : l'état des filtres reste possédé par `StockView` (qui
 * doit le passer à `filterProducts` / `sortProducts` du domaine). Aucune règle
 * métier ici, uniquement de la présentation. Le bouton « Nouveau Produit » est
 * co-localisé dans la barre d'actions pour préserver la mise en page existante.
 */

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
  onReset: () => void;
  onCreateProduct: () => void;
  totalCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  inStockCount: number;
}

const CATEGORIES: Category[] = ['Frais', 'Épicerie', 'Boissons', 'Hygiène'];

const CHIP_BASE =
  'filter-chip flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer';
const CHIP_ACTIVE = 'bg-slate-900 text-white shadow-xs border border-slate-900';
const CHIP_IDLE = 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50';

function chipClass(active: boolean): string {
  return `${CHIP_BASE} ${active ? CHIP_ACTIVE : CHIP_IDLE}`;
}

export function StockFilters({
  searchTerm,
  onSearchTermChange,
  categoryFilter,
  onCategoryFilterChange,
  statusFilter,
  onStatusFilterChange,
  sortBy,
  onSortChange,
  onReset,
  onCreateProduct,
  totalCount,
  lowStockCount,
  outOfStockCount,
  inStockCount,
}: StockFiltersProps) {
  const handleSortCycle = () => {
    const next: StockSortKey = sortBy === 'stock' ? 'name' : sortBy === 'name' ? 'price' : 'stock';
    onSortChange(next);
  };

  return (
    <>
      {/* Barre d'actions : création, réinitialisation des filtres, tri */}
      <section className="flex items-center gap-2">
        <button
          id="btn-add-product"
          type="button"
          onClick={onCreateProduct}
          className="flex-1 h-12 bg-slate-900 hover:bg-slate-800 active:scale-[0.98] transition-transform rounded-xl flex items-center justify-center gap-2 px-3 shadow-xs font-bold text-xs text-white cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px] text-emerald-400">add_circle</span>
          <span>Nouveau Produit</span>
        </button>

        <button
          aria-label="Filtres avancés"
          type="button"
          onClick={onReset}
          className="h-12 w-12 bg-white hover:bg-slate-50 rounded-xl flex items-center justify-center text-slate-700 shadow-2xs border border-slate-200/80 active:scale-95 transition-transform shrink-0 cursor-pointer"
          title="Réinitialiser les filtres"
        >
          <span className="material-symbols-outlined text-[20px]">tune</span>
        </button>

        {/* Déclencheur de tri (cycle Quantité → Nom → Prix) */}
        <button
          id="sort-trigger"
          type="button"
          onClick={handleSortCycle}
          className="h-12 px-3 bg-white hover:bg-slate-50 rounded-xl flex items-center gap-1 text-slate-700 shadow-2xs border border-slate-200/80 active:scale-95 transition-transform shrink-0 text-xs font-semibold cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px] text-slate-400">sort</span>
          <span className="capitalize">{sortBy === 'stock' ? 'Quantité' : sortBy}</span>
          <span className="material-symbols-outlined text-[16px] text-slate-400">expand_more</span>
        </button>
      </section>

      {/* Recherche + filtres catégorie + filtres statut */}
      <section className="flex flex-col gap-2">
        <div className="relative w-full flex items-center">
          <span className="material-symbols-outlined absolute left-3.5 text-slate-400 text-[20px] pointer-events-none">
            search
          </span>
          <input
            id="stock-search-input"
            type="text"
            value={searchTerm}
            onChange={(event) => onSearchTermChange(event.target.value)}
            placeholder="Rechercher par nom, SKU ou catégorie..."
            className="w-full h-11 pl-10 pr-9 bg-white rounded-xl text-xs text-slate-900 placeholder:text-slate-400 outline-none shadow-2xs border border-slate-200/90 focus:border-slate-800 transition-colors"
          />
          {searchTerm && (
            <button
              id="search-clear"
              type="button"
              onClick={() => onSearchTermChange('')}
              className="absolute right-3 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">cancel</span>
            </button>
          )}
        </div>

        {/* Filtre catégorie */}
        <div
          className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5"
          id="category-chips-group"
        >
          <button
            type="button"
            onClick={() => onCategoryFilterChange('all')}
            className={chipClass(categoryFilter === 'all')}
          >
            <span className="material-symbols-outlined text-[16px]">category</span>
            <span>Toutes catégories</span>
          </button>
          {CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => onCategoryFilterChange(category)}
              className={chipClass(categoryFilter === category)}
            >
              <span>{category}</span>
            </button>
          ))}
        </div>

        {/* Filtre statut */}
        <div
          className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5"
          id="status-chips-group"
        >
          <button
            type="button"
            onClick={() => onStatusFilterChange('all')}
            className={chipClass(statusFilter === 'all')}
          >
            <span>Tous</span>
            <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-num">
              {totalCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onStatusFilterChange('faible')}
            className={chipClass(statusFilter === 'faible')}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>Faible</span>
            <span className="px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-num font-bold">
              {lowStockCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onStatusFilterChange('rupture')}
            className={chipClass(statusFilter === 'rupture')}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
            <span>Rupture</span>
            <span className="px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-num font-bold">
              {outOfStockCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onStatusFilterChange('disponible')}
            className={chipClass(statusFilter === 'disponible')}
          >
            <span>Disponibles</span>
            <span className="px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-num font-bold">
              {inStockCount}
            </span>
          </button>
        </div>
      </section>
    </>
  );
}
