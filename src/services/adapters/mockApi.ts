import type {
  AuthEvent,
  AuthEventMethod,
  AuthResult,
  ClientCredit,
  Device,
  EmailChallenge,
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
import { normalizePhone } from '@/domain/phone';
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

interface MockAuthEvent extends AuthEvent {
  userId: string;
}

interface AuthDb {
  accounts: MockAccount[];
  organizations: Record<string, MockOrganization>;
  memberships: MockMembership[];
  devices: Device[];
  events: MockAuthEvent[];
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
/** Délai de grâce pour vérifier l'e-mail (RG-A28) : 72 h. */
const EMAIL_GRACE_MS = 72 * 60 * 60 * 1000;
/** Durée de vie du code e-mail (RG-A27) : 10 min. */
const EMAIL_CODE_TTL_MS = 10 * 60 * 1000;
const DEMO_EMAIL_CODE = '000000';
/** Code téléphone (D2) : 6 chiffres, 5 min, 5 tentatives (RG-A07/A08). */
const PHONE_CODE_TTL_MS = 5 * 60 * 1000;
const PHONE_CODE_ATTEMPTS = 5;
const PHONE_RESEND_S = 30;
const DEMO_PHONE_CODE = '000000';
/** D6 : 3 appareils actifs maximum, 5 essais de PIN, verrouillage 15 min. */
const DEVICE_LIMIT = 3;
const PIN_MAX_ATTEMPTS = 5;
const PIN_LOCK_MS = 15 * 60 * 1000;
/** D9 : une réauthentification reste valable 5 min. */
const STEP_UP_TTL_MS = 5 * 60 * 1000;

interface MockSession {
  userId: string;
  /** Expiration en millisecondes epoch. */
  expiresAt: number;
}

const clone = <T>(value: T): T => structuredClone(value);

function defaultAuthDb(): AuthDb {
  return clone({
    accounts: MOCK_ACCOUNTS,
    organizations: MOCK_ORGANIZATIONS,
    memberships: MOCK_MEMBERSHIPS,
    devices: [],
    events: [],
  });
}

function loadAuthDb(persist: boolean): AuthDb {
  if (!persist) return defaultAuthDb();
  try {
    const raw = localStorage.getItem(AUTH_DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AuthDb;
      // Blob antérieur à D6 : la liste des appareils peut manquer.
      return {
        ...parsed,
        devices: Array.isArray(parsed.devices) ? parsed.devices : [],
        events: Array.isArray(parsed.events) ? parsed.events : [],
      };
    }
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
  /** Fenêtres de réauthentification courte (D9), par compte, 5 min. */
  const stepUpWindows = new Map<string, number>();

  /** Journal d'authentification (RG-A20) : 100 derniers événements. */
  const logEvent = (userId: string, method: AuthEventMethod, result: 'success' | 'failure'): void => {
    auth.events.unshift({
      id: createId('evt'),
      userId,
      at: new Date().toISOString(),
      method,
      result,
      ip: '127.0.0.1',
      userAgent: 'démo',
      deviceId: null,
    });
    auth.events = auth.events.slice(0, 100);
    saveAuth();
  };

  /** Exige une réauthentification de moins de 5 min (D9). */
  const requireStepUp = (userId: string): void => {
    const last = stepUpWindows.get(userId) ?? 0;
    if (Date.now() - last > STEP_UP_TTL_MS) fail(t.auth.errors.stepUpRequired, 401, 'STEP_UP_REQUIRED');
  };

  /** Code de vérification e-mail simulé (un seul à la fois, comme côté serveur). */
  let emailChallenge: { email: string; code: string; expiresAt: number } | null = null;
  /** Défi de réinitialisation de mot de passe (D4) : 10 min, 5 tentatives. */
  let passwordReset: { email: string; code: string; expiresAt: number; attempts: number } | null = null;
  /** Défi téléphone simulé (D2) : un seul à la fois, 5 min, 5 tentatives. */
  let phoneChallenge: {
    id: string;
    phone: string;
    code: string;
    expiresAt: number;
    attempts: number;
  } | null = null;

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
    if (!membership) fail(t.errors.notAMember, 403, 'NOT_A_MEMBER');
    if (membership.status !== 'active') {
      fail(t.auth.errors.invitationPending, 403, 'INVITATION_PENDING');
    }
    return membership;
  };

  const requireOwner = (orgId: string): void => {
    if (requireMembership(orgId).role !== 'owner') fail(t.errors.insufficientRole, 403, 'INSUFFICIENT_ROLE');
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
        // Onboarding à faire : le shell propose les 2 étapes de mise en route.
        onboardedAt: null,
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
            if (account) logEvent(account.id, 'password', 'failure');
            fail(t.auth.errors.invalidCredentials, 401, 'INVALID_CREDENTIALS');
          }
          // Aucune activation implicite : accepter une invitation est un acte
          // explicite (`acceptInvitation`), sinon l'invité accède sans consentir.
          logEvent(account.id, 'password', 'success');
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
            // RG-A27/A28 : adresse non prouvée, 72 h pour la vérifier.
            emailVerified: false,
            emailVerificationDueAt: new Date(Date.now() + EMAIL_GRACE_MS).toISOString(),
          };
          auth.accounts.push(account);
          createOwnerOrganization(account, {
            name: input.organizationName.trim() || t.auth.googleDefaultOrg,
            activity: input.activity.trim(),
            city: input.city.trim(),
          });
          saveAuth();
          openSession(account.id);
          return authResult(account);
        }),
      requestPhoneCode: (rawPhone) =>
        respond(() => {
          const phone = rawPhone.trim();
          const normalized = normalizePhone(phone);
          if (normalized === '') {
            fail(t.auth.errors.phoneInvalid, 422, 'VALIDATION_ERROR');
          }
          const challengeId = createId('otp');
          phoneChallenge = {
            id: challengeId,
            phone: normalized,
            code: DEMO_PHONE_CODE,
            expiresAt: Date.now() + PHONE_CODE_TTL_MS,
            attempts: 0,
          };
          return {
            challengeId,
            phone,
            channel: 'whatsapp_user' as const,
            expiresIn: PHONE_CODE_TTL_MS / 1000,
            retryAfter: PHONE_RESEND_S,
            demoCode: DEMO_PHONE_CODE,
          };
        }),
      verifyPhoneCode: ({ challengeId, code }) =>
        respond(() => {
          const active = phoneChallenge;
          if (!active || active.id !== challengeId) fail(t.auth.errors.phoneCodeMissing, 400, 'OTP_MISSING');
          if (active.expiresAt <= Date.now()) {
            phoneChallenge = null;
            fail(t.auth.errors.phoneCodeExpired, 410, 'OTP_EXPIRED');
          }
          if (active.attempts >= PHONE_CODE_ATTEMPTS) fail(t.auth.errors.phoneTooMany, 429, 'OTP_LOCKED');
          if (code.trim() !== active.code) {
            active.attempts += 1;
            fail(t.auth.errors.phoneCodeInvalid, 401, 'INVALID_OTP');
          }
          const digits = active.phone;
          phoneChallenge = null;

          // D2 : le code prouve le numéro ; le compte est créé s'il est inconnu.
          const existing = auth.accounts.find((a) => normalizePhone(a.phone) === digits);
          let account = existing;
          if (!account) {
            const created: MockAccount = {
              id: createId('user'),
              firstName: '',
              lastName: '',
              role: t.roles.owner,
              phone: digits,
              email: '',
              password: '',
              // Aucune adresse e-mail : rien à vérifier (RG-A27 ne s'applique pas).
              emailVerified: false,
              emailVerificationDueAt: null,
            };
            auth.accounts.push(created);
            createOwnerOrganization(created, {
              name: t.auth.googleDefaultOrg,
              activity: '',
              city: '',
            });
            saveAuth();
            account = created;
          }
          logEvent(account.id, 'otp_phone', 'success');
          openSession(account.id);
          return authResult(account);
        }),
      googleSignIn: (identity) =>
        respond(() => {
          const email = identity.email.trim().toLowerCase();
          const existing = auth.accounts.find((a) => a.email.toLowerCase() === email);
          if (existing) {
            logEvent(existing.id, 'google', 'success');
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
            // Google fournit une adresse déjà vérifiée (RG-A02).
            emailVerified: true,
            emailVerificationDueAt: null,
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
      updateProfile: (input) =>
        respond(() => {
          const account = currentAccount();
          account.firstName = input.firstName.trim();
          account.lastName = input.lastName.trim();
          account.phone = input.phone.trim();
          saveAuth();
          return authResult(account);
        }),
      requestPasswordReset: (rawEmail) =>
        respond(() => {
          const email = rawEmail.trim().toLowerCase();
          passwordReset = {
            email,
            code: DEMO_EMAIL_CODE,
            expiresAt: Date.now() + EMAIL_CODE_TTL_MS,
            attempts: 0,
          };
          // Réponse constante : l'existence du compte n'est jamais révélée (RG-A09).
          return {
            email,
            expiresIn: EMAIL_CODE_TTL_MS / 1000,
            sentAt: new Date().toISOString(),
            demoCode: DEMO_EMAIL_CODE,
          };
        }),
      resetPassword: ({ email, code, password }) =>
        respond(() => {
          const active = passwordReset;
          if (!active) fail(t.auth.errors.resetCodeMissing, 400, 'RESET_CODE_MISSING');
          if (active.email !== email.trim().toLowerCase()) {
            fail(t.auth.errors.resetCodeInvalid, 401, 'INVALID_RESET_CODE');
          }
          if (active.expiresAt <= Date.now()) {
            passwordReset = null;
            fail(t.auth.errors.resetCodeExpired, 410, 'RESET_CODE_EXPIRED');
          }
          if (active.attempts >= 5) fail(t.auth.errors.resetTooMany, 429, 'RESET_LOCKED');
          if (code.trim() !== active.code) {
            active.attempts += 1;
            fail(t.auth.errors.resetCodeInvalid, 401, 'INVALID_RESET_CODE');
          }
          const account = auth.accounts.find((a) => a.email.toLowerCase() === active.email);
          passwordReset = null;
          // Anti-énumération : un e-mail inconnu renvoie le même refus qu'un code faux.
          if (!account) fail(t.auth.errors.resetCodeInvalid, 401, 'INVALID_RESET_CODE');
          account.password = password;
          saveAuth();
        }),
      requestEmailVerification: () =>
        respond<EmailChallenge>(() => {
          const account = currentAccount();
          // Idempotent : un compte déjà vérifié n'a rien à faire, mais ne casse pas.
          emailChallenge = account.emailVerified
            ? null
            : { email: account.email, code: DEMO_EMAIL_CODE, expiresAt: Date.now() + EMAIL_CODE_TTL_MS };
          return {
            email: account.email,
            expiresIn: EMAIL_CODE_TTL_MS / 1000,
            sentAt: new Date().toISOString(),
          };
        }),
      verifyEmail: ({ code }) =>
        respond(() => {
          const account = currentAccount();
          if (account.emailVerified) return authResult(account);
          const active = emailChallenge;
          if (!active || active.email !== account.email) {
            fail(t.auth.errors.emailCodeMissing, 400, 'EMAIL_CODE_MISSING');
          }
          if (active.expiresAt <= Date.now()) {
            emailChallenge = null;
            fail(t.auth.errors.emailCodeExpired, 410, 'EMAIL_CODE_EXPIRED');
          }
          if (code.trim() !== active.code) {
            fail(t.auth.errors.emailCodeInvalid, 401, 'INVALID_EMAIL_CODE');
          }
          account.emailVerified = true;
          account.emailVerificationDueAt = null;
          emailChallenge = null;
          saveAuth();
          return authResult(account);
        }),
      stepUp: ({ password }) =>
        respond(() => {
          const account = currentAccount();
          if (!account.password || account.password !== password) {
            logEvent(account.id, 'step_up', 'failure');
            fail(t.auth.errors.passwordMismatch, 401, 'INVALID_CREDENTIALS');
          }
          stepUpWindows.set(account.id, Date.now());
          logEvent(account.id, 'step_up', 'success');
          return { ok: true as const };
        }),
      events: () =>
        respond(() => {
          const account = currentAccount();
          return auth.events
            .filter((event) => event.userId === account.id)
            .slice(0, 10)
            .map(({ userId: _userId, ...event }) => {
              void _userId;
              return event;
            });
        }),
      deleteAccount: ({ password, confirmation }) =>
        respond(() => {
          const account = currentAccount();
          if (confirmation.trim() !== 'SUPPRIMER') {
            fail(t.auth.errors.confirmationMismatch, 422, 'VALIDATION_ERROR');
          }
          if (account.password && account.password !== password) {
            fail(t.auth.errors.passwordMismatch, 401, 'INVALID_CREDENTIALS');
          }
          // RG-A21 : accès supprimés immédiatement, données comptables anonymisées.
          const owned = auth.memberships
            .filter((membership) => membership.userId === account.id && membership.role === 'owner')
            .map((membership) => membership.organizationId);
          auth.memberships = auth.memberships.filter((membership) => membership.userId !== account.id);
          for (const orgId of owned) {
            delete auth.organizations[orgId];
            auth.devices = auth.devices.filter((device) => device.organizationId !== orgId);
          }
          auth.devices = auth.devices.filter((device) => device.memberId !== account.id);
          account.firstName = '';
          account.lastName = '';
          account.phone = '';
          account.email = '';
          account.password = '';
          account.emailVerified = false;
          account.emailVerificationDueAt = null;
          auth.events = auth.events.filter((event) => event.userId !== account.id);
          saveAuth();
          closeSession();
        }),
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
    onboarding: {
      complete: (orgId, input) =>
        respond(() => {
          const membership = requireMembership(orgId);
          if (membership.role === 'cashier') fail(t.errors.insufficientRole, 403, 'INSUFFICIENT_ROLE');
          const org = auth.organizations[orgId] ?? fail(t.auth.errors.notFound, 404, 'NOT_FOUND');
          org.business = {
            ...org.business,
            name: input.name.trim() || org.business.name,
            city: input.city.trim(),
            phone: input.phone.trim(),
            activity: input.activity.trim(),
            onboardedAt: new Date().toISOString(),
          };
          saveAuth();
          return org.business;
        }),
      update: (orgId, input) =>
        respond(() => {
          const membership = requireMembership(orgId);
          if (membership.role === 'cashier') fail(t.errors.insufficientRole, 403, 'INSUFFICIENT_ROLE');
          const org = auth.organizations[orgId] ?? fail(t.auth.errors.notFound, 404, 'NOT_FOUND');
          // Édition depuis le profil : `onboardedAt` n'est pas modifié.
          org.business = {
            ...org.business,
            name: input.name.trim() || org.business.name,
            city: input.city.trim(),
            phone: input.phone.trim(),
            activity: input.activity.trim(),
          };
          saveAuth();
          return org.business;
        }),
    },
    devices: {
      list: (orgId) =>
        respond(() => {
          requireMembership(orgId);
          return auth.devices.filter((device) => device.organizationId === orgId);
        }),
      enroll: (orgId, input) =>
        respond(() => {
          requireOwner(orgId);
          const actor = currentAccount();
          requireStepUp(actor.id);
          const membership = auth.memberships.find(
            (m) => m.organizationId === orgId && m.userId === input.memberId && m.status === 'active'
          );
          if (!membership) fail(t.auth.errors.notFound, 404, 'NOT_FOUND');

          const active = auth.devices.filter(
            (device) => device.organizationId === orgId && device.revokedAt === null
          );
          if (active.length >= DEVICE_LIMIT) fail(t.devices.errors.limit, 422, 'DEVICE_LIMIT');

          const account = auth.accounts.find((a) => a.id === membership.userId);
          const device: Device = {
            id: createId('device'),
            organizationId: orgId,
            name: input.name.trim() || t.devices.defaultName,
            memberId: membership.userId,
            memberName: account
              ? `${account.firstName} ${account.lastName}`.trim() || account.phone
              : membership.userId,
            enrolledBy: actor.id,
            enrolledAt: toIsoDate(new Date()),
            lastSeenAt: null,
            revokedAt: null,
          };
          auth.devices.push(device);
          saveAuth();
          return { device, pinSetupToken: `pin-${device.id}` };
        }),
      revoke: (orgId, deviceId) =>
        respond(() => {
          requireOwner(orgId);
          requireStepUp(currentAccount().id);
          const device = auth.devices.find((d) => d.id === deviceId && d.organizationId === orgId);
          if (!device) fail(t.auth.errors.notFound, 404, 'NOT_FOUND');
          device.revokedAt = toIsoDate(new Date());
          saveAuth();
        }),
      setPin: (orgId, userId, pin) =>
        respond(() => {
          const actor = currentAccount();
          const actorMembership = auth.memberships.find(
            (m) => m.organizationId === orgId && m.userId === actor.id && m.status === 'active'
          );
          if (!actorMembership) fail(t.errors.notAMember, 403, 'NOT_A_MEMBER');
          // Un propriétaire définit le PIN d'un membre ; chacun peut définir le sien.
          if (actorMembership.role !== 'owner' && actor.id !== userId) {
            fail(t.errors.insufficientRole, 403, 'INSUFFICIENT_ROLE');
          }
          const target = auth.memberships.find((m) => m.organizationId === orgId && m.userId === userId);
          if (!target) fail(t.auth.errors.notFound, 404, 'NOT_FOUND');
          target.pin = pin;
          target.failedAttempts = 0;
          target.lockedUntil = null;
          saveAuth();
        }),
      verifyPin: ({ deviceId, memberId, pin }) =>
        respond(() => {
          const device = auth.devices.find((d) => d.id === deviceId);
          if (!device || device.revokedAt !== null) {
            fail(t.devices.errors.revoked, 401, 'DEVICE_REVOKED');
          }
          const membership = auth.memberships.find(
            (m) => m.userId === memberId && m.organizationId === device.organizationId
          );
          if (!membership) fail(t.errors.notAMember, 403, 'NOT_A_MEMBER');

          if (membership.lockedUntil && Date.parse(membership.lockedUntil) > Date.now()) {
            fail(t.devices.errors.locked, 423, 'PIN_LOCKED');
          }
          if (membership.pin === undefined || membership.pin !== pin) {
            membership.failedAttempts = (membership.failedAttempts ?? 0) + 1;
            if (membership.failedAttempts >= PIN_MAX_ATTEMPTS) {
              membership.failedAttempts = 0;
              membership.lockedUntil = new Date(Date.now() + PIN_LOCK_MS).toISOString();
              saveAuth();
              fail(t.devices.errors.locked, 423, 'PIN_LOCKED');
            }
            saveAuth();
            fail(t.devices.errors.invalid, 401, 'INVALID_PIN');
          }
          membership.failedAttempts = 0;
          membership.lockedUntil = null;
          device.lastSeenAt = new Date().toISOString();
          saveAuth();
          return { ok: true };
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
              // L'e-mail saisi par le propriétaire n'est pas prouvé par l'invité.
              emailVerified: false,
              emailVerificationDueAt: new Date(Date.now() + EMAIL_GRACE_MS).toISOString(),
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
