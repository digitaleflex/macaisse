import { describe, expect, it } from 'vitest';
import type { CartLine, Product, SaleTransaction } from '../../types';
import {
  DEFAULT_SALES_FILTERS,
  SELLER_UNKNOWN,
  type SalesPeriod,
  activeSales,
  addToCart,
  assessCancellation,
  cancelSale,
  cartTotals,
  completeSale,
  dailyRevenue,
  filterSales,
  hasContactPhone,
  removeFromCart,
  sellerOptions,
  setCartQuantity,
  summarizeSales,
} from '../sales';

function makeProduct(overrides: Partial<Product>): Product {
  return {
    id: 'p1',
    name: 'Lait',
    sku: '#LAI',
    category: 'Frais',
    price: 1000,
    costPrice: 700,
    stock: 10,
    minStockAlert: 5,
    imageUrl: '',
    unit: 'brique',
    ...overrides,
  };
}

function makeSale(overrides: Partial<SaleTransaction>): SaleTransaction {
  return {
    id: 's',
    saleNumber: 'V-20241018-0001',
    time: '09:00',
    date: '2024-10-18',
    paymentMethod: 'Espèces',
    amount: 1000,
    status: 'Validé',
    itemsCount: 1,
    ...overrides,
  };
}

const lait = makeProduct({ id: 'p1', name: 'Lait', price: 1000, stock: 10 });
const riz = makeProduct({ id: 'p2', name: 'Riz', price: 4500, stock: 2, unit: 'sac' });

describe('hasContactPhone — RG-A03', () => {
  it('accepte un contact sur le commerce ou sur le compte', () => {
    expect(hasContactPhone('+221 77 123 45 67', '')).toBe(true);
    expect(hasContactPhone('', '+221 77 123 45 67')).toBe(true);
  });

  it('refuse quand aucun contact n’est renseigné', () => {
    expect(hasContactPhone('', '  ', null, undefined)).toBe(false);
  });
});

describe('cartTotals', () => {
  it('calcule le sous-total et le nombre d’articles', () => {
    const lines: CartLine[] = [
      { productId: 'p1', name: 'Lait', price: 1000, quantity: 2, unit: 'brique' },
      { productId: 'p2', name: 'Riz', price: 4500, quantity: 1, unit: 'sac' },
    ];
    expect(cartTotals(lines)).toEqual({ subtotal: 6500, itemCount: 3 });
  });

  it('renvoie des zéros pour un panier vide', () => {
    expect(cartTotals([])).toEqual({ subtotal: 0, itemCount: 0 });
  });
});

describe('opérations de panier', () => {
  it('ajoute un produit puis fusionne les lignes du même produit', () => {
    const once = addToCart([], lait);
    expect(once).toHaveLength(1);
    expect(once[0].quantity).toBe(1);

    const twice = addToCart(once, lait);
    expect(twice).toHaveLength(1);
    expect(twice[0].quantity).toBe(2);
  });

  it('ajoute des produits distincts', () => {
    const lines = addToCart(addToCart([], lait), riz);
    expect(lines.map((l) => l.productId)).toEqual(['p1', 'p2']);
  });

  it('ne mute pas la liste d’origine', () => {
    const original: CartLine[] = [];
    addToCart(original, lait);
    expect(original).toHaveLength(0);
  });

  it('retire la ligne quand la quantité tombe à 0 ou moins', () => {
    const lines = addToCart([], lait);
    expect(setCartQuantity(lines, 'p1', 0)).toHaveLength(0);
    expect(setCartQuantity(lines, 'p1', -2)).toHaveLength(0);
    expect(setCartQuantity(lines, 'p1', 3)[0].quantity).toBe(3);
  });

  it('retire un produit explicitement', () => {
    const lines = addToCart(addToCart([], lait), riz);
    expect(removeFromCart(lines, 'p1').map((l) => l.productId)).toEqual(['p2']);
  });
});

describe('completeSale', () => {
  const lines: CartLine[] = [
    { productId: 'p1', name: 'Lait', price: 1000, quantity: 2, unit: 'brique' },
    { productId: 'p2', name: 'Riz', price: 4500, quantity: 1, unit: 'sac' },
  ];

  it('valide la vente, calcule le total et décrémente le stock multi-lignes', () => {
    const result = completeSale({
      lines,
      products: [lait, riz],
      paymentMethod: 'Espèces',
      date: new Date(2024, 9, 18, 9, 5),
      saleNumber: 'V-20241018-0007',
    });

    expect(result.sale.amount).toBe(6500);
    expect(result.sale.itemsCount).toBe(3);
    expect(result.sale.status).toBe('Validé');
    expect(result.sale.saleNumber).toBe('V-20241018-0007');
    expect(result.sale.date).toBe('2024-10-18');
    expect(result.sale.time).toBe('09:05');
    expect(result.sale.id.startsWith('sale-')).toBe(true);

    const updatedLait = result.products.find((p) => p.id === 'p1');
    const updatedRiz = result.products.find((p) => p.id === 'p2');
    expect(updatedLait?.stock).toBe(8);
    expect(updatedRiz?.stock).toBe(1);
    expect(updatedRiz?.status).toBe('faible'); // 1 <= minStockAlert 5
  });

  it('recalcule le statut en rupture après décrément', () => {
    const result = completeSale({
      lines: [{ productId: 'p2', name: 'Riz', price: 4500, quantity: 2, unit: 'sac' }],
      products: [riz],
      paymentMethod: 'Espèces',
    });
    expect(result.products.find((p) => p.id === 'p2')?.status).toBe('rupture');
  });

  it('refuse une vente dont le stock est insuffisant', () => {
    expect(() =>
      completeSale({
        lines: [{ productId: 'p2', name: 'Riz', price: 4500, quantity: 3, unit: 'sac' }],
        products: [lait, riz],
        paymentMethod: 'Espèces',
      })
    ).toThrowError(/Stock insuffisant/);
  });

  it('refuse un produit inconnu', () => {
    expect(() =>
      completeSale({
        lines: [{ productId: 'inconnu', name: 'X', price: 100, quantity: 1, unit: 'u' }],
        products: [lait],
        paymentMethod: 'Espèces',
      })
    ).toThrowError(/introuvable/);
  });

  it('refuse un panier vide', () => {
    expect(() =>
      completeSale({ lines: [], products: [lait], paymentMethod: 'Espèces' })
    ).toThrowError(/sans article/);
  });

  it('marque une vente partielle avec le reste dû', () => {
    const result = completeSale({
      lines,
      products: [lait, riz],
      paymentMethod: 'Crédit Partiel',
      creditAmount: 5000,
      clientName: '  Mme Diallo  ',
    });

    expect(result.sale.status).toBe('Partiel');
    expect(result.sale.remainingAmount).toBe(5000);
    expect(result.sale.amount).toBe(6500);
    expect(result.sale.clientName).toBe('Mme Diallo');
  });

  it('génère un numéro de vente du bon format quand aucun n’est fourni', () => {
    const result = completeSale({
      lines: [lines[0]],
      products: [lait],
      paymentMethod: 'Espèces',
      date: new Date(2024, 0, 15),
    });
    expect(result.sale.saleNumber).toMatch(/^V-20240115-\d{4}$/);
  });
});

describe('dailyRevenue', () => {
  it('renvoie une série de la longueur demandée, jours vides à 0', () => {
    const sales = [
      makeSale({ date: '2024-10-18', amount: 1000 }),
      makeSale({ date: '2024-10-16', amount: 500 }),
    ];
    const series = dailyRevenue(sales, 3, new Date(2024, 9, 18));
    expect(series).toHaveLength(3);
    expect(series.map((p) => p.date)).toEqual(['2024-10-16', '2024-10-17', '2024-10-18']);
    expect(series.map((p) => p.value)).toEqual([500, 0, 1000]);
  });
});

describe('completeSale — règlement partiel', () => {
  const lait = makeProduct({ price: 1500, stock: 10 });
  const lignes: CartLine[] = [
    { productId: 'p1', name: 'Lait', price: 1500, quantity: 2, unit: 'brique' },
  ];

  it('borne le crédit au sous-total de la vente', () => {
    const { sale } = completeSale({
      lines: lignes,
      products: [lait],
      paymentMethod: 'Crédit Partiel',
      clientName: 'M. Ba Ousmane',
      creditAmount: 999999,
      date: new Date(2024, 0, 15),
    });
    expect(sale.amount).toBe(3000);
    expect(sale.remainingAmount).toBe(3000);
    expect(sale.status).toBe('Partiel');
  });

  it('arrondit le crédit au franc CFA entier', () => {
    const { sale } = completeSale({
      lines: lignes,
      products: [lait],
      paymentMethod: 'Crédit Partiel',
      clientName: 'Awa',
      creditAmount: 1499.6,
      date: new Date(2024, 0, 15),
    });
    expect(sale.remainingAmount).toBe(1500);
  });

  it('refuse un règlement à crédit sans nom de client', () => {
    expect(() =>
      completeSale({
        lines: lignes,
        products: [lait],
        paymentMethod: 'Crédit Partiel',
        creditAmount: 1000,
        date: new Date(2024, 0, 15),
      })
    ).toThrow(/nom du client/);
  });

  it('ignore un crédit négatif', () => {
    const { sale } = completeSale({
      lines: lignes,
      products: [lait],
      paymentMethod: 'Espèces',
      clientName: 'Awa',
      creditAmount: -500,
      date: new Date(2024, 0, 15),
    });
    expect(sale.remainingAmount).toBeUndefined();
    expect(sale.status).toBe('Validé');
  });
});

describe('annulation de vente (EF-14 à EF-17, RG-09)', () => {
  const NOW = new Date('2026-03-10T15:00:00');
  const lines: CartLine[] = [
    { productId: 'p1', name: 'Lait', price: 1000, quantity: 3, unit: 'brique' },
  ];

  function soldSale(overrides: Partial<SaleTransaction> = {}): SaleTransaction {
    return makeSale({ id: 'sale-1', date: '2026-03-10', amount: 3000, lines, ...overrides });
  }

  it('conserve les lignes vendues pour pouvoir remettre le stock', () => {
    const { sale } = completeSale({
      lines,
      products: [makeProduct({ id: 'p1', stock: 10 })],
      paymentMethod: 'Espèces',
    });
    expect(sale.lines).toEqual(lines);
  });

  it('remet le stock, trace motif, auteur et date, et garde la vente', () => {
    const { sale, products, stockRestored } = cancelSale({
      sale: soldSale(),
      products: [makeProduct({ id: 'p1', stock: 2 })],
      reason: '  erreur de produit  ',
      by: 'Awa Fall',
      date: NOW,
    });

    expect(products[0]?.stock).toBe(5);
    expect(stockRestored).toBe(true);
    expect(sale).toMatchObject({
      id: 'sale-1',
      status: 'Annulée',
      cancelReason: 'erreur de produit',
      cancelledBy: 'Awa Fall',
      cancelledAt: NOW.toISOString(),
      amount: 3000,
    });
  });

  it('refuse un motif absent ou trop court', () => {
    const base = { sale: soldSale(), products: [makeProduct({ id: 'p1' })], by: 'Awa' };
    expect(() => cancelSale({ ...base, reason: '' })).toThrow(/motif/i);
    expect(() => cancelSale({ ...base, reason: '  a ' })).toThrow(/motif/i);
  });

  it('refuse d’annuler deux fois la même vente', () => {
    const once = cancelSale({
      sale: soldSale(),
      products: [makeProduct({ id: 'p1' })],
      reason: 'doublon',
      by: 'Awa',
    });
    expect(() =>
      cancelSale({ sale: once.sale, products: once.products, reason: 'doublon', by: 'Awa' }),
    ).toThrow(/déjà annulée/);
  });

  it('signale que le stock n’est pas remis quand le détail des lignes est inconnu', () => {
    const result = cancelSale({
      sale: soldSale({ lines: undefined }),
      products: [makeProduct({ id: 'p1', stock: 2 })],
      reason: 'erreur',
      by: 'Awa',
    });
    expect(result.stockRestored).toBe(false);
    expect(result.products[0]?.stock).toBe(2);
  });

  it('efface le reste dû d’une vente annulée (le crédit lié disparaît)', () => {
    const { sale } = cancelSale({
      sale: soldSale({ status: 'Partiel', remainingAmount: 2000, creditId: 'credit-1' }),
      products: [makeProduct({ id: 'p1' })],
      reason: 'erreur',
      by: 'Awa',
    });
    expect(sale.remainingAmount).toBeUndefined();
    expect(sale.creditId).toBeUndefined();
  });

  it('exclut les ventes annulées des ventes comptabilisables', () => {
    const cancelled = soldSale({ id: 'x', status: 'Annulée' });
    expect(activeSales([soldSale(), cancelled]).map((sale) => sale.id)).toEqual(['sale-1']);
    expect(dailyRevenue([soldSale(), cancelled], 1, NOW)).toEqual([
      { date: '2026-03-10', value: 3000 },
    ]);
  });

  describe('assessCancellation', () => {
    const credit = (repaid: number) => ({
      id: 'credit-1',
      clientName: 'M. Ba',
      initials: 'MB',
      shopOrLocation: '',
      phone: '',
      totalInitial: 2000,
      remainingAmount: 2000 - repaid,
      dueDate: '2026-04-09',
      status: 'En attente' as const,
    });

    it('autorise le gérant le jour même', () => {
      expect(assessCancellation({ sale: soldSale(), role: 'manager', now: NOW })).toMatchObject({
        allowed: true,
      });
    });

    it('refuse le caissier', () => {
      expect(assessCancellation({ sale: soldSale(), role: 'cashier', now: NOW })).toMatchObject({
        allowed: false,
        denial: 'role',
      });
    });

    it('réserve au propriétaire une vente d’un autre jour', () => {
      const old = soldSale({ date: '2026-03-09' });
      expect(assessCancellation({ sale: old, role: 'manager', now: NOW }).denial).toBe('window');
      expect(assessCancellation({ sale: old, role: 'owner', now: NOW }).allowed).toBe(true);
    });

    it('bloque l’annulation quand le crédit lié a reçu un remboursement', () => {
      const result = assessCancellation({
        sale: soldSale(),
        credit: credit(500),
        role: 'owner',
        now: NOW,
      });
      expect(result).toMatchObject({ allowed: false, denial: 'credit-repaid', repaidAmount: 500 });
      expect(
        assessCancellation({ sale: soldSale(), credit: credit(0), role: 'owner', now: NOW })
          .allowed,
      ).toBe(true);
    });

    it('refuse une vente déjà annulée', () => {
      expect(
        assessCancellation({ sale: soldSale({ status: 'Annulée' }), role: 'owner', now: NOW })
          .denial,
      ).toBe('already-cancelled');
    });
  });
});

describe('historique des ventes (EF-13)', () => {
  const NOW = new Date('2026-03-10T15:00:00');

  const history: SaleTransaction[] = [
    makeSale({ id: 'a', saleNumber: 'V-1', date: '2026-03-10', time: '09:00', amount: 1000, sellerId: 'u1', sellerName: 'Awa Fall' }),
    makeSale({ id: 'b', saleNumber: 'V-2', date: '2026-03-10', time: '14:30', amount: 2000, sellerId: 'u2', sellerName: 'Ibou Diop', clientName: 'M. Ba' }),
    makeSale({ id: 'c', saleNumber: 'V-3', date: '2026-03-08', time: '11:00', amount: 3000, status: 'Partiel', sellerId: 'u1', sellerName: 'Awa Fall' }),
    makeSale({ id: 'd', saleNumber: 'V-4', date: '2026-02-01', time: '10:00', amount: 4000, status: 'Annulée' }),
  ];
  const ids = (list: SaleTransaction[]) => list.map((sale) => sale.id);

  it('trie de la plus récente à la plus ancienne (date puis heure)', () => {
    expect(ids(filterSales(history, DEFAULT_SALES_FILTERS, NOW))).toEqual(['b', 'a', 'c', 'd']);
  });

  it('filtre par période : aujourd’hui, 7 jours, 30 jours', () => {
    const run = (period: SalesPeriod) => ids(filterSales(history, { ...DEFAULT_SALES_FILTERS, period }, NOW));
    expect(run('today')).toEqual(['b', 'a']);
    expect(run('7d')).toEqual(['b', 'a', 'c']);
    expect(run('30d')).toEqual(['b', 'a', 'c']);
    expect(run('all')).toEqual(['b', 'a', 'c', 'd']);
  });

  it('filtre par période personnalisée, bornes incluses', () => {
    const custom = { ...DEFAULT_SALES_FILTERS, period: 'custom' as const };
    expect(ids(filterSales(history, { ...custom, from: '2026-03-08', to: '2026-03-08' }, NOW))).toEqual(['c']);
    expect(ids(filterSales(history, { ...custom, from: '2026-03-09' }, NOW))).toEqual(['b', 'a']);
    expect(ids(filterSales(history, { ...custom, to: '2026-02-01' }, NOW))).toEqual(['d']);
  });

  it('filtre par vendeur, y compris les ventes sans vendeur enregistré', () => {
    expect(ids(filterSales(history, { ...DEFAULT_SALES_FILTERS, seller: 'u1' }, NOW))).toEqual(['a', 'c']);
    expect(ids(filterSales(history, { ...DEFAULT_SALES_FILTERS, seller: SELLER_UNKNOWN }, NOW))).toEqual(['d']);
  });

  it('filtre par statut', () => {
    expect(ids(filterSales(history, { ...DEFAULT_SALES_FILTERS, status: 'Annulée' }, NOW))).toEqual(['d']);
    expect(ids(filterSales(history, { ...DEFAULT_SALES_FILTERS, status: 'Partiel' }, NOW))).toEqual(['c']);
  });

  it('recherche par numéro de ticket ou client, sans tenir compte de la casse', () => {
    expect(ids(filterSales(history, { ...DEFAULT_SALES_FILTERS, query: ' v-3 ' }, NOW))).toEqual(['c']);
    expect(ids(filterSales(history, { ...DEFAULT_SALES_FILTERS, query: 'm. ba' }, NOW))).toEqual(['b']);
  });

  it('combine les filtres', () => {
    const filters = { ...DEFAULT_SALES_FILTERS, period: '7d' as const, seller: 'u1', status: 'Partiel' as const };
    expect(ids(filterSales(history, filters, NOW))).toEqual(['c']);
  });

  it('liste les vendeurs distincts par ordre alphabétique', () => {
    expect(sellerOptions(history)).toEqual([
      { key: 'u1', name: 'Awa Fall' },
      { key: 'u2', name: 'Ibou Diop' },
    ]);
  });

  it('résume : le total exclut les ventes annulées, qui sont comptées à part', () => {
    expect(summarizeSales(history)).toEqual({ count: 4, cancelledCount: 1, total: 6000 });
  });

  it('enregistre le vendeur sur la vente', () => {
    const { sale } = completeSale({
      lines: [{ productId: 'p1', name: 'Lait', price: 1000, quantity: 1, unit: 'brique' }],
      products: [makeProduct({ id: 'p1', stock: 5 })],
      paymentMethod: 'Espèces',
      seller: { id: 'u1', name: 'Awa Fall' },
    });
    expect(sale).toMatchObject({ sellerId: 'u1', sellerName: 'Awa Fall' });
  });
});
