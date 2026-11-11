// Référentiels et constantes d'affichage partagés (catégories, moyens de
// paiement, seuils). Les libellés longs restent dans `@/content`.

import type {
  Category,
  CreditStatus,
  NotificationType,
  PaymentKind,
  PaymentMethod,
  PaymentProvider,
  SaleStatus,
  StockStatus,
  TabType,
  TenderMethod,
} from '@/types';

/**
 * Référentiels de valeurs : SOURCE UNIQUE des unions métier côté valeurs.
 * `satisfies` garantit qu'aucune valeur n'est inventée ; les gardes de
 * `store/storeUtils.ts` et les formulaires en dérivent (ne jamais réécrire
 * ces listes ailleurs).
 */
export const PRODUCT_CATEGORIES = [
  'Épicerie',
  'Boissons',
  'Frais',
  'Hygiène',
] as const satisfies readonly Category[];

export const SALE_STATUSES = ['completed', 'partial', 'pending', 'cancelled'] as const satisfies readonly SaleStatus[];

export const CREDIT_STATUSES = [
  'overdue',
  'partial',
  'pending',
  'settled',
] as const satisfies readonly CreditStatus[];

/**
 * Anciens libellés français (données persistées avant les identifiants stables)
 * → identifiants. Sert uniquement à migrer un stockage local ; jamais à l'API.
 */
const LEGACY_SALE_STATUS: Readonly<Record<string, SaleStatus>> = {
  Validé: 'completed',
  Partiel: 'partial',
  'En attente': 'pending',
  Annulée: 'cancelled',
};
const LEGACY_CREDIT_STATUS: Readonly<Record<string, CreditStatus>> = {
  'En retard': 'overdue',
  Partiel: 'partial',
  'En attente': 'pending',
  Réglé: 'settled',
};

/** Identifiant de statut de vente, qu'il soit déjà stable ou ancien libellé ; `null` sinon. */
export function normalizeSaleStatus(value: unknown): SaleStatus | null {
  if (typeof value !== 'string') return null;
  if ((SALE_STATUSES as readonly string[]).includes(value)) return value as SaleStatus;
  return LEGACY_SALE_STATUS[value] ?? null;
}

/** Identifiant de statut de crédit, qu'il soit déjà stable ou ancien libellé ; `null` sinon. */
export function normalizeCreditStatus(value: unknown): CreditStatus | null {
  if (typeof value !== 'string') return null;
  if ((CREDIT_STATUSES as readonly string[]).includes(value)) return value as CreditStatus;
  return LEGACY_CREDIT_STATUS[value] ?? null;
}

export const NOTIFICATION_TYPES = [
  'warning',
  'alert',
  'info',
  'success',
] as const satisfies readonly NotificationType[];

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
  /** Identifiant d'API stable. */
  method: PaymentMethod;
  /** Libellé complet (listes, exports). */
  label: string;
  /** Libellé court (boutons, tickets). */
  short: string;
  icon: string;
  kind: PaymentKind;
  /**
   * Canaux par lesquels ce moyen peut être encaissé en ligne, en plus du
   * transfert direct. Vide pour espèces, crédit et autre. Couverture publiée
   * par FedaPay (docs.fedapay.com, « Payment methods ») et KKiaPay
   * (docs.kkiapay.me, « Méthodes de paiement » ; Celtiis Cash : CGU) — elle
   * varie selon le pays et doit être revérifiée avant la mise en production.
   */
  providers: readonly Exclude<PaymentProvider, 'manual'>[];
}

/**
 * Catalogue des moyens de paiement, **dans l'ordre d'affichage** : le mobile
 * money d'abord (priorité produit), puis la carte, les espèces et le crédit.
 */
export const PAYMENT_METHODS: readonly PaymentMethodOption[] = [
  { method: 'mtn_money', label: 'MTN Mobile Money', short: 'MTN MoMo', icon: 'smartphone', kind: 'mobile_money', providers: ['fedapay', 'kkiapay'] },
  { method: 'moov_money', label: 'Moov Money', short: 'Moov Money', icon: 'smartphone', kind: 'mobile_money', providers: ['fedapay', 'kkiapay'] },
  { method: 'orange_money', label: 'Orange Money', short: 'Orange Money', icon: 'phone_iphone', kind: 'mobile_money', providers: ['fedapay'] },
  { method: 'wave', label: 'Wave', short: 'Wave', icon: 'waves', kind: 'mobile_money', providers: ['fedapay'] },
  { method: 'celtiis_cash', label: 'Celtiis Cash', short: 'Celtiis Cash', icon: 'smartphone', kind: 'mobile_money', providers: ['fedapay', 'kkiapay'] },
  { method: 'card', label: 'Carte bancaire', short: 'Carte', icon: 'credit_card', kind: 'card', providers: ['fedapay', 'kkiapay'] },
  { method: 'cash', label: 'Espèces', short: 'Espèces', icon: 'payments', kind: 'cash', providers: [] },
  { method: 'credit', label: 'À crédit', short: 'Crédit', icon: 'account_balance_wallet', kind: 'credit', providers: [] },
  { method: 'other', label: 'Autre moyen', short: 'Autre', icon: 'more_horiz', kind: 'other', providers: [] },
];

/** Valeurs de `PaymentMethod` (dérivées, jamais dupliquées). */
export const PAYMENT_METHOD_VALUES: readonly PaymentMethod[] = PAYMENT_METHODS.map(
  (option) => option.method
);

/** Moyens proposés à l'encaissement d'une vente (tout sauf « autre »). */
export const SALE_PAYMENT_METHODS: readonly PaymentMethodOption[] = PAYMENT_METHODS.filter(
  (option) => option.method !== 'other'
);

export type TenderMethodOption = PaymentMethodOption & { method: TenderMethod };

/** Moyens pour recevoir ou verser de l'argent (tout sauf le crédit) : règlements, dépenses, abonnement. */
export const TENDER_METHODS: readonly TenderMethodOption[] = PAYMENT_METHODS.filter(
  (option): option is TenderMethodOption => option.method !== 'credit'
);

/**
 * Moyens payables en ligne via un agrégateur (abonnement de la plateforme) : ceux
 * qui ont au moins un agrégateur. Même ordre que le catalogue : mobile money d'abord.
 */
export const ONLINE_PAYMENT_METHODS: readonly TenderMethodOption[] = TENDER_METHODS.filter(
  (option) => option.providers.length > 0
);

const LEGACY_PAYMENT_METHOD: Readonly<Record<string, PaymentMethod>> = {
  Espèces: 'cash',
  'Mobile Money (Wave)': 'wave',
  Wave: 'wave',
  'Orange Money': 'orange_money',
  'Carte Bancaire': 'card',
  Carte: 'card',
  'Crédit Partiel': 'credit',
};

/**
 * Identifiant de moyen de paiement, qu'il soit déjà stable ou un ancien libellé
 * français (migration d'un stockage local) ; `null` si la valeur est inconnue.
 */
export function normalizePaymentMethod(value: unknown): PaymentMethod | null {
  if (typeof value !== 'string') return null;
  if ((PAYMENT_METHOD_VALUES as readonly string[]).includes(value)) return value as PaymentMethod;
  return LEGACY_PAYMENT_METHOD[value] ?? null;
}

/** Comme `normalizePaymentMethod`, limité aux moyens par lesquels de l'argent circule. */
export function normalizeTenderMethod(value: unknown): TenderMethod | null {
  const method = normalizePaymentMethod(value);
  return method === null || method === 'credit' ? null : method;
}

/** Option du catalogue ; `undefined` pour une valeur inconnue. */
export function paymentOption(method: string): PaymentMethodOption | undefined {
  return PAYMENT_METHODS.find((option) => option.method === method);
}

/** Libellé complet d'un moyen ; l'identifiant lui-même s'il est inconnu. */
export function paymentLabel(method: string): string {
  return paymentOption(method)?.label ?? method;
}

/** Libellé court d'un moyen ; l'identifiant lui-même s'il est inconnu. */
export function paymentShortLabel(method: string): string {
  return paymentOption(method)?.short ?? method;
}

/** Vrai pour le mobile money (opérateur de téléphonie). */
export function isMobileMoney(method: string): boolean {
  return paymentOption(method)?.kind === 'mobile_money';
}

export const STOCK_STATUS_TONE: Record<StockStatus, 'success' | 'warning' | 'danger'> = {
  disponible: 'success',
  faible: 'warning',
  rupture: 'danger',
};

export const CREDIT_STATUS_TONE: Record<CreditStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  settled: 'success',
  partial: 'warning',
  overdue: 'danger',
  pending: 'neutral',
};

export const SALE_STATUS_TONE: Record<SaleStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  completed: 'success',
  partial: 'warning',
  cancelled: 'danger',
  pending: 'neutral',
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
export { DEMO_PASSWORD as DEMO_INVITE_PASSWORD } from '@/mocks/fixtures/accounts';
