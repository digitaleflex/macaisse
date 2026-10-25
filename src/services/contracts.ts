import type {
  AuthResult,
  CartLine,
  DemoAccount,
  ClientCredit,
  EmailChallenge,
  Expense,
  GoogleIdentity,
  NotificationItem,
  Product,
  SaleTransaction,
  InviteMemberInput,
  Invitation,
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
  restock(id: string, quantity: number): Promise<Product>;
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

export interface SalesRepository {
  list(): Promise<SaleTransaction[]>;
  create(payload: CreateSalePayload): Promise<SaleTransaction>;
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

export interface Api {
  /** `mock` ou `http` : utile pour l'affichage d'un badge « Démo ». */
  readonly mode: 'mock' | 'http';
  auth: AuthRepository;
  session: SessionRepository;
  team: TeamRepository;
  products: ProductsRepository;
  sales: SalesRepository;
  expenses: ExpensesRepository;
  credits: CreditsRepository;
  notifications: NotificationsRepository;
}
