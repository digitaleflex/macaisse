import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SaleTransaction, Expense } from '../types';

export interface AccountingEntry {
  date: string;
  time: string;
  type: 'Vente' | 'Dépense';
  ref: string;
  description: string;
  categoryOrClient: string;
  paymentMethod: string;
  creditAmount: number; // Entrée (Vente)
  debitAmount: number;  // Sortie (Dépense)
  status: string;
}

/**
 * Normalise et combine les ventes et dépenses en écritures comptables
 */
export function getAccountingEntries(
  sales: SaleTransaction[],
  expenses: Expense[],
  filterType: 'all' | 'sales' | 'expenses' = 'all'
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

/**
 * Exporte les écritures au format CSV avec encodage UTF-8 et séparateur point-virgule (Excel FR)
 */
export function exportToCSV(
  filterType: 'all' | 'sales' | 'expenses',
  sales: SaleTransaction[],
  expenses: Expense[]
): void {
  const entries = getAccountingEntries(sales, expenses, filterType);

  const headers = [
    'Date',
    'Heure',
    'Type',
    'Référence',
    'Description',
    'Tiers / Catégorie',
    'Mode Règlement',
    'Entrée Vente (FCFA)',
    'Sortie Dépense (FCFA)',
    'Statut',
  ];

  const escapeCSV = (val: string | number) => {
    const stringVal = String(val ?? '');
    if (stringVal.includes(';') || stringVal.includes('"') || stringVal.includes('\n')) {
      return `"${stringVal.replace(/"/g, '""')}"`;
    }
    return stringVal;
  };

  const rows = entries.map((e) => [
    escapeCSV(e.date),
    escapeCSV(e.time),
    escapeCSV(e.type),
    escapeCSV(e.ref),
    escapeCSV(e.description),
    escapeCSV(e.categoryOrClient),
    escapeCSV(e.paymentMethod),
    escapeCSV(e.creditAmount > 0 ? e.creditAmount : ''),
    escapeCSV(e.debitAmount > 0 ? e.debitAmount : ''),
    escapeCSV(e.status),
  ]);

  // Ligne de totaux
  const totalCredits = entries.reduce((sum, e) => sum + e.creditAmount, 0);
  const totalDebits = entries.reduce((sum, e) => sum + e.debitAmount, 0);
  const soldeNet = totalCredits - totalDebits;

  rows.push([]);
  rows.push([
    'TOTAL GÉNÉRAL',
    '',
    '',
    '',
    '',
    '',
    '',
    escapeCSV(totalCredits),
    escapeCSV(totalDebits),
    `Solde Net: ${soldeNet} FCFA`,
  ]);

  const csvContent =
    '\uFEFF' + // UTF-8 BOM pour Excel
    [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  const todayStr = new Date().toISOString().slice(0, 10);
  const prefix =
    filterType === 'sales'
      ? 'journal_ventes'
      : filterType === 'expenses'
      ? 'journal_depenses'
      : 'journal_comptable_complet';

  link.href = url;
  link.setAttribute('download', `${prefix}_${todayStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exporte un rapport comptable officiel au format PDF avec jsPDF et autoTable
 */
export function exportToPDF(
  filterType: 'all' | 'sales' | 'expenses',
  sales: SaleTransaction[],
  expenses: Expense[]
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const entries = getAccountingEntries(sales, expenses, filterType);
  const totalSales = entries.reduce((sum, e) => sum + e.creditAmount, 0);
  const totalExpenses = entries.reduce((sum, e) => sum + e.debitAmount, 0);
  const soldeNet = totalSales - totalExpenses;

  const todayFormatted = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  // En-tête de l'entreprise
  doc.setFillColor(11, 28, 48); // #0b1c30
  doc.rect(0, 0, 210, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('BOUTIQUE ÉTOILE', 14, 12);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(218, 226, 253);
  doc.text('Alimentation Générale & Dépôt • Avenue Lamine Guèye, Dakar', 14, 18);
  doc.text('NINEA: 0048912 • Tél: +221 33 821 44 00 • Contact: caisse@etoile.sn', 14, 23);

  // Titre du Document
  const docTitle =
    filterType === 'sales'
      ? 'JOURNAL DES VENTES & RECETTES'
      : filterType === 'expenses'
      ? 'GRAND-LIVRE DES DÉPENSES & CHARGES'
      : 'JOURNAL GÉNÉRAL & SUIVI DE TRÉSORERIE';

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(197, 244, 65); // #c5f441
  doc.text(docTitle, 210 - 14, 13, { align: 'right' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 255, 255);
  doc.text(`Édité le: ${todayFormatted}`, 210 - 14, 19, { align: 'right' });
  doc.text(`Devise: FCFA (XOF)`, 210 - 14, 24, { align: 'right' });

  // Encadré de synthèse financière
  const startY = 35;

  // Boîte Ventes
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(14, startY, 57, 18, 2, 2, 'F');
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(14, startY, 57, 18, 2, 2, 'S');

  doc.setFontSize(7.5);
  doc.setTextColor(22, 101, 52);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL ENCAISSEMENTS', 18, startY + 6);
  doc.setFontSize(11);
  doc.text(`+${totalSales.toLocaleString('fr-FR')} F`, 18, startY + 13);

  // Boîte Dépenses
  doc.setFillColor(254, 242, 242);
  doc.roundedRect(76, startY, 57, 18, 2, 2, 'F');
  doc.setDrawColor(254, 202, 202);
  doc.roundedRect(76, startY, 57, 18, 2, 2, 'S');

  doc.setFontSize(7.5);
  doc.setTextColor(153, 27, 27);
  doc.text('TOTAL DÉCAISSEMENTS', 80, startY + 6);
  doc.setFontSize(11);
  doc.text(`-${totalExpenses.toLocaleString('fr-FR')} F`, 80, startY + 13);

  // Boîte Solde Net
  doc.setFillColor(239, 244, 255);
  doc.roundedRect(138, startY, 58, 18, 2, 2, 'F');
  doc.setDrawColor(220, 233, 255);
  doc.roundedRect(138, startY, 58, 18, 2, 2, 'S');

  doc.setFontSize(7.5);
  doc.setTextColor(11, 28, 48);
  doc.text('RÉSULTAT NET D\'EXPLOITATION', 142, startY + 6);
  doc.setFontSize(11);
  doc.text(
    `${soldeNet >= 0 ? '+' : ''}${soldeNet.toLocaleString('fr-FR')} FCFA`,
    142,
    startY + 13
  );

  // Tableau détaillé des écritures
  const tableHead = [
    [
      'Date/H',
      'Type',
      'Réf.',
      'Libellé / Tiers',
      'Règlement',
      'Entrée (F)',
      'Sortie (F)',
      'Statut',
    ],
  ];

  const tableBody = entries.map((e) => [
    `${e.date}\n${e.time}`,
    e.type,
    e.ref,
    `${e.description}\n(${e.categoryOrClient})`,
    e.paymentMethod,
    e.creditAmount > 0 ? `${e.creditAmount.toLocaleString('fr-FR')}` : '-',
    e.debitAmount > 0 ? `${e.debitAmount.toLocaleString('fr-FR')}` : '-',
    e.status,
  ]);

  // Ajouter ligne de totalisation au tableau
  tableBody.push([
    'TOTAL',
    '',
    `${entries.length} écriture(s)`,
    '',
    '',
    `${totalSales.toLocaleString('fr-FR')}`,
    `${totalExpenses.toLocaleString('fr-FR')}`,
    `Net: ${soldeNet.toLocaleString('fr-FR')}`,
  ]);

  autoTable(doc, {
    startY: startY + 24,
    head: tableHead,
    body: tableBody,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      font: 'helvetica',
      textColor: [11, 28, 48],
      lineColor: [229, 238, 255],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [11, 28, 48],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left',
    },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 16 },
      2: { cellWidth: 18 },
      3: { cellWidth: 54 },
      4: { cellWidth: 26 },
      5: { cellWidth: 20, halign: 'right' },
      6: { cellWidth: 20, halign: 'right' },
      7: { cellWidth: 16, halign: 'center' },
    },
    alternateRowStyles: {
      fillColor: [248, 249, 255],
    },
    didParseCell: (data) => {
      // Style spécial pour la dernière ligne de total
      if (data.row.index === tableBody.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [234, 241, 255];
        data.cell.styles.textColor = [11, 28, 48];
      }
    },
    margin: { left: 14, right: 14, bottom: 25 },
  });

  // Pied de page légal et signature
  // @ts-expect-error autoTable adds lastAutoTable to jsPDF instance
  const finalY = (doc.lastAutoTable?.finalY || 240) + 10;

  if (finalY < 265) {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(86, 94, 116);
    doc.text(
      'Document généré automatiquement par le Terminal de Caisse POS - Certifié conforme pour la tenue comptable externe.',
      14,
      finalY
    );

    // Bloc Signature / Visa
    doc.setFont('helvetica', 'normal');
    doc.text('Visa de la Gérance & Cachet de l\'Établissement :', 140, finalY);
    doc.setDrawColor(200, 210, 230);
    doc.rect(140, finalY + 2, 56, 16);
  }

  // Numérotation des pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(130, 140, 160);
    doc.text(
      `Page ${i} sur ${pageCount} • Boutique Étoile - Dakar • Système Ma Caisse`,
      105,
      292,
      { align: 'center' }
    );
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const filename = `Rapport_Comptable_Boutique_Etoile_${todayStr}.pdf`;
  doc.save(filename);
}
