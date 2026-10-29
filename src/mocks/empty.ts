/**
 * Substitut de `@/mocks` quand les mocks sont désactivés.
 *
 * `vite.config.ts` alias `@/mocks` et `@/mocks/fixtures/accounts` vers ce module
 * dès que le mode est `http` : les fixtures de démonstration ne sont alors jamais
 * incluses dans le bundle, et toute donnée simulée devient vide.
 *
 * Surface strictement identique à `./index.ts` (mêmes noms, mêmes types) : les
 * consommateurs (stores, adaptateur, `config/reference.ts`) n'ont rien à changer.
 * Les types sont importés en `import type` : effacés à la compilation, ils
 * n'entraînent aucune fixture dans le graphe d'exécution.
 */
import type {
  ClientCredit,
  Expense,
  NotificationItem,
  Product,
  SaleTransaction,
  Subscription,
} from '@/types';
import type { MockAccount, MockMembership, MockOrganization } from './fixtures/accounts';

export type { MockAccount, MockMembership, MockOrganization };

export const SEED_PRODUCTS: Product[] = [];
export const SEED_SALES: SaleTransaction[] = [];
export const SEED_EXPENSES: Expense[] = [];
export const SEED_CREDITS: ClientCredit[] = [];
export const SEED_NOTIFICATIONS: NotificationItem[] = [];

export const DEFAULT_ORG_ID = '';
export const DEMO_PASSWORD = '';
export const MOCK_ACCOUNTS: MockAccount[] = [];
export const MOCK_ORGANIZATIONS: Record<string, MockOrganization> = {};
export const MOCK_MEMBERSHIPS: MockMembership[] = [];

export function trialSubscription(): Subscription {
  throw new Error(
    'Mocks désactivés : aucun abonnement de démonstration n’est disponible. ' +
      'Définissez VITE_API_MODE=mock pour un environnement de démonstration.',
  );
}

/** Jeu de données métier d'une organisation. */
export interface OrgSeed {
  products: Product[];
  sales: SaleTransaction[];
  expenses: Expense[];
  credits: ClientCredit[];
  notifications: NotificationItem[];
}

export const EMPTY_ORG_SEED: OrgSeed = {
  products: [],
  sales: [],
  expenses: [],
  credits: [],
  notifications: [],
};

export const ORG_SEEDS: Record<string, OrgSeed> = {};

/** En mode réel, une organisation démarre toujours vide : le backend fait foi. */
export function orgSeed(organizationId?: string): OrgSeed {
  void organizationId; // signature conservée : le seed ne dépend plus de l'organisation
  return structuredClone(EMPTY_ORG_SEED);
}
