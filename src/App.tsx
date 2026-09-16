import React, { useState } from 'react';
import { TabType, Product, CartItem, SaleTransaction, Expense, ClientCredit, NotificationItem } from './types';
import {
  INITIAL_PRODUCTS,
  INITIAL_SALES,
  INITIAL_EXPENSES,
  INITIAL_CREDITS,
  INITIAL_NOTIFICATIONS,
} from './data/initialData';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { AccueilView } from './components/AccueilView';
import { VentesView } from './components/VentesView';
import { StockView } from './components/StockView';
import { CreditsView } from './components/CreditsView';
import { BilanView } from './components/BilanView';
import { DepensesModal } from './components/DepensesModal';
import { ProfilModal } from './components/ProfilModal';
import { AbonnementModal } from './components/AbonnementModal';
import { ReceiptModal } from './components/ReceiptModal';
import { NotificationDrawer } from './components/NotificationDrawer';

export default function App() {
  const [currentTab, setCurrentTab] = useState<TabType>('accueil');
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [sales, setSales] = useState<SaleTransaction[]>(INITIAL_SALES);
  const [expenses, setExpenses] = useState<Expense[]>(INITIAL_EXPENSES);
  const [credits, setCredits] = useState<ClientCredit[]>(INITIAL_CREDITS);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [cart, setCart] = useState<CartItem[]>([]);

  // Modals state
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAbonnementModalOpen, setIsAbonnementModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [activeReceiptSale, setActiveReceiptSale] = useState<SaleTransaction | null>(null);
  const [lastReceiptCart, setLastReceiptCart] = useState<CartItem[]>([]);

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage((prev) => (prev === message ? null : prev));
    }, 3200);
  };

  // Cart operations
  const handleAddToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    showToast(`+1 ${product.name} ajouté au panier`);
  };

  const handleUpdateCartQty = (productId: number, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const handleRemoveFromCart = (productId: number) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleClearCart = () => {
    setCart([]);
    showToast('Panier vidé.');
  };

  // Sale completion flow
  const handleCompleteSale = (
    saleData: Omit<SaleTransaction, 'id'>,
    cartSnapshot: CartItem[]
  ) => {
    const newId = Date.now();
    const completedSale: SaleTransaction = {
      ...saleData,
      id: newId,
    };

    // 1. Add to sales list
    setSales((prev) => [completedSale, ...prev]);

    // 2. Reduce products stock automatically
    setProducts((prev) =>
      prev.map((prod) => {
        const cartItem = cartSnapshot.find((c) => c.product.id === prod.id);
        if (cartItem) {
          const newStock = Math.max(0, prod.stock - cartItem.quantity);
          const status =
            newStock === 0 ? 'rupture' : newStock <= prod.minStockAlert ? 'faible' : 'disponible';
          return { ...prod, stock: newStock, status };
        }
        return prod;
      })
    );

    // 3. Clear cart
    setCart([]);

    // 4. Open Receipt Modal
    setActiveReceiptSale(completedSale);
    setLastReceiptCart(cartSnapshot);
    setIsReceiptModalOpen(true);

    showToast(`Vente ${completedSale.saleNumber} validée ! Reçu généré.`);
  };

  // Stock operations
  const handleAddProduct = (newProd: Omit<Product, 'id'>) => {
    const prod: Product = {
      ...newProd,
      id: Date.now(),
    };
    setProducts((prev) => [prod, ...prev]);
  };

  const handleUpdateStock = (productId: number, newStock: number) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          const status =
            newStock === 0 ? 'rupture' : newStock <= p.minStockAlert ? 'faible' : 'disponible';
          return { ...p, stock: newStock, status };
        }
        return p;
      })
    );
  };

  // Credit operations
  const handlePayCredit = (creditId: number, amountPaid: number, channel: string) => {
    setCredits((prev) =>
      prev.map((c) => {
        if (c.id === creditId) {
          const newRemaining = Math.max(0, c.remainingAmount - amountPaid);
          const newStatus = newRemaining === 0 ? 'Réglé' : 'Partiel';
          return {
            ...c,
            remainingAmount: newRemaining,
            status: newStatus,
          };
        }
        return c;
      })
    );
  };

  const handleAddCredit = (newCredit: Omit<ClientCredit, 'id'>) => {
    const credit: ClientCredit = {
      ...newCredit,
      id: Date.now(),
    };
    setCredits((prev) => [credit, ...prev]);
  };

  // Expense operations
  const handleAddExpense = (newExp: Omit<Expense, 'id'>) => {
    const expense: Expense = {
      ...newExp,
      id: Date.now(),
    };
    setExpenses((prev) => [expense, ...prev]);
  };

  // Notification operations
  const handleMarkAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    showToast('Toutes les notifications sont marquées comme lues.');
  };

  const handleSelectNotification = (notif: NotificationItem) => {
    if (notif.relatedTab) {
      setCurrentTab(notif.relatedTab);
    }
    setIsNotificationOpen(false);
  };

  const unreadNotifCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-emerald-400 selection:text-slate-950">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-22 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-slate-900/95 backdrop-blur-md text-white text-xs font-medium rounded-full shadow-xl border border-slate-700/60 flex items-center gap-2 animate-fadeIn">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Sticky Header */}
      <Header
        currentTab={currentTab}
        unreadNotificationsCount={unreadNotifCount}
        onOpenNotifications={() => setIsNotificationOpen(true)}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        isOffline={isOffline}
      />

      {/* Main View Container */}
      <main className="flex-1 w-full max-w-md mx-auto pt-20">
        {currentTab === 'accueil' && (
          <AccueilView
            onNavigate={(tab) => setCurrentTab(tab)}
            onOpenExpenseModal={() => setIsExpenseModalOpen(true)}
            onOpenNewProductModal={() => setCurrentTab('stock')}
            onOpenNewCreditModal={() => setCurrentTab('credits')}
            sales={sales}
            onOpenSaleDetail={(sale) => {
              setActiveReceiptSale(sale);
              setLastReceiptCart([]);
              setIsReceiptModalOpen(true);
            }}
          />
        )}

        {currentTab === 'ventes' && (
          <VentesView
            products={products}
            cart={cart}
            onAddToCart={handleAddToCart}
            onUpdateCartQty={handleUpdateCartQty}
            onRemoveFromCart={handleRemoveFromCart}
            onClearCart={handleClearCart}
            onCompleteSale={handleCompleteSale}
            onShowToast={showToast}
          />
        )}

        {currentTab === 'stock' && (
          <StockView
            products={products}
            onAddProduct={handleAddProduct}
            onUpdateStock={handleUpdateStock}
            onShowToast={showToast}
          />
        )}

        {currentTab === 'credits' && (
          <CreditsView
            credits={credits}
            onPayCredit={handlePayCredit}
            onAddCredit={handleAddCredit}
            onShowToast={showToast}
          />
        )}

        {currentTab === 'bilan' && (
          <BilanView
            expenses={expenses}
            sales={sales}
            onOpenExpenseModal={() => setIsExpenseModalOpen(true)}
            onShowToast={showToast}
          />
        )}
      </main>

      {/* Persistent Bottom Tab Navigation */}
      <BottomNav
        currentTab={currentTab}
        onChangeTab={(tab) => setCurrentTab(tab)}
        cartCount={cart.reduce((acc, i) => acc + i.quantity, 0)}
      />

      {/* Modals & Overlays */}
      <DepensesModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        expenses={expenses}
        onAddExpense={handleAddExpense}
        onShowToast={showToast}
      />

      <ProfilModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onOpenAbonnement={() => setIsAbonnementModalOpen(true)}
        onShowToast={showToast}
      />

      <AbonnementModal
        isOpen={isAbonnementModalOpen}
        onClose={() => setIsAbonnementModalOpen(false)}
        onShowToast={showToast}
      />

      <ReceiptModal
        sale={activeReceiptSale}
        cartItems={lastReceiptCart}
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        onShowToast={showToast}
      />

      <NotificationDrawer
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        notifications={notifications}
        onMarkAllRead={handleMarkAllNotificationsRead}
        onSelectNotification={handleSelectNotification}
      />
    </div>
  );
}
