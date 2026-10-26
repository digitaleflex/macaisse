/**
 * Règles du PIN de caisse (RG-A16, `docs/AUTH_DECISIONS.md`).
 *
 * Le PIN est un code court (4 à 6 chiffres) vérifié **localement** sur un
 * appareil enrôlé, pour que la caisse s'ouvre même sans réseau. Il ne remplace
 * pas une authentification forte : il protège le poste entre deux vendeurs.
 */

export const PIN_MIN_LENGTH = 4;
export const PIN_MAX_LENGTH = 6;

export type PinIssue = 'length' | 'digits' | 'repeated' | 'sequence' | 'phone' | 'year';

/** Suites triviales refusées (montantes et descendantes, 4 et 6 chiffres). */
const SEQUENCES: ReadonlySet<string> = new Set([
  '0123',
  '1234',
  '2345',
  '3456',
  '4567',
  '5678',
  '6789',
  '3210',
  '4321',
  '5432',
  '6543',
  '7654',
  '8765',
  '9876',
  '01234',
  '12345',
  '23456',
  '34567',
  '45678',
  '56789',
  '98765',
  '87654',
  '76543',
  '65432',
  '54321',
  '43210',
  '012345',
  '123456',
  '654321',
]);

/**
 * Renvoie les manquements (vide = PIN acceptable), dans un ordre stable :
 * longueur, chiffres, répétition, suite, téléphone, année.
 */
export function validatePin(
  pin: string,
  context: { phone?: string; year?: number } = {}
): PinIssue[] {
  const issues: PinIssue[] = [];

  if (pin.length < PIN_MIN_LENGTH || pin.length > PIN_MAX_LENGTH) issues.push('length');
  if (!/^\d+$/.test(pin)) issues.push('digits');
  if (pin.length > 0 && new Set(pin).size === 1) issues.push('repeated');
  if (SEQUENCES.has(pin)) issues.push('sequence');

  const phoneDigits = (context.phone ?? '').replace(/\D/g, '');
  if (pin.length >= PIN_MIN_LENGTH && phoneDigits.includes(pin)) issues.push('phone');

  if (context.year !== undefined && pin === String(context.year)) issues.push('year');

  return issues;
}

/**
 * Hash **local de démonstration** (FNV-1a 32 bits), utilisé pour comparer un PIN
 * hors ligne. En production, le serveur stocke un hash Argon2id et ce hash local
 * n'est qu'un cache d'appareil, effacé à la révocation (RG-A17).
 */
export function pinHash(pin: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < pin.length; index += 1) {
    hash ^= pin.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}
