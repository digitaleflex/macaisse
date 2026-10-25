import { describe, expect, it } from 'vitest';
import type { Expense, SaleTransaction } from '@/types';
import { toIsoDate } from '@/domain/dates';
import { buildAccountingRows, accountingFileName } from '../accounting';
import { escapeCsvCell, buildCsv } from '../csv';

/**
 * Journaux comptables (issue #9) : le contenu exporté doit correspondre
 * exactement à la période affichée, et le nom de fichier suivre la date locale.
 */

function sale(overrides: Partial<SaleTransaction> = {}): SaleTransaction {
  return {
    id: 's1',
    saleNumber: 'V-20260110-0001',
    time: '09:00',
    date: '2026-01-10',
    paymentMethod: 'Espèces',
    amount: 5000,
    status: 'Validé',
    itemsCount: 2,
    ...overrides,
  };
}

function expense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: 'e1',
    title: 'Transport',
    date: '2026-01-12',
    amount: 1500,
    category: 'Transport',
    paymentMethod: 'Espèces',
    ...overrides,
  };
}

describe('buildAccountingRows — période', () => {
  const sales = [
    sale({ id: 's-old', date: '2025-12-31', amount: 1000 }),
    sale({ id: 's-in', date: '2026-01-10', amount: 5000 }),
    sale({ id: 's-new', date: '2026-02-01', amount: 2000 }),
  ];
  const expenses = [
    expense({ id: 'e-old', date: '2025-12-30', amount: 500 }),
    expense({ id: 'e-in', date: '2026-01-12', amount: 1500 }),
  ];

  it('ne retient que les écritures de la période demandée', () => {
    const rows = buildAccountingRows(sales, expenses, 'all', {
      from: new Date(2026, 0, 1),
      to: new Date(2026, 0, 31),
    });

    expect(rows.map((row) => row.ref)).toEqual(['V-20260110-0001', '#DEP-e-in']);
    expect(rows.reduce((sum, row) => sum + row.creditAmount, 0)).toBe(5000);
    expect(rows.reduce((sum, row) => sum + row.debitAmount, 0)).toBe(1500);
  });

  it('sans bornes, conserve toutes les écritures', () => {
    expect(buildAccountingRows(sales, expenses, 'all')).toHaveLength(5);
  });

  it('applique la période avant le filtre de type', () => {
    const rows = buildAccountingRows(sales, expenses, 'expenses', {
      from: new Date(2026, 0, 1),
      to: new Date(2026, 0, 31),
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.type).toBe('Dépense');
  });
});

describe('accountingFileName — date locale', () => {
  it('utilise la date locale, pas la date UTC', () => {
    // 00 h 30 locale : passé en UTC, on changerait de journée dans les fuseaux
    // positifs. Le nom doit suivre la même convention que le reste de l'app.
    const date = new Date(2026, 0, 16, 0, 30);
    expect(accountingFileName('all', date)).toBe(`journal_comptable_complet_${toIsoDate(date)}`);
    expect(accountingFileName('sales', date)).toContain('journal_ventes');
    expect(accountingFileName('expenses', date)).toContain('journal_depenses');
  });
});

describe('CSV — échappement et entêtes', () => {
  it('échappe séparateur, guillemets et retours ligne', () => {
    expect(escapeCsvCell('simple')).toBe('simple');
    expect(escapeCsvCell('a;b')).toBe('"a;b"');
    expect(escapeCsvCell('il a dit "oui"')).toBe('"il a dit ""oui"""');
    expect(escapeCsvCell('ligne1\nligne2')).toBe('"ligne1\nligne2"');
  });

  it('préfixe le contenu d’un BOM UTF-8 et joint par des retours CRLF', () => {
    const csv = buildCsv(['A', 'B'], [['1', '2']]);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('A;B\r\n1;2');
  });
});
