import type { StockActor } from '@/domain/stockMovements';
import { personDisplayName } from '@/domain/users';
import { useSessionStore } from './useSessionStore';

/** Utilisateur connecté, tel qu'il est consigné dans le journal de stock. */
export function currentActor(): StockActor {
  const user = useSessionStore.getState().session?.user;
  return user ? { id: user.id, name: personDisplayName(user.firstName, user.lastName) } : { name: 'Utilisateur' };
}
