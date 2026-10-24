// Chargement initial des données depuis `services/`. En mode `http`, les
// collections du backend remplacent l'état local ; en mode `mock`, seule la
// session est relue (les stores persistés localement font foi).

import { api, isApiError } from '@/services';
import { useCreditsStore } from './useCreditsStore';
import { useExpensesStore } from './useExpensesStore';
import { useNotificationsStore } from './useNotificationsStore';
import { useProductsStore } from './useProductsStore';
import { useSalesStore } from './useSalesStore';
import { useSessionStore } from './useSessionStore';

export async function bootstrapApp(): Promise<void> {
  const { setSession, setStatus } = useSessionStore.getState();
  if (useSessionStore.getState().session === null) setStatus('loading');

  try {
    const session = await api.session.get();
    setSession(session);

    if (api.mode !== 'http') return;

    const [products, sales, expenses, credits, notifications] = await Promise.all([
      api.products.list(),
      api.sales.list(),
      api.expenses.list(),
      api.credits.list(),
      api.notifications.list(),
    ]);
    useProductsStore.getState().setProducts(products);
    useSalesStore.setState({ sales });
    useExpensesStore.getState().setExpenses(expenses);
    useCreditsStore.setState({ credits });
    useNotificationsStore.setState({ notifications });
  } catch (error) {
    setStatus('error', isApiError(error) ? error.message : 'Chargement des données impossible.');
  }
}
