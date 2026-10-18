import type { ClientCredit, Expense, NotificationItem, Product, SaleTransaction } from '@/types';
import { addDays, startOfDay, toIsoDate } from '@/domain/dates';

// Dates dérivées de la date du jour, calculées au chargement du module : les champs
// `date` / `dueDate` doivent être des chaînes ISO « YYYY-MM-DD » pour rester analysables
// par le domaine, tout en gardant la démo pertinente dans le temps.
const NOW = new Date();
const TODAY = toIsoDate(startOfDay(NOW));
const YESTERDAY = toIsoDate(addDays(NOW, -1));
// Dépenses anciennes : 2 à 5 semaines en arrière pour un bilan/une courbe plausibles.
const EXPENSE_18_DAYS_AGO = toIsoDate(addDays(NOW, -18));
const EXPENSE_20_DAYS_AGO = toIsoDate(addDays(NOW, -20));
const EXPENSE_22_DAYS_AGO = toIsoDate(addDays(NOW, -22));
// Échéances de crédit : deux dépassées (retard) et deux à venir (partiel / en attente).
const CREDIT_DUE_5_DAYS_AGO = toIsoDate(addDays(NOW, -5));
const CREDIT_DUE_2_DAYS_AGO = toIsoDate(addDays(NOW, -2));
const CREDIT_DUE_IN_10_DAYS = toIsoDate(addDays(NOW, 10));
const CREDIT_DUE_IN_12_DAYS = toIsoDate(addDays(NOW, 12));

export const APP_LOGO =
  'https://lh3.googleusercontent.com/aida/AEtjO1VrMucOqOjpUYzH-Ai6MwRK4ovtso7qpy-pkMXUkwhBbKQqCXuwOhRQf6z86AN7k4ytV6N4kr0nEj7pqfx1Bnr8-pXxb699e0ZJKSD9CBNwmGDW7g5KY7CZ2dZZKFfMS2jp8YC8RS54ZFNevsrv268slX0S-YSvOwnYWv1sa9CW5w0nQ1Gx2gHYlZUfkepH1GaDY8K118NxLRJj-MyXSof1If2HzJGFRWkSbwT36h4mpFCEqnfL-_kavUk';

export const SEED_PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: 'Lait demi-écrémé 1L',
    sku: '#LAI-018',
    category: 'Frais',
    price: 950,
    costPrice: 750,
    stock: 24,
    minStockAlert: 5,
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBOFh0s9MG1JpMytvAFgA4ZynFXG4IZdGwTIyxcB4xbSbNq3yI5u18Kjt1CISGXeFYcdzVIUL8SrdKL74YSl48puDJzGcgNe--gTvGB4Yrf6ZBZOuMgR_0LvtbQdkj6-2p4pNyxrH6rFHdw75P9OfJUNbJRLcqfZDEtirFJHbp_1dcyIb4SifvtMogEohp5qUXrdUYMO0PMbNwVkLiFVMBYQWhW-pnmd8aZV9_-0SYcEXQqU39IzpSmqQ',
    unit: 'brique',
  },
  {
    id: 'p2',
    name: 'Riz Parfumé 5kg',
    sku: '#RIZ-052',
    category: 'Épicerie',
    price: 4500,
    costPrice: 3750,
    stock: 3,
    minStockAlert: 5,
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuB56BmuZVYcHxSv-wPzv9Kqj2pz2si7AHxLYc3Kym_R765EnWZgBu0zetxZSg8VCXw-Bg7GegSSqrqIo88STgRCgQtmi-xZ7BLkT4LvYxOwqNgRfE6pKff2O5WzQ0UlnUlX4uNauppRTCGUcUAizNU3H8gtiIyigETADZMVqZIChS_qfFYWdZqDer8OnHudiXL7JY3rlMM1m13ZjnQ3b0gORQJTyZnCGV8uJNmwDyemxRy3nWizloUShA',
    unit: 'sac',
  },
  {
    id: 'p3',
    name: 'Huile Végétale Raffinée 1L',
    sku: '#HUI-001',
    category: 'Épicerie',
    price: 1400,
    costPrice: 1100,
    stock: 0,
    minStockAlert: 10,
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuA_j33hMqomtlAjmhMVDy4lAcBbB4sgPWxyrX5lUgIcdejYoFvootVbT_BPWBMfF2PR-hQUgkpxLNDmkG1Te68LCET0EZgkIp2LoMqAaCAoi5Gi7Nn7q7fHRPFdCq3u4SlIDyXPG8wsjTen6sHFFgY20g5PEPSNH9JuQs_W-Nu8BJQsLDRn8f-pA1-Nw_bcFBnc0WwWPV-wS1Ag1ai5Y74RIWYPAEN7Zm1LTMqPYeaXre30GjZ6HOwf0g',
    unit: 'bouteille',
  },
  {
    id: 'p4',
    name: 'Savon Doux 200g',
    sku: '#SAV-031',
    category: 'Hygiène',
    price: 500,
    costPrice: 350,
    stock: 45,
    minStockAlert: 10,
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDZToQa1a1JawMB6xdE9V_PH6avibbyy7fBiCkaB1CVEAyaOt7IUHyctxQpB6yDMqb6d_5NVhm_r8zMoQ0xereLx2Ujd1MFTCsBi2AZeBWJBzHKhqDUNF8DaQU0USIEkbgHOrMDMu5Ix1OV2vdW7-1D2YxDeM68T1fBTF2TLroG3J0DwHuKIc7qascQRqM3Xr1j_GKQWARCkr9nurVprYdfCxwBmjS5RleTIq6D4ad_h2NMGp7EZ-7X4g',
    unit: 'pain',
  },
  {
    id: 'p5',
    name: 'Pack Eau Minérale 6×1.5L',
    sku: '#EAU-012',
    category: 'Boissons',
    price: 2000,
    costPrice: 1600,
    stock: 38,
    minStockAlert: 8,
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBpl4eAGdMFmRxpnnNaKbQxnw9OXaPSPlW3vYGgV9IOYNoUk6yD49mnhLxVedxkN16_nQyik_GkRBQIG88nPfRzQVNkn_BzkZgT32HDGTsXLh_gmjdpJnuLMTSvXP43EdBupLvi7BGxMPGlH-39YbuqCfTFFuxpP8VCw2HmaGVj37DD4virJ2I3EF1kseTujhvtWXC1T3CBRGj2YJGblCdb9Hc6dh1NT6m68XNLwJ52ZQdhWBqD3Y67pw',
    unit: 'pack',
  },
  {
    id: 'p6',
    name: 'Sucre en poudre 1kg',
    sku: '#SUC-004',
    category: 'Épicerie',
    price: 850,
    costPrice: 650,
    stock: 52,
    minStockAlert: 15,
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDr5dPa-gVSpzTxvdYGJOXT8NQSKCmvUmrBERHzHF6NGPH_2wL9NPF7DPnLkrkI0z551YvNlrcnJEEhyXEH8Q4Cd7mzXRhkPNDm4ukalAfMA9eKsOnYPS9Ujr2kMbfha4aQTyzAGR7vDqIJyEQ4RTKA5IDRJEayAkWssNjxX3wjsA65UtYcPzpO2uFW5u9qsVo44QzTV5x2AMbn4NDORT_f82U-Jtzdggt6IA8L4CxnxbFU06uBtzr9UQ',
    unit: 'sachet',
  },
];

export const SEED_SALES: SaleTransaction[] = [
  {
    id: 's1',
    saleNumber: '#1042',
    time: '09:15',
    date: TODAY,
    paymentMethod: 'Espèces',
    amount: 12500,
    status: 'Validé',
    itemsCount: 3,
  },
  {
    id: 's2',
    saleNumber: '#1041',
    time: '08:52',
    date: TODAY,
    paymentMethod: 'Mobile Money (Wave)',
    amount: 4000,
    status: 'Validé',
    itemsCount: 1,
  },
  {
    id: 's3',
    saleNumber: '#1040',
    time: '08:30',
    date: TODAY,
    paymentMethod: 'Crédit Partiel',
    amount: 26000,
    status: 'Partiel',
    clientName: 'Mme Diallo',
    remainingAmount: 16000,
    itemsCount: 4,
  },
  {
    id: 's4',
    saleNumber: '#1039',
    time: '19:40',
    date: YESTERDAY,
    paymentMethod: 'Espèces',
    amount: 8500,
    status: 'Validé',
    itemsCount: 2,
  },
];

export const SEED_EXPENSES: Expense[] = [
  {
    id: 'e1',
    title: "Achat 20 cartons d'huile Dinor",
    date: TODAY,
    amount: 180000,
    category: 'Stock',
    paymentMethod: 'Wave',
    status: 'Justifié',
  },
  {
    id: 'e2',
    title: 'Facture CIE Électricité boutique',
    date: YESTERDAY,
    amount: 35000,
    category: 'Factures',
    paymentMethod: 'Espèces',
    status: 'Validé',
  },
  {
    id: 'e3',
    title: 'Livraison moto stock grossiste',
    date: EXPENSE_18_DAYS_AGO,
    amount: 8500,
    category: 'Transport',
    paymentMethod: 'Orange Money',
    status: 'Validé',
  },
  {
    id: 'e4',
    title: "Sacs d'emballage kraft x500",
    date: EXPENSE_20_DAYS_AGO,
    amount: 15000,
    category: 'Divers',
    paymentMethod: 'Espèces',
    status: 'Ticket OK',
  },
  {
    id: 'e5',
    title: 'Régularisation Riz Parfumé 50kg',
    date: EXPENSE_22_DAYS_AGO,
    amount: 220000,
    category: 'Stock',
    paymentMethod: 'Chèque',
    status: 'Facturé',
  },
];

export const SEED_CREDITS: ClientCredit[] = [
  {
    id: 'c1',
    clientName: 'Mme Aminata Diallo',
    initials: 'AD',
    shopOrLocation: 'Boutique Marché Sud',
    phone: '+221 77 412 88 09',
    remainingAmount: 45000,
    totalInitial: 60000,
    dueDate: CREDIT_DUE_5_DAYS_AGO,
    daysLate: 5,
    status: 'En retard',
  },
  {
    id: 'c2',
    clientName: 'M. Oumar Touré',
    initials: 'OT',
    shopOrLocation: 'Épicerie Centrale',
    phone: '+221 76 890 12 34',
    remainingAmount: 40000,
    totalInitial: 100000,
    dueDate: CREDIT_DUE_IN_10_DAYS,
    status: 'Partiel',
  },
  {
    id: 'c3',
    clientName: 'Restaurant Le Baobab',
    initials: 'RB',
    shopOrLocation: 'Chef Ibrahima',
    phone: '+221 70 334 55 66',
    remainingAmount: 120000,
    totalInitial: 120000,
    dueDate: CREDIT_DUE_IN_12_DAYS,
    status: 'En attente',
  },
  {
    id: 'c4',
    clientName: 'Kouassi Michel',
    initials: 'KM',
    shopOrLocation: 'Client régulier',
    phone: '+221 78 123 99 44',
    remainingAmount: 40000,
    totalInitial: 40000,
    dueDate: CREDIT_DUE_2_DAYS_AGO,
    daysLate: 2,
    status: 'En retard',
  },
];

// `time` ici est purement affiché dans l'UI : jamais analysé par le domaine, on le
// laisse donc en texte lisible ('Il y a 10 min', 'Ce matin 08:30') et non en ISO.
export const SEED_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'n1',
    title: 'Stock critique détecté',
    description: 'Riz Parfumé 5kg : reste 3 sacs (seuil minimal 5 sacs).',
    type: 'warning',
    time: 'Il y a 10 min',
    read: false,
  },
  {
    id: 'n2',
    title: 'Échéance crédit client',
    description: 'Mme Aminata Diallo : 45 000 FCFA en retard de 5 jours.',
    type: 'alert',
    time: 'Il y a 35 min',
    read: false,
  },
  {
    id: 'n3',
    title: 'Clôture de caisse recommandée',
    description: 'Rapprochement recommandé ce soir à 20:00.',
    type: 'info',
    time: 'Ce matin 08:30',
    read: true,
  },
];
