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
    // L'ancien libellé « Partiel » devient l'identifiant stable.
    expect(credits[0].status).toBe('partial');
  });

  it('valide l’onglet et la clôture persistés, ignore la modale', async () => {
    seedStorage(UI_KEY, { tab: 'inexistant', modal: 'depenses', registerClosedAt: '2024-10-18' });

    const { useUiStore } = await import('../useUiStore');
    const state = useUiStore.getState();

    expect(state.tab).toBe('accueil');
    // La modale est transitoire : elle ne doit plus se rouvrir après reconnexion.
    expect(state.modal).toBeNull();
    expect(state.registerClosedAt).toBe('2024-10-18');
    // `isOnline` est transitoire (non persisté).
    expect(typeof state.isOnline).toBe('boolean');
  });

  it('rejette une date de clôture malformée', async () => {
    seedStorage(UI_KEY, { tab: 'stock', registerClosedAt: 'hier' });

    const { useUiStore } = await import('../useUiStore');
    const state = useUiStore.getState();

    expect(state.tab).toBe('stock');
    expect(state.registerClosedAt).toBeNull();
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

describe('migration v2 → v3 : libellés français → identifiants stables', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it('convertit les moyens de paiement et statuts d’anciennes ventes', async () => {
    seedStorage(
      'ma-caisse/sales',
      {
        sales: [
          { id: 's1', saleNumber: 'V-1', time: '09:00', date: '2026-01-01', paymentMethod: 'Espèces', amount: 1000, status: 'Validé', itemsCount: 1 },
          { id: 's2', saleNumber: 'V-2', time: '09:10', date: '2026-01-01', paymentMethod: 'Mobile Money (Wave)', amount: 2000, status: 'Partiel', itemsCount: 1, remainingAmount: 500 },
          { id: 's3', saleNumber: 'V-3', time: '09:20', date: '2026-01-01', paymentMethod: 'Orange Money', amount: 3000, status: 'Annulée', itemsCount: 1 },
          { id: 's4', saleNumber: 'V-4', time: '09:30', date: '2026-01-01', paymentMethod: 'Carte Bancaire', amount: 4000, status: 'Validé', itemsCount: 1 },
          { id: 's5', saleNumber: 'V-5', time: '09:40', date: '2026-01-01', paymentMethod: 'Crédit Partiel', amount: 5000, status: 'En attente', itemsCount: 1 },
        ],
        sequence: 5,
      },
      2
    );

    const { useSalesStore } = await import('../useSalesStore');
    const { sales } = useSalesStore.getState();

    expect(sales.map((sale) => [sale.paymentMethod, sale.status])).toEqual([
      ['cash', 'completed'],
      ['wave', 'partial'],
      ['orange_money', 'cancelled'],
      ['card', 'completed'],
      ['credit', 'pending'],
    ]);
  });

  it('laisse intacts les identifiants déjà stables et écarte un moyen inconnu', async () => {
    seedStorage(
      'ma-caisse/sales',
      {
        sales: [
          { id: 's1', saleNumber: 'V-1', time: '09:00', date: '2026-01-01', paymentMethod: 'mtn_money', amount: 1000, status: 'cancelled', itemsCount: 1 },
          { id: 's2', saleNumber: 'V-2', time: '09:00', date: '2026-01-01', paymentMethod: 'Bitcoin', amount: 1000, status: 'completed', itemsCount: 1 },
        ],
        sequence: 2,
      },
      2
    );

    const { useSalesStore } = await import('../useSalesStore');
    const { sales } = useSalesStore.getState();

    expect(sales).toHaveLength(1);
    expect(sales[0]).toMatchObject({ id: 's1', paymentMethod: 'mtn_money', status: 'cancelled' });
  });

  it('convertit les statuts de crédits et les moyens de paiement de dépenses', async () => {
    seedStorage(
      'ma-caisse/credits',
      {
        credits: [
          { id: 'c1', clientName: 'M. Ba', initials: 'MB', shopOrLocation: '', phone: '', remainingAmount: 0, totalInitial: 100, dueDate: '2999-01-01', status: 'Réglé' },
          { id: 'c2', clientName: 'M. Sy', initials: 'MS', shopOrLocation: '', phone: '', remainingAmount: 50, totalInitial: 100, dueDate: '2000-01-01', status: 'En retard' },
        ],
      },
      2
    );
    seedStorage(
      'ma-caisse/expenses',
      {
        expenses: [
          { id: 'e1', title: 'Taxi', date: '2026-01-01', amount: 500, category: 'Transport', paymentMethod: 'Orange Money' },
          { id: 'e2', title: 'Eau', date: '2026-01-01', amount: 800, category: 'Factures', paymentMethod: 'Crédit Partiel' },
        ],
      },
      2
    );

    const { useCreditsStore } = await import('../useCreditsStore');
    const { useExpensesStore } = await import('../useExpensesStore');

    expect(useCreditsStore.getState().credits.map((credit) => credit.status)).toEqual(['settled', 'overdue']);
    // « Crédit Partiel » n'a pas de sens pour une dépense : repli sur les espèces.
    expect(useExpensesStore.getState().expenses.map((expense) => expense.paymentMethod)).toEqual(['orange_money', 'cash']);
  });
});
