// Orchestration de l'authentification et de l'organisation active :
// connexion, inscription, reprise de session, changement d'espace, déconnexion.
// Seul module autorisé à modifier le contexte `services/tenant`.

import type { AuthResult, LoginInput, SignupInput } from '@/types';
import { t } from '@/content';
import { canAccessTab } from '@/domain/permissions';
import { api, isApiError, setActiveOrganization, setAuthToken } from '@/services';
import { scopeStoresToOrganization } from './tenantScope';
import { useAuthStore } from './useAuthStore';
import { useCreditsStore } from './useCreditsStore';
import { useExpensesStore } from './useExpensesStore';
import { useNotificationsStore } from './useNotificationsStore';
import { useProductsStore } from './useProductsStore';
import { useSalesStore } from './useSalesStore';
import { useSessionStore } from './useSessionStore';
import { useUiStore } from './useUiStore';

function errorMessage(error: unknown, fallback: string): string {
  return isApiError(error) ? error.message : fallback;
}

/** En mode `http`, recharge les collections de l'organisation active. */
async function loadCollections(): Promise<void> {
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
}

/** Ouvre une organisation : cloisonne les stores, charge la session et les données. */
export async function activateOrganization(organizationId: string): Promise<void> {
  const session = useSessionStore.getState();
  session.setStatus('loading');
  try {
    setActiveOrganization(organizationId);
    await scopeStoresToOrganization(organizationId);
    const loaded = await api.session.get(organizationId);
    await loadCollections();
    useAuthStore.getState().setCurrentOrganization(organizationId);
    const ui = useUiStore.getState();
    ui.closeModal();
    ui.closeReceipt();
    if (!canAccessTab(loaded.role, ui.tab)) ui.setTab('ventes');
    useSessionStore.getState().setSession(loaded);
  } catch (error) {
    session.setStatus('error', errorMessage(error, t.auth.errors.generic));
    if (isApiError(error) && error.status === 401) await logout();
  }
}

function pickOrganization(result: AuthResult): string | null {
  const preferred = useAuthStore.getState().currentOrganizationId;
  if (preferred && result.memberships.some((m) => m.organizationId === preferred)) return preferred;
  return result.memberships[0]?.organizationId ?? null;
}

async function applyAuth(result: AuthResult): Promise<void> {
  setAuthToken(result.token);
  useAuthStore.getState().setAuth(result);
  const organizationId = pickOrganization(result);
  if (organizationId) await activateOrganization(organizationId);
  else useSessionStore.getState().setStatus('error', t.auth.noOrgText);
}

export async function login(input: LoginInput): Promise<void> {
  await applyAuth(await api.auth.login(input));
}

export async function signup(input: SignupInput): Promise<void> {
  useAuthStore.getState().setCurrentOrganization(null);
  await applyAuth(await api.auth.signup(input));
}

/** Reprise au démarrage : revalide le jeton persisté et rouvre l'organisation. */
export async function restoreSession(): Promise<void> {
  const { token } = useAuthStore.getState();
  if (!token) return;
  setAuthToken(token);
  try {
    await applyAuth({ ...(await api.auth.me()), token });
  } catch (error) {
    if (isApiError(error) && (error.status === 401 || error.status === 403)) await logout();
    else useSessionStore.getState().setStatus('error', errorMessage(error, t.auth.errors.generic));
  }
}

export async function switchOrganization(organizationId: string): Promise<void> {
  if (organizationId === useAuthStore.getState().currentOrganizationId && useSessionStore.getState().session) return;
  await activateOrganization(organizationId);
}

/** Recharge l'organisation active (bouton « Synchroniser »). */
export async function reloadOrganization(): Promise<void> {
  const organizationId = useAuthStore.getState().currentOrganizationId;
  if (organizationId) await activateOrganization(organizationId);
}

/**
 * Déconnexion : les données locales restent rangées sous la clé de leur
 * organisation ; seuls le jeton, la session et le contexte sont effacés.
 */
export async function logout(): Promise<void> {
  try {
    await api.auth.logout();
  } catch {
    // Déconnexion locale même si le serveur est injoignable.
  }
  setAuthToken(null);
  setActiveOrganization(null);
  useAuthStore.getState().reset();
  useSessionStore.getState().clear();
  useUiStore.getState().closeModal();
  useUiStore.getState().closeReceipt();
}
