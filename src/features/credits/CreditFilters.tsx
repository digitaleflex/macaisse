/**
 * CreditFilters — barre de recherche, filtres de statut et en-tête de tri de la
 * liste des créances.
 *
 * Purement présentationnel : aucune donnée métier, uniquement des compteurs
 * fournis par le parent (calculés par `@/domain/credits`).
 */

export type CreditFilterKey = 'all' | 'retard' | 'partiel' | 'recents';

export interface CreditFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  filter: CreditFilterKey;
  onFilterChange: (filter: CreditFilterKey) => void;
  /** Nombre de créances actives (« Tous »). */
  totalCount: number;
  /** Nombre de créances échues (« En retard »). */
  overdueCount: number;
  /** Nombre de créances partiellement réglées (« Partiel »). */
  partialCount: number;
}

const pillClass = (active: boolean): string =>
  `filter-pill px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all ${
    active
      ? 'bg-slate-900 text-white shadow-2xs'
      : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
  }`;

export function CreditFilters({
  search,
  onSearchChange,
  filter,
  onFilterChange,
  totalCount,
  overdueCount,
  partialCount,
}: CreditFiltersProps) {
  return (
    <>
      <div className="px-4 mt-3 flex flex-col gap-2">
        <div className="relative w-full">
          <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
            <span className="material-symbols-outlined text-[18px]">search</span>
          </span>
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Rechercher un client, contact..."
            className="w-full h-11 pl-9 pr-4 rounded-xl bg-white text-xs text-slate-900 placeholder:text-slate-400 outline-none shadow-2xs border border-slate-200/80 focus:border-slate-400 transition-colors"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            type="button"
            onClick={() => onFilterChange('all')}
            className={pillClass(filter === 'all')}
          >
            <span>Tous</span>
            <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px]">
              {totalCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onFilterChange('retard')}
            className={pillClass(filter === 'retard')}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            <span>En retard</span>
            <span className="px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">
              {overdueCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onFilterChange('partiel')}
            className={pillClass(filter === 'partiel')}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>Partiel</span>
            <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
              {partialCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onFilterChange('recents')}
            className={pillClass(filter === 'recents')}
          >
            <span>Récents</span>
          </button>
        </div>
      </div>

      {/* Sort header */}
      <div className="px-4 mt-2 pt-1 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
          Créances en cours
        </span>
        <span className="text-[11px] text-slate-700 font-bold">Trier par urgence</span>
      </div>
    </>
  );
}
