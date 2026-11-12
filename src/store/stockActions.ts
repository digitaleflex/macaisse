// Corrections de stock orchestrées entre les stores (produits + journal) et l'API.
// Elles vivent hors des stores pour éviter une dépendance circulaire : le store produits
// alimente déjà le journal, le journal ne connaît aucun autre store métier.
//
// Principe : on valide TOUT en local avant la moindre écriture ; en mode `http`, le serveur
// arbitre ensuite (pas d'application optimiste d'une écriture sensible) et un refus
// remonte à l'écran sans rien avoir modifié.

import type { StockAdjustmentInput, StockMovement } from '@/types';
import { t } from '@/content';
import { can } from '@/domain/permissions';
import {
  adjustProduct,
  applyInventory,
  countedProducts,
  toInventoryCounts,
} from '@/domain/stockMovements';
import { api } from '@/services';
import { currentActor } from './actor';
import { useProductsStore } from './useProductsStore';
import { useSessionStore } from './useSessionStore';
import { useStockStore } from './useStockStore';

function assertCanAdjust(): void {
  const role = useSessionStore.getState().session?.role;
  if (!role || !can(role, 'stock.adjust')) throw new Error(t.errors.insufficientRole);
}

/**
 * Corrige le stock d'un produit (écart d'inventaire ou casse) avec un motif obligatoire.
 * Rejette (exception française) un refus de règle ou une erreur serveur.
 */
export async function adjustStock(productId: string, input: StockAdjustmentInput): Promise<StockMovement> {
  assertCanAdjust();
  const products = useProductsStore.getState().products;
  const product = products.find((candidate) => candidate.id === productId);
  if (!product) throw new Error(`Produit introuvable (${productId}).`);

  const change = adjustProduct(product, input, currentActor());
  if (api.mode === 'http') await api.stock.adjust(productId, input);

  useProductsStore.getState().setProducts(
    products.map((candidate) => (candidate.id === productId ? change.product : candidate))
  );
  useStockStore.getState().record([change.movement]);
  return change.movement;
}

export interface InventoryOutcome {
  /** Produits comptés (avec ou sans écart). */
  counted: number;
  /** Mouvements créés : un par écart. */
  movements: StockMovement[];
}

/**
 * Applique un inventaire : un mouvement `adjustment` par écart, tout ou rien. Mémorise la
 * date et l'auteur du dernier inventaire, même s'il ne révèle aucun écart.
 */
export async function applyInventoryCount(
  counts: Readonly<Record<string, number | undefined>>,
  note?: string
): Promise<InventoryOutcome> {
  assertCanAdjust();
  const products = useProductsStore.getState().products;
  if (countedProducts(products, counts) === 0) throw new Error(t.stock.inventory.errors.nothingCounted);

  const stamp = new Date();
  const label = `Inventaire du ${stamp.toLocaleDateString('fr-FR')}`;
  const reason = note && note.trim() !== '' ? `${label} — ${note.trim()}` : label;
  const actor = currentActor();
  const result = applyInventory(products, counts, reason, actor, stamp);

  if (api.mode === 'http') {
    await api.stock.inventory({ counts: toInventoryCounts(products, counts), note });
  }

  useProductsStore.getState().setProducts(result.products);
  useStockStore.getState().record(result.movements);
  useStockStore.getState().setLastInventory({
    at: stamp.toISOString(),
    by: actor.name,
    counted: result.counted,
    variances: result.movements.length,
  });
  return { counted: result.counted, movements: result.movements };
}
