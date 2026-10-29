// Orchestration de l'authentification et de l'organisation active :
// connexion, inscription, reprise de session, changement d'espace, déconnexion.
// Seul module autorisé à modifier le contexte `services/tenant`.

import type {
  AuthEvent,
  AuthResult,
  DemoAccount,
  EmailChallenge,
  GoogleIdentity,
  Invitation,
  LoginInput,
  OnboardingInput,
  PasswordResetChallenge,
  PhoneChallenge,
  PhoneVerifyInput,
  ProfileInput,
  SignupInput,
} from '@/types';
import { t } from '@/content';
import { canAccessTab } from '@/domain/permissions';
import { api, getActiveOrganization, isApiError, setActiveOrganization } from '@/services';
import { scopeStoresToOrganization } from './tenantScope';
import { purgeLocalBusinessData } from './localData';
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
 *
 * **Invariant** : le tenant (`services/tenant`), `useAuthStore.currentOrganizationId`
 * et `useSessionStore.session` désignent toujours la même organisation. L'accès est
 * donc validé **avant** toute bascule, et un échec survenu après la bascule est
 * annulé : une activation refusée ne laisse aucune trace, sinon les requêtes
 * suivantes partent sur une organisation interdite (403 « accès à cette
 * organisation » sans lien apparent avec l'action de l'utilisateur).
 */
export async function activateOrganization(organizationId: string): Promise<boolean> {
  const session = useSessionStore.getState();
  session.setStatus('loading');

  const previous = {
    organizationId: getActiveOrganization(),
    current: useAuthStore.getState().currentOrganizationId,
  };
  let switched = false;

  try {
    // 1. Valider l'accès. `session.get` porte l'`orgId` en clair : il ne dépend
    // pas du tenant, on peut donc l'appeler avant de basculer quoi que ce soit.
    const loaded = await api.session.get(organizationId);

    // 2. Basculer les trois sources de vérité ensemble.
    setActiveOrganization(organizationId);
    useAuthStore.getState().setCurrentOrganization(organizationId);
    useTeamStore.getState().reset();
    await scopeStoresToOrganization(organizationId);
    switched = true;

    await loadCollections();
    const ui = useUiStore.getState();
    ui.closeModal();
    ui.closeReceipt();
    if (!canAccessTab(loaded.role, ui.tab)) ui.setTab('ventes');
    useSessionStore.getState().setSession(loaded);
    return true;
  } catch (error) {
    if (switched) await restoreOrganization(previous);
    session.setStatus('error', errorMessage(error, t.auth.errors.generic));
    if (isApiError(error) && error.status === 401) await logout();
    return false;
  }
}

/** Annule une bascule déjà appliquée (échec survenu après `setActiveOrganization`). */
async function restoreOrganization(previous: {
  organizationId: string | null;
  current: string | null;
}): Promise<void> {
  setActiveOrganization(previous.organizationId);
  useAuthStore.getState().setCurrentOrganization(previous.current);
  useTeamStore.getState().reset();
  if (previous.organizationId !== null) await scopeStoresToOrganization(previous.organizationId);
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

/** Demande un code de connexion par téléphone (D2, WhatsApp). */
export async function requestPhoneLoginCode(phone: string): Promise<PhoneChallenge> {
  return api.auth.requestPhoneCode(phone);
}

/**
 * Vérifie le code téléphone : connecte le compte existant ou crée le commerce
 * si le numéro est inconnu (RG-A09 : la distinction n'est faite qu'ici).
 */
export async function verifyPhoneCode(input: PhoneVerifyInput): Promise<void> {
  await applyAuth(await api.auth.verifyPhoneCode(input));
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

/** Met à jour le profil personnel et rafraîchit compte + session. */
export async function updateProfile(input: ProfileInput): Promise<void> {
  const result = await api.auth.updateProfile(input);
  useAuthStore.getState().setAuth(result);
  useSessionStore.getState().setUser(result.user);
}

/** Enregistre les informations du commerce depuis le profil (sans onboarding). */
export async function saveBusiness(input: OnboardingInput): Promise<void> {
  const organizationId = useAuthStore.getState().currentOrganizationId;
  if (!organizationId) throw new Error('Aucune organisation active.');
  const business = await api.onboarding.update(organizationId, input);
  useSessionStore.getState().setBusiness(business);
}

/** Demande un code de réinitialisation (réponse constante, RG-A09). */
export async function requestPasswordReset(email: string): Promise<PasswordResetChallenge> {
  return api.auth.requestPasswordReset(email);
}

/** Réauthentification courte (D9) : 5 minutes, sans invalider la session. */
export async function stepUp(password: string): Promise<void> {
  await api.auth.stepUp({ password });
}

/** Journal des 10 dernières connexions du titulaire (RG-A20). */
export async function loadAuthEvents(): Promise<AuthEvent[]> {
  return api.auth.events();
}

/** Supprime le compte (anonymisation RG-A21) puis ferme la session. */
export async function deleteAccount(input: { password: string; confirmation: string }): Promise<void> {
  await api.auth.deleteAccount(input);
  await logout();
}

/** Remplace le mot de passe après vérification du code. Aucune session ouverte. */
export async function resetPassword(input: {
  email: string;
  code: string;
  password: string;
}): Promise<void> {
  await api.auth.resetPassword(input);
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
 * Déconnexion : invalidation serveur, puis **purge locale** (RG-A13).
 *
 * Sur un poste partagé, aucune donnée métier ne doit survivre : les collections
 * sont effacées du stockage local et remises à vide en mémoire, sinon le
 * caissier suivant lit les ventes et les clients du précédent.
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
  // Données métier : on vide d'abord l'état mémoire (ce qui réécrit les clés
  // avec des collections vides), puis on supprime les clés — l'ordre inverse
  // laisserait réapparaître un blob après la purge.
  useProductsStore.getState().setProducts([]);
  useSalesStore.setState({ sales: [] });
  useExpensesStore.getState().setExpenses([]);
  useCreditsStore.setState({ credits: [] });
  useNotificationsStore.getState().clear();
  // Le panier est cloisonné par organisation, pas par utilisateur : sur un poste
  // partagé, le caissier suivant ne doit pas retrouver la vente du précédent.
  useCartStore.getState().clear();
  purgeLocalBusinessData();
}
