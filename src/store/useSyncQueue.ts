import { useSyncExternalStore } from 'react';
import { getPendingSyncs, subscribePendingSyncs } from '@/services/syncQueue';

/**
 * Nombre de mutations optimistes en attente de synchronisation.
 * Le snapshot est un **nombre** (jamais un tableau) : pas de boucle de rendu
 * avec `useSyncExternalStore` (règle Zustand/external store du dépôt).
 */
export function usePendingSyncCount(): number {
  return useSyncExternalStore(
    subscribePendingSyncs,
    () => getPendingSyncs().length,
    () => 0
  );
}
