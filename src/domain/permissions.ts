// Matrice des droits par rôle (règle métier pure). Le serveur DOIT appliquer
// les mêmes règles : côté client, elle ne sert qu'à adapter l'interface.

import type { Role, TabType } from '../types';

export type Permission =
  | 'sales.create'
  | 'stock.edit'
  | 'stock.restock'
  | 'stock.viewCost'
  | 'credits.create'
  | 'credits.collect'
  | 'finance.view'
  | 'expenses.manage'
  | 'export.run'
  | 'team.manage'
  | 'billing.manage';

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  owner: [
    'sales.create',
    'stock.edit',
    'stock.restock',
    'stock.viewCost',
    'credits.create',
    'credits.collect',
    'finance.view',
    'expenses.manage',
    'export.run',
    'team.manage',
    'billing.manage',
  ],
  manager: [
    'sales.create',
    'stock.edit',
    'stock.restock',
    'stock.viewCost',
    'credits.create',
    'credits.collect',
    'finance.view',
    'expenses.manage',
    'export.run',
  ],
  cashier: ['sales.create', 'credits.collect'],
};

/** Vrai si le rôle possède la permission. */
export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

/** Onglets accessibles : le bilan exige l'accès aux finances. */
export function canAccessTab(role: Role, tab: TabType): boolean {
  return tab === 'bilan' ? can(role, 'finance.view') : true;
}

/** Hiérarchie des rôles (un rôle ne peut attribuer qu'un rôle inférieur ou égal). */
export const ROLE_RANK: Record<Role, number> = { owner: 3, manager: 2, cashier: 1 };
