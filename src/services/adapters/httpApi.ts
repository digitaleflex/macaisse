import type {
  AuthEvent,
  AuthResult,
  BusinessProfile,
  ClientCredit,
  Device,
  DeviceEnrollment,
  EmailChallenge,
  Expense,
  Invitation,
  NotificationItem,
  PasswordResetChallenge,
  PhoneChallenge,
  Product,
  SaleTransaction,
  Session,
  TeamMember,
} from '@/types';
import type { Api } from '../contracts';
import { ENDPOINTS } from '../endpoints';
import { ApiError } from '../http/ApiError';
import type { HttpClient } from '../http/httpClient';
import { requireOrganization } from '../tenant';

/** Adaptateur REST : chaque appel métier est préfixé par l'organisation active. */
export function createHttpApi(http: HttpClient): Api {
  const org = requireOrganization;
  return {
    mode: 'http',
    auth: {
      login: (input) => http.post<AuthResult>(ENDPOINTS.login, input),
      signup: (input) => http.post<AuthResult>(ENDPOINTS.signup, input),
      requestPhoneCode: (phone) => http.post<PhoneChallenge>(ENDPOINTS.otpRequest, { phone }),
      verifyPhoneCode: (input) => http.post<AuthResult>(ENDPOINTS.otpVerify, input),
      /**
       * L'échange PKCE est fait par le serveur : le client ne doit jamais envoyer
       * une identité Google auto-déclarée. Tant que le backend et l'identifiant
       * client Google ne sont pas fournis, l'appel échoue explicitement plutôt
       * que d'ouvrir une session sur une identité non vérifiée (D3).
       */
      googleSignIn: () =>
        Promise.reject(
          new ApiError(
            'La connexion Google n’est pas encore activée sur ce serveur.',
            501,
            'NOT_IMPLEMENTED'
          )
        ),
      me: () => http.get<AuthResult>(ENDPOINTS.me),
      updateProfile: (input) => http.patch<AuthResult>(ENDPOINTS.me, input),
      requestPasswordReset: (email) =>
        http.post<PasswordResetChallenge>(ENDPOINTS.passwordResetRequest, { email }),
      resetPassword: (input) => http.post<void>(ENDPOINTS.passwordResetConfirm, input),
      stepUp: (input) => http.post<{ ok: true }>(ENDPOINTS.stepUp, input),
      events: () => http.get<AuthEvent[]>(ENDPOINTS.events),
      deleteAccount: ({ password, confirmation }) =>
        http.request<void>('DELETE', ENDPOINTS.me, { body: { password, confirmation } }),
      requestEmailVerification: () => http.post<EmailChallenge>(ENDPOINTS.emailVerifyRequest),
      verifyEmail: (input) => http.post<AuthResult>(ENDPOINTS.emailVerifyConfirm, input),
      logout: () => http.post<void>(ENDPOINTS.logout),
      demoAccounts: () => Promise.resolve([]),
      invitations: () => http.get<Invitation[]>(ENDPOINTS.invitations),
      acceptInvitation: (orgId) =>
        http.post<AuthResult>(ENDPOINTS.acceptInvitation(orgId)),
    },
    session: {
      get: (orgId) => http.get<Session>(ENDPOINTS.session(orgId)),
    },
    onboarding: {
      complete: (orgId, input) => http.post<BusinessProfile>(ENDPOINTS.onboarding(orgId), input),
      update: (orgId, input) => http.patch<BusinessProfile>(ENDPOINTS.business(orgId), input),
    },
    devices: {
      list: (orgId) => http.get<Device[]>(ENDPOINTS.devices(orgId)),
      enroll: (orgId, input) => http.post<DeviceEnrollment>(ENDPOINTS.devices(orgId), input),
      revoke: (orgId, deviceId) => http.delete<void>(ENDPOINTS.device(orgId, deviceId)),
      setPin: (orgId, userId, pin) => http.request<void>('PUT', ENDPOINTS.memberPin(orgId, userId), { body: { pin } }),
      verifyPin: (input) => http.post<{ ok: true }>(ENDPOINTS.pinVerify, input),
    },
    team: {
      list: (orgId) => http.get<TeamMember[]>(ENDPOINTS.members(orgId)),
      invite: (orgId, input) => http.post<TeamMember>(ENDPOINTS.members(orgId), input),
      updateRole: (orgId, userId, role) => http.patch<TeamMember>(ENDPOINTS.member(orgId, userId), { role }),
      remove: (orgId, userId) => http.delete<void>(ENDPOINTS.member(orgId, userId)),
    },
    products: {
      list: () => http.get<Product[]>(ENDPOINTS.products(org())),
      create: (product) => http.post<Product>(ENDPOINTS.products(org()), product),
      update: (id, patch) => http.patch<Product>(ENDPOINTS.product(org(), id), patch),
      remove: (id) => http.delete<void>(ENDPOINTS.product(org(), id)),
      restock: (id, quantity) => http.post<Product>(ENDPOINTS.productRestock(org(), id), { quantity }),
    },
    sales: {
      list: () => http.get<SaleTransaction[]>(ENDPOINTS.sales(org())),
      create: (payload) => http.post<SaleTransaction>(ENDPOINTS.sales(org()), payload),
    },
    expenses: {
      list: () => http.get<Expense[]>(ENDPOINTS.expenses(org())),
      create: (expense) => http.post<Expense>(ENDPOINTS.expenses(org()), expense),
      remove: (id) => http.delete<void>(ENDPOINTS.expense(org(), id)),
    },
    credits: {
      list: () => http.get<ClientCredit[]>(ENDPOINTS.credits(org())),
      create: (credit) => http.post<ClientCredit>(ENDPOINTS.credits(org()), credit),
      pay: (id, amount) => http.post<ClientCredit>(ENDPOINTS.creditPayments(org(), id), { amount }),
      remove: (id) => http.delete<void>(ENDPOINTS.credit(org(), id)),
    },
    notifications: {
      list: () => http.get<NotificationItem[]>(ENDPOINTS.notifications(org())),
      markRead: (id) => http.post<void>(ENDPOINTS.notificationRead(org(), id)),
      markAllRead: () => http.post<void>(ENDPOINTS.notificationsReadAll(org())),
    },
  };
}
