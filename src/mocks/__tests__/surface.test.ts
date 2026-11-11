import { describe, expect, it } from 'vitest';
import * as empty from '../empty';
import * as full from '../index';

/**
 * Le build de production remplace `@/mocks` par `mocks/empty.ts` (voir `vite.config.ts`).
 * Si ce module oublie un export, les tests passent mais le BUILD échoue : cette garde
 * le détecte tout de suite.
 */
describe('surface de @/mocks', () => {
  it('le substitut vide expose exactement les mêmes noms que les fixtures', () => {
    expect(Object.keys(empty).sort()).toEqual(Object.keys(full).sort());
  });
});
