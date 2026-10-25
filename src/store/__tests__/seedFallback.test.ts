import { describe, expect, it } from 'vitest';
import { SEED_PRODUCTS } from '@/mocks';
import { seedFallback } from '../storeUtils';

describe('seedFallback', () => {
  it('renvoie une copie des fixtures en mode mock', () => {
    const seed = seedFallback(SEED_PRODUCTS, 'mock');
    expect(seed).toHaveLength(SEED_PRODUCTS.length);
    expect(seed).not.toBe(SEED_PRODUCTS);

    seed.length = 0;
    expect(SEED_PRODUCTS.length).toBeGreaterThan(0);
  });

  it('ne renvoie aucune donnée de démonstration en mode http', () => {
    expect(seedFallback(SEED_PRODUCTS, 'http')).toEqual([]);
  });
});
