// Règles métier des crédits clients : échéances, statut, paiements, synthèse.

import type { ClientCredit, CreditStatus } from '../types';
import { addDays, fullDaysBetween, parseDate, toIsoDate } from './dates';

/** Échéance par défaut d'un crédit né d'une vente au comptoir (en jours). */
export const DEFAULT_CREDIT_TERM_DAYS = 30;

/** Civilités ignorées lors du calcul des initiales. */
const CIVILITIES = /^(m|mme|mlle|mr|mrs|dr)\.?$/i;

/** Initiales d'affichage (« M. Ba Ousmane » → « BO »), repli « CL ». */
export function initialsFrom(name: string): string {
  const initials = name
    .split(/\s+/)
    .filter((word) => word.length > 0 && !CIVILITIES.test(word))
    .map((word) => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
  return initials.length > 0 ? initials : 'CL';
}

export interface CreditFromSaleInput {
  clientName: string;
  amount: number;
  date: Date;
  /** Commerce ou repère saisi par le caissier (« Client comptoir » par défaut). */
  place: string;
}

/**
 * Créance issue d'une vente au comptoir : échéance à 30 jours, montants entiers
 * en FCFA. Le téléphone reste vide : il n'est pas saisi à la caisse.
 */
export function creditFromSale({
  clientName,
  amount,
  date,
  place,
}: CreditFromSaleInput): Omit<ClientCredit, 'id' | 'status' | 'daysLate'> {
  const name = clientName.trim();
  const total = Math.max(0, Math.round(amount));
  return {
    clientName: name,
    initials: initialsFrom(name),
    shopOrLocation: place,
    phone: '',
    remainingAmount: total,
    totalInitial: total,
    dueDate: toIsoDate(addDays(date, DEFAULT_CREDIT_TERM_DAYS)),
  };
}

/** Nombre de jours de retard (0 si le crédit n'est pas échu). */
export function daysLate(dueDate: string, now: Date = new Date()): number {
  const due = parseDate(dueDate);
  if (!due) return 0;
  const diff = fullDaysBetween(due, now);
  return diff > 0 ? diff : 0;
}

/**
 * Statut d'un crédit : « Réglé » si le reste dû est nul, sinon « En retard » si échu,
 * sinon « Partiel » (acompte versé) ou « En attente ».
 */
export function computeCreditStatus(
  remainingAmount: number,
  totalInitial: number,
  dueDate: string,
  now: Date = new Date()
): CreditStatus {
  if (remainingAmount <= 0) return 'Réglé';
  if (daysLate(dueDate, now) > 0) return 'En retard';
  if (remainingAmount < totalInitial) return 'Partiel';
  return 'En attente';
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Progression du remboursement, entre 0 et 1. */
export function creditProgress(credit: ClientCredit): number {
  if (credit.totalInitial <= 0) {
    return credit.remainingAmount <= 0 ? 1 : 0;
  }
  const paid = credit.totalInitial - credit.remainingAmount;
  return clamp(paid / credit.totalInitial, 0, 1);
}

/**
 * Applique un paiement à un crédit (pur, immuable).
 * Refuse (throw) un montant ≤ 0 ou supérieur au reste dû.
 */
export function applyPayment(credit: ClientCredit, amount: number): ClientCredit {
  if (amount <= 0) {
    throw new Error('Le montant du paiement doit être supérieur à zéro.');
  }
  if (amount > credit.remainingAmount) {
    throw new Error(
      `Le paiement (${amount}) dépasse le reste dû (${credit.remainingAmount}).`
    );
  }

  const remainingAmount = Math.max(0, credit.remainingAmount - amount);
  return {
    ...credit,
    remainingAmount,
    status: computeCreditStatus(remainingAmount, credit.totalInitial, credit.dueDate),
    daysLate: daysLate(credit.dueDate),
  };
}

export interface CreditSummary {
  /** Somme des montants initiaux. */
  total: number;
  /** Somme des restes dus. */
  outstanding: number;
  /** Somme des restes dus des crédits en retard. */
  overdue: number;
  /** Montant déjà recouvré (total − restant dû). */
  settled: number;
  /** Nombre de crédits. */
  count: number;
}

/** Synthèse agrégée d'un carnet de crédits. */
export function creditSummary(credits: ClientCredit[], now: Date = new Date()): CreditSummary {
  return credits.reduce<CreditSummary>(
    (acc, credit) => {
      const status = computeCreditStatus(
        credit.remainingAmount,
        credit.totalInitial,
        credit.dueDate,
        now
      );
      acc.total += credit.totalInitial;
      acc.outstanding += credit.remainingAmount;
      acc.settled += credit.totalInitial - credit.remainingAmount;
      if (status === 'En retard') acc.overdue += credit.remainingAmount;
      acc.count += 1;
      return acc;
    },
    { total: 0, outstanding: 0, overdue: 0, settled: 0, count: 0 }
  );
}
