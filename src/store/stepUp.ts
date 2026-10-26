// Réauthentification courte (D9, RG-A12).
//
// Le serveur répond `401 STEP_UP_REQUIRED` sur les actions sensibles. Le client
// ouvre une modale, attend la confirmation, puis **rejoue l'action une fois**.
// Un `STEP_UP_REQUIRED` ne déconnecte jamais : la session reste valide.

import { create } from 'zustand';
import { isApiError } from '@/services';

export interface StepUpState {
  open: boolean;
  /** Ouvre la modale et résout quand l'utilisateur répond. */
  request: () => Promise<boolean>;
  resolve: (ok: boolean) => void;
}

let resolver: ((ok: boolean) => void) | null = null;

export const useStepUpStore = create<StepUpState>()((set) => ({
  open: false,
  request: () =>
    new Promise<boolean>((resolve) => {
      resolver = resolve;
      set({ open: true });
    }),
  resolve: (ok) => {
    const pending = resolver;
    resolver = null;
    set({ open: false });
    pending?.(ok);
  },
}));

/**
 * Exécute une action protégée par step-up. En cas de `STEP_UP_REQUIRED`, demande
 * la confirmation puis rejoue **une seule fois**.
 */
export async function withStepUp<T>(action: () => Promise<T>): Promise<T> {
  try {
    return await action();
  } catch (error) {
    if (isApiError(error) && error.code === 'STEP_UP_REQUIRED') {
      const confirmed = await useStepUpStore.getState().request();
      if (confirmed) return action();
    }
    throw error;
  }
}
