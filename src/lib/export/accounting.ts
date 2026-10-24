import type { Expense, SaleTransaction } from '@/types';
import { t } from '@/content';

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

/** Normalise et combine ventes et dépenses en écritures comptables (fonction pure). */
export function buildAccountingRows(
  sales: readonly SaleTransaction[],
  expenses: readonly Expense[],
  filterType: ExportFilterType = 'all',
): AccountingEntry[] {
  const entries: AccountingEntry[] = [];

  if (filterType === 'all' || filterType === 'sales') {
    sales.forEach((s) => {
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
