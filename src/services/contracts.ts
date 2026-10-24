import type {
  CartLine,
  ClientCredit,
  Expense,
  NotificationItem,
  Product,
  SaleTransaction,
  Session,
} from '@/types';

/**
 * Contrats des dépôts distants. Deux implémentations : `adapters/mock` (démo,
 * en mémoire) et `adapters/http` (backend REST). Les stores ne connaissent que
 * cette interface, jamais l'adaptateur concret.
 */

export interface SessionRepository {
  get(): Promise<Session>;
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
  session: SessionRepository;
  products: ProductsRepository;
  sales: SalesRepository;
  expenses: ExpensesRepository;
  credits: CreditsRepository;
  notifications: NotificationsRepository;
}
