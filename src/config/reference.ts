// Référentiels et constantes d'affichage partagés (catégories, moyens de
// paiement, seuils). Les libellés longs restent dans `@/content`.

import type { Category, PaymentMethod, StockStatus, CreditStatus, TabType } from '@/types';

export const PRODUCT_CATEGORIES: readonly Category[] = ['Épicerie', 'Boissons', 'Frais', 'Hygiène'];

/** Icône et teinte associées à chaque rayon (vignettes produit sans image). */
export const CATEGORY_STYLE: Record<Category, { icon: string; tone: string }> = {
  Épicerie: { icon: 'grocery', tone: 'bg-amber-100 text-amber-700' },
  Boissons: { icon: 'local_drink', tone: 'bg-sky-100 text-sky-700' },
  Frais: { icon: 'egg', tone: 'bg-emerald-100 text-emerald-700' },
  Hygiène: { icon: 'soap', tone: 'bg-violet-100 text-violet-700' },
};

export const EXPENSE_CATEGORIES = ['Achat Stock', 'Transport', 'Factures', 'Salaires', 'Divers'] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const EXPENSE_CATEGORY_ICON: Record<string, string> = {
  'Achat Stock': 'shopping_cart',
  Stock: 'shopping_cart',
  Transport: 'local_shipping',
  Factures: 'bolt',
  Salaires: 'badge',
  Divers: 'category',
};

export interface PaymentMethodOption {
  method: PaymentMethod;
  short: string;
  icon: string;
}

export const PAYMENT_METHODS: readonly PaymentMethodOption[] = [
  { method: 'Espèces', short: 'Espèces', icon: 'payments' },
  { method: 'Mobile Money (Wave)', short: 'Wave', icon: 'waves' },
  { method: 'Orange Money', short: 'Orange Money', icon: 'phone_iphone' },
  { method: 'Carte Bancaire', short: 'Carte', icon: 'credit_card' },
  { method: 'Crédit Partiel', short: 'Crédit', icon: 'account_balance_wallet' },
];

export function paymentShortLabel(method: string): string {
  return PAYMENT_METHODS.find((option) => option.method === method)?.short ?? method;
}

export const STOCK_STATUS_TONE: Record<StockStatus, 'success' | 'warning' | 'danger'> = {
  disponible: 'success',
  faible: 'warning',
  rupture: 'danger',
};

export const CREDIT_STATUS_TONE: Record<CreditStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  Réglé: 'success',
  Partiel: 'warning',
  'En retard': 'danger',
  'En attente': 'neutral',
};

/** Navigation principale (ordre d'affichage). Libellés : `content.nav`. */
export const TAB_ORDER: readonly TabType[] = ['accueil', 'ventes', 'stock', 'credits', 'bilan'];

export const TAB_ICON: Record<TabType, string> = {
  accueil: 'space_dashboard',
  ventes: 'point_of_sale',
  stock: 'inventory_2',
  credits: 'account_balance_wallet',
  bilan: 'monitoring',
};

/** Objectif journalier indicatif affiché sur la courbe des revenus (FCFA). */
export const DAILY_REVENUE_TARGET = 60000;

/** Quantités proposées en réapprovisionnement rapide. */
export const QUICK_RESTOCK_STEPS = [5, 10, 20] as const;

/** Montants rapides proposés pour un règlement de crédit (FCFA). */
export const QUICK_CREDIT_PAYMENTS = [5000, 10000, 20000] as const;

/** Mot de passe attribué aux membres invités en mode démo (voir `mocks/`). */
export const DEMO_INVITE_PASSWORD = 'demo1234';
