// Session courante (utilisateur, commerce, abonnement) et état de chargement
// des données distantes. Non persisté : toujours relu via `services/`.

import { create } from 'zustand';
import type { Session } from '@/types';
import { env } from '@/config/env';
import { SEED_SESSION } from '@/mocks';

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface SessionState {
  session: Session | null;
  status: LoadStatus;
  error: string | null;
  setSession: (session: Session) => void;
  setStatus: (status: LoadStatus, error?: string | null) => void;
}

// En mode démo, la session est disponible immédiatement (pas d'écran de chargement).
const INITIAL_SESSION = env.apiMode === 'mock' ? SEED_SESSION : null;

export const useSessionStore = create<SessionState>()((set) => ({
  session: INITIAL_SESSION,
  status: INITIAL_SESSION ? 'ready' : 'idle',
  error: null,
  setSession: (session) => set({ session, status: 'ready', error: null }),
  setStatus: (status, error = null) => set({ status, error }),
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
