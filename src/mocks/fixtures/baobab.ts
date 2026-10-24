// Données de démonstration de la seconde organisation (Supérette Le Baobab).
import type { ClientCredit, Expense, NotificationItem, Product, SaleTransaction } from '@/types';
import { addDays, toIsoDate } from '@/domain/dates';

const NOW = new Date();
const day = (offset: number) => toIsoDate(addDays(NOW, offset));

export const BAOBAB_PRODUCTS: Product[] = [
  { id: 'bb-p1', name: 'Attiéké 1kg', sku: '#ATT-001', category: 'Épicerie', price: 800, costPrice: 550, stock: 40, minStockAlert: 10, imageUrl: '', unit: 'sachet' },
  { id: 'bb-p2', name: 'Huile de palme 1L', sku: '#PAL-014', category: 'Épicerie', price: 1500, costPrice: 1150, stock: 4, minStockAlert: 8, imageUrl: '', unit: 'bouteille' },
  { id: 'bb-p3', name: 'Jus de gingembre 50cl', sku: '#GIN-003', category: 'Boissons', price: 500, costPrice: 300, stock: 60, minStockAlert: 12, imageUrl: '', unit: 'bouteille' },
  { id: 'bb-p4', name: 'Lait concentré sucré', sku: '#LCS-020', category: 'Frais', price: 650, costPrice: 480, stock: 0, minStockAlert: 6, imageUrl: '', unit: 'boîte' },
  { id: 'bb-p5', name: 'Savon de Marseille', sku: '#SVM-008', category: 'Hygiène', price: 400, costPrice: 250, stock: 33, minStockAlert: 10, imageUrl: '', unit: 'pain' },
  { id: 'bb-p6', name: 'Eau minérale 1.5L', sku: '#EAU-150', category: 'Boissons', price: 350, costPrice: 220, stock: 96, minStockAlert: 24, imageUrl: '', unit: 'bouteille' },
  { id: 'bb-p7', name: 'Riz brisé 25kg', sku: '#RIZ-250', category: 'Épicerie', price: 13500, costPrice: 11800, stock: 9, minStockAlert: 4, imageUrl: '', unit: 'sac' },
];

const AMOUNTS = [
  [9800, 14200, 6100],
  [21500, 7800],
  [11200, 16400, 5200],
  [8800, 19900],
  [13600, 7400, 10100],
  [24300, 6600],
  [12800, 9300, 15100],
  [17700, 8200],
  [10400, 20600],
  [14900, 6800, 11300],
  [18200, 9700],
  [7600, 22400, 8100],
  [15800, 12300],
  [9900, 13100, 6400],
];
const METHODS: SaleTransaction['paymentMethod'][] = ['Espèces', 'Orange Money', 'Espèces', 'Mobile Money (Wave)'];

export const BAOBAB_SALES: SaleTransaction[] = AMOUNTS.flatMap((amounts, dayIndex) =>
  amounts.map((amount, saleIndex) => ({
    id: `bb-s${dayIndex}-${saleIndex}`,
    saleNumber: `#B${600 - dayIndex * 3 - saleIndex}`,
    time: `${String(8 + saleIndex * 5).padStart(2, '0')}:${String((dayIndex * 11) % 60).padStart(2, '0')}`,
    date: day(-dayIndex),
    paymentMethod: METHODS[(dayIndex + saleIndex) % METHODS.length],
    amount,
    status: 'Validé' as const,
    itemsCount: 1 + ((dayIndex * 2 + saleIndex) % 6),
  }))
);

export const BAOBAB_EXPENSES: Expense[] = [
  { id: 'bb-e1', title: 'Réassort grossiste Adjamé', date: day(-2), amount: 96000, category: 'Stock', paymentMethod: 'Orange Money', status: 'Justifié' },
  { id: 'bb-e2', title: 'Facture CIE électricité', date: day(-6), amount: 28500, category: 'Factures', paymentMethod: 'Espèces', status: 'Validé' },
  { id: 'bb-e3', title: 'Livraison tricycle', date: day(-9), amount: 6000, category: 'Transport', paymentMethod: 'Espèces', status: 'Validé' },
];

export const BAOBAB_CREDITS: ClientCredit[] = [
  { id: 'bb-c1', clientName: 'Maquis Chez Tantie', initials: 'CT', shopOrLocation: 'Rue des Jardins', phone: '+225 07 11 22 33 44', remainingAmount: 38000, totalInitial: 50000, dueDate: day(-3), daysLate: 3, status: 'En retard' },
  { id: 'bb-c2', clientName: 'M. Yao Kouadio', initials: 'YK', shopOrLocation: 'Client régulier', phone: '+225 05 66 77 88 99', remainingAmount: 15000, totalInitial: 15000, dueDate: day(8), status: 'En attente' },
];

export const BAOBAB_NOTIFICATIONS: NotificationItem[] = [
  { id: 'bb-n1', title: 'Rupture de stock', description: 'Lait concentré sucré : stock épuisé.', type: 'alert', time: 'Il y a 1 h', read: false, relatedTab: 'stock' },
  { id: 'bb-n2', title: 'Crédit en retard', description: 'Maquis Chez Tantie : 38 000 FCFA en retard de 3 jours.', type: 'warning', time: 'Ce matin', read: false, relatedTab: 'credits' },
];
