// Mise en route d'une organisation (RG-A04) : les 2 étapes qui rendent la caisse
// utilisable (nom du commerce, coordonnées) et clôturent l'onboarding.
// Seul module autorisé à appeler `api.onboarding` et à rafraîchir la session.

import type { BusinessProfile, OnboardingInput } from '@/types';
import { api } from '@/services';
import { useAuthStore } from './useAuthStore';
import { useSessionStore } from './useSessionStore';

/** Vrai tant que le commerce de l'organisation active n'a pas été configuré. */
export function needsOnboarding(business: BusinessProfile | null | undefined): boolean {
  return !business || !business.onboardedAt;
}

/** Enregistre les informations du commerce et clôt l'onboarding. */
export async function completeOnboarding(input: OnboardingInput): Promise<BusinessProfile> {
  const organizationId = useAuthStore.getState().currentOrganizationId;
  if (!organizationId) throw new Error('Aucune organisation active.');
  const business = await api.onboarding.complete(organizationId, input);
  useSessionStore.getState().setBusiness(business);
  return business;
}
