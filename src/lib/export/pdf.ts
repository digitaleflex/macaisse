import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { BusinessProfile, Expense, SaleTransaction } from '@/types';
import { t } from '@/content';
import { toIsoDate } from '@/domain/dates';
import { buildAccountingRows, type ExportFilterType, type ExportRange } from './accounting';

/**
 * Exporte un rapport comptable officiel au format PDF avec jsPDF et autoTable.
 *
 * Les couleurs de marque restent volontairement codées en dur ici (le module
 * `lib/` ne dépend pas du design system de l'app).
 */
export function exportToPDF(
  filterType: ExportFilterType,
  sales: readonly SaleTransaction[],
  expenses: readonly Expense[],
  business: BusinessProfile,
  range: ExportRange = {},
): void {
  const d = t.documents;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const entries = buildAccountingRows(sales, expenses, filterType, range);
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
  doc.text(business.name.toUpperCase(), 14, 12);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(218, 226, 253);
  doc.text(`${business.activity} • ${business.address}, ${business.city}`, 14, 18);
  doc.text(d.pdfContact(business.taxId, business.phone, business.email), 14, 23);

  // Titre du Document
  const docTitle = d.pdfTitle[filterType];

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(197, 244, 65); // #c5f441
  doc.text(docTitle, 210 - 14, 13, { align: 'right' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 255, 255);
  doc.text(d.pdfIssued(todayFormatted), 210 - 14, 19, { align: 'right' });
  doc.text(d.pdfCurrency, 210 - 14, 24, { align: 'right' });

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
  doc.text(d.pdfTotalIn, 18, startY + 6);
  doc.setFontSize(11);
  doc.text(`+${totalSales.toLocaleString('fr-FR')} F`, 18, startY + 13);

  // Boîte Dépenses
  doc.setFillColor(254, 242, 242);
  doc.roundedRect(76, startY, 57, 18, 2, 2, 'F');
  doc.setDrawColor(254, 202, 202);
  doc.roundedRect(76, startY, 57, 18, 2, 2, 'S');

  doc.setFontSize(7.5);
  doc.setTextColor(153, 27, 27);
  doc.text(d.pdfTotalOut, 80, startY + 6);
  doc.setFontSize(11);
  doc.text(`-${totalExpenses.toLocaleString('fr-FR')} F`, 80, startY + 13);

  // Boîte Solde Net
  doc.setFillColor(239, 244, 255);
  doc.roundedRect(138, startY, 58, 18, 2, 2, 'F');
  doc.setDrawColor(220, 233, 255);
  doc.roundedRect(138, startY, 58, 18, 2, 2, 'S');

  doc.setFontSize(7.5);
  doc.setTextColor(11, 28, 48);
  doc.text(d.pdfNet, 142, startY + 6);
  doc.setFontSize(11);
  doc.text(
    `${soldeNet >= 0 ? '+' : ''}${soldeNet.toLocaleString('fr-FR')} FCFA`,
    142,
    startY + 13,
  );

  // Tableau détaillé des écritures
  const tableHead = [[...d.pdfHead]];

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
    d.pdfTotalRow,
    '',
    d.pdfEntries(entries.length),
    '',
    '',
    `${totalSales.toLocaleString('fr-FR')}`,
    `${totalExpenses.toLocaleString('fr-FR')}`,
    d.pdfNetShort(soldeNet.toLocaleString('fr-FR')),
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
    doc.text(d.pdfFooterNote, 14, finalY);

    // Bloc Signature / Visa
    doc.setFont('helvetica', 'normal');
    doc.text(d.pdfVisa, 140, finalY);
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
      d.pdfPage(i, pageCount, business.name),
      105,
      292,
      { align: 'center' },
    );
  }

  const todayStr = toIsoDate(new Date());
  const filename = d.pdfFile(business.name.replace(/\s+/g, '_'), todayStr);
  doc.save(filename);
}
