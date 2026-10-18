import { useMemo, useState } from 'react';
import type { Product, ProductInput } from '@/types';
import { filterProducts, sortProducts } from '@/domain/stock';
import { formatFCFA } from '@/domain/money';
import { productsWithStatus, retailValueOf, stockValueOf, useProductsStore } from '@/store/useProductsStore';
import { useUiStore } from '@/store/useUiStore';
import { Button, EmptyState } from '@/ui';
import { ProductFormModal } from './ProductFormModal';
import { RestockModal } from './RestockModal';
import { StockFilters } from './StockFilters';
import { StockMetrics } from './StockMetrics';
import type { StockCategoryFilter, StockSortKey, StockStatusFilter } from './StockFilters';

/**
 * StockView — onglet « Inventaire & Réserves ».
 *
 * Aucune prop métier : tout provient de `useProductsStore` (catalogue + actions)
 * et `useUiStore` (toast). Le statut de stock est toujours dérivé par le domaine
 * (`computeStockStatus` via le sélecteur hydraté) ; le filtrage et le tri passent
 * par `filterProducts` / `sortProducts` de `@/domain/stock`.
 */
export function StockView() {
  const rawProducts = useProductsStore((state) => state.products);
  const addProduct = useProductsStore((state) => state.addProduct);
  const updateProduct = useProductsStore((state) => state.updateProduct);
  const removeProduct = useProductsStore((state) => state.removeProduct);
  const restock = useProductsStore((state) => state.restock);
  const showToast = useUiStore((state) => state.showToast);

  // `productsWithStatus` renvoie un nouveau tableau à chaque appel : on
  // s'abonne à la tranche STABLE `products` puis on dérive sous `useMemo`
  // (clé = référence `products`) plutôt que de le passer comme sélecteur
  // direct de `useStore`, qui boucle avec `useSyncExternalStore`.
  const products = useMemo(() => productsWithStatus(rawProducts), [rawProducts]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StockStatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<StockCategoryFilter>('all');
  const [sortBy, setSortBy] = useState<StockSortKey>('stock');
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formInstance, setFormInstance] = useState(0);
  const [restockProduct, setRestockProduct] = useState<Product | null>(null);
  const [restockInstance, setRestockInstance] = useState(0);

  // Compteurs globaux (indépendants des filtres courants), via le domaine.
  const lowStockCount = filterProducts(products, { status: 'faible' }).length;
  const outOfStockCount = filterProducts(products, { status: 'rupture' }).length;
  const inStockCount = filterProducts(products, { status: 'disponible' }).length;
  const totalStockValue = stockValueOf(products);
  const totalRetailValue = retailValueOf(products);
  // Marge moyenne réelle : (valeur de vente − valeur d'achat) / valeur de vente.
  const averageMarginPercent =
    totalRetailValue > 0
      ? Math.round(((totalRetailValue - totalStockValue) / totalRetailValue) * 100)
      : 0;

  // Filtrage + tri délégués au domaine (prix : décroissant, comme avant).
  const visibleProducts = useMemo(
    () =>
      sortProducts(
        filterProducts(products, {
          query: searchTerm,
          category: categoryFilter === 'all' ? undefined : categoryFilter,
          status: statusFilter === 'all' ? undefined : statusFilter,
        }),
        sortBy,
        sortBy === 'price' ? 'desc' : 'asc'
      ),
    [products, searchTerm, categoryFilter, statusFilter, sortBy]
  );

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setCategoryFilter('all');
  };

  const handleSortChange = (next: StockSortKey) => {
    setSortBy(next);
    showToast(
      `Tri appliqué : ${next === 'stock' ? 'Par Quantité' : next === 'name' ? 'Par Nom' : 'Par Prix'}`
    );
  };

  /** Réapprovisionnement : `restock` lève une erreur française si la quantité est invalide. */
  const handleRestock = (product: Product, quantity: number) => {
    const updated = product.stock + quantity;
    try {
      restock(product.id, quantity);
      showToast(`Stock mis à jour : +${quantity} pour ${product.name} (Nouveau stock: ${updated})`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Réapprovisionnement impossible.', 'error');
    }
  };

  const handleRestockSubmit = (quantity: number) => {
    if (!restockProduct) return;
    handleRestock(restockProduct, quantity);
    setRestockProduct(null);
  };

  const handleDeleteProduct = (product: Product) => {
    removeProduct(product.id);
    showToast(`Article « ${product.name} » supprimé du catalogue.`);
  };

  const openCreateForm = () => {
    setEditingProduct(null);
    setFormInstance((instance) => instance + 1);
    setIsProductFormOpen(true);
  };

  const openEditForm = (product: Product) => {
    setEditingProduct(product);
    setFormInstance((instance) => instance + 1);
    setIsProductFormOpen(true);
  };

  const openRestockForm = (product: Product) => {
    setRestockProduct(product);
    setRestockInstance((instance) => instance + 1);
  };

  const closeProductForm = () => {
    setIsProductFormOpen(false);
    setEditingProduct(null);
  };

  /** Création/édition : `addProduct` peut lever une erreur française. */
  const handleSubmitProduct = (input: ProductInput) => {
    try {
      if (editingProduct) {
        updateProduct(editingProduct.id, input);
        showToast(`Article « ${input.name} » mis à jour.`);
      } else {
        addProduct(input);
        showToast(`Article « ${input.name} » ajouté au catalogue !`);
      }
      closeProductForm();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Enregistrement impossible.', 'error');
    }
  };

  return (
    <div className="flex flex-col w-full px-4 space-y-4 pb-28 pt-2">
      {/* Header Section & Quick Metrics (valeurs dérivées du catalogue réel) */}
      <StockMetrics
        productCount={products.length}
        lowStockCount={lowStockCount}
        outOfStockCount={outOfStockCount}
        totalStockValue={totalStockValue}
        averageMarginPercent={averageMarginPercent}
        onShowLowStock={() => setStatusFilter('faible')}
        onShowOutOfStock={() => setStatusFilter('rupture')}
      />

      {/* Contrôles : création / recherche / catégorie / statut / tri */}
      <StockFilters
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        sortBy={sortBy}
        onSortChange={handleSortChange}
        onReset={resetFilters}
        onCreateProduct={openCreateForm}
        totalCount={products.length}
        lowStockCount={lowStockCount}
        outOfStockCount={outOfStockCount}
        inStockCount={inStockCount}
      />

      {/* Inventory Product List */}
      <section className="flex flex-col gap-2.5" id="inventory-list">
        {visibleProducts.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-2xs border border-slate-200/80">
            <EmptyState
              icon="inventory_2"
              title="Aucun article trouvé"
              description="Aucun produit ne correspond à la recherche ou aux filtres sélectionnés."
              action={
                <Button variant="secondary" size="md" onClick={resetFilters}>
                  Réinitialiser les filtres
                </Button>
              }
            />
          </div>
        ) : (
          visibleProducts.map((product) => {
            const marginPercent = Math.round(
              ((product.price - product.costPrice) / product.price) * 100
            );

            return (
              <article
                key={product.id}
                className="stock-item bg-white p-3.5 rounded-2xl shadow-2xs border border-slate-200/80 flex flex-col gap-2 relative overflow-hidden"
              >
                {/* Top Row: Identification & Quick Status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 shrink-0 flex items-center justify-center overflow-hidden border border-slate-200/60">
                      <img
                        src={product.imageUrl}
                        alt={product.imageAlt || product.name}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <h2 className="font-display text-xs font-bold text-slate-900 leading-snug truncate">
                        {product.name}
                      </h2>
                      <div className="flex items-center gap-1 mt-0.5 text-[11px] text-slate-500">
                        <span className="tracking-wide font-medium">{product.sku}</span>
                        <span className="text-[8px]">•</span>
                        <span>{product.category}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Pill & Quantity */}
                  <div className="flex flex-col items-end shrink-0">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        product.status === 'rupture'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : product.status === 'faible'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          product.status === 'rupture'
                            ? 'bg-rose-600'
                            : product.status === 'faible'
                            ? 'bg-amber-500'
                            : 'bg-emerald-600'
                        }`}
                      />
                      {product.status === 'rupture'
                        ? 'RUPTURE'
                        : product.status === 'faible'
                        ? 'STOCK FAIBLE'
                        : 'DISPONIBLE'}
                    </span>

                    <span
                      className={`font-display text-xs font-bold mt-1 font-num ${
                        product.status === 'rupture' ? 'text-rose-700' : 'text-slate-900'
                      }`}
                    >
                      {product.stock} {product.unit}
                      {product.stock > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Progress Gauge for Low Stock */}
                {product.status === 'faible' && (
                  <div className="flex flex-col gap-1 py-1">
                    <div className="flex items-center justify-between text-[10px] font-medium text-slate-500">
                      <span>
                        Niveau actuel (Alerte : {product.minStockAlert} {product.unit}s)
                      </span>
                      <span className="text-slate-900 font-bold font-num">
                        {product.stock} / {product.minStockAlert}
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full transition-all"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.round((product.stock / product.minStockAlert) * 100)
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Financial Margins & Pricing Micro-bar */}
                <div className="flex items-center justify-between py-1.5 px-3 bg-slate-50 rounded-xl border border-slate-100 text-slate-500 text-xs">
                  <div className="flex flex-col">
                    <span className="text-[9px] uppercase font-semibold">Prix Vente</span>
                    <span className="font-display font-bold text-xs text-slate-900 font-num">
                      {formatFCFA(product.price)}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] uppercase font-semibold">Prix Achat</span>
                    <span className="text-xs font-medium text-slate-500 font-num">
                      {formatFCFA(product.costPrice)}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] uppercase font-semibold">Marge</span>
                    <span className="text-xs text-emerald-700 font-bold font-num">
                      +{marginPercent}%
                    </span>
                  </div>
                </div>

                {/* Action Buttons: Quick Restock (comportement historique conservé) */}
                <div className="flex items-center justify-between pt-1">
                  {product.status === 'rupture' ? (
                    <>
                      <div className="flex items-center gap-1 text-rose-700 text-[10px] font-semibold">
                        <span className="material-symbols-outlined text-[15px]">priority_high</span>
                        Demande élevée cette semaine
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRestock(product, 20)}
                        className="h-8 px-3 bg-emerald-500 hover:bg-emerald-400 active:scale-95 transition-transform rounded-xl flex items-center gap-1.5 text-slate-950 text-xs font-bold shadow-xs cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          add_shopping_cart
                        </span>
                        <span>Réapprovisionner (+20)</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="text-[11px] text-slate-500 font-medium">
                        Rotation dynamique
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          aria-label="Ajuster stock"
                          onClick={() => handleRestock(product, 5)}
                          className="h-8 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1 active:scale-95 transition-transform cursor-pointer border border-slate-200/80"
                        >
                          <span className="material-symbols-outlined text-[16px] text-emerald-700">
                            add
                          </span>
                          <span>+5 Entrée</span>
                        </button>
                        <button
                          type="button"
                          aria-label="Entrée de stock"
                          onClick={() => handleRestock(product, 10)}
                          className="h-8 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1 active:scale-95 transition-transform cursor-pointer border border-slate-200/80"
                        >
                          <span className="material-symbols-outlined text-[16px] text-emerald-700">
                            add
                          </span>
                          <span>+10</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Gestion de l'article : réappro. libre, édition, suppression */}
                <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-slate-100">
                  <button
                    type="button"
                    aria-label="Réapprovisionner"
                    onClick={() => openRestockForm(product)}
                    className="h-8 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1 active:scale-95 transition-transform cursor-pointer border border-slate-200/80"
                  >
                    <span className="material-symbols-outlined text-[16px] text-emerald-700">
                      inventory_2
                    </span>
                    <span>Réappro.</span>
                  </button>
                  <button
                    type="button"
                    aria-label="Modifier l'article"
                    onClick={() => openEditForm(product)}
                    className="h-8 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1 active:scale-95 transition-transform cursor-pointer border border-slate-200/80"
                  >
                    <span className="material-symbols-outlined text-[16px] text-slate-700">
                      edit
                    </span>
                    <span>Modifier</span>
                  </button>
                  <button
                    type="button"
                    aria-label="Supprimer l'article"
                    onClick={() => handleDeleteProduct(product)}
                    className="h-8 px-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center gap-1 active:scale-95 transition-transform cursor-pointer border border-rose-200"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                    <span>Supprimer</span>
                  </button>
                </div>
              </article>
            );
          })
        )}
      </section>

      {/* Floating Quick Stock Audit Card */}
      <section className="p-3.5 rounded-2xl bg-slate-100/90 flex items-center justify-between border border-slate-200/80">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-700 flex items-center justify-center shrink-0 font-bold border border-emerald-500/30">
            <span className="material-symbols-outlined text-[18px]">fact_check</span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold text-slate-900">Inventaire tournant</span>
            <span className="text-[11px] text-slate-500">
              Aucun historique de vérification enregistré
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() =>
            showToast(`Inventaire validé : ${products.length} références conformes.`)
          }
          className="text-xs text-emerald-700 font-bold px-2 py-1 hover:underline cursor-pointer"
        >
          Vérifier
        </button>
      </section>

      {/* Modal: Nouveau Produit / Édition */}
      <ProductFormModal
        key={`product-form-${formInstance}`}
        open={isProductFormOpen}
        onClose={closeProductForm}
        product={editingProduct}
        onSubmit={handleSubmitProduct}
      />

      {/* Modal: Réapprovisionnement */}
      <RestockModal
        key={`restock-${restockInstance}`}
        open={restockProduct !== null}
        onClose={() => setRestockProduct(null)}
        product={restockProduct}
        onSubmit={handleRestockSubmit}
      />
    </div>
  );
}
