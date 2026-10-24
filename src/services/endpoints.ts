/**
 * Routes REST du backend — source unique. Le contrat détaillé (verbes, payloads,
 * réponses) est documenté dans `docs/API_CONTRACT.md`.
 */
export const ENDPOINTS = {
  session: '/session',
  products: '/products',
  product: (id: string) => `/products/${encodeURIComponent(id)}`,
  productRestock: (id: string) => `/products/${encodeURIComponent(id)}/restock`,
  sales: '/sales',
  expenses: '/expenses',
  expense: (id: string) => `/expenses/${encodeURIComponent(id)}`,
  credits: '/credits',
  credit: (id: string) => `/credits/${encodeURIComponent(id)}`,
  creditPayments: (id: string) => `/credits/${encodeURIComponent(id)}/payments`,
  notifications: '/notifications',
  notificationRead: (id: string) => `/notifications/${encodeURIComponent(id)}/read`,
  notificationsReadAll: '/notifications/read-all',
} as const;
