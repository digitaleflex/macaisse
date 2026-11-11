// Règles pures du paiement de l'abonnement de la plateforme (FedaPay / KKiaPay).
// Le montant, l'échéance et l'agrégateur sont décidés ICI et par le serveur : le
// client n'envoie jamais un prix.

import type {
  BillingCycle,
  CheckoutInstruction,
  PaymentIntent,
  PaymentIntentStatus,
  PaymentProvider,
  Subscription,
  SubscriptionPlan,
} from '../types';
import { ONLINE_PAYMENT_METHODS, paymentOption } from '../config/reference';
import { parseDate, startOfDay } from './dates';
import { normalizePhone } from './phone';

/** Durée de validité d'une tentative de paiement avant expiration. */
export const PAYMENT_INTENT_TTL_MS = 10 * 60 * 1000;

/** Intervalle de suivi d'une tentative de paiement en attente. */
export const PAYMENT_POLL_INTERVAL_MS = 3000;

/** Prix d'un forfait pour un cycle (FCFA entiers). */
export function planPrice(plan: SubscriptionPlan, cycle: BillingCycle): number {
  return cycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
}

/** Vrai si le moyen peut être payé en ligne (au moins un agrégateur). */
export function isOnlineMethod(method: string): boolean {
  return ONLINE_PAYMENT_METHODS.some((option) => option.method === method);
}

/** Agrégateurs capables d'encaisser ce moyen, par ordre de préférence. */
export function eligibleProviders(method: string): readonly Exclude<PaymentProvider, 'manual'>[] {
  return paymentOption(method)?.providers ?? [];
}

/**
 * Agrégateur retenu pour un moyen : le premier de la liste. Quand plusieurs
 * conviennent (MTN, Moov, Celtiis, carte), le serveur peut router autrement
 * (coût, disponibilité) ; le client n'en dépend pas.
 */
export function chooseProvider(method: string): Exclude<PaymentProvider, 'manual'> | null {
  return eligibleProviders(method)[0] ?? null;
}

/** Instruction de fin de paiement : mobile money → validation sur téléphone, carte → page sécurisée. */
export function checkoutKind(method: string): CheckoutInstruction['type'] {
  return paymentOption(method)?.kind === 'card' ? 'redirect' : 'push';
}

/** Un numéro de paiement mobile doit être international (« + » ou « 00 ») : le pays n'est pas deviné. */
export function isInternationalPhone(raw: string | null | undefined): boolean {
  const trimmed = (raw ?? '').trim();
  if (!trimmed.startsWith('+') && !trimmed.startsWith('00')) return false;
  const digits = normalizePhone(trimmed);
  return digits.length >= 10 && digits.length <= 15;
}

/** Forme transmise à l'agrégateur : « +229970000 00 » → « +22997000000 ». */
export function toPaymentPhone(raw: string): string {
  return `+${normalizePhone(raw)}`;
}

export type PaymentRequestIssue = 'method_unsupported' | 'phone_required' | 'phone_invalid';

/** Contrôle d'une demande de paiement ; `null` si elle est recevable. */
export function validatePaymentRequest(input: {
  paymentMethod: string;
  phone?: string | null;
}): PaymentRequestIssue | null {
  if (!isOnlineMethod(input.paymentMethod)) return 'method_unsupported';
  if (paymentOption(input.paymentMethod)?.kind === 'mobile_money') {
    const phone = (input.phone ?? '').trim();
    if (phone === '') return 'phone_required';
    if (!isInternationalPhone(phone)) return 'phone_invalid';
  }
  return null;
}

/** Ajoute des mois en gardant le jour, ramené à la fin du mois si nécessaire (31 janv. + 1 mois = 28 févr.). */
export function addMonths(date: Date, months: number): Date {
  const day = date.getDate();
  const result = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, lastDay));
  return result;
}

/** Fin d'une période de facturation commencée à `from`. */
export function periodEnd(from: Date, cycle: BillingCycle): Date {
  return addMonths(startOfDay(from), cycle === 'monthly' ? 1 : 12);
}

/**
 * Nouvelle date d'échéance après un paiement : on prolonge à partir de l'échéance
 * actuelle si le même forfait est encore en cours (aucun jour perdu, essai compris) ;
 * sinon la période démarre aujourd'hui.
 */
export function nextRenewalDate(
  current: Pick<Subscription, 'plan' | 'renewalDate'>,
  planId: string,
  cycle: BillingCycle,
  now: Date = new Date()
): Date {
  const renewal = parseDate(current.renewalDate);
  const extend = current.plan.id === planId && renewal !== null && renewal.getTime() > startOfDay(now).getTime();
  return periodEnd(extend ? renewal : now, cycle);
}

/** Vrai quand la tentative n'évoluera plus. */
export function isFinalStatus(status: PaymentIntentStatus): boolean {
  return status !== 'pending';
}

/** Date limite d'une tentative créée à `now`. */
export function intentExpiry(now: Date): string {
  return new Date(now.getTime() + PAYMENT_INTENT_TTL_MS).toISOString();
}

/** Vrai si une tentative `pending` a dépassé sa date limite. */
export function isExpired(intent: Pick<PaymentIntent, 'status' | 'expiresAt'>, now: Date = new Date()): boolean {
  return intent.status === 'pending' && new Date(intent.expiresAt).getTime() <= now.getTime();
}

/** Numéro de facture suivant : continue la suite existante (INV-0012 → INV-0013), sans compter les factures. */
export function nextInvoiceId(existingIds: readonly string[]): string {
  const highest = existingIds.reduce((max, id) => {
    const match = /(\d+)$/.exec(id);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `INV-${String(highest + 1).padStart(4, '0')}`;
}
