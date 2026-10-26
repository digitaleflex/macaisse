import { describe, expect, it } from 'vitest';
import { pinHash, validatePin } from '../pin';

/**
 * RG-A16 — PIN de caisse : 4 à 6 chiffres, sans suite évidente, sans recopier le
 * numéro de téléphone ni l'année courante.
 */
describe('validatePin', () => {
  it('accepte un PIN personnel', () => {
    expect(validatePin('9274', { phone: '+221 77 123 45 67', year: 2026 })).toEqual([]);
    expect(validatePin('482915', { year: 2026 })).toEqual([]);
  });

  it('refuse une longueur hors 4–6', () => {
    expect(validatePin('123', { year: 2026 })).toContain('length');
    expect(validatePin('1234567', { year: 2026 })).toContain('length');
  });

  it('refuse les caractères non numériques', () => {
    expect(validatePin('12a4', { year: 2026 })).toContain('digits');
  });

  it('refuse un chiffre répété', () => {
    expect(validatePin('0000', { year: 2026 })).toContain('repeated');
    expect(validatePin('999999', { year: 2026 })).toContain('repeated');
  });

  it('refuse les suites évidentes', () => {
    expect(validatePin('1234', { year: 2026 })).toContain('sequence');
    expect(validatePin('654321', { year: 2026 })).toContain('sequence');
  });

  it('refuse un PIN contenu dans le téléphone du titulaire', () => {
    expect(validatePin('1234', { phone: '+221 77 123 45 67', year: 2026 })).toContain('phone');
  });

  it('refuse l’année courante', () => {
    expect(validatePin('2026', { year: 2026 })).toContain('year');
  });
});

describe('pinHash', () => {
  it('est déterministe et distingue deux PIN', () => {
    expect(pinHash('9274')).toBe(pinHash('9274'));
    expect(pinHash('9274')).not.toBe(pinHash('9275'));
    expect(pinHash('9274')).toMatch(/^[0-9a-f]{8}$/);
  });
});
