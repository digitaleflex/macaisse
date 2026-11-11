import { describe, expect, it } from 'vitest';
import {
  CREDIT_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_METHOD_VALUES,
  SALE_PAYMENT_METHODS,
  SALE_STATUSES,
  TENDER_METHODS,
  isMobileMoney,
  normalizeCreditStatus,
  normalizePaymentMethod,
  normalizeSaleStatus,
  normalizeTenderMethod,
  paymentLabel,
  paymentShortLabel,
} from '../reference';

describe('catalogue des moyens de paiement', () => {
  it('utilise des identifiants stables en snake_case, sans doublon', () => {
    expect(new Set(PAYMENT_METHOD_VALUES).size).toBe(PAYMENT_METHOD_VALUES.length);
    for (const id of PAYMENT_METHOD_VALUES) expect(id).toMatch(/^[a-z]+(_[a-z]+)*$/);
  });

  it('place le mobile money avant tous les autres moyens (priorité produit)', () => {
    const kinds = PAYMENT_METHODS.map((option) => option.kind);
    const lastMobile = kinds.lastIndexOf('mobile_money');
    const firstOther = kinds.findIndex((kind) => kind !== 'mobile_money');
    expect(kinds[0]).toBe('mobile_money');
    expect(lastMobile).toBeLessThan(firstOther);
  });

  it('propose à l’encaissement tout sauf « autre », et pour les règlements tout sauf le crédit', () => {
    expect(SALE_PAYMENT_METHODS.map((o) => o.method)).not.toContain('other');
    expect(SALE_PAYMENT_METHODS.map((o) => o.method)).toContain('credit');
    expect(TENDER_METHODS.map((o) => o.method)).not.toContain('credit');
    expect(TENDER_METHODS.map((o) => o.method)).toContain('cash');
  });

  it('indique les agrégateurs capables d’encaisser chaque moyen', () => {
    const providers = (id: string) => PAYMENT_METHODS.find((o) => o.method === id)?.providers ?? [];
    expect(providers('mtn_money')).toEqual(['fedapay', 'kkiapay']);
    expect(providers('moov_money')).toEqual(['fedapay', 'kkiapay']);
    expect(providers('card')).toEqual(['fedapay', 'kkiapay']);
    // Orange Money et Wave : couverts par FedaPay, non confirmés chez KKiaPay.
    expect(providers('orange_money')).toEqual(['fedapay']);
    expect(providers('wave')).toEqual(['fedapay']);
    // Pas d'agrégateur pour l'argent qui ne circule pas en ligne.
    expect(providers('cash')).toEqual([]);
    expect(providers('credit')).toEqual([]);
  });

  it('donne un libellé français ; l’identifiant lui-même si le moyen est inconnu', () => {
    expect(paymentLabel('cash')).toBe('Espèces');
    expect(paymentLabel('mtn_money')).toBe('MTN Mobile Money');
    expect(paymentShortLabel('card')).toBe('Carte');
    expect(paymentLabel('inconnu')).toBe('inconnu');
  });

  it('reconnaît le mobile money', () => {
    expect(isMobileMoney('wave')).toBe(true);
    expect(isMobileMoney('card')).toBe(false);
    expect(isMobileMoney('cash')).toBe(false);
  });
});

describe('conversion des anciens libellés', () => {
  it('convertit les libellés français des moyens de paiement', () => {
    expect(normalizePaymentMethod('Espèces')).toBe('cash');
    expect(normalizePaymentMethod('Mobile Money (Wave)')).toBe('wave');
    expect(normalizePaymentMethod('Orange Money')).toBe('orange_money');
    expect(normalizePaymentMethod('Carte Bancaire')).toBe('card');
    expect(normalizePaymentMethod('Crédit Partiel')).toBe('credit');
  });

  it('laisse un identifiant stable inchangé et rejette l’inconnu', () => {
    for (const id of PAYMENT_METHOD_VALUES) expect(normalizePaymentMethod(id)).toBe(id);
    expect(normalizePaymentMethod('Bitcoin')).toBeNull();
    expect(normalizePaymentMethod(42)).toBeNull();
  });

  it('refuse « credit » comme moyen par lequel de l’argent circule', () => {
    expect(normalizeTenderMethod('credit')).toBeNull();
    expect(normalizeTenderMethod('Crédit Partiel')).toBeNull();
    expect(normalizeTenderMethod('Espèces')).toBe('cash');
  });

  it('convertit les statuts de vente et de crédit', () => {
    expect(normalizeSaleStatus('Validé')).toBe('completed');
    expect(normalizeSaleStatus('Annulée')).toBe('cancelled');
    expect(normalizeCreditStatus('Réglé')).toBe('settled');
    expect(normalizeCreditStatus('En retard')).toBe('overdue');
    for (const id of SALE_STATUSES) expect(normalizeSaleStatus(id)).toBe(id);
    for (const id of CREDIT_STATUSES) expect(normalizeCreditStatus(id)).toBe(id);
    expect(normalizeSaleStatus('inconnu')).toBeNull();
  });
});
