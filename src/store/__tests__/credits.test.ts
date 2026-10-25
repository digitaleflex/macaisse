import { beforeEach, describe, expect, it } from 'vitest';
import type { ClientCredit } from '@/types';
import { useCreditsStore } from '../useCreditsStore';

function makeCredit(overrides: Partial<ClientCredit> = {}): ClientCredit {
  return {
    id: 'c1',
    clientName: 'Mme Aminata Diallo',
    initials: 'AD',
    shopOrLocation: 'Boutique Marché Sud',
    phone: '+221 77 000 00 00',
    remainingAmount: 40000,
    totalInitial: 100000,
    dueDate: '2999-01-01',
    status: 'Partiel',
    ...overrides,
  };
}

beforeEach(() => {
  useCreditsStore.setState({ credits: [] });
});

describe('useCreditsStore — mutations', () => {
  it('ajoute un crédit avec un statut dérivé', () => {
    useCreditsStore.getState().addCredit({
      clientName: 'Mme Diallo',
      initials: 'MD',
      shopOrLocation: 'Boutique',
      phone: '+221',
      remainingAmount: 40000,
      totalInitial: 100000,
      dueDate: '2999-01-01',
    });

    const [credit] = useCreditsStore.getState().credits;
    expect(credit.id).toMatch(/^credit-/);
    expect(credit.status).toBe('Partiel');
    expect(credit.daysLate).toBeUndefined();
  });

  it('applique un paiement partiel et refuse le sur-paiement', () => {
    useCreditsStore.setState({ credits: [makeCredit({ id: 'c1' })] });

    useCreditsStore.getState().payCredit('c1', 10000);
    expect(useCreditsStore.getState().credits[0].remainingAmount).toBe(30000);

    expect(() => useCreditsStore.getState().payCredit('c1', 999999)).toThrowError(
      /dépasse le reste dû/
    );
    expect(() => useCreditsStore.getState().payCredit('c1', 0)).toThrowError(/supérieur à zéro/);
    // Aucune mutation après les refus.
    expect(useCreditsStore.getState().credits[0].remainingAmount).toBe(30000);
  });

  it('solde un crédit', () => {
    useCreditsStore.setState({ credits: [makeCredit({ id: 'c1' })] });
    useCreditsStore.getState().markSettled('c1');

    const [credit] = useCreditsStore.getState().credits;
    expect(credit.remainingAmount).toBe(0);
    expect(credit.status).toBe('Réglé');
  });

  it('retire un crédit', () => {
    useCreditsStore.setState({ credits: [makeCredit({ id: 'c1' }), makeCredit({ id: 'c2' })] });
    useCreditsStore.getState().removeCredit('c1');
    expect(useCreditsStore.getState().credits.map((c) => c.id)).toEqual(['c2']);
  });
});

