import { describe, expect, it } from 'vitest';
import type { ClientCredit, Expense, Product, SaleTransaction } from '../../types';
import {
  cashFlowSeries,
  channelSplit,
  computeKpis,
  dailyRevenueSeries,
  expenseBreakdown,
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
    paymentMethod: 'Espèces',
    amount: 1000,
    status: 'Validé',
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
    paymentMethod: 'Espèces',
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
    status: 'Partiel',
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
      makeSale({ paymentMethod: 'Espèces', amount: 1000 }),
      makeSale({ paymentMethod: 'Mobile Money (Wave)', amount: 500 }),
      makeSale({ paymentMethod: 'Espèces', amount: 2000 }),
    ];
    expect(channelSplit(sales)).toEqual([
      { key: 'Espèces', label: 'Espèces', amount: 3000 },
      { key: 'Mobile Money (Wave)', label: 'Mobile Money (Wave)', amount: 500 },
    ]);
  });

  it('renvoie un tableau vide sans vente', () => {
    expect(channelSplit([])).toEqual([]);
  });
});
