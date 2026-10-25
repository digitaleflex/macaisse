import { useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import type { CartLine, Category, Product } from '@/types';
import { t } from '@/content';
import { CATEGORY_STYLE, PAYMENT_METHODS, PRODUCT_CATEGORIES } from '@/config/reference';
import { filterProducts } from '@/domain/stock';
import { hasContactPhone } from '@/domain/sales';
import { productsWithStatus, useProductsStore } from '@/store/useProductsStore';
import { selectCartTotals, useCartStore } from '@/store/useCartStore';
import { useSalesStore } from '@/store/useSalesStore';
import { useCurrentSession } from '@/store/useSessionStore';
import { useUiStore } from '@/store/useUiStore';
import { Button, Chip, EmptyState, IconButton, Modal, SearchField, cn } from '@/ui';
import { CartPanel, MobileCartBar } from './CartPanel';
import { PaymentPad, type PaymentPayload } from './PaymentPad';
import { PhoneRequiredModal } from './PhoneRequiredModal';
import { ProductCard } from './ProductCard';

/**
 * Point de vente : catalogue filtrable + panier (colonne fixe ≥ lg, feuille sur
 * mobile). Données : `useProductsStore`, `useCartStore`, `useSalesStore`.
 */
type CategoryFilter = Category | 'all';

export function VentesView() {
  const { business, user } = useCurrentSession();
  const storedProducts = useProductsStore((state) => state.products);
  const products = useMemo(() => productsWithStatus(storedProducts), [storedProducts]);
  const lines = useCartStore((state) => state.lines);
  const totals = useCartStore(useShallow(selectCartTotals));
  const addItem = useCartStore((state) => state.addItem);
  const setQuantity = useCartStore((state) => state.setQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clear);
  const completeSale = useSalesStore((state) => state.completeSale);
  const openReceipt = useUiStore((state) => state.openReceipt);
  const setTab = useUiStore((state) => state.setTab);
  const showToast = useUiStore((state) => state.showToast);

  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [scanning, setScanning] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentInstance, setPaymentInstance] = useState(0);
  const [phoneModalOpen, setPhoneModalOpen] = useState(false);
  const [cartSheetOpen, setCartSheetOpen] = useState(false);

  const scanTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (scanTimeout.current !== null) clearTimeout(scanTimeout.current);
    },
    []
  );

  const filteredProducts = useMemo(
    () => filterProducts(products, { query: searchQuery, category: category === 'all' ? undefined : category }),
    [products, searchQuery, category]
  );

  const quantities = useMemo(() => new Map(lines.map((line) => [line.productId, line.quantity])), [lines]);

  const handleAddToCart = (product: Product, message?: string) => {
    try {
      addItem(product);
      showToast(message ?? t.pos.added(product.name));
    } catch (error) {
      showToast(error instanceof Error ? error.message : t.pos.outOfStock(product.name), 'error');
    }
  };

  const handleScan = () => {
    setScanning(true);
    showToast(t.pos.scanning);
    scanTimeout.current = setTimeout(() => {
      setScanning(false);
      const item = products.find((product) => product.status !== 'rupture') ?? products[0];
      if (!item) {
        showToast(t.pos.scanEmpty, 'error');
        return;
      }
      handleAddToCart(item, t.pos.scanned(item.name));
    }, 600);
  };

  const handleCheckout = () => {
    if (lines.length === 0) {
      showToast(t.pos.cart.empty);
      return;
    }
    // RG-A03 : pas de ticket sans contact téléphonique.
    if (!hasContactPhone(business.phone, user.phone)) {
      setPhoneModalOpen(true);
      return;
    }
    setCartSheetOpen(false);
    setPaymentInstance((instance) => instance + 1);
    setPaymentOpen(true);
  };

  const handleClearCart = () => {
    clearCart();
    setCartSheetOpen(false);
    showToast(t.pos.cart.cleared);
  };

  const handleValidateSale = (payload: PaymentPayload) => {
    // RG-A03 : le paiement a pu être ouvert avant l'ajout du téléphone.
    if (!hasContactPhone(business.phone, user.phone)) {
      setPaymentOpen(false);
      setPhoneModalOpen(true);
      return;
    }
    // Snapshot AVANT validation : `completeSale` vide le panier.
    const snapshot: CartLine[] = [...useCartStore.getState().lines];
    try {
      const sale = completeSale(payload);
      setPaymentOpen(false);
      openReceipt(sale, snapshot);
      showToast(t.pos.payment.success(sale.saleNumber), 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : t.pos.payment.failure, 'error');
    }
  };

  const cartProps = {
    lines,
    totals,
    onChangeQuantity: setQuantity,
    onRemove: removeItem,
    onClear: handleClearCart,
    onCheckout: handleCheckout,
  };

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px] gap-6">
      <div className="flex flex-col gap-4 min-w-0">
        <div className="flex items-center gap-2">
          <SearchField
            id="product-search"
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={t.pos.searchPlaceholder}
            className="flex-1"
          />
          <IconButton
            id="barcode-scan-btn"
            icon={scanning ? 'qr_code_scanner' : 'barcode_scanner'}
            label={t.pos.scan}
            variant="secondary"
            size="lg"
            onClick={handleScan}
            className={cn('size-11', scanning && 'ring-2 ring-brand-500 text-brand-600 animate-pulse')}
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
          <Chip active={category === 'all'} onClick={() => setCategory('all')} icon="apps" count={products.length}>
            {t.common.all}
          </Chip>
          {PRODUCT_CATEGORIES.map((entry) => (
            <Chip key={entry} active={category === entry} onClick={() => setCategory(entry)} icon={CATEGORY_STYLE[entry].icon}>
              {entry}
            </Chip>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-[15px] text-ink-900">
            {t.pos.catalogTitle}
            <span className="ml-2 text-sm font-medium text-slate-400 font-num">{t.pos.catalogCount(filteredProducts.length)}</span>
          </h2>
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500">
            <span>{t.pos.acceptedMethods}</span>
            {PAYMENT_METHODS.slice(0, 4).map((option) => (
              <span key={option.method} className="px-2 py-0.5 rounded-md bg-white border border-line font-semibold text-slate-600">
                {option.short}
              </span>
            ))}
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="bg-surface rounded-card border border-line">
            {products.length === 0 ? (
              <EmptyState
                icon="add_box"
                title={t.pos.emptyCatalogTitle}
                description={t.pos.emptyCatalogText}
                action={
                  <Button icon="add" onClick={() => setTab('stock')}>
                    {t.pos.emptyCatalogAction}
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon="search_off"
                title={t.pos.emptyTitle}
                description={t.pos.emptyText}
                action={
                  <Button
                    variant="secondary"
                    icon="restart_alt"
                    onClick={() => {
                      setSearchQuery('');
                      setCategory('all');
                    }}
                  >
                    {t.pos.showAll}
                  </Button>
                }
              />
            )}
          </div>
        ) : (
          <div id="product-grid" className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                quantityInCart={quantities.get(product.id) ?? 0}
                onAdd={handleAddToCart}
              />
            ))}
          </div>
        )}
      </div>

      {/* Panier — colonne fixe sur grand écran */}
      <aside className="hidden lg:block">
        <div className="sticky top-[88px] h-[calc(100dvh-112px)] bg-surface rounded-card border border-line shadow-card overflow-hidden flex">
          <CartPanel {...cartProps} className="flex-1" />
        </div>
      </aside>

      {/* Panier — mobile */}
      <MobileCartBar totals={totals} onOpen={() => setCartSheetOpen(true)} />
      <Modal open={cartSheetOpen} onClose={() => setCartSheetOpen(false)} flush>
        <CartPanel {...cartProps} className="flex-1" />
      </Modal>

      <PaymentPad
        key={`payment-${paymentInstance}`}
        open={paymentOpen}
        total={totals.subtotal}
        onClose={() => setPaymentOpen(false)}
        onValidate={handleValidateSale}
      />

      <PhoneRequiredModal
        open={phoneModalOpen}
        onClose={() => setPhoneModalOpen(false)}
        onSaved={() => {
          setPhoneModalOpen(false);
          setPaymentOpen(false);
        }}
      />
    </div>
  );
}
