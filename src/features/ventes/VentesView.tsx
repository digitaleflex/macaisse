import { useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import type { CartLine, Category, Product } from '@/types';
import { filterProducts } from '@/domain/stock';
import { productsWithStatus, useProductsStore } from '@/store/useProductsStore';
import { selectCartTotals, useCartStore } from '@/store/useCartStore';
import { useSalesStore } from '@/store/useSalesStore';
import { useUiStore } from '@/store/useUiStore';
import { EmptyState } from '@/ui';
import { CartPanel } from './CartPanel';
import { PaymentPad, type PaymentPayload } from './PaymentPad';
import { ProductCard } from './ProductCard';

/**
 * Écran Point de Vente (POS). Aucune prop métier : le catalogue vient de
 * `useProductsStore`, le panier de `useCartStore`, la validation de
 * `useSalesStore` et le toast de `useUiStore`.
 */

const CATEGORIES: readonly (Category | 'Tous')[] = [
  'Tous',
  'Boissons',
  'Épicerie',
  'Frais',
  'Hygiène',
];

export function VentesView() {
  // `productsWithStatus` (comme tout sélecteur dérivé) renvoie un tableau neuf :
  // on s'abonne à la tranche STABLE `products` puis on dérive dans un `useMemo`
  // (clé = référence `products`) plutôt que de passer un sélecteur frais à
  // `useStore`, qui boucle avec `useSyncExternalStore` sous zustand v5.
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
  const showToast = useUiStore((state) => state.showToast);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'Tous'>('Tous');
  const [scanning, setScanning] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);

  const scanTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (scanTimeout.current !== null) clearTimeout(scanTimeout.current);
    },
    []
  );

  const filteredProducts = useMemo(
    () =>
      filterProducts(products, {
        query: searchQuery,
        category: selectedCategory === 'Tous' ? undefined : selectedCategory,
      }),
    [products, searchQuery, selectedCategory]
  );

  const handleAddToCart = (product: Product, message?: string) => {
    try {
      addItem(product);
      showToast(message ?? `+1 ${product.name} ajouté au panier`);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : `« ${product.name} » est en rupture de stock.`,
        'error'
      );
    }
  };

  const handleSimulateBarcodeScan = () => {
    setScanning(true);
    scanTimeout.current = setTimeout(() => {
      setScanning(false);
      const item = products.find((product) => product.sku === '#LAI-018') ?? products[0];
      if (!item) {
        showToast('Aucun article à scanner dans le catalogue.', 'error');
        return;
      }
      handleAddToCart(item, `Code-barres scanné : +1 ${item.name}`);
    }, 600);
  };

  const handleCheckout = () => {
    if (lines.length === 0) {
      showToast('Votre panier est vide ! Ajoutez des articles.');
      return;
    }
    setPaymentOpen(true);
  };

  const handleClearCart = () => {
    clearCart();
    showToast('Panier vidé.');
  };

  const handleValidateSale = (payload: PaymentPayload) => {
    // Snapshot AVANT validation : `completeSale` vide le panier.
    const snapshot: CartLine[] = [...useCartStore.getState().lines];
    try {
      const sale = completeSale(payload);
      openReceipt(sale, snapshot);
      setPaymentOpen(false);
      showToast(`Vente ${sale.saleNumber} validée ! Reçu généré.`, 'success');
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Erreur lors de la validation de la vente.',
        'error'
      );
    }
  };

  return (
    <div className="flex flex-col w-full pb-36 pt-1">
      {/* Barre recherche & scan */}
      <div className="px-4 py-2 bg-slate-50">
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center bg-white px-3.5 py-2.5 rounded-xl shadow-2xs border border-slate-200/90 focus-within:border-slate-800 transition-colors">
            <span className="material-symbols-outlined text-slate-400 text-[20px] mr-2">
              search
            </span>
            <input
              type="text"
              id="product-search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Rechercher un produit ou code barre..."
              className="w-full bg-transparent border-none outline-none text-xs text-slate-900 placeholder:text-slate-400 focus:ring-0"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-slate-400 hover:text-slate-700 p-0.5 rounded-full cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            )}
          </div>

          <button
            type="button"
            id="barcode-scan-btn"
            aria-label="Scanner code-barres"
            onClick={handleSimulateBarcodeScan}
            className={`w-11 h-11 shrink-0 flex items-center justify-center bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-800 rounded-xl shadow-2xs border border-slate-200/90 transition-all active:scale-95 cursor-pointer ${
              scanning ? 'animate-pulse ring-2 ring-emerald-500 bg-emerald-50 text-emerald-700' : ''
            }`}
            title="Simuler un scan de code-barres"
          >
            <span className="material-symbols-outlined text-[22px]">
              {scanning ? 'qr_code_scanner' : 'barcode_scanner'}
            </span>
          </button>
        </div>
      </div>

      {/* Slider catégories */}
      <div className="w-full overflow-x-auto no-scrollbar py-1.5 px-4 flex items-center gap-2">
        {CATEGORIES.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setSelectedCategory(category)}
            className={`category-pill shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95 cursor-pointer ${
              selectedCategory === category
                ? 'bg-slate-900 text-white shadow-xs border border-slate-900'
                : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200/80'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Bandeau des canaux de paiement */}
      <div className="px-4 mt-1">
        <div className="flex items-center justify-between bg-slate-100/90 px-3 py-2 rounded-xl border border-slate-200/70">
          <div className="flex items-center gap-1.5 text-slate-600 min-w-0">
            <span className="material-symbols-outlined text-[16px] text-emerald-600 shrink-0">
              contactless
            </span>
            <span className="text-[11px] font-medium shrink-0">Modes acceptés :</span>
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              <span className="bg-white px-2 py-0.5 rounded-md text-[10px] text-slate-800 font-semibold border border-slate-200/80 shrink-0">
                Espèces
              </span>
              <span className="bg-white px-2 py-0.5 rounded-md text-[10px] text-slate-800 font-semibold border border-slate-200/80 shrink-0">
                Wave
              </span>
              <span className="bg-white px-2 py-0.5 rounded-md text-[10px] text-slate-800 font-semibold border border-slate-200/80 shrink-0">
                OM
              </span>
              <span className="bg-white px-2 py-0.5 rounded-md text-[10px] text-slate-800 font-semibold border border-slate-200/80 shrink-0">
                Carte
              </span>
            </div>
          </div>
          <span className="text-emerald-700 text-[11px] font-semibold flex items-center gap-1 shrink-0 ml-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Actif
          </span>
        </div>
      </div>

      {/* Catalogue produits */}
      <div className="px-4 mt-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Articles Fréquents
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          </div>
          <span className="text-[11px] text-slate-500 font-medium font-num">
            {filteredProducts.length} affichés
          </span>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
            <EmptyState
              icon="search_off"
              title="Aucun article trouvé"
              description="Essayez une autre recherche ou réinitialisez les filtres."
              action={
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('Tous');
                  }}
                  className="text-xs text-emerald-700 font-bold hover:underline cursor-pointer"
                >
                  Afficher tous les articles
                </button>
              }
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5" id="product-grid">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                quantityInCart={lines.find((line) => line.productId === product.id)?.quantity ?? 0}
                onAdd={handleAddToCart}
              />
            ))}
          </div>
        )}
      </div>

      {/* Panier flottant */}
      <CartPanel
        lines={lines}
        totals={totals}
        onChangeQuantity={setQuantity}
        onRemove={removeItem}
        onClear={handleClearCart}
        onCheckout={handleCheckout}
      />

      {/* Pavé d'encaissement (monté à l'ouverture, comme l'inline d'origine) */}
      {paymentOpen && (
        <PaymentPad
          total={totals.subtotal}
          onClose={() => setPaymentOpen(false)}
          onValidate={handleValidateSale}
        />
      )}
    </div>
  );
}
