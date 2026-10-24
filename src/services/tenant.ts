/**
 * Contexte d'exécution des appels API : jeton d'authentification et
 * organisation active. Alimenté par `store/auth.ts` ; lu par les adaptateurs
 * pour préfixer chaque requête métier par `/orgs/:orgId`.
 */

let authToken: string | null = null;
let activeOrganizationId: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

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
