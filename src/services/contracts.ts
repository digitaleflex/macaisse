import type {
  AuthEvent,
  AuthResult,
  BusinessProfile,
  CartLine,
  ClientCredit,
  DemoAccount,
  Device,
  DeviceEnrollment,
  EmailChallenge,
  EnrollDeviceInput,
  Expense,
  GoogleIdentity,
  NotificationItem,
  OnboardingInput,
  PasswordResetChallenge,
  PaymentIntent,
  PhoneChallenge,
  PhoneVerifyInput,
  PinVerifyInput,
  Product,
  ProfileInput,
  SaleTransaction,
  StepUpInput,
  StockAdjustmentInput,
  StockMovement,
  StockMovementType,
  SubscriptionPaymentInput,
  SubscriptionPlan,
  InviteMemberInput,
  Invitation,
  InventoryCount,
  LoginInput,
  Role,
  Session,
  SignupInput,
  TeamMember,
} from '@/types';

/**
 * Contrats des dépôts distants. Deux implémentations : `adapters/mock` (démo,
 * en mémoire) et `adapters/http` (backend REST). Les stores ne connaissent que
 * cette interface, jamais l'adaptateur concret.
 *
 * Les dépôts métier (produits, ventes…) s'appliquent à l'organisation active
 * (`services/tenant.ts`) ; auth, session et équipe reçoivent l'organisation
 * explicitement.
 */

export interface AuthRepository {
  login(input: LoginInput): Promise<AuthResult>;
  signup(input: SignupInput): Promise<AuthResult>;
  /** Envoie un code à usage unique au téléphone (D2, RG-A07/A08/A09). */
  requestPhoneCode(phone: string): Promise<PhoneChallenge>;
  /** Vérifie le code : connecte le compte ou le crée si le numéro est inconnu. */
  verifyPhoneCode(input: PhoneVerifyInput): Promise<AuthResult>;
  /**
   * Connexion par Google. En démo, l'identité est simulée ; un compte inconnu est
   * créé avec un espace « Mon commerce » (décision D3). En production, l'échange
   * PKCE est fait par le serveur et l'identité ne transite jamais par le client.
   */
  googleSignIn(identity: GoogleIdentity): Promise<AuthResult>;
  /** Reprise de session à partir du cookie courant. */
  me(): Promise<AuthResult>;
  /** Envoie un code à usage unique à l'adresse du compte (TTL 10 min, RG-A27). */
  requestEmailVerification(): Promise<EmailChallenge>;
  /** Vérifie le code et marque l'adresse comme prouvée. */
  verifyEmail(input: { code: string }): Promise<AuthResult>;
  /** Met à jour le profil personnel (nom, téléphone). */
  updateProfile(input: ProfileInput): Promise<AuthResult>;
  /** Envoie un code de réinitialisation (réponse constante, RG-A09). */
  requestPasswordReset(email: string): Promise<PasswordResetChallenge>;
  /** Remplace le mot de passe après vérification du code. */
  resetPassword(input: { email: string; code: string; password: string }): Promise<void>;
  /** Réauthentification courte (D9) : ouvre une fenêtre de 5 min. */
  stepUp(input: StepUpInput): Promise<{ ok: true }>;
  /** Journal des connexions du titulaire (RG-A20). */
  events(): Promise<AuthEvent[]>;
  /** Suppression du compte : anonymisation sous 30 j (RG-A21). */
  deleteAccount(input: { password: string; confirmation: string }): Promise<void>;
  logout(): Promise<void>;
  /** Comptes proposés sur l'écran de connexion (vide hors démo). */
  demoAccounts(): Promise<DemoAccount[]>;
  /** Invitations reçues par l'utilisateur connecté, en attente d'acceptation. */
  invitations(): Promise<Invitation[]>;
  /**
   * Accepte explicitement une invitation : l'appartenance passe de `invited` à
   * `active` et le résultat d'auth renvoyé contient la nouvelle liste.
   */
  acceptInvitation(organizationId: string): Promise<AuthResult>;
}

export interface SessionRepository {
  get(organizationId: string): Promise<Session>;
}

/** Mise en route d'une organisation (RG-A04). */
export interface OnboardingRepository {
  /** Enregistre les informations du commerce et clôt l'onboarding. */
  complete(organizationId: string, input: OnboardingInput): Promise<BusinessProfile>;
  /** Modifie les informations du commerce sans toucher à `onboardedAt`. */
  update(organizationId: string, input: OnboardingInput): Promise<BusinessProfile>;
}

/** Appareils de caisse et PIN (D6, RG-A15→A17). */
export interface DevicesRepository {
  list(organizationId: string): Promise<Device[]>;
  enroll(organizationId: string, input: EnrollDeviceInput): Promise<DeviceEnrollment>;
  revoke(organizationId: string, deviceId: string): Promise<void>;
  setPin(organizationId: string, userId: string, pin: string): Promise<void>;
  /** Vérification distante : sert au compteur d'échecs partagé. */
  verifyPin(input: PinVerifyInput): Promise<{ ok: true }>;
}

export interface TeamRepository {
  list(organizationId: string): Promise<TeamMember[]>;
  invite(organizationId: string, input: InviteMemberInput): Promise<TeamMember>;
  updateRole(organizationId: string, userId: string, role: Role): Promise<TeamMember>;
  remove(organizationId: string, userId: string): Promise<void>;
}

export interface ProductsRepository {
  list(): Promise<Product[]>;
  create(product: Product): Promise<Product>;
  update(id: string, patch: Partial<Product>): Promise<Product>;
  remove(id: string): Promise<void>;
  /** Réception de marchandise : crée un mouvement `purchase`. `reason` (fournisseur, bon de livraison) est facultatif. */
  restock(id: string, quantity: number, reason?: string): Promise<Product>;
}

export interface CreateSalePayload {
  sale: SaleTransaction;
  lines: CartLine[];
  /**
   * Créance créée par la vente (règlement partiel). Le serveur DOIT l'enregistrer
   * dans la même transaction que la vente : c'est la seule façon de garantir
   * qu'un encaissement à crédit ne se transforme pas en créance fantôme.
   */
  credit?: ClientCredit;
}

export interface StockAdjustmentResult {
  product: Product;
  movement: StockMovement;
}

export interface StockMovementQuery {
  productId?: string;
  type?: StockMovementType;
  /** Nombre maximal de mouvements renvoyés (les plus récents d'abord). */
  limit?: number;
}

/**
 * Journal de stock (EF-19, RG-05). Le stock ne change que par une vente, une annulation,
 * une réception ou une des corrections ci-dessous ; `PATCH /products/:id` ne le modifie jamais.
 */
export interface StockRepository {
  /** Mouvements, du plus récent au plus ancien. */
  movements(query?: StockMovementQuery): Promise<StockMovement[]>;
  /** Correction manuelle d'un produit (écart d'inventaire ou casse), motif obligatoire. */
  adjust(productId: string, input: StockAdjustmentInput): Promise<StockAdjustmentResult>;
  /**
   * Inventaire : applique tous les écarts en une seule transaction (tout ou rien) et renvoie
   * les mouvements créés. Les produits sans écart ne génèrent aucun mouvement.
   */
  inventory(input: { counts: InventoryCount[]; note?: string }): Promise<StockMovement[]>;
}

export interface SalesRepository {
  list(): Promise<SaleTransaction[]>;
  create(payload: CreateSalePayload): Promise<SaleTransaction>;
  /**
   * Annule une vente (jamais de suppression, RG-04) : motif obligatoire (RG-09),
   * stock remis, crédit lié supprimé. Renvoie la vente au statut « Annulée ».
   */
  cancel(id: string, reason: string): Promise<SaleTransaction>;
}

export interface ExpensesRepository {
  list(): Promise<Expense[]>;
  create(expense: Expense): Promise<Expense>;
  remove(id: string): Promise<void>;
}

export interface CreditsRepository {
  list(): Promise<ClientCredit[]>;
  create(credit: ClientCredit): Promise<ClientCredit>;
  pay(id: string, amount: number): Promise<ClientCredit>;
  remove(id: string): Promise<void>;
}

export interface NotificationsRepository {
  list(): Promise<NotificationItem[]>;
  markRead(id: string): Promise<void>;
  markAllRead(): Promise<void>;
}

/**
 * Paiement de l'abonnement de la plateforme via un agrégateur (FedaPay, KKiaPay).
 * Réservé au propriétaire. Le serveur calcule le montant, choisit l'agrégateur et ne
 * croit jamais le client : il confirme la transaction auprès de l'agrégateur.
 */
export interface BillingRepository {
  /** Forfaits proposés. */
  plans(organizationId: string): Promise<SubscriptionPlan[]>;
  /** Démarre un paiement. Idempotent : rejouer le même `id` renvoie la même tentative. */
  pay(organizationId: string, input: SubscriptionPaymentInput): Promise<PaymentIntent>;
  /** État d'une tentative ; à interroger tant qu'elle est `pending`. */
  payment(organizationId: string, paymentId: string): Promise<PaymentIntent>;
  /** Annule une tentative encore `pending` (`409` sinon). */
  cancel(organizationId: string, paymentId: string): Promise<PaymentIntent>;
}

export interface Api {
  /** `mock` ou `http` : utile pour l'affichage d'un badge « Démo ». */
  readonly mode: 'mock' | 'http';
  auth: AuthRepository;
  session: SessionRepository;
  onboarding: OnboardingRepository;
  devices: DevicesRepository;
  team: TeamRepository;
  billing: BillingRepository;
  products: ProductsRepository;
  stock: StockRepository;
  sales: SalesRepository;
  expenses: ExpensesRepository;
  credits: CreditsRepository;
  notifications: NotificationsRepository;
}
