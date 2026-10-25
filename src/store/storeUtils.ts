// Utilitaires partagés par les stores Zustand : nom de clé localStorage, version
// du schéma, options `persist` mutualisées et coercions défensives utilisées par
// les migrations. Aucune règle métier ici — uniquement de la plomberie d'état.
//
// RÈGLE SÉLECTEURS (zustand v5) : ne JAMAIS passer directement à `useStore` un
// sélecteur qui alloue une référence fraîche (objet/tableau neuf) à chaque appel
// — `useSyncExternalStore` le voit changer à l'infini et boucle le rendu. Dans ce
// cas, s'abonner à une tranche STABLE (`state.products`, `state.credits`,
// `state.lines`…) puis dériver avec `useMemo`, OU envelopper le sélecteur avec
// `useShallow` (`zustand/react/shallow`) quand une comparaison superficielle
// suffit. Les sélecteurs primitifs (booléen, nombre, chaîne) sont toujours sûrs.

import { createJSONStorage, type PersistOptions } from 'zustand/middleware';
import { env, type ApiMode } from '@/config/env';
import type {
  Category,
  CreditStatus,
  NotificationType,
  PaymentMethod,
  SaleStatus,
  TabType,
} from '@/types';

/**
 * Version courante du schéma persisté.
 * La v1 (données historiques) portait des identifiants numériques ; la v2 utilise
 * des `string` conformément au domaine (`domain/ids.ts`).
 */
export const STORE_VERSION = 2;

/** Clés localStorage — une par store, jamais dupliquées. */
export const PERSIST_NAMES = {
  products: 'ma-caisse/products',
  cart: 'ma-caisse/cart',
  sales: 'ma-caisse/sales',
  expenses: 'ma-caisse/expenses',
  credits: 'ma-caisse/credits',
  notifications: 'ma-caisse/notifications',
  ui: 'ma-caisse/ui',
  auth: 'ma-caisse/auth',
} as const;

export type PersistName = (typeof PERSIST_NAMES)[keyof typeof PERSIST_NAMES];

/**
 * Construit les options `persist` d'un store : clé, version, stockage JSON
 * localStorage, `partialize` et `migrate`. Centralise la configuration pour que
 * chaque store n'exprime que ce qui lui est propre.
 */
export function persistOptions<T, U>(
  name: PersistName,
  partialize: (state: T) => U,
  migrate: (persistedState: unknown, version: number) => U
): PersistOptions<T, U> {
  return {
    name,
    version: STORE_VERSION,
    storage: createJSONStorage<U>(() => localStorage),
    partialize,
    migrate,
  };
}

/**
 * Repli de réhydratation d'une collection de démonstration. En mode `http`, une
 * organisation réelle ne doit JAMAIS voir réapparaître les fixtures : un blob
 * absent ou illisible donne une collection vide, pas la démo.
 */
export function seedFallback<T>(seed: readonly T[], mode: ApiMode = env.apiMode): T[] {
  return mode === 'http' ? [] : seed.map((item) => item);
}

// ---------------------------------------------------------------------------
// Coercions défensives : une donnée persistée malformée ne doit jamais planter.
// ---------------------------------------------------------------------------

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function coerceArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/** Identifiant : accepte `string` et coerce les anciens ids numériques en string. */
export function coerceId(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return null;
}

export function coerceString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return fallback;
}

export function coerceNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

export function coerceBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

// ---------------------------------------------------------------------------
// Gardes de types (valeurs d'union du domaine).
// ---------------------------------------------------------------------------

function stringSet(values: readonly string[]): ReadonlySet<string> {
  return new Set(values);
}

const CATEGORY_SET = stringSet(['Frais', 'Épicerie', 'Boissons', 'Hygiène']);
export function isCategory(value: unknown): value is Category {
  return typeof value === 'string' && CATEGORY_SET.has(value);
}

const PAYMENT_METHOD_SET = stringSet([
  'Espèces',
  'Mobile Money (Wave)',
  'Orange Money',
  'Carte Bancaire',
  'Crédit Partiel',
]);
export function isPaymentMethod(value: unknown): value is PaymentMethod {
  return typeof value === 'string' && PAYMENT_METHOD_SET.has(value);
}

const SALE_STATUS_SET = stringSet(['Validé', 'Partiel', 'En attente']);
export function isSaleStatus(value: unknown): value is SaleStatus {
  return typeof value === 'string' && SALE_STATUS_SET.has(value);
}

const CREDIT_STATUS_SET = stringSet(['En retard', 'Partiel', 'En attente', 'Réglé']);
export function isCreditStatus(value: unknown): value is CreditStatus {
  return typeof value === 'string' && CREDIT_STATUS_SET.has(value);
}

const NOTIFICATION_TYPE_SET = stringSet(['warning', 'alert', 'info', 'success']);
export function isNotificationType(value: unknown): value is NotificationType {
  return typeof value === 'string' && NOTIFICATION_TYPE_SET.has(value);
}

const TAB_SET = stringSet(['accueil', 'ventes', 'stock', 'credits', 'bilan']);
export function isTabType(value: unknown): value is TabType {
  return typeof value === 'string' && TAB_SET.has(value);
}

// ---------------------------------------------------------------------------
// Migration générique d'une liste persistée.
// ---------------------------------------------------------------------------

/**
 * Réhydrate une liste persistée : coerce chaque entrée via `coerce` et écarte les
 * entrées irréparables. Renvoie `fallback` (les données de seed) si le blob stocké
 * n'a pas la forme attendue, et `[]` si l'utilisateur a volontairement tout vidé.
 */
export function migrateList<T>(
  persisted: unknown,
  key: string,
  coerce: (value: unknown) => T | null,
  fallback: readonly T[]
): T[] {
  const record = isRecord(persisted) ? persisted : {};
  const raw = record[key];
  if (!Array.isArray(raw)) return fallback.map((item) => item);
  const items = raw.map(coerce).filter((item): item is T => item !== null);
  if (raw.length > 0 && items.length === 0) return fallback.map((item) => item);
  return items;
}
