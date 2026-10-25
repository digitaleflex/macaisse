// Session de travail : utilisateur dans l'organisation active (profil du
// commerce, abonnement, rôle) et état de chargement. Non persisté : relu via
// `services/` à chaque ouverture d'organisation.

import { create } from 'zustand';
import type { BusinessProfile, Session } from '@/types';
import { can, type Permission } from '@/domain/permissions';

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface SessionState {
  session: Session | null;
  status: LoadStatus;
  error: string | null;
  setSession: (session: Session) => void;
  /** Met à jour le commerce de l'organisation active (onboarding, paramètres). */
  setBusiness: (business: BusinessProfile) => void;
  setStatus: (status: LoadStatus, error?: string | null) => void;
  clear: () => void;
}

export const useSessionStore = create<SessionState>()((set) => ({
  session: null,
  status: 'idle',
  error: null,
  setSession: (session) => set({ session, status: 'ready', error: null }),
  setBusiness: (business) =>
    set((state) => ({ session: state.session === null ? null : { ...state.session, business } })),
  setStatus: (status, error = null) => set({ status, error }),
  clear: () => set({ session: null, status: 'idle', error: null }),
}));

export const selectSession = (state: SessionState): Session | null => state.session;
export const selectSessionStatus = (state: SessionState): LoadStatus => state.status;

/**
 * Session garantie non nulle : le shell n'affiche les vues qu'une fois la
 * session chargée (`App.tsx`), ce hook peut donc être utilisé partout dessous.
 */
export function useCurrentSession(): Session {
  const session = useSessionStore(selectSession);
  if (session === null) {
    throw new Error('Session indisponible : le shell doit attendre le chargement.');
  }
  return session;
}

/** Vrai si l'utilisateur courant dispose de la permission dans l'organisation active. */
export function usePermission(permission: Permission): boolean {
  return useSessionStore((state) => (state.session ? can(state.session.role, permission) : false));
}
