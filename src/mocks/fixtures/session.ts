// Session de démonstration (mode `mock`) : utilisateur connecté, identité du
// commerce et abonnement. En mode `http`, ces données viennent de `GET /session`.
import type { Session } from '@/types';
import { addDays, toIsoDate } from '@/domain/dates';

const NOW = new Date();

export const SEED_SESSION: Session = {
  user: {
    id: 'u1',
    firstName: 'Mamadou',
    lastName: 'Konaté',
    role: 'Gérant',
    phone: '+221 77 482 19 02',
    email: 'mamadou@boutique-etoile.sn',
  },
  business: {
    id: 'b1',
    name: 'Boutique Étoile',
    activity: 'Alimentation générale & dépôt',
    address: 'Avenue Lamine Guèye',
    city: 'Dakar Plateau',
    phone: '+221 33 821 44 00',
    email: 'caisse@boutique-etoile.sn',
    taxId: '0048912',
    currency: 'FCFA',
    registerLabel: 'Caisse #01',
    closingTime: '20:00',
  },
  subscription: {
    plan: {
      id: 'pro',
      name: 'Pro Commerçant',
      monthlyPrice: 15000,
      yearlyPrice: 150000,
      features: [
        'Ventes illimitées',
        'Jusqu’à 3 caissiers',
        'Reçus WhatsApp inclus',
        'Export comptable Excel & PDF',
      ],
    },
    cycle: 'monthly',
    renewalDate: toIsoDate(addDays(NOW, 31)),
    paymentMethod: 'Wave',
    autoRenew: true,
    invoices: [
      { id: 'INV-0012', date: toIsoDate(addDays(NOW, -1)), amount: 15000, paymentMethod: 'Wave', status: 'Payée' },
      { id: 'INV-0011', date: toIsoDate(addDays(NOW, -31)), amount: 15000, paymentMethod: 'Wave', status: 'Payée' },
      { id: 'INV-0010', date: toIsoDate(addDays(NOW, -62)), amount: 15000, paymentMethod: 'Orange Money', status: 'Payée' },
    ],
  },
};
