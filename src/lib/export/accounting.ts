import type { Expense, SaleTransaction } from '@/types';
import { t } from '@/content';
import { toIsoDate } from '@/domain/dates';

/** Périmètre de données exportable (journal complet, ventes seules ou dépenses seules). */
export type ExportFilterType = 'all' | 'sales' | 'expenses';

/** Écriture comptable normalisée, commune aux exports CSV et PDF. */
export interface AccountingEntry {
  date: string;
  time: string;
  type: string;
  ref: string;
  description: string;
  categoryOrClient: string;
  paymentMethod: string;
  creditAmount: number; // Entrée (vente)
  debitAmount: number; // Sortie (dépense)
  status: string;
}

/** Bornes de période d'un export (incluses, en date locale). */
export interface ExportRange {
  from?: Date;
  to?: Date;
}

/** Vrai si la date ISO tombe dans la période (bornes optionnelles). */
function inRange(date: string, fromKey: string | null, toKey: string | null): boolean {
  if (fromKey !== null && date < fromKey) return false;
  if (toKey !== null && date > toKey) return false;
  return true;
}

/**
 * Normalise et combine ventes et dépenses en écritures comptables (fonction pure).
 * La période est appliquée AVANT le filtre de type : l'export correspond
 * exactement à ce que l'utilisateur voit à l'écran.
 */
export function buildAccountingRows(
  sales: readonly SaleTransaction[],
  expenses: readonly Expense[],
  filterType: ExportFilterType = 'all',
  range: ExportRange = {},
): AccountingEntry[] {
  const entries: AccountingEntry[] = [];
  const fromKey = range.from ? toIsoDate(range.from) : null;
  const toKey = range.to ? toIsoDate(range.to) : null;

  if (filterType === 'all' || filterType === 'sales') {
    sales.forEach((s) => {
      if (!inRange(s.date, fromKey, toKey)) return;
      entries.push({
        date: s.date,
        time: s.time || '--:--',
        type: t.documents.entrySale,
        ref: s.saleNumber,
        description: t.documents.saleDescription(s.itemsCount),
        categoryOrClient: s.clientName ? t.documents.saleClient(s.clientName) : t.documents.counter,
        paymentMethod: s.paymentMethod,
        creditAmount: s.amount,
        debitAmount: 0,
        status: s.status,
      });
    });
  }

  if (filterType === 'all' || filterType === 'expenses') {
    expenses.forEach((e) => {
      if (!inRange(e.date, fromKey, toKey)) return;
      entries.push({
        date: e.date,
        time: e.time || '--:--',
        type: t.documents.entryExpense,
        ref: `#DEP-${e.id.toString().padStart(4, '0')}`,
        description: e.title,
        categoryOrClient: e.category,
        paymentMethod: e.paymentMethod,
        creditAmount: 0,
        debitAmount: e.amount,
        status: e.status || t.documents.defaultStatus,
      });
    });
  }

  return entries;
}

/**
 * Nom de fichier de l'export comptable, daté en **heure locale** (le reste de
 * l'application l'est aussi ; `toISOString` produisait un décalage d'un jour).
 */
export function accountingFileName(
  filterType: ExportFilterType,
  date: Date = new Date(),
): string {
  return `${t.documents.filePrefix[filterType]}_${toIsoDate(date)}`;
}
