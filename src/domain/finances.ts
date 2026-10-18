// Règles métier financières : KPI, séries, répartitions.

import type {
  BreakdownSlice,
  ClientCredit,
  Expense,
  Kpis,
  PaymentMethod,
  Product,
  SaleTransaction,
  SeriesPoint,
} from '../types';
import { addDays, isSameDay, isSameMonth, parseDate, startOfDay, toIsoDate } from './dates';
import { computeStockStatus } from './stock';

export interface KpisInput {
  sales: SaleTransaction[];
  expenses: Expense[];
  credits: ClientCredit[];
  products: Product[];
}

function sumByDay(items: { date: string; amount: number }[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const item of items) {
    const date = parseDate(item.date);
    if (!date) continue;
    const key = toIsoDate(date);
    totals.set(key, (totals.get(key) ?? 0) + item.amount);
  }
  return totals;
}

/**
 * Indicateurs de l'accueil : CA du jour, CA du mois, marge, créances en attente,
 * dépenses du mois, alertes stock.
 *
 * La marge est la marge potentielle du stock courant : somme de (prix de vente −
 * prix d'achat) × stock (les ventes ne portent pas le détail des lignes vendues).
 */
export function computeKpis(input: KpisInput, now: Date = new Date()): Kpis {
  const { sales, expenses, credits, products } = input;

  let dailyRevenue = 0;
  let monthlyRevenue = 0;
  for (const sale of sales) {
    const date = parseDate(sale.date);
    if (!date) continue;
    if (isSameDay(date, now)) dailyRevenue += sale.amount;
    if (isSameMonth(date, now)) monthlyRevenue += sale.amount;
  }

  let monthlyExpenses = 0;
  for (const expense of expenses) {
    const date = parseDate(expense.date);
    if (date && isSameMonth(date, now)) monthlyExpenses += expense.amount;
  }

  const outstandingCredits = credits.reduce((sum, c) => sum + Math.max(0, c.remainingAmount), 0);

  const margin = products.reduce((sum, p) => sum + (p.price - p.costPrice) * p.stock, 0);

  const stockAlerts = products.filter(
    (p) => computeStockStatus(p.stock, p.minStockAlert) !== 'disponible'
  ).length;

  return { dailyRevenue, monthlyRevenue, margin, outstandingCredits, monthlyExpenses, stockAlerts };
}

/** Série des revenus journaliers sur les `days` derniers jours (jours vides à 0). */
export function dailyRevenueSeries(
  sales: SaleTransaction[],
  days: number,
  now: Date = new Date()
): SeriesPoint[] {
  const totals = sumByDay(sales);
  const end = startOfDay(now);
  const series: SeriesPoint[] = [];
  for (let i = Math.max(0, days) - 1; i >= 0; i -= 1) {
    const key = toIsoDate(addDays(end, -i));
    series.push({ date: key, value: totals.get(key) ?? 0 });
  }
  return series;
}

/** Flux de trésorerie journalier : entrées (ventes) − sorties (dépenses). */
export function cashFlowSeries(
  sales: SaleTransaction[],
  expenses: Expense[],
  days: number,
  now: Date = new Date()
): SeriesPoint[] {
  const revenue = dailyRevenueSeries(sales, days, now);
  const expensesByDay = sumByDay(expenses);
  return revenue.map((point) => ({
    date: point.date,
    value: point.value - (expensesByDay.get(point.date) ?? 0),
  }));
}

/**
 * Répartition des dépenses par poste (catégorie), triée par montant décroissant.
 * `from` et `to` bornent optionnellement la période (inclus).
 */
export function expenseBreakdown(expenses: Expense[], from?: Date, to?: Date): BreakdownSlice[] {
  const fromKey = from ? toIsoDate(from) : undefined;
  const toKey = to ? toIsoDate(to) : undefined;

  const totals = new Map<string, number>();
  for (const expense of expenses) {
    const date = parseDate(expense.date);
    if (!date) continue;
    const key = toIsoDate(date);
    if (fromKey && key < fromKey) continue;
    if (toKey && key > toKey) continue;
    const category = expense.category || 'Autre';
    totals.set(category, (totals.get(category) ?? 0) + expense.amount);
  }

  return [...totals.entries()]
    .map(([key, amount]) => ({ key, label: key, amount }))
    .sort((a, b) => b.amount - a.amount);
}

/** Répartition des encaissements par moyen de paiement, triée décroissante. */
export function channelSplit(sales: SaleTransaction[]): BreakdownSlice[] {
  const totals = new Map<PaymentMethod, number>();
  for (const sale of sales) {
    totals.set(sale.paymentMethod, (totals.get(sale.paymentMethod) ?? 0) + sale.amount);
  }
  return [...totals.entries()]
    .map(([key, amount]) => ({ key, label: key, amount }))
    .sort((a, b) => b.amount - a.amount);
}
