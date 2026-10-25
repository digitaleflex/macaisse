// Store de l'équipe : membres de l'organisation active. Les écrans ne parlent
// plus directement à `services/` ; les erreurs remontent à l'appelant qui décide
// de l'affichage (toast) et le store reste testable sans DOM.

import { create } from 'zustand';
import type { InviteMemberInput, Role, TeamMember } from '@/types';
import { api } from '@/services';
import type { LoadStatus } from './useSessionStore';

export interface TeamState {
  members: TeamMember[];
  status: LoadStatus;
  error: string | null;
  /** Charge les membres de l'organisation ; les erreurs sont exposées dans `error`. */
  load: (organizationId: string) => Promise<void>;
  invite: (organizationId: string, input: InviteMemberInput) => Promise<TeamMember>;
  updateRole: (organizationId: string, userId: string, role: Role) => Promise<TeamMember>;
  remove: (organizationId: string, userId: string) => Promise<void>;
  /** Vide l'état au changement d'organisation ou à la déconnexion. */
  reset: () => void;
}

export const useTeamStore = create<TeamState>()((set) => ({
  members: [],
  status: 'idle',
  error: null,

  load: async (organizationId) => {
    set({ status: 'loading', error: null });
    try {
      const members = await api.team.list(organizationId);
      set({ members, status: 'ready' });
    } catch (error) {
      set({
        status: 'error',
        error: error instanceof Error ? error.message : null,
      });
    }
  },

  invite: async (organizationId, input) => {
    const member = await api.team.invite(organizationId, input);
    set((state) => ({ members: [...state.members, member] }));
    return member;
  },

  updateRole: async (organizationId, userId, role) => {
    const updated = await api.team.updateRole(organizationId, userId, role);
    set((state) => ({
      members: state.members.map((member) => (member.userId === updated.userId ? updated : member)),
    }));
    return updated;
  },

  remove: async (organizationId, userId) => {
    await api.team.remove(organizationId, userId);
    set((state) => ({ members: state.members.filter((member) => member.userId !== userId) }));
  },

  reset: () => set({ members: [], status: 'idle', error: null }),
}));
