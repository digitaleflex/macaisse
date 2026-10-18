// Règles métier des ventes : panier, totaux, validation, séries de revenus.

import type {
  CartLine,
  PaymentMethod,
  Product,
  SaleStatus,
  SaleTransaction,
  SeriesPoint,
} from '../types';
import { addDays, formatTime, parseDate, startOfDay, toIsoDate } from './dates';
import { createId, nextSaleNumber, nextSaleSequence } from './ids';
import { computeStockStatus } from './stock';

export interface CartTotals {
  subtotal: number;
  itemCount: number;
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

  const normalizedCredit = Math.max(0, creditAmount);
  const status: SaleStatus = normalizedCredit > 0 ? 'Partiel' : 'Validé';
  const trimmedClient = clientName?.trim();

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
  };

  return { sale, products: updatedProducts };
}

/** Série des revenus journaliers sur les `days` derniers jours (jours vides à 0). */
export function dailyRevenue(sales: SaleTransaction[], days: number, now: Date = new Date()): SeriesPoint[] {
  const totals = new Map<string, number>();
  for (const sale of sales) {
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
