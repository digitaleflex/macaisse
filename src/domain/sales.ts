// Règles métier des ventes : panier, totaux, validation, séries de revenus.

import type {
  CartLine,
  ClientCredit,
  PaymentMethod,
  Product,
  Role,
  SaleStatus,
  SaleTransaction,
  SeriesPoint,
} from '../types';
import { addDays, formatTime, isSameDay, parseDate, startOfDay, toIsoDate } from './dates';
import { createId, nextSaleNumber, nextSaleSequence } from './ids';
import { can } from './permissions';
import { computeStockStatus } from './stock';

export interface CartTotals {
  subtotal: number;
  itemCount: number;
}

/**
 * RG-A03 — un ticket ne doit pas sortir sans contact téléphonique.
 * Le contact peut venir du commerce (reçu) ou du compte : une seule adresse
 * valide suffit. Le serveur applique la même règle, cette fonction sert à
 * bloquer l'encaissement **avant** d'ouvrir le paiement.
 */
export function hasContactPhone(...phones: (string | null | undefined)[]): boolean {
  return phones.some((phone) => (phone ?? '').trim().length > 0);
}

/** Total d'un panier et nombre d'articles (somme des quantités). */
export function cartTotals(lines: CartLine[]): CartTotals {
  return lines.reduce<CartTotals>(
    (acc, line) => ({
      subtotal: acc.subtotal + line.price * line.quantity,
      itemCount: acc.itemCount + line.quantity,
    }),
    { subtotal: 0, itemCount: 0 }
  );
}

/** Ajoute un produit au panier en fusionnant les lignes du même produit. */
export function addToCart(lines: CartLine[], product: Product, qty = 1): CartLine[] {
  const existing = lines.find((line) => line.productId === product.id);
  if (existing) {
    return setCartQuantity(lines, product.id, existing.quantity + qty);
  }
  if (qty <= 0) return lines;
  return [
    ...lines,
    {
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: qty,
      unit: product.unit,
    },
  ];
}

/** Fixe la quantité d'une ligne. Une quantité ≤ 0 retire la ligne. */
export function setCartQuantity(lines: CartLine[], productId: string, qty: number): CartLine[] {
  if (qty <= 0) return removeFromCart(lines, productId);
  return lines.map((line) => (line.productId === productId ? { ...line, quantity: qty } : line));
}

/** Retire un produit du panier. */
export function removeFromCart(lines: CartLine[], productId: string): CartLine[] {
  return lines.filter((line) => line.productId !== productId);
}

export interface CompleteSaleInput {
  lines: CartLine[];
  products: Product[];
  paymentMethod: PaymentMethod;
  date?: Date;
  clientName?: string;
  saleNumber?: string;
  creditAmount?: number;
  /** Vendeur qui encaisse (historique filtrable par vendeur, EF-13). */
  seller?: { id: string; name: string };
}

export interface CompleteSaleResult {
  sale: SaleTransaction;
  products: Product[];
}

/**
 * Valide une vente : calcule le total, décrémente le stock, gère les ventes partielles.
 * Refuse (throw) si le panier est vide ou si le stock est insuffisant.
 */
export function completeSale(input: CompleteSaleInput): CompleteSaleResult {
  const {
    lines,
    products,
    paymentMethod,
    date = new Date(),
    clientName,
    saleNumber,
    creditAmount = 0,
    seller,
  } = input;

  if (lines.length === 0) {
    throw new Error('Impossible de valider une vente sans article.');
  }

  // Quantité requise par produit (fusionne d'éventuelles lignes en double).
  const requiredByProduct = new Map<string, number>();
  for (const line of lines) {
    requiredByProduct.set(
      line.productId,
      (requiredByProduct.get(line.productId) ?? 0) + line.quantity
    );
  }

  // Vérifie la disponibilité avant toute mutation.
  for (const [productId, quantity] of requiredByProduct) {
    const product = products.find((p) => p.id === productId);
    if (!product) {
      throw new Error(`Produit introuvable pour la vente (${productId}).`);
    }
    if (product.deactivatedAt !== undefined) {
      throw new Error(`« ${product.name} » est désactivé : il ne peut plus être vendu.`);
    }
    if (quantity > product.stock) {
      throw new Error(
        `Stock insuffisant pour « ${product.name} » : ${product.stock} disponible(s), ${quantity} demandé(s).`
      );
    }
  }

  const { subtotal, itemCount } = cartTotals(lines);

  const updatedProducts = products.map((product) => {
    const quantity = requiredByProduct.get(product.id);
    if (!quantity) return product;
    const stock = product.stock - quantity;
    return { ...product, stock, status: computeStockStatus(stock, product.minStockAlert) };
  });

  const trimmedClient = clientName?.trim();
  // Le crédit est borné au sous-total et arrondi au franc : un reste dû ne peut
  // jamais dépasser la vente, et aucun montant fractionnaire n'entre en état.
  const normalizedCredit = Math.min(subtotal, Math.max(0, Math.round(creditAmount)));
  if (normalizedCredit > 0 && !trimmedClient) {
    throw new Error('Une vente à crédit nécessite le nom du client.');
  }
  const status: SaleStatus = normalizedCredit > 0 ? 'partial' : 'completed';

  const sale: SaleTransaction = {
    id: createId('sale'),
    saleNumber: saleNumber ?? nextSaleNumber(nextSaleSequence(), date),
    time: formatTime(date),
    date: toIsoDate(date),
    paymentMethod,
    amount: subtotal,
    status,
    clientName: trimmedClient ? trimmedClient : undefined,
    remainingAmount: normalizedCredit > 0 ? normalizedCredit : undefined,
    itemsCount: itemCount,
    ...(seller ? { sellerId: seller.id, sellerName: seller.name } : {}),
    // Copie figée des lignes : l'annulation en a besoin pour remettre le stock.
    lines: lines.map((line) => ({ ...line })),
  };

  return { sale, products: updatedProducts };
}

// ---------------------------------------------------------------------------
// Annulation (EF-14 à EF-17, RG-04, RG-05, RG-09)
// ---------------------------------------------------------------------------

/** Longueur minimale du motif d'annulation, une fois les espaces retirés. */
export const MIN_CANCEL_REASON_LENGTH = 3;

/** Une vente annulée reste dans l'historique mais ne compte dans aucun total. */
export function isActiveSale(sale: SaleTransaction): boolean {
  return sale.status !== 'cancelled';
}

/** Ventes comptabilisables (revenus, canaux, export). */
export function activeSales(sales: readonly SaleTransaction[]): SaleTransaction[] {
  return sales.filter(isActiveSale);
}

/** Motif du refus d'une annulation. */
export type CancelDenial =
  /** Déjà annulée. */
  | 'already-cancelled'
  /** Le rôle n'a pas la permission d'annuler. */
  | 'role'
  /** Vente d'un autre jour : réservée au propriétaire. */
  | 'window'
  /** Le crédit lié a déjà reçu un remboursement (EF-16). */
  | 'credit-repaid';

export interface CancelAssessment {
  allowed: boolean;
  denial?: CancelDenial;
  /** Montant déjà remboursé sur le crédit lié (information pour l'écran). */
  repaidAmount: number;
}

/** Montant déjà remboursé d'un crédit (initial − reste). */
export function repaidAmountOf(credit: ClientCredit | undefined): number {
  return credit ? Math.max(0, credit.totalInitial - credit.remainingAmount) : 0;
}

/**
 * Dit si `role` peut annuler `sale` maintenant. Règles : permission d'annuler ;
 * le jour même pour le gérant, tout jour pour le propriétaire ; aucune annulation
 * si le crédit lié a reçu un remboursement. Le serveur applique les mêmes règles.
 */
export function assessCancellation(input: {
  sale: SaleTransaction;
  credit?: ClientCredit;
  role: Role;
  now?: Date;
}): CancelAssessment {
  const { sale, credit, role, now = new Date() } = input;
  const repaidAmount = repaidAmountOf(credit);
  const deny = (denial: CancelDenial): CancelAssessment => ({
    allowed: false,
    denial,
    repaidAmount,
  });

  if (!isActiveSale(sale)) return deny('already-cancelled');
  if (!can(role, 'sales.cancel')) return deny('role');
  const saleDate = parseDate(sale.date);
  if (saleDate && !isSameDay(saleDate, now) && !can(role, 'sales.cancelAnyDay'))
    return deny('window');
  if (repaidAmount > 0) return deny('credit-repaid');
  return { allowed: true, repaidAmount };
}

/** Motif normalisé, ou `null` s'il est trop court (RG-09). */
export function normalizeCancelReason(reason: string): string | null {
  const trimmed = reason.trim();
  return trimmed.length >= MIN_CANCEL_REASON_LENGTH ? trimmed : null;
}

export interface CancelSaleInput {
  sale: SaleTransaction;
  products: Product[];
  reason: string;
  /** Nom de l'auteur de l'annulation (trace : qui). */
  by: string;
  date?: Date;
}

export interface CancelSaleResult {
  sale: SaleTransaction;
  products: Product[];
  /** Faux si le détail des articles est inconnu : le stock n'a pas pu être remis. */
  stockRestored: boolean;
}

/**
 * Annule une vente (pur, immuable) : statut « Annulée » avec motif, auteur et
 * date ; les quantités vendues retournent en stock. La vente n'est jamais
 * supprimée. Refuse (throw) un motif trop court ou une vente déjà annulée.
 * Le crédit lié est traité par l'appelant (voir `assessCancellation`).
 */
export function cancelSale(input: CancelSaleInput): CancelSaleResult {
  const { sale, products, by, date = new Date() } = input;
  if (!isActiveSale(sale)) {
    throw new Error('Cette vente est déjà annulée.');
  }
  const reason = normalizeCancelReason(input.reason);
  if (reason === null) {
    throw new Error(
      `Le motif d’annulation est obligatoire (${MIN_CANCEL_REASON_LENGTH} caractères minimum).`,
    );
  }

  const lines = sale.lines ?? [];
  const restored = new Map<string, number>();
  for (const line of lines) {
    restored.set(line.productId, (restored.get(line.productId) ?? 0) + line.quantity);
  }
  const updatedProducts = products.map((product) => {
    const quantity = restored.get(product.id);
    if (!quantity) return product;
    const stock = product.stock + quantity;
    return { ...product, stock, status: computeStockStatus(stock, product.minStockAlert) };
  });

  const cancelled: SaleTransaction = {
    ...sale,
    status: 'cancelled',
    cancelledAt: date.toISOString(),
    cancelledBy: by,
    cancelReason: reason,
  };
  // Le crédit lié disparaît avec la vente : plus de reste dû ni de lien.
  delete cancelled.remainingAmount;
  delete cancelled.creditId;
  return { sale: cancelled, products: updatedProducts, stockRestored: lines.length > 0 };
}

// ---------------------------------------------------------------------------
// Historique des ventes (EF-13) : filtres par période, vendeur et statut
// ---------------------------------------------------------------------------

export type SalesPeriod = 'today' | '7d' | '30d' | 'all' | 'custom';

/** Valeur du filtre « vendeur » pour les ventes sans vendeur enregistré. */
export const SELLER_UNKNOWN = '__unknown__';

export interface SalesFilters {
  period: SalesPeriod;
  /** Bornes « YYYY-MM-DD » inclusives, utilisées si `period === 'custom'`. */
  from: string;
  to: string;
  /** `'all'`, une clé de vendeur (`sellerKey`) ou `SELLER_UNKNOWN`. */
  seller: string;
  status: SaleStatus | 'all';
  /** Recherche libre : numéro de ticket ou nom du client. */
  query: string;
}

export const DEFAULT_SALES_FILTERS: SalesFilters = {
  period: 'all',
  from: '',
  to: '',
  seller: 'all',
  status: 'all',
  query: '',
};

/** Clé stable d'un vendeur (identifiant, à défaut le nom) ; `''` si inconnu. */
export function sellerKey(sale: SaleTransaction): string {
  return sale.sellerId ?? sale.sellerName ?? '';
}

export interface SellerOption {
  key: string;
  name: string;
}

/** Vendeurs distincts présents dans les ventes, triés par nom. */
export function sellerOptions(sales: readonly SaleTransaction[]): SellerOption[] {
  const byKey = new Map<string, string>();
  for (const sale of sales) {
    const key = sellerKey(sale);
    if (key !== '' && !byKey.has(key)) byKey.set(key, sale.sellerName ?? key);
  }
  return [...byKey.entries()]
    .map(([key, name]) => ({ key, name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}

/** Bornes « YYYY-MM-DD » (inclusives) d'une période ; `null` = pas de borne. */
function periodBounds(filters: SalesFilters, now: Date): { from: string | null; to: string | null } {
  switch (filters.period) {
    case 'today':
      return { from: toIsoDate(now), to: toIsoDate(now) };
    case '7d':
      return { from: toIsoDate(addDays(now, -6)), to: toIsoDate(now) };
    case '30d':
      return { from: toIsoDate(addDays(now, -29)), to: toIsoDate(now) };
    case 'custom':
      return { from: filters.from || null, to: filters.to || null };
    default:
      return { from: null, to: null };
  }
}

/**
 * Ventes correspondant aux filtres, de la plus récente à la plus ancienne
 * (date puis heure). Les ventes annulées restent listées : seul le filtre de
 * statut permet de les masquer.
 */
export function filterSales(
  sales: readonly SaleTransaction[],
  filters: SalesFilters,
  now: Date = new Date()
): SaleTransaction[] {
  const { from, to } = periodBounds(filters, now);
  const query = filters.query.trim().toLowerCase();

  const matches = sales.filter((sale) => {
    if (from !== null || to !== null) {
      const date = parseDate(sale.date);
      if (!date) return false;
      const key = toIsoDate(date);
      if (from !== null && key < from) return false;
      if (to !== null && key > to) return false;
    }
    if (filters.status !== 'all' && sale.status !== filters.status) return false;
    if (filters.seller !== 'all') {
      const key = sellerKey(sale);
      if (filters.seller === SELLER_UNKNOWN ? key !== '' : key !== filters.seller) return false;
    }
    if (query !== '') {
      const haystack = `${sale.saleNumber} ${sale.clientName ?? ''}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });

  const stamp = (sale: SaleTransaction): string => {
    const date = parseDate(sale.date);
    return `${date ? toIsoDate(date) : ''} ${sale.time}`;
  };
  // Tri stable : à égalité de date et d'heure, l'ordre d'origine est conservé.
  return matches
    .map((sale, index) => ({ sale, index, stamp: stamp(sale) }))
    .sort((a, b) => (a.stamp < b.stamp ? 1 : a.stamp > b.stamp ? -1 : a.index - b.index))
    .map((entry) => entry.sale);
}

export interface SalesSummary {
  /** Ventes affichées, annulées comprises. */
  count: number;
  /** Ventes annulées parmi elles. */
  cancelledCount: number;
  /** Total des ventes non annulées. */
  total: number;
}

export function summarizeSales(sales: readonly SaleTransaction[]): SalesSummary {
  let total = 0;
  let cancelledCount = 0;
  for (const sale of sales) {
    if (isActiveSale(sale)) total += sale.amount;
    else cancelledCount += 1;
  }
  return { count: sales.length, cancelledCount, total };
}

/** Série des revenus journaliers sur les `days` derniers jours (jours vides à 0). */
export function dailyRevenue(sales: SaleTransaction[], days: number, now: Date = new Date()): SeriesPoint[] {
  const totals = new Map<string, number>();
  for (const sale of activeSales(sales)) {
    const date = parseDate(sale.date);
    if (!date) continue;
    const key = toIsoDate(date);
    totals.set(key, (totals.get(key) ?? 0) + sale.amount);
  }

  const end = startOfDay(now);
  const series: SeriesPoint[] = [];
  for (let i = Math.max(0, days) - 1; i >= 0; i -= 1) {
    const key = toIsoDate(addDays(end, -i));
    series.push({ date: key, value: totals.get(key) ?? 0 });
  }
  return series;
}
