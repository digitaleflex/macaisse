import { beforeEach, describe, expect, it } from 'vitest';
import type { ClientCredit } from '@/types';
import {
  selectActiveCredits,
  selectCreditSummary,
  selectOverdueCredits,
  selectTotalOutstanding,
  useCreditsStore,
} from '../useCreditsStore';

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

describe('sélecteurs de crédits (date figée)', () => {
  const now = new Date(2024, 9, 18);

  beforeEach(() => {
    useCreditsStore.setState({
      credits: [
        makeCredit({ id: 'c1', remainingAmount: 45000, totalInitial: 60000, dueDate: '2024-10-13' }),
        makeCredit({ id: 'c2', remainingAmount: 40000, totalInitial: 100000, dueDate: '2999-01-01' }),
        makeCredit({ id: 'c3', remainingAmount: 0, totalInitial: 120000, dueDate: '2999-01-01' }),
      ],
    });
  });

  it('selectOverdueCredits ne retient que les échéances dépassées', () => {
    expect(selectOverdueCredits(useCreditsStore.getState(), now).map((c) => c.id)).toEqual(['c1']);
  });

  it('selectActiveCredits exclut les crédits réglés', () => {
    expect(selectActiveCredits(useCreditsStore.getState(), now).map((c) => c.id)).toEqual([
      'c1',
      'c2',
    ]);
  });

  it('selectCreditSummary et selectTotalOutstanding agrègent', () => {
    const state = useCreditsStore.getState();
    expect(selectCreditSummary(state, now)).toEqual({
      total: 280000,
      outstanding: 85000,
      overdue: 45000,
      settled: 195000,
      count: 3,
    });
    expect(selectTotalOutstanding(state)).toBe(85000);
  });
});
