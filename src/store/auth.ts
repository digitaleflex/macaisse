// Orchestration de l'authentification et de l'organisation active :
// connexion, inscription, reprise de session, changement d'espace, déconnexion.
// Seul module autorisé à modifier le contexte `services/tenant`.

import type { AuthResult, DemoAccount, EmailChallenge, GoogleIdentity, Invitation, LoginInput, SignupInput } from '@/types';
import { t } from '@/content';
import { canAccessTab } from '@/domain/permissions';
import { api, isApiError, setActiveOrganization } from '@/services';
import { scopeStoresToOrganization } from './tenantScope';
import { useAuthStore } from './useAuthStore';
import { useCartStore } from './useCartStore';
import { useCreditsStore } from './useCreditsStore';
import { useExpensesStore } from './useExpensesStore';
import { useNotificationsStore } from './useNotificationsStore';
import { useProductsStore } from './useProductsStore';
import { useSalesStore } from './useSalesStore';
import { useSessionStore } from './useSessionStore';
import { useTeamStore } from './useTeamStore';
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

/**
 * Ouvre une organisation : cloisonne les stores, charge la session et les données.
 * Renvoie `false` en cas d'échec (la session passe en `error`) pour que l'appelant
 * n'annonce pas un succès qui n'a pas eu lieu (issue #10).
 */
export async function activateOrganization(organizationId: string): Promise<boolean> {
  const session = useSessionStore.getState();
  session.setStatus('loading');
  try {
    setActiveOrganization(organizationId);
    useTeamStore.getState().reset();
    await scopeStoresToOrganization(organizationId);
    const loaded = await api.session.get(organizationId);
    await loadCollections();
    useAuthStore.getState().setCurrentOrganization(organizationId);
    const ui = useUiStore.getState();
    ui.closeModal();
    ui.closeReceipt();
    if (!canAccessTab(loaded.role, ui.tab)) ui.setTab('ventes');
    useSessionStore.getState().setSession(loaded);
    return true;
  } catch (error) {
    session.setStatus('error', errorMessage(error, t.auth.errors.generic));
    if (isApiError(error) && error.status === 401) await logout();
    return false;
  }
}

function pickOrganization(result: AuthResult): string | null {
  const preferred = useAuthStore.getState().currentOrganizationId;
  if (preferred && result.memberships.some((m) => m.organizationId === preferred)) return preferred;
  return result.memberships[0]?.organizationId ?? null;
}

async function applyAuth(result: AuthResult): Promise<void> {
  useAuthStore.getState().setAuth(result);
  const organizationId = pickOrganization(result);
  if (organizationId) await activateOrganization(organizationId);
  else useSessionStore.getState().setStatus('error', t.auth.noOrgText);
}

/** Comptes proposés sur l'écran de connexion (vide hors mode démo). */
export async function loadDemoAccounts(): Promise<DemoAccount[]> {
  return api.auth.demoAccounts();
}

/** Invitations en attente pour l'utilisateur connecté. */
export async function loadInvitations(): Promise<Invitation[]> {
  return api.auth.invitations();
}

/**
 * Accepte une invitation puis ouvre l'espace concerné. L'acceptation est
 * explicite : sans elle, l'appartenance reste `invited` et l'accès est refusé.
 */
export async function acceptInvitation(organizationId: string): Promise<void> {
  await applyAuth(await api.auth.acceptInvitation(organizationId));
}

export async function login(input: LoginInput): Promise<void> {
  await applyAuth(await api.auth.login(input));
}

/**
 * Connexion / création de compte par Google (décision D3). En démo, l'identité
 * est simulée par l'appelant ; en production, le serveur reçoit un code PKCE et
 * ne voit jamais une identité auto-déclarée.
 */
export async function signInWithGoogle(identity: GoogleIdentity): Promise<void> {
  await applyAuth(await api.auth.googleSignIn(identity));
}

export async function signup(input: SignupInput): Promise<void> {
  useAuthStore.getState().setCurrentOrganization(null);
  await applyAuth(await api.auth.signup(input));
}

/**
 * Reprise au démarrage : le cookie de session est revalidé par `GET /auth/me`.
 * Un utilisateur persisté n'est qu'un indice d'interface — jamais une preuve.
 */
export async function restoreSession(): Promise<void> {
  if (!useAuthStore.getState().user) return;
  try {
    await applyAuth(await api.auth.me());
  } catch (error) {
    if (isApiError(error) && (error.status === 401 || error.status === 403)) await logout();
    else useSessionStore.getState().setStatus('error', errorMessage(error, t.auth.errors.generic));
  }
}

/** Envoie (ou renvoie) le code de vérification de l'adresse du compte courant. */
export async function requestEmailVerification(): Promise<EmailChallenge> {
  return api.auth.requestEmailVerification();
}

/** Confirme le code de vérification et met à jour le profil connecté. */
export async function verifyEmail(code: string): Promise<void> {
  const result = await api.auth.verifyEmail({ code });
  useAuthStore.getState().setAuth(result);
}

export async function switchOrganization(organizationId: string): Promise<boolean> {
  if (organizationId === useAuthStore.getState().currentOrganizationId && useSessionStore.getState().session) {
    return true;
  }
  return activateOrganization(organizationId);
}

/** Recharge l'organisation active (bouton « Synchroniser »). */
export async function reloadOrganization(): Promise<boolean> {
  const organizationId = useAuthStore.getState().currentOrganizationId;
  if (organizationId === null) return false;
  return activateOrganization(organizationId);
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
  setActiveOrganization(null);
  useAuthStore.getState().reset();
  useSessionStore.getState().clear();
  useUiStore.getState().closeModal();
  useUiStore.getState().closeReceipt();
  useTeamStore.getState().reset();
  // Le panier est cloisonné par organisation, pas par utilisateur : sur un poste
  // partagé, le caissier suivant ne doit pas retrouver la vente du précédent.
  useCartStore.getState().clear();
}
