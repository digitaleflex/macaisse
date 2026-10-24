// Compte connecté : jeton, profil, appartenances et organisation active.
// Persisté pour reprendre la session au rechargement. Les actions asynchrones
// (connexion, changement d'organisation…) sont dans `store/auth.ts`.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Membership, UserProfile } from '@/types';
import { isRecord, persistOptions } from './storeUtils';

export interface AuthState {
  token: string | null;
  user: UserProfile | null;
  memberships: Membership[];
  currentOrganizationId: string | null;
  setAuth: (auth: { token: string; user: UserProfile; memberships: Membership[] }) => void;
  setCurrentOrganization: (organizationId: string | null) => void;
  reset: () => void;
}

type PersistedAuth = Pick<AuthState, 'token' | 'user' | 'memberships' | 'currentOrganizationId'>;

const EMPTY: PersistedAuth = { token: null, user: null, memberships: [], currentOrganizationId: null };

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      ...EMPTY,
      setAuth: ({ token, user, memberships }) => set({ token, user, memberships }),
      setCurrentOrganization: (currentOrganizationId) => set({ currentOrganizationId }),
      reset: () => set({ ...EMPTY }),
    }),
    persistOptions<AuthState, PersistedAuth>(
      'ma-caisse/auth',
      (state) => ({
        token: state.token,
        user: state.user,
        memberships: state.memberships,
        currentOrganizationId: state.currentOrganizationId,
      }),
      (persisted) => (isRecord(persisted) ? { ...EMPTY, ...(persisted as Partial<PersistedAuth>) } : EMPTY)
    )
  )
);

export const selectIsAuthenticated = (state: AuthState): boolean => state.token !== null;
export const selectMemberships = (state: AuthState): Membership[] => state.memberships;
export const selectCurrentOrganizationId = (state: AuthState): string | null => state.currentOrganizationId;
