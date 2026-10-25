import { describe, expect, it } from 'vitest';
import {
  validateCreditForm,
  validateExpenseForm,
  validateProductForm,
  validateRestock,
} from '../validation';

/**
 * Règles de validation des formulaires (issues #6 et #7).
 * Le domaine décide et renvoie un code ; l'UI le traduit via `content/fr.ts`.
 */
describe('validateProductForm', () => {
  const valid = { name: 'Savon', price: 500, costPrice: 300, stock: 10, minStockAlert: 2 };

  it('accepte une saisie valide', () => {
    expect(validateProductForm(valid)).toBeNull();
  });

  it('refuse un nom vide', () => {
    expect(validateProductForm({ ...valid, name: '   ' })).toBe('required');
  });

  it('refuse un prix nul ou négatif', () => {
    expect(validateProductForm({ ...valid, price: 0 })).toBe('amount_positive');
    expect(validateProductForm({ ...valid, price: -10 })).toBe('amount_positive');
  });

  it('refuse un prix d’achat négatif', () => {
    expect(validateProductForm({ ...valid, costPrice: -1 })).toBe('amount_not_negative');
  });

  it('refuse les montants et quantités non entiers', () => {
    expect(validateProductForm({ ...valid, price: 12.5 })).toBe('not_integer');
    expect(validateProductForm({ ...valid, stock: 1.5 })).toBe('not_integer');
  });

  it('refuse un stock ou un seuil négatif', () => {
    expect(validateProductForm({ ...valid, stock: -1 })).toBe('quantity_negative');
    expect(validateProductForm({ ...valid, minStockAlert: -2 })).toBe('quantity_negative');
  });

  it('refuse les valeurs non finies', () => {
    expect(validateProductForm({ ...valid, price: Number.NaN })).toBe('amount_positive');
  });
});

describe('validateCreditForm', () => {
  const valid = { clientName: 'M. Ba', amount: 5000, dueDate: '2026-11-15' };

  it('accepte une saisie valide', () => {
    expect(validateCreditForm(valid)).toBeNull();
  });

  it('exige un nom et une échéance', () => {
    expect(validateCreditForm({ ...valid, clientName: '' })).toBe('required');
    expect(validateCreditForm({ ...valid, dueDate: '' })).toBe('required');
  });

  it('exige un montant strictement positif et entier', () => {
    expect(validateCreditForm({ ...valid, amount: 0 })).toBe('amount_positive');
    expect(validateCreditForm({ ...valid, amount: 99.99 })).toBe('not_integer');
  });
});

describe('validateExpenseForm', () => {
  it('accepte une saisie valide', () => {
    expect(validateExpenseForm({ title: 'Taxi', amount: 2000 })).toBeNull();
  });

  it('exige un motif et un montant positif', () => {
    expect(validateExpenseForm({ title: '  ', amount: 2000 })).toBe('required');
    expect(validateExpenseForm({ title: 'Taxi', amount: -1 })).toBe('amount_positive');
    expect(validateExpenseForm({ title: 'Taxi', amount: 10.5 })).toBe('not_integer');
  });
});

describe('validateRestock', () => {
  it('accepte une quantité entière positive', () => {
    expect(validateRestock(10)).toBeNull();
  });

  it('refuse zéro, le négatif et les décimales', () => {
    expect(validateRestock(0)).toBe('quantity_positive');
    expect(validateRestock(-5)).toBe('quantity_positive');
    expect(validateRestock(2.5)).toBe('not_integer');
  });
});
