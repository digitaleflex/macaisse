import type {
  AuthResult,
  ClientCredit,
  Expense,
  Membership,
  NotificationItem,
  Product,
  SaleTransaction,
  TeamMember,
  UserProfile,
} from '@/types';
import { t } from '@/content';
import { applyPayment } from '@/domain/credits';
import { createId } from '@/domain/ids';
import { toIsoDate } from '@/domain/dates';
import {
  DEMO_PASSWORD,
  MOCK_ACCOUNTS,
  MOCK_MEMBERSHIPS,
  MOCK_ORGANIZATIONS,
  orgSeed,
  trialSubscription,
  type MockAccount,
  type MockMembership,
  type MockOrganization,
} from '@/mocks';
import type { Api } from '../contracts';
import { ApiError } from '../http/ApiError';
import { requireOrganization } from '../tenant';

/**
 * Adaptateur de démonstration : simule le backend multi-organisation à partir
 * des fixtures de `@/mocks`. Comptes, organisations et appartenances sont
 * persistés dans `localStorage` (une inscription ou une invitation survit au
 * rechargement) ; les données métier sont en mémoire, par organisation.
 * Il respecte exactement le contrat `Api` : basculer vers `http` ne change pas l'UI.
 */

interface AuthDb {
  accounts: MockAccount[];
  organizations: Record<string, MockOrganization>;
  memberships: MockMembership[];
}

interface OrgDb {
  products: Product[];
  sales: SaleTransaction[];
  expenses: Expense[];
  credits: ClientCredit[];
  notifications: NotificationItem[];
}

const AUTH_DB_KEY = 'ma-caisse/mock-auth-db';
/**
 * Simulation du cookie de session : `localStorage` tient lieu de jar de cookies
 * en mode démo. La session n'est **jamais** rangée dans le store d'auth du client
 * (décision D1) ; elle est lue par l'adaptateur, comme le ferait le serveur.
 */
const SESSION_KEY = 'ma-caisse/mock-session';
const SESSION_TTL_MS = 15 * 60 * 1000;

interface MockSession {
  userId: string;
  /** Expiration en millisecondes epoch. */
  expiresAt: number;
}

const clone = <T>(value: T): T => structuredClone(value);

function defaultAuthDb(): AuthDb {
  return clone({ accounts: MOCK_ACCOUNTS, organizations: MOCK_ORGANIZATIONS, memberships: MOCK_MEMBERSHIPS });
}

function loadAuthDb(persist: boolean): AuthDb {
  if (!persist) return defaultAuthDb();
  try {
    const raw = localStorage.getItem(AUTH_DB_KEY);
    if (raw) return JSON.parse(raw) as AuthDb;
  } catch {
    // Stockage indisponible ou corrompu : on repart des fixtures.
  }
  return defaultAuthDb();
}

function loadSession(persist: boolean): MockSession | null {
  if (!persist) return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<MockSession>;
    if (typeof parsed.userId !== 'string' || typeof parsed.expiresAt !== 'number') return null;
    return parsed.expiresAt > Date.now() ? { userId: parsed.userId, expiresAt: parsed.expiresAt } : null;
  } catch {
    return null;
  }
}

function fail(message: string, status: number, code: string): never {
  throw new ApiError(message, status, code);
}

export interface MockApiOptions {
  latencyMs?: number;
  /** Persiste comptes / organisations / appartenances dans localStorage. */
  persist?: boolean;
}

export function createMockApi({ latencyMs = 0, persist = false }: MockApiOptions = {}): Api {
  const auth = loadAuthDb(persist);
  const orgData = new Map<string, OrgDb>();
  let session = loadSession(persist);

  const saveAuth = () => {
    if (!persist) return;
    try {
      localStorage.setItem(AUTH_DB_KEY, JSON.stringify(auth));
    } catch {
      // Quota atteint ou stockage désactivé : la démo continue en mémoire.
    }
  };

  /** Ouvre la « session » simulée (équivalent du cookie `mc_session`). */
  const openSession = (userId: string): void => {
    session = { userId, expiresAt: Date.now() + SESSION_TTL_MS };
    if (!persist) return;
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch {
      // Stockage indisponible : session en mémoire pour l'onglet courant.
    }
  };

  /** Ferme la session simulée (équivalent de `POST /auth/logout`). */
  const closeSession = (): void => {
    session = null;
    if (!persist) return;
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      // Rien à faire : la session mémoire est déjà nulle.
    }
  };

  const respond = <T>(compute: () => T): Promise<T> =>
    new Promise((resolve, reject) => {
      const run = () => {
        try {
          resolve(clone(compute()));
        } catch (error) {
          reject(error);
        }
      };
      if (latencyMs > 0) setTimeout(run, latencyMs);
      else queueMicrotask(run);
    });

  // --- Authentification & appartenances ------------------------------------

  const profileOf = (account: MockAccount): UserProfile => {
    const { password: _password, ...profile } = account;
    void _password;
    return profile;
  };

  const membershipsOf = (userId: string): Membership[] =>
    auth.memberships
      // Une invitation non acceptée ne donne aucun accès : elle n'apparaît pas
      // dans les appartenances (elle est exposée par `invitations()`).
      .filter((m) => m.userId === userId && m.status === 'active' && auth.organizations[m.organizationId])
      .map((m) => ({
        organizationId: m.organizationId,
        organizationName: auth.organizations[m.organizationId].business.name,
        city: auth.organizations[m.organizationId].business.city,
        role: m.role,
      }));

  const authResult = (account: MockAccount): AuthResult => {
    const expiresAt =
      session !== null && session.userId === account.id ? session.expiresAt : Date.now() + SESSION_TTL_MS;
    return {
      user: profileOf(account),
      memberships: membershipsOf(account.id),
      expiresAt: new Date(expiresAt).toISOString(),
    };
  };

  const currentAccount = (): MockAccount => {
    const active = session;
    if (!active || active.expiresAt <= Date.now()) {
      closeSession();
      fail(t.auth.errors.sessionExpired, 401, 'UNAUTHENTICATED');
    }
    return (
      auth.accounts.find((a) => a.id === active.userId) ??
      fail(t.auth.errors.sessionExpired, 401, 'UNAUTHENTICATED')
    );
  };

  const requireMembership = (orgId: string): MockMembership => {
    const account = currentAccount();
    const membership = auth.memberships.find(
      (m) => m.userId === account.id && m.organizationId === orgId
    );
    if (!membership) fail(t.auth.errors.forbidden, 403, 'FORBIDDEN');
    if (membership.status !== 'active') {
      fail(t.auth.errors.invitationPending, 403, 'INVITATION_PENDING');
    }
    return membership;
  };

  const requireOwner = (orgId: string): void => {
    if (requireMembership(orgId).role !== 'owner') fail(t.auth.errors.forbidden, 403, 'FORBIDDEN');
  };

  const teamMember = (m: MockMembership): TeamMember => {
    const account = auth.accounts.find((a) => a.id === m.userId) ?? fail(t.auth.errors.notFound, 404, 'NOT_FOUND');
    return {
      userId: account.id,
      firstName: account.firstName,
      lastName: account.lastName,
      email: account.email,
      phone: account.phone,
      role: m.role,
      status: m.status,
      joinedAt: m.joinedAt,
    };
  };

  // --- Données métier par organisation ---------------------------------------

  /** Crée l'espace d'un nouveau propriétaire (inscription et connexion Google). */
  const createOwnerOrganization = (
    account: MockAccount,
    business: { name: string; activity: string; city: string }
  ): string => {
    const orgId = createId('org');
    auth.organizations[orgId] = {
      business: {
        id: orgId,
        name: business.name,
        activity: business.activity,
        address: '',
        city: business.city,
        phone: account.phone,
        email: account.email,
        taxId: '—',
        currency: 'FCFA',
        registerLabel: t.org.defaultRegister,
        closingTime: '20:00',
      },
      subscription: trialSubscription(),
    };
    auth.memberships.push({
      userId: account.id,
      organizationId: orgId,
      role: 'owner',
      status: 'active',
      joinedAt: toIsoDate(new Date()),
    });
    return orgId;
  };

  const db = (): OrgDb => {
    const orgId = requireOrganization();
    requireMembership(orgId);
    let data = orgData.get(orgId);
    if (!data) {
      data = orgSeed(orgId);
      orgData.set(orgId, data);
    }
    return data;
  };

  const findProduct = (id: string) => db().products.find((p) => p.id === id) ?? fail(t.auth.errors.notFound, 404, 'NOT_FOUND');
  const findCredit = (id: string) => db().credits.find((c) => c.id === id) ?? fail(t.auth.errors.notFound, 404, 'NOT_FOUND');

  return {
    mode: 'mock',
    auth: {
      login: ({ email, password }) =>
        respond(() => {
          const account = auth.accounts.find((a) => a.email.toLowerCase() === email.trim().toLowerCase());
          // Un compte créé par Google n'a pas de mot de passe : `!account.password`
          // empêche une connexion avec une chaîne vide.
          if (!account || !account.password || account.password !== password) {
            fail(t.auth.errors.invalidCredentials, 401, 'INVALID_CREDENTIALS');
          }
          // Aucune activation implicite : accepter une invitation est un acte
          // explicite (`acceptInvitation`), sinon l'invité accède sans consentir.
          openSession(account.id);
          return authResult(account);
        }),
      signup: (input) =>
        respond(() => {
          const email = input.email.trim().toLowerCase();
          if (auth.accounts.some((a) => a.email.toLowerCase() === email)) fail(t.auth.errors.emailTaken, 409, 'EMAIL_TAKEN');
          const account: MockAccount = {
            id: createId('user'),
            firstName: input.firstName.trim(),
            lastName: input.lastName.trim(),
            role: t.roles.owner,
            phone: input.phone.trim(),
            email,
            password: input.password,
          };
          auth.accounts.push(account);
          createOwnerOrganization(account, {
            name: input.organizationName.trim(),
            activity: input.activity.trim(),
            city: input.city.trim(),
          });
          saveAuth();
          openSession(account.id);
          return authResult(account);
        }),
      googleSignIn: (identity) =>
        respond(() => {
          const email = identity.email.trim().toLowerCase();
          const existing = auth.accounts.find((a) => a.email.toLowerCase() === email);
          if (existing) {
            openSession(existing.id);
            return authResult(existing);
          }
          const account: MockAccount = {
            id: createId('user'),
            firstName: identity.firstName.trim(),
            lastName: identity.lastName.trim(),
            role: t.roles.owner,
            phone: '',
            email,
            password: '',
          };
          auth.accounts.push(account);
          createOwnerOrganization(account, {
            name: t.auth.googleDefaultOrg,
            activity: '',
            city: '',
          });
          saveAuth();
          openSession(account.id);
          return authResult(account);
        }),
      me: () => respond(() => authResult(currentAccount())),
      logout: () =>
        respond(() => {
          closeSession();
        }),
      invitations: () =>
        respond(() =>
          auth.memberships
            .filter((m) => m.userId === currentAccount().id && m.status === 'invited')
            .map((m) => ({
              organizationId: m.organizationId,
              organizationName: auth.organizations[m.organizationId].business.name,
              city: auth.organizations[m.organizationId].business.city,
              role: m.role,
              invitedAt: m.joinedAt,
            }))
        ),
      acceptInvitation: (orgId) =>
        respond(() => {
          const account = currentAccount();
          const membership = auth.memberships.find(
            (m) => m.userId === account.id && m.organizationId === orgId && m.status === 'invited'
          );
          if (!membership) fail(t.auth.errors.invitationNotFound, 404, 'INVITATION_NOT_FOUND');
          auth.memberships = auth.memberships.map((m) =>
            m === membership ? { ...m, status: 'active' } : m
          );
          saveAuth();
          openSession(account.id);
          return authResult(account);
        }),
      demoAccounts: () =>
        respond(() =>
          MOCK_ACCOUNTS.map((seed) => {
            const account = auth.accounts.find((a) => a.id === seed.id) ?? seed;
            return {
              email: account.email,
              password: account.password,
              fullName: `${account.firstName} ${account.lastName}`,
              initials: `${account.firstName[0]}${account.lastName[0]}`,
              organizations: auth.memberships
                .filter(
                  (m) =>
                    m.userId === account.id &&
                    m.status === 'active' &&
                    auth.organizations[m.organizationId]
                )
                .map((m) => ({ name: auth.organizations[m.organizationId].business.name, role: m.role })),
            };
          })
        ),
    },
    session: {
      get: (orgId) =>
        respond(() => {
          const membership = requireMembership(orgId);
          const org = auth.organizations[orgId] ?? fail(t.auth.errors.notFound, 404, 'NOT_FOUND');
          return { user: profileOf(currentAccount()), business: org.business, subscription: org.subscription, role: membership.role };
        }),
    },
    team: {
      list: (orgId) =>
        respond(() => {
          requireMembership(orgId);
          return auth.memberships.filter((m) => m.organizationId === orgId).map(teamMember);
        }),
      invite: (orgId, input) =>
        respond(() => {
          requireOwner(orgId);
          const email = input.email.trim().toLowerCase();
          let account = auth.accounts.find((a) => a.email.toLowerCase() === email);
          if (account && auth.memberships.some((m) => m.userId === account?.id && m.organizationId === orgId)) {
            fail(t.team.errors.alreadyMember, 409, 'ALREADY_MEMBER');
          }
          if (!account) {
            account = {
              id: createId('user'),
              firstName: input.firstName.trim(),
              lastName: input.lastName.trim(),
              role: t.roles[input.role],
              phone: '',
              email,
              password: DEMO_PASSWORD,
            };
            auth.accounts.push(account);
          }
          const membership: MockMembership = {
            userId: account.id,
            organizationId: orgId,
            role: input.role,
            status: 'invited',
            joinedAt: toIsoDate(new Date()),
          };
          auth.memberships.push(membership);
          saveAuth();
          return teamMember(membership);
        }),
      updateRole: (orgId, userId, role) =>
        respond(() => {
          requireOwner(orgId);
          const target = auth.memberships.find((m) => m.organizationId === orgId && m.userId === userId) ?? fail(t.auth.errors.notFound, 404, 'NOT_FOUND');
          if (target.role === 'owner' || role === 'owner') fail(t.team.errors.ownerLocked, 422, 'OWNER_LOCKED');
          target.role = role;
          saveAuth();
          return teamMember(target);
        }),
      remove: (orgId, userId) =>
        respond(() => {
          requireOwner(orgId);
          const target = auth.memberships.find((m) => m.organizationId === orgId && m.userId === userId) ?? fail(t.auth.errors.notFound, 404, 'NOT_FOUND');
          if (target.role === 'owner') fail(t.team.errors.ownerLocked, 422, 'OWNER_LOCKED');
          auth.memberships = auth.memberships.filter((m) => m !== target);
          saveAuth();
        }),
    },
    products: {
      list: () => respond(() => db().products),
      create: (product) =>
        respond(() => {
          const data = db();
          data.products = [product, ...data.products.filter((p) => p.id !== product.id)];
          return product;
        }),
      update: (id, patch) =>
        respond(() => {
          const data = db();
          const updated = { ...findProduct(id), ...patch, id };
          data.products = data.products.map((p) => (p.id === id ? updated : p));
          return updated;
        }),
      remove: (id) =>
        respond(() => {
          const data = db();
          data.products = data.products.filter((p) => p.id !== id);
        }),
      restock: (id, quantity) =>
        respond(() => {
          const data = db();
          const product = findProduct(id);
          const updated = { ...product, stock: product.stock + quantity };
          data.products = data.products.map((p) => (p.id === id ? updated : p));
          return updated;
        }),
    },
    sales: {
      list: () => respond(() => db().sales),
      create: ({ sale, lines, credit }) =>
        respond(() => {
          const data = db();
          // Le serveur applique la même règle que le domaine client : un stock
          // insuffisant est un refus (409), jamais une décrémentation bornée.
          for (const line of lines) {
            const product =
              data.products.find((item) => item.id === line.productId) ??
              fail(t.auth.errors.notFound, 404, 'NOT_FOUND');
            if (line.quantity > product.stock) {
              fail(
                `Stock insuffisant pour « ${product.name} » : ${product.stock} disponible(s).`,
                409,
                'INSUFFICIENT_STOCK'
              );
            }
          }
          for (const line of lines) {
            data.products = data.products.map((p) =>
              p.id === line.productId ? { ...p, stock: p.stock - line.quantity } : p
            );
          }
          data.sales = [sale, ...data.sales];
          // Transaction unique : la créance d'un règlement partiel est écrite
          // avec la vente, sinon elle n'existerait que dans le navigateur.
          if (credit) data.credits = [credit, ...data.credits];
          return sale;
        }),
    },
    expenses: {
      list: () => respond(() => db().expenses),
      create: (expense) =>
        respond(() => {
          const data = db();
          data.expenses = [expense, ...data.expenses];
          return expense;
        }),
      remove: (id) =>
        respond(() => {
          const data = db();
          data.expenses = data.expenses.filter((e) => e.id !== id);
        }),
    },
    credits: {
      list: () => respond(() => db().credits),
      create: (credit) =>
        respond(() => {
          const data = db();
          data.credits = [credit, ...data.credits];
          return credit;
        }),
      pay: (id, amount) =>
        respond(() => {
          const data = db();
          const updated = applyPayment(findCredit(id), amount);
          data.credits = data.credits.map((c) => (c.id === id ? updated : c));
          return updated;
        }),
      remove: (id) =>
        respond(() => {
          const data = db();
          data.credits = data.credits.filter((c) => c.id !== id);
        }),
    },
    notifications: {
      list: () => respond(() => db().notifications),
      markRead: (id) =>
        respond(() => {
          const data = db();
          data.notifications = data.notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
        }),
      markAllRead: () =>
        respond(() => {
          const data = db();
          data.notifications = data.notifications.map((n) => ({ ...n, read: true }));
        }),
    },
  };
}
