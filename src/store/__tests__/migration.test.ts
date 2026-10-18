import { beforeEach, describe, expect, it, vi } from 'vitest';

// Clés localStorage (identiques à `PERSIST_NAMES`).
const PRODUCTS_KEY = 'ma-caisse/products';
const CART_KEY = 'ma-caisse/cart';
const CREDITS_KEY = 'ma-caisse/credits';
const UI_KEY = 'ma-caisse/ui';

/** Simule un blob persisté au format historique (v1, identifiants numériques). */
function seedStorage(key: string, state: unknown, version = 1): void {
  localStorage.setItem(key, JSON.stringify({ state, version }));
}

describe('migration v1 → v2 des données persistées', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it('coerce les identifiants numériques des produits en string', async () => {
    seedStorage(PRODUCTS_KEY, {
      products: [
        {
          id: 1,
          name: 'Farine de blé 1kg',
          sku: '#FAR-01',
          category: 'Épicerie',
          price: 500,
          costPrice: 300,
          stock: 4,
          minStockAlert: 2,
          imageUrl: '',
          unit: 'sachet',
          status: 'faible',
        },
      ],
    });

    const { useProductsStore } = await import('../useProductsStore');
    const { products } = useProductsStore.getState();

    expect(products).toHaveLength(1);
    expect(products[0].id).toBe('1');
    expect(typeof products[0].id).toBe('string');
    // Le statut dérivé n'est jamais conservé en état.
    expect('status' in products[0]).toBe(false);
  });

  it('écarte les entrées irréparables et retombe sur le seed', async () => {
    seedStorage(PRODUCTS_KEY, {
      products: [{ id: 1, name: '' }, 'invalide', 42, { name: 'Sans id' }],
    });

    const { useProductsStore } = await import('../useProductsStore');
    const { products } = useProductsStore.getState();

    expect(products.length).toBeGreaterThan(0);
    expect(products.every((product) => typeof product.id === 'string')).toBe(true);
  });

  it('répare un panier aux identifiants numériques', async () => {
    seedStorage(CART_KEY, {
      lines: [{ productId: 7, name: 'Riz', price: 4500, quantity: 2, unit: 'sac' }],
    });

    const { useCartStore } = await import('../useCartStore');
    const { lines } = useCartStore.getState();

    expect(lines).toHaveLength(1);
    expect(lines[0].productId).toBe('7');
  });

  it('répare un carnet de crédits aux identifiants numériques', async () => {
    seedStorage(CREDITS_KEY, {
      credits: [
        {
          id: 3,
          clientName: 'M. Oumar Touré',
          initials: 'OT',
          shopOrLocation: 'Épicerie Centrale',
          phone: '+221',
          remainingAmount: 40000,
          totalInitial: 100000,
          dueDate: '2999-01-01',
          status: 'Partiel',
        },
      ],
    });

    const { useCreditsStore } = await import('../useCreditsStore');
    const { credits } = useCreditsStore.getState();

    expect(credits).toHaveLength(1);
    expect(credits[0].id).toBe('3');
  });

  it('valide l’onglet et la modale persistés', async () => {
    seedStorage(UI_KEY, { tab: 'inexistant', modal: 'depenses' });

    const { useUiStore } = await import('../useUiStore');
    const state = useUiStore.getState();

    expect(state.tab).toBe('accueil');
    expect(state.modal).toBe('depenses');
    // `isOnline` est transitoire (non persisté).
    expect(typeof state.isOnline).toBe('boolean');
  });

  it('ne plante pas sur une forme inattendue et repart du seed', async () => {
    seedStorage(PRODUCTS_KEY, 'pas un objet');

    const { useProductsStore } = await import('../useProductsStore');
    const { products } = useProductsStore.getState();

    expect(products.length).toBeGreaterThan(0);
    expect(products.every((product) => typeof product.id === 'string')).toBe(true);
  });

  it('ne plante pas sur un JSON invalide', async () => {
    localStorage.setItem(PRODUCTS_KEY, '{ ceci n’est pas du JSON');

    const { useProductsStore } = await import('../useProductsStore');
    expect(useProductsStore.getState().products.every((p) => typeof p.id === 'string')).toBe(true);
  });
});
