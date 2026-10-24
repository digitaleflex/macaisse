/**
 * Données de démonstration centralisées. Consommées uniquement par :
 * - `services/adapters/mock` (réponses simulées du backend) ;
 * - les stores, comme état initial / repli de migration en mode `mock`.
 * Aucun composant UI n'importe ce module.
 */
export {
  SEED_PRODUCTS,
  SEED_SALES,
  SEED_EXPENSES,
  SEED_CREDITS,
  SEED_NOTIFICATIONS,
} from './fixtures/business';
export { SEED_SESSION } from './fixtures/session';
