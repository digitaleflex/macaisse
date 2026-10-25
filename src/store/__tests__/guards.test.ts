import { describe, expect, it } from 'vitest';
import {
  CREDIT_STATUSES,
  NOTIFICATION_TYPES,
  PAYMENT_METHOD_VALUES,
  PRODUCT_CATEGORIES,
  SALE_STATUSES,
  TAB_ORDER,
} from '@/config/reference';
import {
  isCategory,
  isCreditStatus,
  isNotificationType,
  isPaymentMethod,
  isSaleStatus,
  isTabType,
} from '../storeUtils';

/**
 * Filet de sécurité des référentiels : toute valeur ajoutée dans
 * `config/reference.ts` doit être acceptée par la garde correspondante, sinon
 * la migration rejetterait les données existantes en silence.
 */
describe('gardes de types alignées sur les référentiels', () => {
  it('accepte toutes les catégories produit', () => {
    for (const value of PRODUCT_CATEGORIES) expect(isCategory(value)).toBe(true);
  });

  it('accepte tous les moyens de paiement', () => {
    for (const value of PAYMENT_METHOD_VALUES) expect(isPaymentMethod(value)).toBe(true);
  });

  it('accepte tous les statuts de vente et de crédit', () => {
    for (const value of SALE_STATUSES) expect(isSaleStatus(value)).toBe(true);
    for (const value of CREDIT_STATUSES) expect(isCreditStatus(value)).toBe(true);
  });

  it('accepte tous les types de notification et tous les onglets', () => {
    for (const value of NOTIFICATION_TYPES) expect(isNotificationType(value)).toBe(true);
    for (const value of TAB_ORDER) expect(isTabType(value)).toBe(true);
  });

  it('refuse les valeurs inconnues', () => {
    expect(isCategory('Boulangerie')).toBe(false);
    expect(isPaymentMethod('Bitcoin')).toBe(false);
    expect(isTabType('profil')).toBe(false);
  });
});
