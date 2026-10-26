import { describe, expect, it } from 'vitest';
import { isValidPhone, normalizePhone } from '../phone';

/**
 * RG-A01 — le numéro est l'identité : toutes ses écritures doivent désigner le
 * même compte. Sans ça, « 77 123 45 67 » et « +221 77 123 45 67 » créeraient
 * deux commerces distincts.
 */
describe('normalizePhone', () => {
  it('ramène un numéro national à sa forme internationale', () => {
    expect(normalizePhone('77 123 45 67')).toBe('221771234567');
    expect(normalizePhone('771234567')).toBe('221771234567');
    expect(normalizePhone('+221 77 123 45 67')).toBe('221771234567');
    expect(normalizePhone('00221771234567')).toBe('221771234567');
  });

  it('conserve un numéro déjà international', () => {
    expect(normalizePhone('+225 07 00 00 00 00')).toBe('2250700000000');
  });

  it('renvoie une chaîne vide pour une saisie inexploitable', () => {
    expect(normalizePhone('')).toBe('');
    expect(normalizePhone('12')).toBe('');
    expect(normalizePhone(null)).toBe('');
  });
});

describe('isValidPhone', () => {
  it('accepte un numéro complet et refuse une saisie courte', () => {
    expect(isValidPhone('+221 77 123 45 67')).toBe(true);
    expect(isValidPhone('12345')).toBe(false);
  });
});
