import type {
  AuthResult,
  ClientCredit,
  Expense,
  NotificationItem,
  Product,
  SaleTransaction,
  Session,
  TeamMember,
} from '@/types';
import type { Api } from '../contracts';
import { ENDPOINTS } from '../endpoints';
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
      me: () => http.get<AuthResult>(ENDPOINTS.me),
      logout: () => http.post<void>(ENDPOINTS.logout),
      demoAccounts: () => Promise.resolve([]),
    },
    session: {
      get: (orgId) => http.get<Session>(ENDPOINTS.session(orgId)),
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
