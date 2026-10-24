import type { ClientCredit, Expense, NotificationItem, Product, SaleTransaction } from '@/types';
import { applyPayment } from '@/domain/credits';
import {
  SEED_CREDITS,
  SEED_EXPENSES,
  SEED_NOTIFICATIONS,
  SEED_PRODUCTS,
  SEED_SALES,
  SEED_SESSION,
} from '@/mocks';
import type { Api } from '../contracts';
import { ApiError } from '../http/ApiError';

/**
 * Adaptateur de démonstration : simule le backend en mémoire à partir des
 * fixtures de `@/mocks`, avec une latence configurable. Il respecte exactement
 * le contrat `Api`, ce qui permet de basculer vers `http` sans toucher à l'UI.
 */

interface MockDb {
  products: Product[];
  sales: SaleTransaction[];
  expenses: Expense[];
  credits: ClientCredit[];
  notifications: NotificationItem[];
}

const clone = <T>(value: T): T => structuredClone(value);

function notFound(entity: string, id: string): never {
  throw new ApiError(`${entity} introuvable (${id}).`, 404, 'NOT_FOUND');
}

export function createMockApi(latencyMs = 0): Api {
  const db: MockDb = {
    products: clone(SEED_PRODUCTS),
    sales: clone(SEED_SALES),
    expenses: clone(SEED_EXPENSES),
    credits: clone(SEED_CREDITS),
    notifications: clone(SEED_NOTIFICATIONS),
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

  const findProduct = (id: string) => db.products.find((p) => p.id === id) ?? notFound('Produit', id);
  const findCredit = (id: string) => db.credits.find((c) => c.id === id) ?? notFound('Crédit', id);

  return {
    mode: 'mock',
    session: {
      get: () => respond(() => SEED_SESSION),
    },
    products: {
      list: () => respond(() => db.products),
      create: (product) =>
        respond(() => {
          db.products = [product, ...db.products.filter((p) => p.id !== product.id)];
          return product;
        }),
      update: (id, patch) =>
        respond(() => {
          const updated = { ...findProduct(id), ...patch, id };
          db.products = db.products.map((p) => (p.id === id ? updated : p));
          return updated;
        }),
      remove: (id) =>
        respond(() => {
          db.products = db.products.filter((p) => p.id !== id);
        }),
      restock: (id, quantity) =>
        respond(() => {
          const product = findProduct(id);
          const updated = { ...product, stock: product.stock + quantity };
          db.products = db.products.map((p) => (p.id === id ? updated : p));
          return updated;
        }),
    },
    sales: {
      list: () => respond(() => db.sales),
      create: ({ sale, lines }) =>
        respond(() => {
          for (const line of lines) {
            db.products = db.products.map((p) =>
              p.id === line.productId ? { ...p, stock: Math.max(0, p.stock - line.quantity) } : p
            );
          }
          db.sales = [sale, ...db.sales];
          return sale;
        }),
    },
    expenses: {
      list: () => respond(() => db.expenses),
      create: (expense) =>
        respond(() => {
          db.expenses = [expense, ...db.expenses];
          return expense;
        }),
      remove: (id) =>
        respond(() => {
          db.expenses = db.expenses.filter((e) => e.id !== id);
        }),
    },
    credits: {
      list: () => respond(() => db.credits),
      create: (credit) =>
        respond(() => {
          db.credits = [credit, ...db.credits];
          return credit;
        }),
      pay: (id, amount) =>
        respond(() => {
          const updated = applyPayment(findCredit(id), amount);
          db.credits = db.credits.map((c) => (c.id === id ? updated : c));
          return updated;
        }),
      remove: (id) =>
        respond(() => {
          db.credits = db.credits.filter((c) => c.id !== id);
        }),
    },
    notifications: {
      list: () => respond(() => db.notifications),
      markRead: (id) =>
        respond(() => {
          db.notifications = db.notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
        }),
      markAllRead: () =>
        respond(() => {
          db.notifications = db.notifications.map((n) => ({ ...n, read: true }));
        }),
    },
  };
}
