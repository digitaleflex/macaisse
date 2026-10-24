import { useMemo, useState } from 'react';
import type { Product, ProductInput } from '@/types';
import { t } from '@/content';
import { STOCK_STATUS_TONE } from '@/config/reference';
import { filterProducts, sortProducts } from '@/domain/stock';
import { formatFCFA } from '@/domain/money';
import { productsWithStatus, retailValueOf, stockValueOf, useProductsStore } from '@/store/useProductsStore';
import { useUiStore } from '@/store/useUiStore';
import { Badge, Button, Card, EmptyState, Icon, IconButton, PageHeader, ProgressBar, cn } from '@/ui';
import { ProductThumb } from '@/features/shared/ProductThumb';
import { ProductFormModal } from './ProductFormModal';
import { RestockModal } from './RestockModal';
import { StockFilters, type StockCategoryFilter, type StockSortKey, type StockStatusFilter } from './StockFilters';
import { StockMetrics } from './StockMetrics';

/**
 * Inventaire : indicateurs, filtres, liste (tableau ≥ md, cartes en dessous)
 * et modales de création / édition / réapprovisionnement. Filtrage et tri
 * délégués à `@/domain/stock`.
 */

const SORT_LABEL: Record<StockSortKey, string> = {
  stock: t.stock.sort.stock,
  name: t.stock.sort.name,
  price: t.stock.sort.price,
};

function marginPercent(product: Product): number {
  return product.price > 0 ? Math.round(((product.price - product.costPrice) / product.price) * 100) : 0;
}

interface RowActionsProps {
  product: Product;
  onQuickRestock: (product: Product, quantity: number) => void;
  onRestock: (product: Product) => void;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
}

function RowActions({ product, onQuickRestock, onRestock, onEdit, onDelete }: RowActionsProps) {
  const quick = product.status === 'rupture' ? 20 : 5;
  return (
    <div className="flex items-center gap-1 justify-end">
      <Button
        variant={product.status === 'rupture' ? 'brand' : 'secondary'}
        size="sm"
        icon="add"
        aria-label={t.stock.quickRestockLabel(quick, product.name)}
        onClick={() => onQuickRestock(product, quick)}
      >
        {quick}
      </Button>
      <IconButton icon="local_shipping" label={t.stock.restock} size="sm" onClick={() => onRestock(product)} />
      <IconButton icon="edit" label={t.stock.edit(product.name)} size="sm" onClick={() => onEdit(product)} />
      <IconButton icon="delete" label={t.stock.remove(product.name)} size="sm" variant="danger-soft" onClick={() => onDelete(product)} />
    </div>
  );
}

function StockLevel({ product }: { product: Product }) {
  const status = product.status ?? 'disponible';
  const ratio = product.minStockAlert > 0 ? product.stock / (product.minStockAlert * 3) : 1;
  return (
    <div className="flex flex-col gap-1.5 min-w-28">
      <div className="flex items-baseline justify-between gap-2">
        <span className={cn('font-num font-bold text-sm', status === 'rupture' ? 'text-rose-600' : 'text-ink-900')}>
          {t.stock.units(product.stock, product.unit)}
        </span>
        <span className="text-[11px] text-slate-400 font-num">{t.stock.minShort(product.minStockAlert)}</span>
      </div>
      <ProgressBar
        value={ratio}
        tone={status === 'rupture' ? 'danger' : status === 'faible' ? 'warning' : 'brand'}
        label={t.stock.level(product.stock, product.minStockAlert)}
      />
    </div>
  );
}

export function StockView() {
  const rawProducts = useProductsStore((state) => state.products);
  const addProduct = useProductsStore((state) => state.addProduct);
  const updateProduct = useProductsStore((state) => state.updateProduct);
  const removeProduct = useProductsStore((state) => state.removeProduct);
  const restock = useProductsStore((state) => state.restock);
  const showToast = useUiStore((state) => state.showToast);

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

  const lowStockCount = filterProducts(products, { status: 'faible' }).length;
  const outOfStockCount = filterProducts(products, { status: 'rupture' }).length;
  const inStockCount = filterProducts(products, { status: 'disponible' }).length;
  const totalStockValue = stockValueOf(products);
  const totalRetailValue = retailValueOf(products);
  const averageMarginPercent =
    totalRetailValue > 0 ? Math.round(((totalRetailValue - totalStockValue) / totalRetailValue) * 100) : 0;

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
    showToast(t.stock.sort.applied(SORT_LABEL[next]));
  };

  const handleRestock = (product: Product, quantity: number) => {
    try {
      restock(product.id, quantity);
      showToast(t.stock.toasts.restocked(quantity, product.name, product.stock + quantity), 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : t.stock.toasts.restockFailed, 'error');
    }
  };

  const handleRestockSubmit = (quantity: number) => {
    if (!restockProduct) return;
    handleRestock(restockProduct, quantity);
    setRestockProduct(null);
  };

  const handleDeleteProduct = (product: Product) => {
    removeProduct(product.id);
    showToast(t.stock.toasts.removed(product.name));
  };

  const openForm = (product: Product | null) => {
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

  const handleSubmitProduct = (input: ProductInput) => {
    try {
      if (editingProduct) {
        updateProduct(editingProduct.id, input);
        showToast(t.stock.toasts.updated(input.name), 'success');
      } else {
        addProduct(input);
        showToast(t.stock.toasts.created(input.name), 'success');
      }
      closeProductForm();
    } catch (error) {
      showToast(error instanceof Error ? error.message : t.stock.toasts.saveFailed, 'error');
    }
  };

  const actionProps = {
    onQuickRestock: handleRestock,
    onRestock: openRestockForm,
    onEdit: (product: Product) => openForm(product),
    onDelete: handleDeleteProduct,
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t.nav.stock.title}
        description={t.nav.stock.description}
        actions={
          <Button id="btn-add-product" variant="primary" icon="add" onClick={() => openForm(null)}>
            {t.stock.newProduct}
          </Button>
        }
      />

      <StockMetrics
        productCount={products.length}
        lowStockCount={lowStockCount}
        outOfStockCount={outOfStockCount}
        totalStockValue={totalStockValue}
        averageMarginPercent={averageMarginPercent}
        onShowLowStock={() => setStatusFilter('faible')}
        onShowOutOfStock={() => setStatusFilter('rupture')}
      />

      <StockFilters
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        sortBy={sortBy}
        onSortChange={handleSortChange}
        totalCount={products.length}
        lowStockCount={lowStockCount}
        outOfStockCount={outOfStockCount}
        inStockCount={inStockCount}
      />

      <Card padding="none" className="overflow-hidden">
        {visibleProducts.length === 0 ? (
          <EmptyState
            icon="inventory_2"
            title={t.stock.emptyTitle}
            description={t.stock.emptyText}
            action={
              <Button variant="secondary" icon="restart_alt" onClick={resetFilters}>
                {t.common.reset}
              </Button>
            }
          />
        ) : (
          <>
            {/* Tableau (≥ md) */}
            <table id="inventory-list" className="hidden md:table w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-slate-500 border-b border-line bg-slate-50/70">
                  <th className="px-5 py-3 font-semibold">{t.stock.table.product}</th>
                  <th className="px-3 py-3 font-semibold">{t.stock.table.stock}</th>
                  <th className="px-3 py-3 font-semibold text-right">{t.stock.table.price}</th>
                  <th className="px-3 py-3 font-semibold text-right hidden xl:table-cell">{t.stock.table.cost}</th>
                  <th className="px-3 py-3 font-semibold text-right">{t.stock.table.margin}</th>
                  <th className="px-3 py-3 font-semibold">{t.stock.table.status}</th>
                  <th className="px-5 py-3 font-semibold text-right">{t.stock.table.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {visibleProducts.map((product) => (
                  <tr key={product.id} className="stock-item hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <ProductThumb product={product} className="size-11 rounded-xl shrink-0" />
                        <div className="min-w-0">
                          <div className="font-semibold text-ink-900 truncate max-w-56">{product.name}</div>
                          <div className="text-xs text-slate-500">
                            {product.sku} · {product.category}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <StockLevel product={product} />
                    </td>
                    <td className="px-3 py-3 text-right font-num font-semibold text-ink-900">{formatFCFA(product.price)}</td>
                    <td className="px-3 py-3 text-right font-num text-slate-500 hidden xl:table-cell">
                      {formatFCFA(product.costPrice)}
                    </td>
                    <td className="px-3 py-3 text-right font-num font-semibold text-brand-600">+{marginPercent(product)} %</td>
                    <td className="px-3 py-3">
                      <Badge tone={STOCK_STATUS_TONE[product.status ?? 'disponible']} dot>
                        {t.labels.stockStatus[product.status ?? 'disponible']}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      <RowActions product={product} {...actionProps} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Cartes (< md) */}
            <ul className="md:hidden divide-y divide-line">
              {visibleProducts.map((product) => (
                <li key={product.id} className="stock-item p-4 flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    <ProductThumb product={product} className="size-12 rounded-xl shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-semibold text-sm text-ink-900 leading-snug">{product.name}</div>
                        <Badge tone={STOCK_STATUS_TONE[product.status ?? 'disponible']} dot>
                          {t.labels.stockStatus[product.status ?? 'disponible']}
                        </Badge>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {product.sku} · {product.category}
                      </div>
                    </div>
                  </div>
                  <StockLevel product={product} />
                  <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-50 text-xs">
                    <div>
                      <div className="text-slate-500">{t.stock.table.price}</div>
                      <div className="font-num font-bold text-ink-900">{formatFCFA(product.price)}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">{t.stock.table.cost}</div>
                      <div className="font-num text-slate-600">{formatFCFA(product.costPrice)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-slate-500">{t.stock.table.margin}</div>
                      <div className="font-num font-bold text-brand-600">+{marginPercent(product)} %</div>
                    </div>
                  </div>
                  <RowActions product={product} {...actionProps} />
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      <section className="rounded-card border border-dashed border-line-strong p-4 flex items-center gap-3.5">
        <span className="size-11 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
          <Icon name="fact_check" size={22} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-ink-900">{t.stock.audit.title}</div>
          <div className="text-xs text-slate-500">{t.stock.audit.text}</div>
        </div>
        <Button variant="secondary" size="sm" onClick={() => showToast(t.stock.audit.done(products.length), 'success')}>
          {t.stock.audit.action}
        </Button>
      </section>

      <ProductFormModal
        key={`product-form-${formInstance}`}
        open={isProductFormOpen}
        onClose={closeProductForm}
        product={editingProduct}
        onSubmit={handleSubmitProduct}
      />
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
