import { useEffect, useMemo, useState } from 'react';
import type { StockMovement } from '@/types';
import { filterMovements } from '@/domain/stockMovements';
import { api, errorText } from '@/services';
import { useStockStore } from '@/store/useStockStore';

/** Nombre maximal de mouvements relus du serveur à l'ouverture du journal. */
export const REMOTE_MOVEMENT_LIMIT = 200;

export interface StockMovementsResult {
  /** Du plus récent au plus ancien ; `null` pendant le chargement. */
  movements: StockMovement[] | null;
  loading: boolean;
  error: string | null;
}

/**
 * Mouvements de stock à afficher. En mode `mock`, le journal local fait foi ; en mode `http`
 * c'est le serveur qui tient le journal complet : on le relit à chaque ouverture (le composant
 * qui affiche le journal est monté seulement quand il est ouvert, donc l'état repart de zéro).
 * `productId` limite le journal à un produit.
 */
export function useStockMovements(open: boolean, productId?: string): StockMovementsResult {
  const local = useStockStore((state) => state.movements);
  const remoteMode = api.mode === 'http';
  const requestKey = open && remoteMode ? (productId ?? '*') : null;
  // Résultat tagué par sa requête : un résultat d'un autre produit n'est jamais affiché.
  const [result, setResult] = useState<{ key: string; list?: StockMovement[]; error?: string } | null>(null);

  useEffect(() => {
    if (requestKey === null) return;
    let cancelled = false;
    api.stock
      .movements({ productId, limit: REMOTE_MOVEMENT_LIMIT })
      .then((list) => {
        if (!cancelled) setResult({ key: requestKey, list });
      })
      .catch((failure: unknown) => {
        if (!cancelled) setResult({ key: requestKey, error: errorText(failure) });
      });
    return () => {
      cancelled = true;
    };
  }, [requestKey, productId]);

  const localList = useMemo(() => filterMovements(local, { productId }), [local, productId]);
  if (!remoteMode) return { movements: localList, loading: false, error: null };
  const current = result !== null && result.key === requestKey ? result : null;
  return {
    movements: current?.list ?? null,
    loading: current === null,
    error: current?.error ?? null,
  };
}
