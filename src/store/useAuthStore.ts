// Compte connecté : profil, appartenances, organisation active et expiration de
// la session. Aucun jeton n'est persisté : la session est portée par des cookies
// `HttpOnly` posés par le serveur (décision D1, docs/AUTH_DECISIONS.md).
// Persisté uniquement pour restaurer l'interface au rechargement ; la validité
// réelle est revérifiée par `restoreSession()` → `GET /auth/me`.
// Les actions asynchrones (connexion, changement d'organisation…) sont dans
// `store/auth.ts`.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Membership, UserProfile } from '@/types';
import { isRecord, persistOptions } from './storeUtils';

export interface AuthState {
  user: UserProfile | null;
  memberships: Membership[];
  currentOrganizationId: string | null;
  /** Expiration de l'access token (ISO), pour l'affichage et le diagnostic. */
  expiresAt: string | null;
  setAuth: (auth: { user: UserProfile; memberships: Membership[]; expiresAt: string }) => void;
  setCurrentOrganization: (organizationId: string | null) => void;
  reset: () => void;
}

type PersistedAuth = Pick<AuthState, 'user' | 'memberships' | 'currentOrganizationId' | 'expiresAt'>;

const EMPTY: PersistedAuth = {
  user: null,
  memberships: [],
  currentOrganizationId: null,
  expiresAt: null,
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      ...EMPTY,
      setAuth: ({ user, memberships, expiresAt }) => set({ user, memberships, expiresAt }),
      setCurrentOrganization: (currentOrganizationId) => set({ currentOrganizationId }),
      reset: () => set({ ...EMPTY }),
    }),
    persistOptions<AuthState, PersistedAuth>(
      'ma-caisse/auth',
      (state) => ({
        user: state.user,
        memberships: state.memberships,
        currentOrganizationId: state.currentOrganizationId,
        expiresAt: state.expiresAt,
      }),
      // Migration : un blob antérieur peut contenir un `token` (v1). Il est
      // ignoré — aucun jeton ne doit survivre en `localStorage` (écart A1/A9).
      (persisted) => {
        if (!isRecord(persisted)) return EMPTY;
        return {
          user: isRecord(persisted.user) ? (persisted.user as unknown as UserProfile) : null,
          memberships: Array.isArray(persisted.memberships)
            ? (persisted.memberships as Membership[])
            : [],
          currentOrganizationId:
            typeof persisted.currentOrganizationId === 'string'
              ? persisted.currentOrganizationId
              : null,
          expiresAt: typeof persisted.expiresAt === 'string' ? persisted.expiresAt : null,
        };
      }
    )
  )
);

export const selectIsAuthenticated = (state: AuthState): boolean => state.user !== null;
export const selectMemberships = (state: AuthState): Membership[] => state.memberships;
export const selectCurrentOrganizationId = (state: AuthState): string | null => state.currentOrganizationId;
