import type { Expense, SaleTransaction } from '@/types';

/** Périmètre de données exportable (journal complet, ventes seules ou dépenses seules). */
export type ExportFilterType = 'all' | 'sales' | 'expenses';

/**
 * Écriture comptable normalisée, commune aux exports CSV et PDF.
 */
export interface AccountingEntry {
  date: string;
  time: string;
  type: 'Vente' | 'Dépense';
  ref: string;
  description: string;
  categoryOrClient: string;
  paymentMethod: string;
  creditAmount: number; // Entrée (Vente)
  debitAmount: number; // Sortie (Dépense)
  status: string;
}

/**
 * Normalise et combine les ventes et dépenses en écritures comptables.
 *
 * Fonction pure (aucun accès DOM/réseau) réutilisable par la feature Export
 * (CSV/PDF) et le Bilan, et testable unitairement. Cette normalisation vit
 * désormais dans `src/lib/export/accounting.ts` ; elle remplace l'ancien
 * `getAccountingEntries` qui résidait dans `utils/exportUtils.ts` (fichier
 * supprimé lors de la migration d'architecture).
 */
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
        type: 'Vente',
        ref: s.saleNumber,
        description: `Encaissement vente (${s.itemsCount} art.)`,
        categoryOrClient: s.clientName ? `Client: ${s.clientName}` : 'Comptoir boutique',
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
        type: 'Dépense',
        ref: `#DEP-${e.id.toString().padStart(4, '0')}`,
        description: e.title,
        categoryOrClient: e.category,
        paymentMethod: e.paymentMethod,
        creditAmount: 0,
        debitAmount: e.amount,
        status: e.status || 'Validé',
      });
    });
  }

  return entries;
}
