import { useMemo } from 'react';
import { canAccessTab } from '@/domain/permissions';
import { useCurrentSession } from '@/store/useSessionStore';
import { TABS, type TabDefinition } from './routes';

/** Onglets visibles pour le rôle de l'utilisateur dans l'organisation active. */
export function useAllowedTabs(): readonly TabDefinition[] {
  const { role } = useCurrentSession();
  return useMemo(() => TABS.filter((tab) => canAccessTab(role, tab.id)), [role]);
}
