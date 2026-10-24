// Types métier partagés — source unique de vérité pour toutes les lanes.
// Les identifiants créés à l'exécution sont des `string` (voir `domain/ids.ts`).

export type TabType = 'accueil' | 'ventes' | 'stock' | 'credits' | 'bilan';

export type StockStatus = 'disponible' | 'faible' | 'rupture';

export type CreditStatus = 'En retard' | 'Partiel' | 'En attente' | 'Réglé';

export type PaymentMethod =
  | 'Espèces'
  | 'Mobile Money (Wave)'
  | 'Orange Money'
  | 'Carte Bancaire'
  | 'Crédit Partiel';

export type SaleStatus = 'Validé' | 'Partiel' | 'En attente';

export type Category = 'Frais' | 'Épicerie' | 'Boissons' | 'Hygiène';

export type NotificationType = 'warning' | 'alert' | 'info' | 'success';

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: Category;
  price: number; // en FCFA
  costPrice: number; // en FCFA
  stock: number;
  minStockAlert: number;
  imageUrl: string;
  imageAlt?: string;
  /** Statut dérivé du stock par le domaine ; conservé optionnel pour compatibilité UI. */
  status?: StockStatus;
  unit: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface SaleTransaction {
  id: string;
  saleNumber: string;
  time: string;
  date: string;
  paymentMethod: PaymentMethod;
  amount: number;
  status: SaleStatus;
  clientName?: string;
  remainingAmount?: number;
  itemsCount: number;
}

export interface Expense {
  id: string;
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
  id: string;
  clientName: string;
  initials: string;
  shopOrLocation: string;
  phone: string;
  remainingAmount: number;
  totalInitial: number;
  dueDate: string;
  daysLate?: number;
  status: CreditStatus;
}

export interface NotificationItem {
  id: string;
  title: string;
  description?: string;
  message?: string;
  type: NotificationType;
  time: string;
  read: boolean;
  relatedTab?: TabType;
}

// ---------------------------------------------------------------------------
// Entrées / view-models utilisés par le domaine et les stores.
// ---------------------------------------------------------------------------

/** Entrée de création/mise à jour d'un produit : le statut est dérivé, jamais fourni. */
export type ProductInput = Omit<Product, 'status'>;

/** Ligne de panier minimale (indépendante du composant React). */
export interface CartLine {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  unit: string;
}

/** Indicateurs synthétiques affichés sur l'accueil. */
export interface Kpis {
  dailyRevenue: number;
  monthlyRevenue: number;
  margin: number;
  outstandingCredits: number;
  monthlyExpenses: number;
  stockAlerts: number;
}

/** Point d'une série temporelle (graphiques). */
export interface SeriesPoint {
  date: string;
  label?: string;
  value: number;
}

/** Tranche d'une répartition (canaux, postes de dépenses). */
export interface BreakdownSlice {
  key: string;
  label: string;
  amount: number;
}

// ---------------------------------------------------------------------------
// Compte, commerce et abonnement (servis par `services/` — mock ou backend).
// ---------------------------------------------------------------------------

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  phone: string;
  email: string;
}

export interface BusinessProfile {
  id: string;
  name: string;
  activity: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  taxId: string;
  currency: string;
  registerLabel: string;
  /** Heure de clôture de caisse recommandée (« HH:MM »). */
  closingTime: string;
}

export type BillingCycle = 'monthly' | 'yearly';

export interface SubscriptionPlan {
  id: string;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: string[];
}

export interface Invoice {
  id: string;
  date: string;
  amount: number;
  paymentMethod: string;
  status: 'Payée' | 'En attente';
}

export interface Subscription {
  plan: SubscriptionPlan;
  cycle: BillingCycle;
  renewalDate: string;
  paymentMethod: string;
  autoRenew: boolean;
  invoices: Invoice[];
}

/** Session courante : utilisateur, commerce et abonnement. */
export interface Session {
  user: UserProfile;
  business: BusinessProfile;
  subscription: Subscription;
}
