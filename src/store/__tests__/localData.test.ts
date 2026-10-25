import { describe, expect, it } from 'vitest';
import { isBusinessStorageKey, purgeLocalBusinessData } from '../localData';

/** Stockage mémoire minimal : la purge ne doit dépendre que de l'API `Storage`. */
function memoryStorage(initial: Record<string, string> = {}): Storage {
  const map = new Map(Object.entries(initial));
  const storage = {
    get length() {
      return map.size;
    },
    key: (index: number) => [...map.keys()][index] ?? null,
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
    clear: () => map.clear(),
  };
  return storage as unknown as Storage;
}

/**
 * RG-A13 — la déconnexion ne doit laisser aucune donnée métier derrière elle,
 * mais doit conserver les préférences d'affichage et les données serveur simulées.
 */
describe('isBusinessStorageKey', () => {
  it('reconnaît les collections cloisonnées par organisation', () => {
    expect(isBusinessStorageKey('ma-caisse/org-etoile/products')).toBe(true);
    expect(isBusinessStorageKey('ma-caisse/org-etoile/cart')).toBe(true);
    expect(isBusinessStorageKey('ma-caisse/org-<uuid>/sales')).toBe(true);
  });

  it('reconnaît les collections globales', () => {
    expect(isBusinessStorageKey('ma-caisse/products')).toBe(true);
    expect(isBusinessStorageKey('ma-caisse/credits')).toBe(true);
  });

  it('préserve l’auth, les préférences et les données de démonstration', () => {
    expect(isBusinessStorageKey('ma-caisse/auth')).toBe(false);
    expect(isBusinessStorageKey('ma-caisse/ui')).toBe(false);
    expect(isBusinessStorageKey('ma-caisse/mock-auth-db')).toBe(false);
    expect(isBusinessStorageKey('ma-caisse/mock-session')).toBe(false);
    expect(isBusinessStorageKey('autre/cle')).toBe(false);
  });
});

describe('purgeLocalBusinessData', () => {
  it('supprime les données métier et préserve le reste', () => {
    const storage = memoryStorage({
      'ma-caisse/org-etoile/products': '[{"name":"Lait"}]',
      'ma-caisse/org-etoile/sales': '[{"clientName":"M. Ba"}]',
      'ma-caisse/products': '[]',
      'ma-caisse/ui': '{"tab":"ventes"}',
      'ma-caisse/auth': '{"user":null}',
      'ma-caisse/mock-auth-db': '{"accounts":[]}',
    });

    const removed = purgeLocalBusinessData(storage);

    expect(removed.sort()).toEqual([
      'ma-caisse/org-etoile/products',
      'ma-caisse/org-etoile/sales',
      'ma-caisse/products',
    ]);
    expect(storage.getItem('ma-caisse/org-etoile/products')).toBeNull();
    expect(storage.getItem('ma-caisse/org-etoile/sales')).toBeNull();
    expect(storage.getItem('ma-caisse/ui')).toBe('{"tab":"ventes"}');
    expect(storage.getItem('ma-caisse/auth')).toBe('{"user":null}');
    expect(storage.getItem('ma-caisse/mock-auth-db')).toBe('{"accounts":[]}');
  });

  it('ne fait rien quand le stockage est indisponible', () => {
    expect(purgeLocalBusinessData(undefined)).toEqual([]);
  });
});
