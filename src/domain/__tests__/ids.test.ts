import { describe, expect, it } from 'vitest';
import { createId, nextSaleNumber } from '../ids';

describe('ids', () => {
  it('génère 1000 identifiants uniques', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 1000; i += 1) {
      ids.add(createId('article'));
    }
    expect(ids.size).toBe(1000);
  });

  it('préfixe les identifiants', () => {
    expect(createId('sale').startsWith('sale-')).toBe(true);
  });

  it('ne repose pas sur Date.now() seul', () => {
    expect(createId('x')).not.toBe(createId('x'));
  });

  it('formate le numéro de vente V-YYYYMMDD-0007', () => {
    expect(nextSaleNumber(7, new Date(2024, 0, 15))).toBe('V-20240115-0007');
    expect(nextSaleNumber(123, new Date(2024, 11, 31))).toBe('V-20241231-0123');
    expect(nextSaleNumber(0, new Date(2024, 5, 1))).toBe('V-20240601-0000');
  });

  it('normalise les séquences invalides', () => {
    expect(nextSaleNumber(-5, new Date(2024, 5, 1))).toBe('V-20240601-0000');
    expect(nextSaleNumber(12.9, new Date(2024, 5, 1))).toBe('V-20240601-0012');
  });
});
