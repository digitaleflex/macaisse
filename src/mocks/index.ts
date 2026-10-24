/**
 * Données de démonstration centralisées. Consommées uniquement par :
 * - `services/adapters/mock` (réponses simulées du backend) ;
 * - les stores, comme état initial par organisation en mode `mock`.
 * Aucun composant UI n'importe ce module.
 */
import type { ClientCredit, Expense, NotificationItem, Product, SaleTransaction } from '@/types';
import {
  SEED_CREDITS,
  SEED_EXPENSES,
  SEED_NOTIFICATIONS,
  SEED_PRODUCTS,
  SEED_SALES,
} from './fixtures/business';
import {
  BAOBAB_CREDITS,
  BAOBAB_EXPENSES,
  BAOBAB_NOTIFICATIONS,
  BAOBAB_PRODUCTS,
  BAOBAB_SALES,
} from './fixtures/baobab';

export { SEED_PRODUCTS, SEED_SALES, SEED_EXPENSES, SEED_CREDITS, SEED_NOTIFICATIONS };
export {
  DEFAULT_ORG_ID,
  DEMO_PASSWORD,
  MOCK_ACCOUNTS,
  MOCK_MEMBERSHIPS,
  MOCK_ORGANIZATIONS,
  trialSubscription,
} from './fixtures/accounts';
export type { MockAccount, MockMembership, MockOrganization } from './fixtures/accounts';

/** Jeu de données métier d'une organisation. */
export interface OrgSeed {
  products: Product[];
  sales: SaleTransaction[];
  expenses: Expense[];
  credits: ClientCredit[];
  notifications: NotificationItem[];
}

export const EMPTY_ORG_SEED: OrgSeed = { products: [], sales: [], expenses: [], credits: [], notifications: [] };

export const ORG_SEEDS: Record<string, OrgSeed> = {
  'org-etoile': {
    products: SEED_PRODUCTS,
    sales: SEED_SALES,
    expenses: SEED_EXPENSES,
    credits: SEED_CREDITS,
    notifications: SEED_NOTIFICATIONS,
  },
  'org-baobab': {
    products: BAOBAB_PRODUCTS,
    sales: BAOBAB_SALES,
    expenses: BAOBAB_EXPENSES,
    credits: BAOBAB_CREDITS,
    notifications: BAOBAB_NOTIFICATIONS,
  },
};

/** Données de démonstration d'une organisation (vides pour une organisation créée). */
export function orgSeed(organizationId: string): OrgSeed {
  return structuredClone(ORG_SEEDS[organizationId] ?? EMPTY_ORG_SEED);
}
