/**
 * Normalisation des numéros de téléphone (RG-A01).
 *
 * L'identité de connexion est le numéro : deux écritures du même numéro doivent
 * désigner le **même compte**. On stocke donc un identifiant comparable
 * (chiffres uniquement, préfixe pays par défaut si absent) — l'affichage, lui,
 * garde la forme saisie.
 */

/** Pays par défaut du lancement (Sénégal). À passer en configuration quand
 *  plusieurs marchés coexistent. */
const DEFAULT_COUNTRY_CODE = '221';

/** Longueur maximale d'un numéro national dans la zone (9 chiffres au Sénégal). */
const NATIONAL_MAX_LENGTH = 9;

/**
 * Renvoie la forme canonique (chiffres, pays inclus) ou `''` si le numéro est
 * inexploitable. `+221 77 123 45 67`, `00221771234567` et `77 123 45 67`
 * donnent tous `221771234567`.
 */
export function normalizePhone(raw: string | null | undefined): string {
  const digits = (raw ?? '').replace(/\D/g, '').replace(/^00/, '');
  if (digits.length < 6) return '';
  if (digits.length <= NATIONAL_MAX_LENGTH) return `${DEFAULT_COUNTRY_CODE}${digits}`;
  return digits;
}

/** Vrai si le numéro peut servir d'identifiant de connexion. */
export function isValidPhone(raw: string | null | undefined): boolean {
  const normalized = normalizePhone(raw);
  return normalized.length >= 10;
}
