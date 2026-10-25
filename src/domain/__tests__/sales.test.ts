import { describe, expect, it } from 'vitest';
import type { CartLine, Product, SaleTransaction } from '../../types';
import {
  addToCart,
  cartTotals,
  completeSale,
  dailyRevenue,
  removeFromCart,
  setCartQuantity,
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
