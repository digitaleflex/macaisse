// Génération d'identifiants et de numéros de vente.

let fallbackCounter = 0;
let saleSequence = 0;

/**
 * Crée un identifiant unique préfixé.
 * Utilise `crypto.randomUUID()` quand disponible, sinon un repli horodaté + compteur
 * (jamais `Date.now()` seul, qui collisionne en boucle rapide).
 */
export function createId(prefix: string): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    return `${prefix}-${cryptoApi.randomUUID()}`;
  }
  fallbackCounter = (fallbackCounter + 1) % 1_000_000;
  return `${prefix}-${Date.now().toString(36)}-${fallbackCounter.toString(36)}`;
}

/** Construit un numéro de vente du type « V-YYYYMMDD-0007 ». */
export function nextSaleNumber(seq: number, date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const normalized = Number.isFinite(seq) ? Math.max(0, Math.trunc(seq)) : 0;
  return `V-${y}${m}${d}-${String(normalized).padStart(4, '0')}`;
}

/** Compteur interne monotone utilisé pour numéroter les ventes sans numéro fourni. */
export function nextSaleSequence(): number {
  saleSequence += 1;
  return saleSequence;
}
