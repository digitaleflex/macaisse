import { describe, expect, it } from 'vitest';
import {
  addDays,
  formatTime,
  fullDaysBetween,
  isSameDay,
  isSameMonth,
  parseDate,
  startOfDay,
  toIsoDate,
} from '../dates';

describe('dates', () => {
  it('formate une date en ISO court local', () => {
    expect(toIsoDate(new Date(2024, 0, 5))).toBe('2024-01-05');
    expect(toIsoDate(new Date(2024, 11, 31))).toBe('2024-12-31');
  });

  it('formate l’heure HH:MM', () => {
    const d = new Date(2024, 0, 5, 9, 7);
    expect(formatTime(d)).toBe('09:07');
  });

  it('analyse une date seule en heure locale', () => {
    const parsed = parseDate('2024-10-18');
    expect(parsed).not.toBeNull();
    expect(parsed?.getFullYear()).toBe(2024);
    expect(parsed?.getMonth()).toBe(9);
    expect(parsed?.getDate()).toBe(18);
  });

  it('renvoie null pour une date invalide', () => {
    expect(parseDate('pas une date')).toBeNull();
    expect(parseDate('')).toBeNull();
    expect(parseDate(undefined)).toBeNull();
  });

  it('ramène au début du jour et ajoute des jours', () => {
    const d = new Date(2024, 9, 18, 15, 30);
    expect(toIsoDate(startOfDay(d))).toBe('2024-10-18');
    expect(toIsoDate(addDays(d, 2))).toBe('2024-10-20');
    expect(toIsoDate(addDays(d, -18))).toBe('2024-09-30');
  });

  it('compte les jours entiers entre deux dates', () => {
    expect(fullDaysBetween(new Date(2024, 9, 18), new Date(2024, 9, 23))).toBe(5);
    expect(fullDaysBetween(new Date(2024, 9, 23), new Date(2024, 9, 18))).toBe(-5);
  });

  it('compare jour et mois', () => {
    expect(isSameDay(new Date(2024, 9, 18, 1), new Date(2024, 9, 18, 23))).toBe(true);
    expect(isSameDay(new Date(2024, 9, 18), new Date(2024, 9, 19))).toBe(false);
    expect(isSameMonth(new Date(2024, 9, 1), new Date(2024, 9, 31))).toBe(true);
    expect(isSameMonth(new Date(2024, 9, 1), new Date(2024, 10, 1))).toBe(false);
  });
});
