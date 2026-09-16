export type TabType = 'accueil' | 'ventes' | 'stock' | 'credits' | 'bilan';

export interface Product {
  id: number;
  name: string;
  sku: string;
  category: 'Frais' | 'Épicerie' | 'Boissons' | 'Hygiène';
  price: number; // in FCFA
  costPrice: number; // in FCFA
  stock: number;
  minStockAlert: number;
  imageUrl: string;
  imageAlt?: string;
  status: 'disponible' | 'faible' | 'rupture';
  unit: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface SaleTransaction {
  id: number;
  saleNumber: string;
  time: string;
  date: string;
  paymentMethod: 'Espèces' | 'Mobile Money (Wave)' | 'Orange Money' | 'Carte Bancaire' | 'Crédit Partiel';
  amount: number;
  status: 'Validé' | 'Partiel' | 'En attente';
  clientName?: string;
  remainingAmount?: number;
  itemsCount: number;
}

export interface Expense {
  id: number;
  title: string;
  date: string;
  time?: string;
  amount: number;
  category: string;
  paymentMethod: string;
  status?: string;
  hasReceipt?: boolean;
}

export interface ClientCredit {
  id: number;
  clientName: string;
  initials: string;
  shopOrLocation: string;
  phone: string;
  remainingAmount: number;
  totalInitial: number;
  dueDate: string;
  daysLate?: number;
  status: 'En retard' | 'Partiel' | 'En attente' | 'Réglé';
}

export interface NotificationItem {
  id: number;
  title: string;
  description?: string;
  message?: string;
  type: 'warning' | 'alert' | 'info' | 'success';
  time: string;
  read: boolean;
  relatedTab?: TabType;
}
