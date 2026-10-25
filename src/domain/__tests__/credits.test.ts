import { describe, expect, it } from 'vitest';
import type { ClientCredit } from '../../types';
import {
  appliedPaymentAmount,
  applyPayment,
  computeCreditStatus,
  creditFromSale,
  creditProgress,
  creditSummary,
  daysLate,
  DEFAULT_CREDIT_TERM_DAYS,
  initialsFrom,
} from '../credits';

function makeCredit(overrides: Partial<ClientCredit>): ClientCredit {
  return {
    id: 'c1',
    clientName: 'Mme Diallo',
    initials: 'MD',
    shopOrLocation: 'Boutique',
    phone: '+221 77 000 00 00',
    remainingAmount: 40000,
    totalInitial: 100000,
    dueDate: '2999-01-01',
    status: 'Partiel',
    ...overrides,
  };
}

describe('daysLate', () => {
  it('renvoie le nombre de jours de retard pour une échéance passée', () => {
    expect(daysLate('2024-10-18', new Date(2024, 9, 23))).toBe(5);
  });

  it('renvoie 0 pour une échéance future ou aujourd’hui', () => {
    expect(daysLate('2024-10-30', new Date(2024, 9, 18))).toBe(0);
    expect(daysLate('2024-10-18', new Date(2024, 9, 18))).toBe(0);
  });

  it('renvoie 0 pour une date invalide', () => {
    expect(daysLate('pas une date')).toBe(0);
  });
});

describe('computeCreditStatus', () => {
  const now = new Date(2024, 9, 18);

  it('est « Réglé » quand le reste dû est nul', () => {
    expect(computeCreditStatus(0, 60000, '2999-01-01', now)).toBe('Réglé');
    expect(computeCreditStatus(-1, 60000, '2000-01-01', now)).toBe('Réglé');
  });

  it('est « En retard » quand l’échéance est dépassée', () => {
    expect(computeCreditStatus(45000, 60000, '2024-10-13', now)).toBe('En retard');
    expect(computeCreditStatus(40000, 40000, '2024-10-16', now)).toBe('En retard');
  });

  it('est « Partiel » quand un acompte a été versé sans retard', () => {
    expect(computeCreditStatus(40000, 100000, '2999-01-01', now)).toBe('Partiel');
  });

  it('est « En attente » quand rien n’a été versé et sans retard', () => {
    expect(computeCreditStatus(120000, 120000, '2999-01-01', now)).toBe('En attente');
  });
});

describe('applyPayment', () => {
  it('refuse un montant nul ou négatif', () => {
    expect(() => applyPayment(makeCredit({}), 0)).toThrowError(/supérieur à zéro/);
    expect(() => applyPayment(makeCredit({}), -100)).toThrowError(/supérieur à zéro/);
  });

  it('refuse un sur-paiement', () => {
    expect(() => applyPayment(makeCredit({ remainingAmount: 40000 }), 50000)).toThrowError(
      /dépasse le reste dû/
    );
  });

  it('solde le crédit sur un paiement exact', () => {
    const updated = applyPayment(makeCredit({ remainingAmount: 40000 }), 40000);
    expect(updated.remainingAmount).toBe(0);
    expect(updated.status).toBe('Réglé');
  });

  it('applique un paiement partiel et recalcule le statut', () => {
    const updated = applyPayment(makeCredit({ remainingAmount: 40000 }), 10000);
    expect(updated.remainingAmount).toBe(30000);
    expect(updated.status).toBe('Partiel');
  });

  it('conserve le statut « En retard » tant que le reste dû demeure', () => {
    const updated = applyPayment(
      makeCredit({ remainingAmount: 45000, dueDate: '2000-01-01' }),
      5000
    );
    expect(updated.remainingAmount).toBe(40000);
    expect(updated.status).toBe('En retard');
    expect(updated.daysLate).toBeGreaterThan(0);
  });

  it('ne mute pas le crédit d’origine', () => {
    const credit = makeCredit({ remainingAmount: 40000 });
    applyPayment(credit, 10000);
    expect(credit.remainingAmount).toBe(40000);
  });
});

describe('creditProgress', () => {
  it('calcule la progression entre 0 et 1', () => {
    expect(creditProgress(makeCredit({ totalInitial: 100000, remainingAmount: 40000 }))).toBe(0.6);
    expect(creditProgress(makeCredit({ totalInitial: 100000, remainingAmount: 100000 }))).toBe(0);
    expect(creditProgress(makeCredit({ totalInitial: 100000, remainingAmount: 0 }))).toBe(1);
  });

  it('gère un total initial nul', () => {
    expect(creditProgress(makeCredit({ totalInitial: 0, remainingAmount: 0 }))).toBe(1);
    expect(creditProgress(makeCredit({ totalInitial: 0, remainingAmount: 50 }))).toBe(0);
  });
});

describe('creditSummary', () => {
  it('agrège total, restant dû, retard, recouvré et nombre', () => {
    const now = new Date(2024, 9, 18);
    const credits = [
      makeCredit({ id: 'c1', totalInitial: 60000, remainingAmount: 45000, dueDate: '2000-01-01' }),
      makeCredit({ id: 'c2', totalInitial: 100000, remainingAmount: 40000, dueDate: '2999-01-01' }),
      makeCredit({ id: 'c3', totalInitial: 120000, remainingAmount: 0, dueDate: '2999-01-01' }),
    ];
    expect(creditSummary(credits, now)).toEqual({
      total: 280000,
      outstanding: 85000,
      overdue: 45000,
      settled: 195000,
      count: 3,
    });
  });

  it('renvoie des zéros pour un carnet vide', () => {
    expect(creditSummary([])).toEqual({
      total: 0,
      outstanding: 0,
      overdue: 0,
      settled: 0,
      count: 0,
    });
  });
});

describe('initialsFrom', () => {
  it('ignore les civilités et garde deux initiales', () => {
    expect(initialsFrom('M. Ba Ousmane')).toBe('BO');
    expect(initialsFrom('Mme Fatou Diop')).toBe('FD');
  });

  it('gère un nom simple et un nom vide', () => {
    expect(initialsFrom('Awa')).toBe('A');
    expect(initialsFrom('   ')).toBe('CL');
  });
});

describe('creditFromSale', () => {
  it('crée une créance à échéance 30 jours, montants entiers', () => {
    const credit = creditFromSale({
      clientName: 'Koffi Mensah',
      amount: 1234.6,
      date: new Date(2024, 0, 15),
      place: 'Client comptoir',
    });
    expect(credit).toMatchObject({
      clientName: 'Koffi Mensah',
      initials: 'KM',
      shopOrLocation: 'Client comptoir',
      phone: '',
      remainingAmount: 1235,
      totalInitial: 1235,
      dueDate: '2024-02-14',
    });
    expect(DEFAULT_CREDIT_TERM_DAYS).toBe(30);
  });
});

describe('appliedPaymentAmount — montant réellement imputé (#8)', () => {
  const credit = makeCredit({ remainingAmount: 4000, totalInitial: 10000 });

  it('impute le montant demandé s’il reste sous le dû', () => {
    expect(appliedPaymentAmount(credit, 1500)).toEqual({ applied: 1500, clamped: false });
  });

  it('plafonne au reste dû et le signale', () => {
    expect(appliedPaymentAmount(credit, 9000)).toEqual({ applied: 4000, clamped: true });
  });

  it('arrondit au franc et neutralise le négatif', () => {
    expect(appliedPaymentAmount(credit, 1000.4)).toEqual({ applied: 1000, clamped: false });
    expect(appliedPaymentAmount(credit, -100)).toEqual({ applied: 0, clamped: false });
  });
});
