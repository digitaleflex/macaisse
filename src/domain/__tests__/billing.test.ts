import { describe, expect, it } from 'vitest';
import type { PaymentIntent, SubscriptionPlan } from '../../types';
import {
  addMonths,
  checkoutKind,
  chooseProvider,
  eligibleProviders,
  intentExpiry,
  isExpired,
  isFinalStatus,
  isInternationalPhone,
  isOnlineMethod,
  nextInvoiceId,
  nextRenewalDate,
  periodEnd,
  planPrice,
  toPaymentPhone,
  validatePaymentRequest,
  PAYMENT_INTENT_TTL_MS,
} from '../billing';
import { toIsoDate } from '../dates';

const PRO: SubscriptionPlan = { id: 'pro', name: 'Pro', monthlyPrice: 15000, yearlyPrice: 150000, features: [] };
const iso = (date: Date) => toIsoDate(date);

describe('moyens payables en ligne', () => {
  it('accepte le mobile money et la carte, refuse espèces, crédit et autre', () => {
    for (const method of ['mtn_money', 'moov_money', 'orange_money', 'wave', 'celtiis_cash', 'card']) {
      expect(isOnlineMethod(method)).toBe(true);
    }
    for (const method of ['cash', 'credit', 'other', 'bitcoin']) expect(isOnlineMethod(method)).toBe(false);
  });

  it('retient un agrégateur compatible avec chaque moyen (FedaPay et KKiaPay sont tous deux gérés)', () => {
    expect(eligibleProviders('mtn_money')).toEqual(['fedapay', 'kkiapay']);
    expect(chooseProvider('mtn_money')).toBe('fedapay');
    // Orange et Wave : seul FedaPay les couvre.
    expect(chooseProvider('orange_money')).toBe('fedapay');
    expect(chooseProvider('wave')).toBe('fedapay');
    expect(chooseProvider('cash')).toBeNull();
  });

  it('demande une validation sur téléphone pour le mobile money et une page sécurisée pour la carte', () => {
    expect(checkoutKind('mtn_money')).toBe('push');
    expect(checkoutKind('wave')).toBe('push');
    expect(checkoutKind('card')).toBe('redirect');
  });
});

describe('numéro de paiement mobile', () => {
  it('exige le format international : le pays n’est jamais deviné', () => {
    expect(isInternationalPhone('+229 97 00 00 01')).toBe(true);
    expect(isInternationalPhone('00229 97 00 00 01')).toBe(true);
    expect(isInternationalPhone('97 00 00 01')).toBe(false);
    expect(isInternationalPhone('')).toBe(false);
    expect(isInternationalPhone('+22')).toBe(false);
  });

  it('normalise le numéro envoyé à l’agrégateur', () => {
    expect(toPaymentPhone('+229 97 00 00 01')).toBe('+22997000001');
    expect(toPaymentPhone('00221 77 123 45 67')).toBe('+221771234567');
  });
});

describe('validatePaymentRequest', () => {
  it('exige un numéro international pour le mobile money', () => {
    expect(validatePaymentRequest({ paymentMethod: 'mtn_money' })).toBe('phone_required');
    expect(validatePaymentRequest({ paymentMethod: 'mtn_money', phone: '  ' })).toBe('phone_required');
    expect(validatePaymentRequest({ paymentMethod: 'mtn_money', phone: '97000001' })).toBe('phone_invalid');
    expect(validatePaymentRequest({ paymentMethod: 'mtn_money', phone: '+22997000001' })).toBeNull();
  });

  it('n’exige aucun numéro pour la carte', () => {
    expect(validatePaymentRequest({ paymentMethod: 'card' })).toBeNull();
  });

  it('refuse un moyen non payable en ligne', () => {
    expect(validatePaymentRequest({ paymentMethod: 'cash' })).toBe('method_unsupported');
  });
});

describe('montant et échéance', () => {
  it('donne le prix du forfait selon le cycle', () => {
    expect(planPrice(PRO, 'monthly')).toBe(15000);
    expect(planPrice(PRO, 'yearly')).toBe(150000);
  });

  it('ramène le jour à la fin du mois quand il n’existe pas', () => {
    expect(iso(addMonths(new Date(2026, 0, 31), 1))).toBe('2026-02-28');
    expect(iso(addMonths(new Date(2028, 0, 31), 1))).toBe('2028-02-29');
    expect(iso(addMonths(new Date(2026, 4, 15), 1))).toBe('2026-06-15');
  });

  it('calcule la fin de période', () => {
    expect(iso(periodEnd(new Date(2026, 10, 11), 'monthly'))).toBe('2026-12-11');
    expect(iso(periodEnd(new Date(2026, 10, 11), 'yearly'))).toBe('2027-11-11');
  });

  const NOW = new Date(2026, 10, 11, 14, 0);

  it('prolonge depuis l’échéance quand le même forfait est encore en cours', () => {
    const current = { plan: PRO, renewalDate: '2026-11-25' };
    expect(iso(nextRenewalDate(current, 'pro', 'monthly', NOW))).toBe('2026-12-25');
  });

  it('démarre aujourd’hui quand le forfait change ou quand l’abonnement est échu', () => {
    expect(iso(nextRenewalDate({ plan: PRO, renewalDate: '2026-11-25' }, 'starter', 'monthly', NOW))).toBe('2026-12-11');
    expect(iso(nextRenewalDate({ plan: PRO, renewalDate: '2026-10-01' }, 'pro', 'monthly', NOW))).toBe('2026-12-11');
    expect(iso(nextRenewalDate({ plan: PRO, renewalDate: '2026-11-11' }, 'pro', 'yearly', NOW))).toBe('2027-11-11');
  });

  it('numérote les factures en continuant la suite existante', () => {
    expect(nextInvoiceId([])).toBe('INV-0001');
    expect(nextInvoiceId(['INV-0010', 'INV-0012', 'INV-0011'])).toBe('INV-0013');
    expect(nextInvoiceId(['INV-B-0003'])).toBe('INV-0004');
  });
});

describe('cycle de vie d’une tentative', () => {
  const base: Pick<PaymentIntent, 'status' | 'expiresAt'> = { status: 'pending', expiresAt: '' };

  it('ne considère « pending » comme non final que lui', () => {
    expect(isFinalStatus('pending')).toBe(false);
    for (const status of ['succeeded', 'failed', 'expired', 'cancelled'] as const) {
      expect(isFinalStatus(status)).toBe(true);
    }
  });

  it('expire après le délai, et seulement si elle est encore en attente', () => {
    const now = new Date('2026-11-11T10:00:00Z');
    const expiresAt = intentExpiry(now);
    expect(new Date(expiresAt).getTime() - now.getTime()).toBe(PAYMENT_INTENT_TTL_MS);
    expect(isExpired({ ...base, expiresAt }, new Date(now.getTime() + PAYMENT_INTENT_TTL_MS - 1))).toBe(false);
    expect(isExpired({ ...base, expiresAt }, new Date(now.getTime() + PAYMENT_INTENT_TTL_MS))).toBe(true);
    expect(isExpired({ status: 'succeeded', expiresAt }, new Date(now.getTime() + PAYMENT_INTENT_TTL_MS * 2))).toBe(false);
  });
});
