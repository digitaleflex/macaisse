/**
 * Contexte d'exécution des appels API : organisation active.
 *
 * La session n'est **plus** transportée ici : elle vit dans les cookies
 * `HttpOnly` posés par le serveur (décision D1, `docs/AUTH_DECISIONS.md`).
 * Ce module ne conserve donc aucun secret — seulement l'espace de travail que
 * l'utilisateur a ouvert, pour préfixer les routes métier par `/orgs/:orgId`.
 */

let activeOrganizationId: string | null = null;

export function setActiveOrganization(organizationId: string | null): void {
  activeOrganizationId = organizationId;
}

export function getActiveOrganization(): string | null {
  return activeOrganizationId;
}

/** Organisation active, obligatoire pour toute requête métier. */
export function requireOrganization(): string {
  if (activeOrganizationId === null) {
    throw new Error('Aucune organisation active : connectez-vous puis choisissez un espace.');
  }
  return activeOrganizationId;
}
