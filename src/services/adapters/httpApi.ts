import type { ClientCredit, Expense, NotificationItem, Product, SaleTransaction, Session } from '@/types';
import type { Api } from '../contracts';
import { ENDPOINTS } from '../endpoints';
import type { HttpClient } from '../http/httpClient';

/** Adaptateur REST : traduit chaque appel de dépôt en requête HTTP. */
export function createHttpApi(http: HttpClient): Api {
  return {
    mode: 'http',
    session: {
      get: () => http.get<Session>(ENDPOINTS.session),
    },
    products: {
      list: () => http.get<Product[]>(ENDPOINTS.products),
      create: (product) => http.post<Product>(ENDPOINTS.products, product),
      update: (id, patch) => http.patch<Product>(ENDPOINTS.product(id), patch),
      remove: (id) => http.delete<void>(ENDPOINTS.product(id)),
      restock: (id, quantity) => http.post<Product>(ENDPOINTS.productRestock(id), { quantity }),
    },
    sales: {
      list: () => http.get<SaleTransaction[]>(ENDPOINTS.sales),
      create: (payload) => http.post<SaleTransaction>(ENDPOINTS.sales, payload),
    },
    expenses: {
      list: () => http.get<Expense[]>(ENDPOINTS.expenses),
      create: (expense) => http.post<Expense>(ENDPOINTS.expenses, expense),
      remove: (id) => http.delete<void>(ENDPOINTS.expense(id)),
    },
    credits: {
      list: () => http.get<ClientCredit[]>(ENDPOINTS.credits),
      create: (credit) => http.post<ClientCredit>(ENDPOINTS.credits, credit),
      pay: (id, amount) => http.post<ClientCredit>(ENDPOINTS.creditPayments(id), { amount }),
      remove: (id) => http.delete<void>(ENDPOINTS.credit(id)),
    },
    notifications: {
      list: () => http.get<NotificationItem[]>(ENDPOINTS.notifications),
      markRead: (id) => http.post<void>(ENDPOINTS.notificationRead(id)),
      markAllRead: () => http.post<void>(ENDPOINTS.notificationsReadAll),
    },
  };
}
