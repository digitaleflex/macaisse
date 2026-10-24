// Cloisonnement local des données par organisation : chaque store métier
// persiste sous `ma-caisse/<orgId>/<collection>`. Changer d'organisation
// redirige la persistance puis recharge l'état de la nouvelle organisation
// (stockage local s'il existe, sinon données initiales).

import { env } from '@/config/env';
import { EMPTY_ORG_SEED, orgSeed, type OrgSeed } from '@/mocks';
import { useCartStore } from './useCartStore';
import { useCreditsStore } from './useCreditsStore';
import { useExpensesStore } from './useExpensesStore';
import { useNotificationsStore } from './useNotificationsStore';
import { useProductsStore } from './useProductsStore';
import { useSalesStore } from './useSalesStore';

interface ScopableStore<S> {
  persist: {
    setOptions: (options: { name: string }) => void;
    rehydrate: () => Promise<void> | void;
  };
  setState: (partial: Partial<S>) => void;
}

export function scopedStorageKey(organizationId: string, collection: string): string {
  return `ma-caisse/${organizationId}/${collection}`;
}

function hasStoredData(key: string): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(key) !== null;
  } catch {
    return false;
  }
}

async function scope<S>(store: ScopableStore<S>, key: string, initial: Partial<S>): Promise<void> {
  store.persist.setOptions({ name: key });
  if (hasStoredData(key)) {
    await store.persist.rehydrate();
  } else {
    store.setState(initial);
  }
}

/**
 * Bascule tous les stores métier sur l'organisation donnée. En mode `mock`,
 * une organisation jamais ouverte démarre avec ses données de démonstration ;
 * en mode `http`, elle démarre vide puis est remplie par le backend.
 */
export async function scopeStoresToOrganization(organizationId: string): Promise<void> {
  const seed: OrgSeed = env.apiMode === 'mock' ? orgSeed(organizationId) : EMPTY_ORG_SEED;
  const key = (collection: string) => scopedStorageKey(organizationId, collection);

  await Promise.all([
    scope(useProductsStore, key('products'), { products: seed.products }),
    scope(useSalesStore, key('sales'), { sales: seed.sales, sequence: 0 }),
    scope(useExpensesStore, key('expenses'), { expenses: seed.expenses }),
    scope(useCreditsStore, key('credits'), { credits: seed.credits }),
    scope(useNotificationsStore, key('notifications'), { notifications: seed.notifications }),
    scope(useCartStore, key('cart'), { lines: [] }),
  ]);
}
