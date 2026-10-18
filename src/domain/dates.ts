// Utilitaires de dates purs, sans dépendance. Toutes les dates sont locales.

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const ISO_DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Formate une date en ISO court « YYYY-MM-DD » (fuseau local). */
export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Formate l'heure « HH:MM ». */
export function formatTime(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${min}`;
}

/**
 * Analyse une date (ISO « YYYY-MM-DD » ou chaîne reconnue par `Date`).
 * Les dates seules sont interprétées en heure locale (et non UTC).
 * Renvoie `null` si la valeur est invalide.
 */
export function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const match = ISO_DATE_ONLY.exec(value.trim());
  if (match) {
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Date ramenée au début du jour local. */
export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Ajoute (ou retire) des jours à une date. */
export function addDays(date: Date, days: number): Date {
  const copy = startOfDay(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

/** Nombre de jours entiers entre deux dates (positif si `to` est après `from`). */
export function fullDaysBetween(from: Date, to: Date): number {
  return Math.floor((startOfDay(to).getTime() - startOfDay(from).getTime()) / MS_PER_DAY);
}

/** Vrai si les deux dates tombent le même jour local. */
export function isSameDay(a: Date, b: Date): boolean {
  return toIsoDate(a) === toIsoDate(b);
}

/** Vrai si les deux dates tombent le même mois local. */
export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}
