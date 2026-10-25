// Comptes, organisations et appartenances de démonstration (mode `mock`).
// En mode `http`, ces données viennent de `/auth/*`, `/orgs/:orgId/session`
// et `/orgs/:orgId/members`.
import type { BusinessProfile, Role, Subscription, UserProfile } from '@/types';
import { addDays, toIsoDate } from '@/domain/dates';

const NOW = new Date();
const day = (offset: number) => toIsoDate(addDays(NOW, offset));

/** Mot de passe commun à tous les comptes de démonstration. */
export const DEMO_PASSWORD = 'demo1234';

export interface MockAccount extends UserProfile {
  password: string;
}

export interface MockOrganization {
  business: BusinessProfile;
  subscription: Subscription;
}

export interface MockMembership {
  userId: string;
  organizationId: string;
  role: Role;
  status: 'active' | 'invited';
  joinedAt: string;
}

export const DEFAULT_ORG_ID = 'org-etoile';

export const MOCK_ACCOUNTS: MockAccount[] = [
  {
    id: 'u-mamadou',
    firstName: 'Mamadou',
    lastName: 'Konaté',
    role: 'Gérant',
    phone: '+221 77 482 19 02',
    email: 'mamadou@boutique-etoile.sn',
    password: DEMO_PASSWORD,
    emailVerified: true,
    emailVerificationDueAt: null,
  },
  {
    id: 'u-awa',
    firstName: 'Awa',
    lastName: 'Ndiaye',
    role: 'Caissière',
    phone: '+221 76 220 41 87',
    email: 'awa@boutique-etoile.sn',
    password: DEMO_PASSWORD,
    emailVerified: true,
    emailVerificationDueAt: null,
  },
  {
    id: 'u-koffi',
    firstName: 'Koffi',
    lastName: 'Mensah',
    role: 'Propriétaire',
    phone: '+225 07 58 33 21 10',
    email: 'koffi@superette-baobab.ci',
    password: DEMO_PASSWORD,
    emailVerified: true,
    emailVerificationDueAt: null,
  },
  {
    id: 'u-fatou',
    firstName: 'Fatou',
    lastName: 'Diop',
    role: 'Responsable',
    phone: '+225 05 44 18 90 02',
    email: 'fatou@superette-baobab.ci',
    password: DEMO_PASSWORD,
    emailVerified: true,
    emailVerificationDueAt: null,
  },
];

const PRO_PLAN = {
  id: 'pro',
  name: 'Pro Commerçant',
  monthlyPrice: 15000,
  yearlyPrice: 150000,
  features: ['Ventes illimitées', 'Jusqu’à 5 membres', 'Reçus WhatsApp inclus', 'Export comptable Excel & PDF'],
};

const STARTER_PLAN = {
  id: 'starter',
  name: 'Starter',
  monthlyPrice: 5000,
  yearlyPrice: 50000,
  features: ['500 ventes / mois', 'Jusqu’à 2 membres', 'Reçus numériques', 'Export CSV'],
};

export const MOCK_ORGANIZATIONS: Record<string, MockOrganization> = {
  'org-etoile': {
    business: {
      id: 'org-etoile',
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
      // Organisations de démonstration : onboarding déjà fait.
      onboardedAt: day(-120),
    },
    subscription: {
      plan: PRO_PLAN,
      cycle: 'monthly',
      renewalDate: day(31),
      paymentMethod: 'Wave',
      autoRenew: true,
      invoices: [
        { id: 'INV-0012', date: day(-1), amount: 15000, paymentMethod: 'Wave', status: 'Payée' },
        { id: 'INV-0011', date: day(-31), amount: 15000, paymentMethod: 'Wave', status: 'Payée' },
        { id: 'INV-0010', date: day(-62), amount: 15000, paymentMethod: 'Orange Money', status: 'Payée' },
      ],
    },
  },
  'org-baobab': {
    business: {
      id: 'org-baobab',
      name: 'Supérette Le Baobab',
      activity: 'Supérette de quartier',
      address: 'Boulevard Latrille, Cocody',
      city: 'Abidjan',
      phone: '+225 27 22 41 55 00',
      email: 'contact@superette-baobab.ci',
      taxId: 'CI-ABJ-2291',
      currency: 'FCFA',
      registerLabel: 'Caisse principale',
      closingTime: '21:30',
      // Organisation de démonstration : onboarding déjà fait.
      onboardedAt: day(-120),
    },
    subscription: {
      plan: STARTER_PLAN,
      cycle: 'yearly',
      renewalDate: day(140),
      paymentMethod: 'Orange Money',
      autoRenew: true,
      invoices: [{ id: 'INV-B-0003', date: day(-225), amount: 50000, paymentMethod: 'Orange Money', status: 'Payée' }],
    },
  },
};

export const MOCK_MEMBERSHIPS: MockMembership[] = [
  { userId: 'u-mamadou', organizationId: 'org-etoile', role: 'owner', status: 'active', joinedAt: day(-420) },
  { userId: 'u-awa', organizationId: 'org-etoile', role: 'cashier', status: 'active', joinedAt: day(-90) },
  { userId: 'u-koffi', organizationId: 'org-baobab', role: 'owner', status: 'active', joinedAt: day(-300) },
  { userId: 'u-fatou', organizationId: 'org-baobab', role: 'manager', status: 'active', joinedAt: day(-150) },
  // Mamadou conseille aussi la supérette : il appartient à deux organisations.
  { userId: 'u-mamadou', organizationId: 'org-baobab', role: 'manager', status: 'active', joinedAt: day(-60) },
];

/** Abonnement attribué à une organisation créée par inscription. */
export function trialSubscription(): Subscription {
  return {
    plan: STARTER_PLAN,
    cycle: 'monthly',
    renewalDate: day(14),
    paymentMethod: 'Essai gratuit',
    autoRenew: false,
    invoices: [],
  };
}
