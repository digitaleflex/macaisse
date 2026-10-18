// Formatage et analyse des montants en francs CFA (FCFA).

const NOMBRE_FORMATTER = new Intl.NumberFormat('fr-FR');

/** Arrondit un montant au franc CFA entier. */
export function roundMontant(n: number): number {
  return Math.round(n);
}

/** Formate un nombre au format fr-FR (séparateur de milliers : espace fine insécable). */
export function formatNombre(n: number): string {
  return NOMBRE_FORMATTER.format(n);
}

export interface FormatFCFAOptions {
  /** Ajoute le suffixe « FCFA » (activé par défaut). */
  withSuffix?: boolean;
}

/** Formate un montant en FCFA au format fr-FR, suffixe « FCFA » par défaut. */
export function formatFCFA(amount: number, opts: FormatFCFAOptions = {}): string {
  const { withSuffix = true } = opts;
  const base = formatNombre(roundMontant(amount));
  return withSuffix ? `${base} FCFA` : base;
}

/**
 * Analyse une saisie utilisateur en montant numérique.
 * Accepte « 12 500 », « 12500.5 », « 12 500,50 FCFA ». Renvoie 0 si invalide.
 */
export function parseMontant(input: string): number {
  if (!input) return 0;
  const cleaned = input
    .replace(/FCFA/gi, '')
    .replace(/[\s\u00a0\u202f\u2009]/g, '')
    .replace(',', '.')
    .replace(/[^\d.-]/g, '');
  if (cleaned === '' || cleaned === '-') return 0;
  const value = Number.parseFloat(cleaned);
  return Number.isFinite(value) ? value : 0;
}
