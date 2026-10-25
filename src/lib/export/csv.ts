import type { Expense, SaleTransaction } from '@/types';
import { t } from '@/content';
import { accountingFileName, buildAccountingRows, type ExportFilterType, type ExportRange } from './accounting';

/**
 * Échappe une cellule CSV (séparateur `;`, guillemets et sauts de ligne).
 * Accepte n'importe quelle valeur, sans `any`.
 */
export function escapeCsvCell(value: unknown): string {
  const stringVal = String(value ?? '');
  if (stringVal.includes(';') || stringVal.includes('"') || stringVal.includes('\n')) {
    return `"${stringVal.replace(/"/g, '""')}"`;
  }
  return stringVal;
}

/**
 * Construit le contenu CSV (BOM UTF-8 + séparateur `;` compatible Excel FR).
 * Fonction pure : aucune écriture DOM, retourne la chaîne complète.
 */
export function buildCsv(
  headers: readonly string[],
  rows: readonly (readonly unknown[])[],
): string {
  const lines: string[] = [headers.map(escapeCsvCell).join(';')];
  for (const row of rows) {
    lines.push(row.map(escapeCsvCell).join(';'));
  }
  return '\uFEFF' + lines.join('\r\n');
}

/**
 * Exporte les écritures au format CSV avec encodage UTF-8 et séparateur
 * point-virgule (Excel FR). Déclenche le téléchargement côté navigateur et
 * retourne le contenu généré.
 */
export function exportToCSV(
  filterType: ExportFilterType,
  sales: readonly SaleTransaction[],
  expenses: readonly Expense[],
  range: ExportRange = {},
): string {
  const entries = buildAccountingRows(sales, expenses, filterType, range);

  const headers = t.documents.csvHeaders;

  const rows: unknown[][] = entries.map((e) => [
    e.date,
    e.time,
    e.type,
    e.ref,
    e.description,
    e.categoryOrClient,
    e.paymentMethod,
    e.creditAmount > 0 ? e.creditAmount : '',
    e.debitAmount > 0 ? e.debitAmount : '',
    e.status,
  ]);

  // Ligne de totaux
  const totalCredits = entries.reduce((sum, e) => sum + e.creditAmount, 0);
  const totalDebits = entries.reduce((sum, e) => sum + e.debitAmount, 0);
  const soldeNet = totalCredits - totalDebits;

  rows.push([]);
  rows.push([
    t.documents.csvTotal,
    '',
    '',
    '',
    '',
    '',
    '',
    totalCredits,
    totalDebits,
    t.documents.csvNet(String(soldeNet)),
  ]);

  const csvContent = buildCsv(headers, rows);

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.setAttribute('download', `${accountingFileName(filterType)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return csvContent;
}
