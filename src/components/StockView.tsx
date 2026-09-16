import React, { useState } from 'react';
import { Product } from '../types';
import { formatFCFA } from '../data/initialData';

interface StockViewProps {
  products: Product[];
  onAddProduct: (product: Omit<Product, 'id'>) => void;
  onUpdateStock: (productId: number, newStock: number) => void;
  onShowToast: (msg: string) => void;
}

export const StockView: React.FC<StockViewProps> = ({
  products,
  onAddProduct,
  onUpdateStock,
  onShowToast,
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'faible' | 'rupture' | 'disponible'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'stock' | 'name' | 'price'>('stock');
  const [showNewProductModal, setShowNewProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // New product form state
  const [newName, setNewName] = useState('');
  const [newSku, setNewSku] = useState('');
  const [newCategory, setNewCategory] = useState<'Frais' | 'Épicerie' | 'Boissons' | 'Hygiène'>('Épicerie');
  const [newPrice, setNewPrice] = useState<number>(1000);
  const [newCostPrice, setNewCostPrice] = useState<number>(800);
  const [newInitialStock, setNewInitialStock] = useState<number>(10);
  const [newMinStock, setNewMinStock] = useState<number>(5);

  // Filter and sort items
  const filteredProducts = products.filter((item) => {
    const matchesFilter = activeFilter === 'all' || item.status === activeFilter;
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !term ||
      item.name.toLowerCase().includes(term) ||
      item.sku.toLowerCase().includes(term) ||
      item.category.toLowerCase().includes(term);
    return matchesFilter && matchesSearch;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'stock') return a.stock - b.stock;
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'price') return b.price - a.price;
    return 0;
  });

  const totalStockValue = products.reduce((acc, p) => acc + p.stock * p.costPrice, 0);
  const lowStockCount = products.filter((p) => p.status === 'faible').length;
  const outOfStockCount = products.filter((p) => p.status === 'rupture').length;
  const inStockCount = products.filter((p) => p.status === 'disponible').length;

  const handleQuickRestock = (product: Product, addedQuantity: number) => {
    const updated = product.stock + addedQuantity;
    onUpdateStock(product.id, updated);
    onShowToast(`Stock mis à jour : +${addedQuantity} pour ${product.name} (Nouveau stock: ${updated})`);
  };

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const status: 'disponible' | 'faible' | 'rupture' =
      newInitialStock === 0
        ? 'rupture'
        : newInitialStock <= newMinStock
        ? 'faible'
        : 'disponible';

    onAddProduct({
      name: newName.trim(),
      sku: newSku.trim() || `#ART-${Math.floor(100 + Math.random() * 900)}`,
      category: newCategory,
      price: Number(newPrice),
      costPrice: Number(newCostPrice),
      stock: Number(newInitialStock),
      minStockAlert: Number(newMinStock),
      imageUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuBOFh0s9MG1JpMytvAFgA4ZynFXG4IZdGwTIyxcB4xbSbNq3yI5u18Kjt1CISGXeFYcdzVIUL8SrdKL74YSl48puDJzGcgNe--gTvGB4Yrf6ZBZOuMgR_0LvtbQdkj6-2p4pNyxrH6rFHdw75P9OfJUNbJRLcqfZDEtirFJHbp_1dcyIb4SifvtMogEohp5qUXrdUYMO0PMbNwVkLiFVMBYQWhW-pnmd8aZV9_-0SYcEXQqU39IzpSmqQ',
      status,
      unit: 'unité',
    });

    onShowToast(`Article « ${newName} » ajouté au catalogue !`);
    setShowNewProductModal(false);
    setNewName('');
    setNewSku('');
    setNewInitialStock(10);
  };

  return (
    <div className="flex flex-col w-full px-4 space-y-4 pb-28 pt-2">
      {/* Header Section & Quick Metrics */}
      <section className="flex flex-col gap-2 pt-1">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <h1 className="font-display text-lg font-bold text-slate-900">
              Inventaire &amp; Réserves
            </h1>
            <p className="text-[11px] text-slate-500">Mise à jour en temps réel • Boutique Étoile</p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200/80">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            148 réf.
          </span>
        </div>

        {/* Bento Metric Cards */}
        <div className="grid grid-cols-3 gap-2.5 pt-1">
          {/* Total Value Card */}
          <div className="col-span-3 bg-white p-4 rounded-2xl shadow-2xs border border-slate-200/80 flex items-center justify-between relative overflow-hidden">
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="material-symbols-outlined text-[16px] text-emerald-700">
                  account_balance_wallet
                </span>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                  Valeur totale du stock
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-display font-bold text-2xl text-slate-900 font-num">
                  1 850 000
                </span>
                <span className="text-xs text-slate-500 font-bold">FCFA</span>
              </div>
              <span className="text-[11px] text-emerald-700 mt-0.5 flex items-center gap-1 font-semibold">
                <span className="material-symbols-outlined text-[14px]">trending_up</span> Marge
                moyenne estimée : +23.8%
              </span>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600 border border-slate-200/60">
              <span className="material-symbols-outlined text-[22px]">inventory</span>
            </div>
          </div>

          {/* Low Stock Alert Card */}
          <div
            onClick={() => setActiveFilter('faible')}
            role="button"
            tabIndex={0}
            className="col-span-2 bg-white p-3 rounded-2xl shadow-2xs border border-amber-200/80 hover:border-amber-300 flex flex-col justify-between cursor-pointer active:scale-95 transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-600 font-medium">Stock faible</span>
              <span className="px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[10px] font-bold flex items-center gap-0.5 border border-amber-200">
                <span className="material-symbols-outlined text-[12px]">warning</span>
                Alerte
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="font-display font-bold text-lg text-slate-900 font-num">
                {lowStockCount}
              </span>
              <span className="text-xs text-slate-500 font-medium">articles</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">Seuil minimal atteint</p>
          </div>

          {/* Out of Stock Warning Card */}
          <div
            onClick={() => setActiveFilter('rupture')}
            role="button"
            tabIndex={0}
            className="col-span-1 bg-white p-3 rounded-2xl shadow-2xs border border-rose-200/80 hover:border-rose-300 flex flex-col justify-between cursor-pointer active:scale-95 transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-rose-700 font-bold">Ruptures</span>
              <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="font-display font-bold text-lg text-rose-700 font-num">
                {outOfStockCount}
              </span>
              <span className="text-xs text-rose-700 font-medium">critiques</span>
            </div>
            <p className="text-[10px] text-rose-700 font-semibold mt-0.5">À commander</p>
          </div>
        </div>
      </section>

      {/* Action Row */}
      <section className="flex items-center gap-2">
        <button
          id="btn-add-product"
          type="button"
          onClick={() => setShowNewProductModal(true)}
          className="flex-1 h-12 bg-slate-900 hover:bg-slate-800 active:scale-[0.98] transition-transform rounded-xl flex items-center justify-center gap-2 px-3 shadow-xs font-bold text-xs text-white cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px] text-emerald-400">add_circle</span>
          <span>Nouveau Produit</span>
        </button>

        <button
          aria-label="Filtres avancés"
          type="button"
          onClick={() => {
            setActiveFilter('all');
            setSearchTerm('');
          }}
          className="h-12 w-12 bg-white hover:bg-slate-50 rounded-xl flex items-center justify-center text-slate-700 shadow-2xs border border-slate-200/80 active:scale-95 transition-transform shrink-0 cursor-pointer"
          title="Réinitialiser les filtres"
        >
          <span className="material-symbols-outlined text-[20px]">tune</span>
        </button>

        {/* Sort Trigger */}
        <button
          id="sort-trigger"
          type="button"
          onClick={() => {
            const next = sortBy === 'stock' ? 'name' : sortBy === 'name' ? 'price' : 'stock';
            setSortBy(next);
            onShowToast(
              `Tri appliqué : ${
                next === 'stock' ? 'Par Quantité' : next === 'name' ? 'Par Nom' : 'Par Prix'
              }`
            );
          }}
          className="h-12 px-3 bg-white hover:bg-slate-50 rounded-xl flex items-center gap-1 text-slate-700 shadow-2xs border border-slate-200/80 active:scale-95 transition-transform shrink-0 text-xs font-semibold cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px] text-slate-400">sort</span>
          <span className="capitalize">{sortBy === 'stock' ? 'Quantité' : sortBy}</span>
          <span className="material-symbols-outlined text-[16px] text-slate-400">expand_more</span>
        </button>
      </section>

      {/* Search and Live Filters Segment */}
      <section className="flex flex-col gap-2">
        {/* Search Bar */}
        <div className="relative w-full flex items-center">
          <span className="material-symbols-outlined absolute left-3.5 text-slate-400 text-[20px] pointer-events-none">
            search
          </span>
          <input
            id="stock-search-input"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par nom, SKU ou catégorie..."
            className="w-full h-11 pl-10 pr-9 bg-white rounded-xl text-xs text-slate-900 placeholder:text-slate-400 outline-none shadow-2xs border border-slate-200/90 focus:border-slate-800 transition-colors"
          />
          {searchTerm && (
            <button
              id="search-clear"
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">cancel</span>
            </button>
          )}
        </div>

        {/* Filter Chips Pill Row */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5" id="status-chips-group">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`filter-chip flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs border border-slate-900'
                : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
            }`}
          >
            <span>Tous</span>
            <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-num">
              {products.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('faible')}
            className={`filter-chip flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              activeFilter === 'faible'
                ? 'bg-slate-900 text-white shadow-xs border border-slate-900'
                : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>Faible</span>
            <span className="px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-num font-bold">
              {lowStockCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('rupture')}
            className={`filter-chip flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              activeFilter === 'rupture'
                ? 'bg-slate-900 text-white shadow-xs border border-slate-900'
                : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
            <span>Rupture</span>
            <span className="px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-num font-bold">
              {outOfStockCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('disponible')}
            className={`filter-chip flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              activeFilter === 'disponible'
                ? 'bg-slate-900 text-white shadow-xs border border-slate-900'
                : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
            }`}
          >
            <span>Disponibles</span>
            <span className="px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-num font-bold">
              {inStockCount}
            </span>
          </button>
        </div>
      </section>

      {/* Inventory Product List */}
      <section className="flex flex-col gap-2.5" id="inventory-list">
        {sortedProducts.map((product) => {
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
                    <span>Niveau actuel (Alerte : {product.minStockAlert} {product.unit}s)</span>
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
                    {product.price.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase font-semibold">Prix Achat</span>
                  <span className="text-xs font-medium text-slate-500 font-num">
                    {product.costPrice.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[9px] uppercase font-semibold">Marge</span>
                  <span className="text-xs text-emerald-700 font-bold font-num">
                    +{marginPercent}%
                  </span>
                </div>
              </div>

              {/* Action Buttons: Restock, Quick Add, Edit */}
              <div className="flex items-center justify-between pt-1">
                {product.status === 'rupture' ? (
                  <>
                    <div className="flex items-center gap-1 text-rose-700 text-[10px] font-semibold">
                      <span className="material-symbols-outlined text-[15px]">priority_high</span>
                      Demande élevée cette semaine
                    </div>
                    <button
                      type="button"
                      onClick={() => handleQuickRestock(product, 20)}
                      className="h-8 px-3 bg-emerald-500 hover:bg-emerald-400 active:scale-95 transition-transform rounded-xl flex items-center gap-1.5 text-slate-950 text-xs font-bold shadow-xs cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">add_shopping_cart</span>
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
                        onClick={() => handleQuickRestock(product, 5)}
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
                        onClick={() => handleQuickRestock(product, 10)}
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
            </article>
          );
        })}
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
              Dernière vérification : il y a 2 jours
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onShowToast('Inventaire validé : 148 références conformes.')}
          className="text-xs text-emerald-700 font-bold px-2 py-1 hover:underline cursor-pointer"
        >
          Vérifier
        </button>
      </section>

      {/* Modal: Nouveau Produit */}
      {showNewProductModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-t-3xl p-5 shadow-2xl border-t border-slate-200 max-h-[85vh] overflow-y-auto">
            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-3" />
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-emerald-400">
                  <span className="material-symbols-outlined text-[18px]">add_box</span>
                </div>
                <h3 className="font-display font-bold text-sm text-slate-900">
                  Ajouter un nouvel article
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNewProductModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="flex flex-col gap-3 mt-3">
              <div>
                <label className="text-[11px] text-slate-500 uppercase font-semibold block mb-1">
                  Nom de l'article *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Savon liquide 500ml, Thé Touba..."
                  className="w-full h-10 px-3 rounded-xl bg-slate-50 text-xs text-slate-900 outline-none border border-slate-200 focus:border-slate-800 focus:bg-white transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-500 uppercase font-semibold block mb-1">
                    Code SKU / Réf
                  </label>
                  <input
                    type="text"
                    value={newSku}
                    onChange={(e) => setNewSku(e.target.value)}
                    placeholder="#ART-105"
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 text-xs text-slate-900 outline-none border border-slate-200 focus:border-slate-800 focus:bg-white transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 uppercase font-semibold block mb-1">
                    Rayon / Catégorie
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full h-10 px-2 rounded-xl bg-slate-50 text-xs text-slate-900 outline-none border border-slate-200 focus:border-slate-800 focus:bg-white transition-colors cursor-pointer"
                  >
                    <option value="Épicerie">Épicerie</option>
                    <option value="Frais">Frais</option>
                    <option value="Boissons">Boissons</option>
                    <option value="Hygiène">Hygiène</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-500 uppercase font-semibold block mb-1">
                    Prix de vente (FCFA) *
                  </label>
                  <input
                    type="number"
                    required
                    min={50}
                    step={25}
                    value={newPrice}
                    onChange={(e) => setNewPrice(Number(e.target.value))}
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 text-xs text-slate-900 outline-none border border-slate-200 focus:border-slate-800 focus:bg-white transition-colors font-bold font-num"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 uppercase font-semibold block mb-1">
                    Prix d'achat (FCFA)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={25}
                    value={newCostPrice}
                    onChange={(e) => setNewCostPrice(Number(e.target.value))}
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 text-xs text-slate-900 outline-none border border-slate-200 focus:border-slate-800 focus:bg-white transition-colors font-num"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-500 uppercase font-semibold block mb-1">
                    Stock Initial
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={newInitialStock}
                    onChange={(e) => setNewInitialStock(Number(e.target.value))}
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 text-xs text-slate-900 outline-none border border-slate-200 focus:border-slate-800 focus:bg-white transition-colors font-num"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 uppercase font-semibold block mb-1">
                    Seuil d'alerte
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={newMinStock}
                    onChange={(e) => setNewMinStock(Number(e.target.value))}
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 text-xs text-slate-900 outline-none border border-slate-200 focus:border-slate-800 focus:bg-white transition-colors font-num"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="mt-2 w-full h-12 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-display font-bold text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-98 transition-all"
              >
                <span className="material-symbols-outlined text-[20px]">check</span>
                <span>Enregistrer dans le catalogue</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
