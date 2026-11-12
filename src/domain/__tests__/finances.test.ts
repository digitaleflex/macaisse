import { describe, expect, it } from 'vitest';
import type { ClientCredit, Expense, Product, SaleTransaction } from '../../types';
import {
  cashFlowSeries,
  channelSplit,
  computeKpis,
  dailyRevenueSeries,
  expenseBreakdown,
  monthToDateComparison,
  revenueBetween,
} from '../finances';

function makeProduct(overrides: Partial<Product>): Product {
  return {
    id: 'p',
    name: 'Produit',
    sku: '#SKU',
    category: 'Épicerie',
    price: 1000,
    costPrice: 700,
    stock: 10,
    minStockAlert: 5,
    imageUrl: '',
    unit: 'unité',
    ...overrides,
  };
}

function makeSale(overrides: Partial<SaleTransaction>): SaleTransaction {
  return {
    id: 's',
    saleNumber: 'V-20241018-0001',
    time: '09:00',
    date: '2024-10-18',
    paymentMethod: 'cash',
    amount: 1000,
    status: 'completed',
    itemsCount: 1,
    ...overrides,
  };
}

function makeExpense(overrides: Partial<Expense>): Expense {
  return {
    id: 'e',
    title: 'Dépense',
    date: '2024-10-18',
    amount: 100,
    category: 'Divers',
    paymentMethod: 'cash',
    ...overrides,
  };
}

function makeCredit(overrides: Partial<ClientCredit>): ClientCredit {
  return {
    id: 'c',
    clientName: 'Client',
    initials: 'CL',
    shopOrLocation: 'Boutique',
    phone: '+221 77 000 00 00',
    remainingAmount: 45000,
    totalInitial: 60000,
    dueDate: '2999-01-01',
    status: 'partial',
    ...overrides,
  };
}

describe('computeKpis', () => {
  it('agrège CA jour, CA mois, marge, créances, dépenses et alertes', () => {
    const now = new Date(2024, 9, 18, 12, 0);
    const input = {
      sales: [
        makeSale({ date: '2024-10-18', amount: 1000 }),
        makeSale({ date: '2024-10-05', amount: 2000 }),
        makeSale({ date: '2024-09-30', amount: 5000 }),
      ],
      expenses: [
        makeExpense({ date: '2024-10-02', amount: 800 }),
        makeExpense({ date: '2024-09-15', amount: 300 }),
      ],
      credits: [makeCredit({ remainingAmount: 45000 })],
      products: [
        makeProduct({ id: 'a', stock: 10, minStockAlert: 5, costPrice: 700, price: 1000 }),
        makeProduct({ id: 'b', stock: 3, minStockAlert: 5, costPrice: 400, price: 500 }),
        makeProduct({ id: 'c', stock: 0, minStockAlert: 10, costPrice: 100, price: 200 }),
      ],
    };

    expect(computeKpis(input, now)).toEqual({
      dailyRevenue: 1000,
      monthlyRevenue: 3000,
      margin: 3300,
      outstandingCredits: 45000,
      monthlyExpenses: 800,
      stockAlerts: 2,
    });
  });

  it('ignore les ventes non datables', () => {
    const kpis = computeKpis(
      {
        sales: [makeSale({ date: 'Aujourd\'hui', amount: 9999 })],
        expenses: [],
        credits: [],
        products: [],
      },
      new Date(2024, 9, 18)
    );
    expect(kpis.dailyRevenue).toBe(0);
  });
});

describe('dailyRevenueSeries', () => {
  it('renvoie une série de la longueur demandée, jours vides à 0', () => {
    const sales = [
      makeSale({ date: '2024-10-18', amount: 1000 }),
      makeSale({ date: '2024-10-16', amount: 500 }),
    ];
    const series = dailyRevenueSeries(sales, 7, new Date(2024, 9, 18));
    expect(series).toHaveLength(7);
    expect(series[series.length - 1].date).toBe('2024-10-18');
    expect(series[series.length - 1].value).toBe(1000);
    expect(series[series.length - 3].date).toBe('2024-10-16');
    expect(series[series.length - 3].value).toBe(500);
    expect(series[0].value).toBe(0);
  });

  it('renvoie un tableau vide pour 0 jour', () => {
    expect(dailyRevenueSeries([], 0, new Date(2024, 9, 18))).toEqual([]);
  });
});

describe('cashFlowSeries', () => {
  it('calcule entrées − sorties par jour', () => {
    const sales = [makeSale({ date: '2024-10-18', amount: 1000 })];
    const expenses = [makeExpense({ date: '2024-10-18', amount: 300 })];
    const series = cashFlowSeries(sales, expenses, 2, new Date(2024, 9, 18));
    expect(series.map((p) => p.value)).toEqual([0, 700]);
  });
});

describe('expenseBreakdown', () => {
  it('regroupe par catégorie et trie par montant décroissant', () => {
    const expenses = [
      makeExpense({ category: 'Stock', amount: 500 }),
      makeExpense({ category: 'Transport', amount: 100 }),
      makeExpense({ category: 'Stock', amount: 700 }),
      makeExpense({ category: 'Factures', amount: 300 }),
    ];
    expect(expenseBreakdown(expenses)).toEqual([
      { key: 'Stock', label: 'Stock', amount: 1200 },
      { key: 'Factures', label: 'Factures', amount: 300 },
      { key: 'Transport', label: 'Transport', amount: 100 },
    ]);
  });

  it('borne la période avec from et to', () => {
    const expenses = [
      makeExpense({ date: '2024-10-01', category: 'Stock', amount: 100 }),
      makeExpense({ date: '2024-10-15', category: 'Stock', amount: 200 }),
      makeExpense({ date: '2024-11-01', category: 'Stock', amount: 400 }),
    ];
    const inRange = expenseBreakdown(expenses, new Date(2024, 9, 1), new Date(2024, 9, 31));
    expect(inRange).toEqual([{ key: 'Stock', label: 'Stock', amount: 300 }]);
  });
});

describe('channelSplit', () => {
  it('répartit les encaissements par moyen de paiement, trié décroissant', () => {
    const sales = [
      makeSale({ paymentMethod: 'cash', amount: 1000 }),
      makeSale({ paymentMethod: 'wave', amount: 500 }),
      makeSale({ paymentMethod: 'cash', amount: 2000 }),
    ];
    expect(channelSplit(sales)).toEqual([
      { key: 'cash', label: 'cash', amount: 3000 },
      { key: 'wave', label: 'wave', amount: 500 },
    ]);
  });

  it('renvoie un tableau vide sans vente', () => {
    expect(channelSplit([])).toEqual([]);
  });
});

describe('ventes annulées', () => {
  const NOW = new Date('2024-10-18T12:00:00');
  const sales = [
    makeSale({ id: 'a', amount: 1000 }),
    makeSale({ id: 'b', amount: 4000, paymentMethod: 'orange_money', status: 'cancelled' }),
  ];

  it('ne comptent ni dans le CA du jour ni dans celui du mois', () => {
    const kpis = computeKpis({ sales, expenses: [], credits: [], products: [] }, NOW);
    expect(kpis.dailyRevenue).toBe(1000);
    expect(kpis.monthlyRevenue).toBe(1000);
  });

  it('ne comptent ni dans les séries, ni dans le flux, ni dans les canaux', () => {
    expect(dailyRevenueSeries(sales, 1, NOW)).toEqual([{ date: '2024-10-18', value: 1000 }]);
    expect(cashFlowSeries(sales, [], 1, NOW)).toEqual([{ date: '2024-10-18', value: 1000 }]);
    expect(channelSplit(sales)).toEqual([{ key: 'cash', label: 'cash', amount: 1000 }]);
  });
});

describe('chiffre d’affaires par période', () => {
  const sales = [
    makeSale({ id: 'a', date: '2026-11-20', amount: 1000 }),
    makeSale({ id: 'b', date: '2026-11-03', amount: 4000 }),
    makeSale({ id: 'c', date: '2026-10-03', amount: 3000 }),
    makeSale({ id: 'd', date: '2026-10-25', amount: 9000 }),
    makeSale({ id: 'x', date: '2026-11-20', amount: 8000, status: 'cancelled' }),
  ];

  it('additionne les ventes non annulées entre deux jours, bornes incluses', () => {
    expect(revenueBetween(sales, new Date(2026, 10, 3), new Date(2026, 10, 20))).toBe(5000);
    expect(revenueBetween(sales, new Date(2026, 10, 20), new Date(2026, 10, 20))).toBe(1000);
    expect(revenueBetween(sales, new Date(2026, 0, 1), new Date(2026, 0, 31))).toBe(0);
  });

  it('compare le mois en cours aux MÊMES jours du mois précédent, pas à un mois complet', () => {
    const { current, previous } = monthToDateComparison(sales, new Date(2026, 10, 20));
    expect(current).toBe(5000);
    // Du 1er au 20 octobre : la vente du 3 (3 000), pas celle du 25 (9 000).
    expect(previous).toBe(3000);
  });

  it('ramène la comparaison à la fin d’un mois plus court (31 mars → 28 février)', () => {
    const march = [
      makeSale({ id: 'f', date: '2026-02-28', amount: 700 }),
      makeSale({ id: 'g', date: '2026-03-31', amount: 100 }),
    ];
    expect(monthToDateComparison(march, new Date(2026, 2, 31))).toEqual({ current: 100, previous: 700 });
  });

  it('gère janvier (mois précédent = décembre de l’année d’avant)', () => {
    const january = [
      makeSale({ id: 'h', date: '2025-12-10', amount: 500 }),
      makeSale({ id: 'i', date: '2026-01-10', amount: 800 }),
    ];
    expect(monthToDateComparison(january, new Date(2026, 0, 15))).toEqual({ current: 800, previous: 500 });
  });

  it('répartit par moyen de paiement sur la période choisie seulement', () => {
    const mixed = [
      makeSale({ id: 'j', date: '2026-11-20', amount: 1000, paymentMethod: 'cash' }),
      makeSale({ id: 'k', date: '2026-11-01', amount: 5000, paymentMethod: 'wave' }),
      makeSale({ id: 'l', date: '2026-11-19', amount: 2000, paymentMethod: 'wave', status: 'cancelled' }),
    ];
    const keys = (slices: ReturnType<typeof channelSplit>) => slices.map((slice) => [slice.key, slice.amount]);
    expect(keys(channelSplit(mixed))).toEqual([['wave', 5000], ['cash', 1000]]);
    expect(keys(channelSplit(mixed, new Date(2026, 10, 14), new Date(2026, 10, 20)))).toEqual([['cash', 1000]]);
  });
});
