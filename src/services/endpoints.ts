/**
 * Routes REST du backend — source unique. Toutes les routes métier sont
 * préfixées par l'organisation (`/orgs/:orgId`). Contrat : `docs/API_CONTRACT.md`.
 */
const enc = encodeURIComponent;
const org = (orgId: string) => `/orgs/${enc(orgId)}`;

export const ENDPOINTS = {
  login: '/auth/login',
  signup: '/auth/signup',
  refresh: '/auth/refresh',
  me: '/auth/me',
  logout: '/auth/logout',
  emailVerifyRequest: '/auth/email/verify/request',
  emailVerifyConfirm: '/auth/email/verify/confirm',
  invitations: '/auth/invitations',
  acceptInvitation: (orgId: string) => `/auth/invitations/${enc(orgId)}/accept`,

  session: (orgId: string) => `${org(orgId)}/session`,
  members: (orgId: string) => `${org(orgId)}/members`,
  member: (orgId: string, userId: string) => `${org(orgId)}/members/${enc(userId)}`,

  products: (orgId: string) => `${org(orgId)}/products`,
  product: (orgId: string, id: string) => `${org(orgId)}/products/${enc(id)}`,
  productRestock: (orgId: string, id: string) => `${org(orgId)}/products/${enc(id)}/restock`,
  sales: (orgId: string) => `${org(orgId)}/sales`,
  expenses: (orgId: string) => `${org(orgId)}/expenses`,
  expense: (orgId: string, id: string) => `${org(orgId)}/expenses/${enc(id)}`,
  credits: (orgId: string) => `${org(orgId)}/credits`,
  credit: (orgId: string, id: string) => `${org(orgId)}/credits/${enc(id)}`,
  creditPayments: (orgId: string, id: string) => `${org(orgId)}/credits/${enc(id)}/payments`,
  notifications: (orgId: string) => `${org(orgId)}/notifications`,
  notificationRead: (orgId: string, id: string) => `${org(orgId)}/notifications/${enc(id)}/read`,
  notificationsReadAll: (orgId: string) => `${org(orgId)}/notifications/read-all`,
} as const;
