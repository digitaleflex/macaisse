// Types métier partagés — source unique de vérité pour toutes les lanes.
// Les identifiants créés à l'exécution sont des `string` (voir `domain/ids.ts`).

export type TabType = 'accueil' | 'ventes' | 'stock' | 'credits' | 'bilan';

export type StockStatus = 'disponible' | 'faible' | 'rupture';

/**
 * Statut d'un crédit. Identifiants d'API stables (anglais, snake_case) ; les
 * libellés français vivent dans `@/content` (`t.status.credit`).
 */
export type CreditStatus = 'overdue' | 'partial' | 'pending' | 'settled';

/**
 * Moyen de paiement. Identifiants d'API stables : ils ne changent jamais, même
 * si un libellé est retraduit ou reformulé (libellés : `config/reference.ts`).
 *
 * `credit` n'est pas un instrument de paiement mais le choix « à crédit » de la
 * caisse (reste dû lié à un client) ; voir `TenderMethod` pour l'argent reçu.
 */
export type PaymentMethod =
  | 'cash'
  | 'mtn_money'
  | 'moov_money'
  | 'orange_money'
  | 'wave'
  | 'celtiis_cash'
  | 'card'
  | 'credit'
  | 'other';

/** Moyen par lequel de l'argent a réellement été reçu ou versé (tout sauf `credit`). */
export type TenderMethod = Exclude<PaymentMethod, 'credit'>;

/** Famille d'un moyen de paiement. */
export type PaymentKind = 'cash' | 'mobile_money' | 'card' | 'credit' | 'other';

/**
 * Canal d'encaissement : `manual` = l'argent est reçu directement par le
 * commerçant (espèces, transfert sur son numéro) ; `fedapay` / `kkiapay` =
 * collecte en ligne via un agrégateur, avec transaction et statut.
 */
export type PaymentProvider = 'manual' | 'fedapay' | 'kkiapay';

/** Statut d'une vente. Identifiants d'API stables (libellés : `t.status.sale`). */
export type SaleStatus = 'completed' | 'partial' | 'pending' | 'cancelled';

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
  /** Vendeur ayant encaissé (renseigné à la vente ; absent des ventes plus anciennes). */
  sellerId?: string;
  sellerName?: string;
  /**
   * Détail des articles vendus (client uniquement : le serveur détient les siens).
   * Permet de remettre le stock à jour à l'annulation ; absent pour les ventes
   * chargées depuis le serveur ou antérieures à cette fonction.
   */
  lines?: CartLine[];
  /** Crédit né de cette vente (règlement partiel), s'il existe. */
  creditId?: string;
  /** Renseignés uniquement quand `status === 'Annulée'` (EF-15, RG-09). */
  cancelledAt?: string; // ISO 8601
  cancelledBy?: string; // nom de l'auteur
  cancelReason?: string;
}

export interface Expense {
  id: string;
  title: string;
  date: string;
  time?: string;
  amount: number;
  category: string;
  paymentMethod: TenderMethod;
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
  /** Vente d'origine quand le crédit naît d'un règlement partiel. */
  saleId?: string;
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
  /** Adresse e-mail prouvée par OTP (ou par le fournisseur d'identité Google). */
  emailVerified: boolean;
  /**
   * Fin du délai de grâce de 72 h pour vérifier l'e-mail (ISO 8601).
   * `null` quand l'adresse est déjà vérifiée (RG-A27/RG-A28).
   */
  emailVerificationDueAt: string | null;
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
  /**
   * Date (ISO) à laquelle l'onboarding a été terminé. `null`/absent = à faire :
   * le shell propose alors les 2 étapes de mise en route (RG-A04).
   */
  onboardedAt?: string | null;
}

/** Ce que l'onboarding enregistre sur le commerce (RG-A04). */
export interface OnboardingInput {
  name: string;
  city: string;
  phone: string;
  activity: string;
}

/** Champs personnels modifiables depuis le profil (D4/A8). */
export interface ProfileInput {
  firstName: string;
  lastName: string;
  phone: string;
}

/** Défi de réinitialisation de mot de passe (D4). */
export interface PasswordResetChallenge {
  email: string;
  /** Durée de vie du code, en secondes (600 = 10 min). */
  expiresIn: number;
  sentAt: string;
  /** Mode démo uniquement : le code est affiché pour pouvoir tester. */
  demoCode?: string;
}

/**
 * Appareil de caisse enrôlé (D6). Un appareil enrôlé porte un PIN local qui
 * permet d'ouvrir la caisse **hors ligne** ; sa révocation invalide la session.
 */
export interface Device {
  id: string;
  organizationId: string;
  name: string;
  memberId: string;
  memberName: string;
  enrolledBy: string;
  /** Date (ISO) d'enrôlement. */
  enrolledAt: string;
  /** Dernier contact connu ; `null` = jamais revu depuis l'enrôlement. */
  lastSeenAt: string | null;
  /** Date (ISO) de révocation ; `null` = appareil actif. */
  revokedAt: string | null;
}

/** Résultat d'un enrôlement (le jeton sert à définir le PIN du titulaire). */
export interface DeviceEnrollment {
  device: Device;
  pinSetupToken: string;
}

/** Demande d'enrôlement d'un appareil (owner + step-up côté serveur). */
export interface EnrollDeviceInput {
  name: string;
  memberId: string;
}

/** Méthode d'authentification journalisée (RG-A20). */
export type AuthEventMethod = 'password' | 'google' | 'otp_phone' | 'otp_email' | 'reset' | 'step_up';

/** Événement d'authentification exposé au titulaire (RG-A20). */
export interface AuthEvent {
  id: string;
  /** Date et heure (ISO 8601). */
  at: string;
  method: AuthEventMethod;
  result: 'success' | 'failure';
  ip: string;
  userAgent: string;
  deviceId: string | null;
}

/** Réauthentification courte avant une action sensible (D9). */
export interface StepUpInput {
  password: string;
}

/** Vérification distante du PIN (télémétrie et compteur partagé). */
export interface PinVerifyInput {
  deviceId: string;
  memberId: string;
  pin: string;
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
  paymentMethod: TenderMethod;
  /** `paid` = payée, `pending` = en attente (libellés : `t.status.invoice`). */
  status: 'paid' | 'pending';
}

export interface Subscription {
  plan: SubscriptionPlan;
  cycle: BillingCycle;
  renewalDate: string;
  /** Moyen enregistré pour le renouvellement ; `null` pendant l'essai gratuit. */
  paymentMethod: TenderMethod | null;
  autoRenew: boolean;
  invoices: Invoice[];
}

/** Statut d'une tentative de paiement en ligne (identifiants d'API stables). */
export type PaymentIntentStatus = 'pending' | 'succeeded' | 'failed' | 'expired' | 'cancelled';

/**
 * Ce que le client doit faire pour finir le paiement :
 * - `push` : l'opérateur mobile money envoie une demande de validation sur le téléphone ;
 * - `redirect` : le client termine sur la page de paiement sécurisée de l'agrégateur (carte).
 */
export type CheckoutInstruction = { type: 'push' } | { type: 'redirect'; url: string };

/** Demande de paiement de l'abonnement de la plateforme. Le montant n'est JAMAIS envoyé : le serveur le calcule. */
export interface SubscriptionPaymentInput {
  /** Identifiant généré par le client : rejouer la demande ne débite pas deux fois. */
  id: string;
  planId: string;
  cycle: BillingCycle;
  paymentMethod: TenderMethod;
  /** Numéro qui reçoit la demande de validation, format international ; requis pour le mobile money. */
  phone?: string;
}

/** Tentative de paiement de l'abonnement via un agrégateur (FedaPay ou KKiaPay, choisi par le serveur). */
export interface PaymentIntent {
  id: string;
  purpose: 'subscription';
  provider: Exclude<PaymentProvider, 'manual'>;
  status: PaymentIntentStatus;
  paymentMethod: TenderMethod;
  planId: string;
  cycle: BillingCycle;
  /** FCFA entiers, calculés par le serveur. */
  amount: number;
  createdAt: string;
  /** Au-delà, une tentative encore `pending` passe à `expired`. */
  expiresAt: string;
  checkout: CheckoutInstruction;
  /** Message lisible en français quand `status` vaut `failed`. */
  failureReason?: string;
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

/** Code de vérification envoyé à l'adresse du compte (RG-A27). */
export interface EmailChallenge {
  email: string;
  /** Durée de vie du code, en secondes (600 = 10 min). */
  expiresIn: number;
  sentAt: string;
}

/** Canal d'envoi d'un code téléphone (RG-A23). */
export type OtpChannel = 'whatsapp_user' | 'whatsapp' | 'sms';

/** Défi de connexion par téléphone (D2). */
export interface PhoneChallenge {
  challengeId: string;
  phone: string;
  channel: OtpChannel;
  /** Durée de vie du code, en secondes (300 = 5 min). */
  expiresIn: number;
  /** Secondes avant de pouvoir redemander un code. */
  retryAfter: number;
  /** Mode démo uniquement : le code est affiché pour pouvoir tester. */
  demoCode?: string;
}

/** Demande / vérification d'un code téléphone. */
export interface PhoneVerifyInput {
  challengeId: string;
  code: string;
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
