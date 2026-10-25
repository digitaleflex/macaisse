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

// ---------------------------------------------------------------------------
// Multi-organisation (SaaS) : comptes, appartenances, rôles.
// ---------------------------------------------------------------------------

/** Rôle d'un membre dans une organisation. */
export type Role = 'owner' | 'manager' | 'cashier';

/** Appartenance d'un utilisateur à une organisation. */
export interface Membership {
  organizationId: string;
  organizationName: string;
  city: string;
  role: Role;
}

/** Invitation en attente d'acceptation pour l'utilisateur connecté. */
export interface Invitation extends Membership {
  /** Date d'envoi de l'invitation (ISO). */
  invitedAt: string;
}

/** Résultat d'une authentification (connexion, inscription, reprise de session). */
export interface AuthResult {
  user: UserProfile;
  memberships: Membership[];
  /**
   * Expiration (ISO 8601) de l'access token porté par le cookie de session.
   * Aucun jeton n'est renvoyé dans le corps : la session vit dans des cookies
   * `HttpOnly` (décision D1, `docs/AUTH_DECISIONS.md`).
   */
  expiresAt: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

/**
 * Identité Google simulée par l'adaptateur de démonstration. En production, le
 * client enverra un code d'autorisation PKCE et l'échange se fera côté serveur
 * (décision D3, `docs/AUTH_DECISIONS.md`).
 */
export interface GoogleIdentity {
  email: string;
  firstName: string;
  lastName: string;
}

export interface SignupInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  organizationName: string;
  activity: string;
  city: string;
}

/** Compte de démonstration proposé sur l'écran de connexion (mode `mock` uniquement). */
export interface DemoAccount {
  email: string;
  password: string;
  fullName: string;
  initials: string;
  organizations: { name: string; role: Role }[];
}

/** Membre de l'équipe d'une organisation. */
export interface TeamMember {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: Role;
  status: 'active' | 'invited';
  joinedAt: string;
}

export interface InviteMemberInput {
  firstName: string;
  lastName: string;
  email: string;
  role: Exclude<Role, 'owner'>;
}

/**
 * Session de travail : utilisateur connecté DANS une organisation donnée
 * (son profil de commerce, son abonnement et le rôle de l'utilisateur).
 */
export interface Session {
  user: UserProfile;
  business: BusinessProfile;
  subscription: Subscription;
  role: Role;
}
