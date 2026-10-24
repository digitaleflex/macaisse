import { describe, expect, it } from 'vitest';
import { can, canAccessTab } from '../permissions';

describe('permissions', () => {
  it('donne tous les droits au propriétaire', () => {
    expect(can('owner', 'team.manage')).toBe(true);
    expect(can('owner', 'billing.manage')).toBe(true);
  });

  it('réserve l’équipe et la facturation au propriétaire', () => {
    expect(can('manager', 'team.manage')).toBe(false);
    expect(can('manager', 'billing.manage')).toBe(false);
    expect(can('manager', 'finance.view')).toBe(true);
  });

  it('limite le caissier à l’encaissement', () => {
    expect(can('cashier', 'sales.create')).toBe(true);
    expect(can('cashier', 'credits.collect')).toBe(true);
    expect(can('cashier', 'stock.viewCost')).toBe(false);
    expect(can('cashier', 'expenses.manage')).toBe(false);
    expect(canAccessTab('cashier', 'bilan')).toBe(false);
    expect(canAccessTab('cashier', 'ventes')).toBe(true);
  });
});
