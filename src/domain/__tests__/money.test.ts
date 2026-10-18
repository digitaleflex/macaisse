import { describe, expect, it } from 'vitest';
import { formatFCFA, formatNombre, parseMontant, roundMontant } from '../money';

describe('money', () => {
  it('arrondit au franc CFA entier', () => {
    expect(roundMontant(12500.4)).toBe(12500);
    expect(roundMontant(12500.6)).toBe(12501);
    expect(roundMontant(-3.5)).toBe(-3);
  });

  it('formate un nombre au format fr-FR (espace fine insécable)', () => {
    const formatted = formatNombre(12500);
    expect(formatted.replace(/\D/g, '')).toBe('12500');
    const separator = formatted.charCodeAt(2);
    expect([0x202f, 0x00a0, 0x2009]).toContain(separator);
  });

  it('ajoute le suffixe FCFA par défaut', () => {
    expect(formatFCFA(12500)).toBe(`${formatNombre(12500)} FCFA`);
    expect(formatFCFA(12500, { withSuffix: false })).toBe(formatNombre(12500));
  });

  it('arrondit avant de formater', () => {
    expect(formatFCFA(12500.4)).toBe(`${formatNombre(12500)} FCFA`);
  });

  it('analyse différents formats de saisie', () => {
    expect(parseMontant('12 500')).toBe(12500);
    expect(parseMontant('12500.5')).toBe(12500.5);
    expect(parseMontant('12 500,50 FCFA')).toBe(12500.5);
    expect(parseMontant('0')).toBe(0);
  });

  it('renvoie 0 sur une saisie invalide', () => {
    expect(parseMontant('')).toBe(0);
    expect(parseMontant('abc')).toBe(0);
    expect(parseMontant('-')).toBe(0);
  });
});
