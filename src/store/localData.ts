// Purge des données métier locales (RG-A13, issue #23).
//
// Sur un poste partagé (caisse de boutique), le caissier suivant ne doit trouver
// ni nom de client, ni montant, ni panier en cours dans le navigateur. La
// déconnexion efface donc **toutes** les collections métier, qu'elles soient
// cloisonnées par organisation (`ma-caisse/<orgId>/<collection>`) ou globales.
//
// Ce qui est conservé, volontairement :
// - `ma-caisse/auth`  : réinitialisé par le store d'auth lui-même ;
// - `ma-caisse/ui`    : préférences d'affichage (aucune donnée client) ;
// - `ma-caisse/mock-*`: données serveur simulées (comptes, organisations),
//   elles ne dépendent pas de la session ouverte.

import { PERSIST_NAMES } from './storeUtils';

/** Collections métier persistées hors cloisonnement par organisation. */
const BUSINESS_KEYS: readonly string[] = [
  PERSIST_NAMES.products,
  PERSIST_NAMES.cart,
  PERSIST_NAMES.sales,
  PERSIST_NAMES.expenses,
  PERSIST_NAMES.credits,
  PERSIST_NAMES.notifications,
];

/** Collections métier persistées sous `ma-caisse/<orgId>/<collection>`. */
const SCOPED_COLLECTIONS: readonly string[] = [
  'products',
  'cart',
  'sales',
  'expenses',
  'credits',
  'notifications',
];

const PREFIX = 'ma-caisse/';

/** Vrai si la clé contient des données métier (donc à purger au logout). */
export function isBusinessStorageKey(key: string): boolean {
  if (!key.startsWith(PREFIX)) return false;
  if (BUSINESS_KEYS.includes(key)) return true;
  const rest = key.slice(PREFIX.length);
  const separator = rest.lastIndexOf('/');
  if (separator <= 0) return false;
  return SCOPED_COLLECTIONS.includes(rest.slice(separator + 1));
}

/**
 * Supprime les collections métier du stockage local et renvoie les clés
 * effectivement retirées (utile aux tests et au diagnostic).
 */
export function purgeLocalBusinessData(
  storage: Storage | undefined = typeof localStorage === 'undefined' ? undefined : localStorage
): string[] {
  if (storage === undefined) return [];
  const doomed: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key !== null && isBusinessStorageKey(key)) doomed.push(key);
  }
  for (const key of doomed) storage.removeItem(key);
  return doomed;
}
