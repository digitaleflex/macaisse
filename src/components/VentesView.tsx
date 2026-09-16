import React, { useState } from 'react';
import { Product, CartItem, SaleTransaction } from '../types';
import { formatFCFA } from '../data/initialData';

interface VentesViewProps {
  products: Product[];
  cart: CartItem[];
  onAddToCart: (product: Product) => void;
  onUpdateCartQty: (productId: number, delta: number) => void;
  onRemoveFromCart: (productId: number) => void;
  onClearCart: () => void;
  onCompleteSale: (sale: Omit<SaleTransaction, 'id'>, cartItems: CartItem[]) => void;
  onShowToast: (message: string) => void;
}

export const VentesView: React.FC<VentesViewProps> = ({
  products,
  cart,
  onAddToCart,
  onUpdateCartQty,
  onRemoveFromCart,
  onClearCart,
  onCompleteSale,
  onShowToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Tous');
  const [showCartDetails, setShowCartDetails] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'Espèces' | 'Mobile Money (Wave)' | 'Orange Money' | 'Carte Bancaire'>('Espèces');
  const [tenderedAmount, setTenderedAmount] = useState<number>(0);
  const [clientName, setClientName] = useState('');
  const [scanning, setScanning] = useState(false);

  const categories = ['Tous', 'Boissons', 'Épicerie', 'Frais', 'Hygiène'];

  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory === 'Tous' || p.category === selectedCategory;
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const totalQuantity = cart.reduce((acc, item) => acc + item.quantity, 0);
  const totalAmount = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);

  // When opening payment modal, set tendered amount to exact total by default
  const handleOpenPaymentModal = () => {
    if (cart.length === 0) {
      onShowToast('Votre panier est vide ! Ajoutez des articles.');
      return;
    }
    setTenderedAmount(totalAmount);
    setShowPaymentModal(true);
  };

  const handleSimulateBarcodeScan = () => {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      // Pick an item or find milk
      const item = products.find((p) => p.sku === '#LAI-018') || products[0];
      onAddToCart(item);
      onShowToast(`Code-barres scanné : +1 ${item.name}`);
    }, 600);
  };

  const handleConfirmSale = () => {
    if (cart.length === 0) return;

    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;

    const newSaleNumber = `#${Math.floor(1043 + Math.random() * 800)}`;

    onCompleteSale(
      {
        saleNumber: newSaleNumber,
        time: timeStr,
        date: "Aujourd'hui",
        paymentMethod: paymentMethod,
        amount: totalAmount,
        status: 'Validé',
        clientName: clientName.trim() || undefined,
        itemsCount: totalQuantity,
      },
      [...cart]
    );

    setShowPaymentModal(false);
    setShowCartDetails(false);
    setClientName('');
  };

  return (
    <div className="flex flex-col w-full pb-36 pt-1">
      {/* Search & Scan Header Bar */}
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
              onChange={(e) => setSearchQuery(e.target.value)}
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

      {/* Horizontal Categories Slider */}
      <div className="w-full overflow-x-auto no-scrollbar py-1.5 px-4 flex items-center gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={`category-pill shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95 cursor-pointer ${
              selectedCategory === cat
                ? 'bg-slate-900 text-white shadow-xs border border-slate-900'
                : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200/80'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Payment Channels Ribbon */}
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

      {/* Product Catalog Grid */}
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
          <div className="bg-white rounded-2xl p-8 text-center flex flex-col items-center justify-center border border-slate-200/80 shadow-2xs">
            <span className="material-symbols-outlined text-[36px] text-slate-400 mb-2">
              search_off
            </span>
            <p className="text-xs font-semibold text-slate-900">Aucun article trouvé</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Essayez une autre recherche ou réinitialisez les filtres.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('Tous');
              }}
              type="button"
              className="mt-3 text-xs text-emerald-700 font-bold hover:underline cursor-pointer"
            >
              Afficher tous les articles
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5" id="product-grid">
            {filteredProducts.map((product) => {
              const inCartItem = cart.find((it) => it.product.id === product.id);

              return (
                <div
                  key={product.id}
                  onClick={() => onAddToCart(product)}
                  role="button"
                  tabIndex={0}
                  className="product-card flex flex-col justify-between bg-white p-2.5 rounded-2xl shadow-2xs border border-slate-200/80 active:scale-[0.98] transition-all cursor-pointer relative overflow-hidden group hover:border-slate-300 hover:shadow-xs"
                >
                  <div className="flex flex-col">
                    <div className="w-full h-28 rounded-xl overflow-hidden relative mb-2 bg-slate-100">
                      <img
                        src={product.imageUrl}
                        alt={product.imageAlt || product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                      {/* Stock Pill */}
                      <span
                        className={`absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold backdrop-blur-xs shadow-2xs border ${
                          product.status === 'rupture'
                            ? 'bg-rose-50/95 text-rose-700 border-rose-200'
                            : product.status === 'faible'
                            ? 'bg-amber-50/95 text-amber-700 border-amber-200'
                            : 'bg-white/95 text-emerald-800 border-emerald-200/80'
                        }`}
                      >
                        {product.status === 'rupture'
                          ? 'Rupture'
                          : product.status === 'faible'
                          ? `Stock faible (${product.stock})`
                          : `En stock (${product.stock})`}
                      </span>

                      {/* In-cart counter badge */}
                      {inCartItem && (
                        <span className="absolute bottom-1.5 right-1.5 w-6 h-6 rounded-full bg-slate-900 text-emerald-400 text-xs font-display font-bold flex items-center justify-center shadow-md ring-2 ring-white">
                          {inCartItem.quantity}
                        </span>
                      )}
                    </div>

                    <span className="font-display font-bold text-xs text-slate-900 leading-tight line-clamp-2">
                      {product.name}
                    </span>
                    <span className="text-[10px] text-slate-500 mt-0.5">{product.category}</span>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-1.5 border-t border-slate-100">
                    <div className="flex flex-col">
                      <span className="font-display font-bold text-sm text-slate-900 font-num">
                        {product.price.toLocaleString('fr-FR')}
                      </span>
                      <span className="text-[10px] text-slate-400 leading-none">FCFA</span>
                    </div>

                    <button
                      type="button"
                      aria-label={`Ajouter ${product.name} au panier`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddToCart(product);
                      }}
                      className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-900 hover:text-emerald-400 text-slate-800 flex items-center justify-center transition-colors active:scale-90 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">add</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sticky Floating Checkout Drawer / Banner */}
      {cart.length > 0 && (
        <div className="fixed bottom-20 left-0 right-0 z-30 px-4 pointer-events-none">
          <div className="pointer-events-auto max-w-md mx-auto bg-slate-900/95 backdrop-blur-md text-white rounded-2xl p-3.5 shadow-2xl transition-all duration-300 border border-slate-700/80">
            {/* Mini Cart Content Row */}
            <div className="flex items-center justify-between pb-2">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                  <span className="material-symbols-outlined text-[20px]">shopping_cart</span>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white font-num">
                      {totalQuantity} article{totalQuantity > 1 ? 's' : ''}
                    </span>
                    <span className="text-slate-500 text-[10px]">•</span>
                    <span className="text-[11px] text-slate-300 font-medium">Panier Actif</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-[11px] text-slate-400">Total :</span>
                    <span className="font-display font-bold text-sm text-white font-num">
                      {totalAmount.toLocaleString('fr-FR')} FCFA
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  aria-label="Vider le panier"
                  onClick={onClearCart}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Vider le panier"
                >
                  <span className="material-symbols-outlined text-[18px]">delete_sweep</span>
                </button>
                <button
                  type="button"
                  id="toggle-cart-details"
                  aria-label="Détail du panier"
                  onClick={() => setShowCartDetails(!showCartDetails)}
                  className="flex items-center gap-0.5 px-2.5 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white transition-colors text-xs font-medium cursor-pointer border border-slate-700/60"
                >
                  <span>Détail</span>
                  <span className="material-symbols-outlined text-[16px]">
                    {showCartDetails ? 'expand_more' : 'expand_less'}
                  </span>
                </button>
              </div>
            </div>

            {/* Quick Expandable Line Item Receipt Drawer */}
            {showCartDetails && (
              <div className="flex flex-col gap-1 py-2 border-t border-slate-800 mb-2 max-h-48 overflow-y-auto pr-1">
                {cart.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex justify-between items-center text-xs text-slate-300 py-1.5 bg-slate-800/60 px-2.5 rounded-xl border border-slate-800"
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="text-white font-medium truncate">{item.product.name}</span>
                      <span className="text-[10px] text-slate-400 font-num">
                        {item.product.price.toLocaleString('fr-FR')} F / unité
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1 bg-slate-700/80 rounded-lg px-1">
                        <button
                          type="button"
                          onClick={() => onUpdateCartQty(item.product.id, -1)}
                          className="w-5 h-5 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
                        >
                          -
                        </button>
                        <span className="font-bold text-white px-1 font-num">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => onUpdateCartQty(item.product.id, 1)}
                          className="w-5 h-5 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
                        >
                          +
                        </button>
                      </div>

                      <span className="font-bold text-white font-num min-w-[70px] text-right">
                        {(item.product.price * item.quantity).toLocaleString('fr-FR')} F
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Primary Action: Big Encaisser CTA */}
            <button
              id="checkout-cta-btn"
              type="button"
              onClick={handleOpenPaymentModal}
              className="w-full h-12 bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-between px-4 rounded-xl font-display font-bold text-sm shadow-md active:scale-[0.98] transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[22px]">payments</span>
                <span className="text-xs font-extrabold uppercase tracking-wide">Encaisser</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-display font-bold text-sm font-num">
                  {totalAmount.toLocaleString('fr-FR')} FCFA
                </span>
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Modal Tender Payment Pad */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 backdrop-blur-xs transition-opacity duration-300">
          <div className="w-full max-w-md bg-white rounded-t-3xl p-5 shadow-2xl border-t border-slate-200 max-h-[85vh] overflow-y-auto">
            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-3" />

            <div className="flex items-center justify-between mb-3">
              <div className="flex flex-col">
                <span className="text-[11px] text-slate-500 uppercase font-semibold">
                  Encaissement Client
                </span>
                <span className="font-display font-bold text-2xl text-slate-900 font-num">
                  {totalAmount.toLocaleString('fr-FR')} FCFA
                </span>
              </div>
              <button
                type="button"
                aria-label="Fermer la fenêtre"
                onClick={() => setShowPaymentModal(false)}
                className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-900 active:scale-95 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Quick Payment Method Selector */}
            <span className="text-xs text-slate-600 mb-1.5 block font-medium">
              Sélectionnez le mode de règlement :
            </span>
            <div className="grid grid-cols-3 gap-2 mb-3.5">
              <button
                type="button"
                onClick={() => setPaymentMethod('Espèces')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all active:scale-95 cursor-pointer border ${
                  paymentMethod === 'Espèces'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-slate-50 text-slate-800 hover:bg-slate-100 border-slate-200/80'
                }`}
              >
                <span
                  className={`material-symbols-outlined text-[24px] mb-1 ${
                    paymentMethod === 'Espèces' ? 'text-emerald-400' : 'text-slate-600'
                  }`}
                >
                  payments
                </span>
                <span className="text-xs font-semibold">Espèces</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('Mobile Money (Wave)')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all active:scale-95 cursor-pointer border ${
                  paymentMethod === 'Mobile Money (Wave)'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-slate-50 text-slate-800 hover:bg-slate-100 border-slate-200/80'
                }`}
              >
                <span
                  className={`material-symbols-outlined text-[24px] mb-1 ${
                    paymentMethod === 'Mobile Money (Wave)' ? 'text-emerald-400' : 'text-slate-600'
                  }`}
                >
                  smartphone
                </span>
                <span className="text-xs font-semibold">Wave / OM</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('Carte Bancaire')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all active:scale-95 cursor-pointer border ${
                  paymentMethod === 'Carte Bancaire'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-slate-50 text-slate-800 hover:bg-slate-100 border-slate-200/80'
                }`}
              >
                <span
                  className={`material-symbols-outlined text-[24px] mb-1 ${
                    paymentMethod === 'Carte Bancaire' ? 'text-emerald-400' : 'text-slate-600'
                  }`}
                >
                  credit_card
                </span>
                <span className="text-xs font-semibold">Carte</span>
              </button>
            </div>

            {/* Optional Customer Name */}
            <div className="mb-3">
              <label className="text-[11px] text-slate-500 uppercase font-semibold block mb-1">
                Client (Optionnel)
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Nom du client ou téléphone pour reçu SMS/WhatsApp..."
                className="w-full h-10 px-3 rounded-xl bg-slate-50 text-xs text-slate-900 outline-none border border-slate-200 focus:border-slate-800 focus:bg-white transition-colors"
              />
            </div>

            {/* Amount Tendered Fast Presets */}
            {paymentMethod === 'Espèces' && (
              <div className="mb-4">
                <span className="text-[11px] text-slate-500 uppercase font-semibold block mb-1.5">
                  Montant reçu par le caissier :
                </span>
                <div className="flex items-center justify-between gap-1.5">
                  <button
                    type="button"
                    onClick={() => setTenderedAmount(totalAmount)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold active:scale-95 border cursor-pointer ${
                      tenderedAmount === totalAmount
                        ? 'bg-slate-900 text-emerald-400 border-slate-900'
                        : 'bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    Exact
                  </button>
                  <button
                    type="button"
                    onClick={() => setTenderedAmount(Math.ceil(totalAmount / 1000) * 1000)}
                    className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-800 text-xs font-bold active:scale-95 border border-slate-200 hover:bg-slate-200 cursor-pointer font-num"
                  >
                    {(Math.ceil(totalAmount / 1000) * 1000).toLocaleString('fr-FR')}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setTenderedAmount(
                        Math.max(10000, Math.ceil(totalAmount / 5000) * 5000)
                      )
                    }
                    className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-800 text-xs font-bold active:scale-95 border border-slate-200 hover:bg-slate-200 cursor-pointer font-num"
                  >
                    {Math.max(10000, Math.ceil(totalAmount / 5000) * 5000).toLocaleString('fr-FR')}
                  </button>
                </div>

                {tenderedAmount > totalAmount && (
                  <div className="mt-2.5 p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between text-xs text-emerald-800 font-semibold">
                    <span>Monnaie à rendre :</span>
                    <span className="font-display font-bold text-sm font-num text-emerald-900">
                      {(tenderedAmount - totalAmount).toLocaleString('fr-FR')} FCFA
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Confirm Payment Button */}
            <button
              id="final-confirm-btn"
              type="button"
              onClick={handleConfirmSale}
              className="w-full h-13 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-display font-bold text-sm flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-transform cursor-pointer"
            >
              <span className="material-symbols-outlined text-[22px]">verified</span>
              <span>Valider la Vente (Reçu Instantané)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
