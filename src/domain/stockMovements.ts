// Journal de stock (EF-19, RG-05) : règles pures. Le stock d'un produit ne change que
// par un mouvement tracé — vente, annulation, réception, écart d'inventaire ou casse.
// Chaque fonction renvoie le produit mis à jour ET le mouvement correspondant, pour
// qu'aucun appelant ne puisse modifier l'un sans l'autre.

import type {
  CartLine,
  InventoryCount,
  Product,
  StockAdjustmentInput,
  StockMovement,
  StockMovementType,
} from '../types';
import { createId } from './ids';
import { computeStockStatus } from './stock';

/** Longueur minimale du motif d'un écart ou d'une casse, espaces retirés. */
export const MIN_STOCK_REASON_LENGTH = 3;

/** Auteur d'un mouvement. */
export interface StockActor {
  id?: string;
  name: string;
}

/** Refus d'une correction de stock (traduit par l'interface). */
export type StockAdjustmentIssue =
  | 'quantity_invalid'
  | 'no_variance'
  | 'loss_exceeds_stock'
  | 'reason_required';

export class StockAdjustmentError extends Error {
  constructor(
    readonly issue: StockAdjustmentIssue,
    message: string
  ) {
    super(message);
    this.name = 'StockAdjustmentError';
  }
}

const MESSAGES: Record<StockAdjustmentIssue, string> = {
  quantity_invalid: 'La quantité doit être un nombre entier positif ou nul.',
  no_variance: 'Aucun écart : la quantité comptée est identique au stock.',
  loss_exceeds_stock: 'La quantité perdue dépasse le stock disponible.',
  reason_required: `Le motif est obligatoire (${MIN_STOCK_REASON_LENGTH} caractères minimum).`,
};

function refuse(issue: StockAdjustmentIssue): never {
  throw new StockAdjustmentError(issue, MESSAGES[issue]);
}

/** Motif normalisé, ou `null` s'il est trop court. */
export function normalizeStockReason(reason: string | undefined): string | null {
  const trimmed = (reason ?? '').trim();
  return trimmed.length >= MIN_STOCK_REASON_LENGTH ? trimmed : null;
}

/** Produit dont le stock vaut `stock` (statut dérivé recalculé). */
function withStock(product: Product, stock: number): Product {
  return { ...product, stock, status: computeStockStatus(stock, product.minStockAlert) };
}

export interface CreateMovementInput {
  type: StockMovementType;
  /** Produit AVANT le mouvement. */
  product: Pick<Product, 'id' | 'name' | 'stock'>;
  /** Variation signée, non nulle. */
  delta: number;
  reason?: string;
  saleId?: string;
  saleNumber?: string;
  by: StockActor;
  date?: Date;
}

/** Construit le mouvement : `quantityAfter` est calculé, jamais saisi. */
export function createMovement(input: CreateMovementInput): StockMovement {
  const { type, product, delta, reason, saleId, saleNumber, by, date = new Date() } = input;
  if (!Number.isInteger(delta) || delta === 0) {
    throw new Error('Un mouvement de stock porte une variation entière non nulle.');
  }
  const movement: StockMovement = {
    id: createId('movement'),
    type,
    productId: product.id,
    productName: product.name,
    quantity: delta,
    quantityAfter: product.stock + delta,
    userName: by.name,
    createdAt: date.toISOString(),
  };
  if (reason !== undefined && reason.trim() !== '') movement.reason = reason.trim();
  if (saleId !== undefined) movement.saleId = saleId;
  if (saleNumber !== undefined) movement.saleNumber = saleNumber;
  if (by.id !== undefined) movement.userId = by.id;
  return movement;
}

export interface StockChange {
  product: Product;
  movement: StockMovement;
}

/**
 * Applique une correction manuelle (pur). Refuse : quantité invalide, absence d'écart,
 * casse supérieure au stock (jamais de stock négatif), motif absent.
 */
export function adjustProduct(
  product: Product,
  input: StockAdjustmentInput,
  by: StockActor,
  date: Date = new Date()
): StockChange {
  const { kind, quantity } = input;
  if (!Number.isInteger(quantity) || quantity < 0 || (kind === 'loss' && quantity === 0)) {
    refuse('quantity_invalid');
  }
  const reason = normalizeStockReason(input.reason);
  if (reason === null) refuse('reason_required');

  let delta: number;
  if (kind === 'count') {
    delta = quantity - product.stock;
    if (delta === 0) refuse('no_variance');
  } else {
    if (quantity > product.stock) refuse('loss_exceeds_stock');
    delta = -quantity;
  }
  const movement = createMovement({
    type: kind === 'count' ? 'adjustment' : 'loss',
    product,
    delta,
    reason,
    by,
    date,
  });
  return { product: withStock(product, movement.quantityAfter), movement };
}

/** Réception de marchandise : entrée en stock (réapprovisionnement). */
export function receiveStock(
  product: Product,
  quantity: number,
  by: StockActor,
  reason?: string,
  date: Date = new Date()
): StockChange {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error('La quantité à réapprovisionner doit être supérieure à zéro.');
  }
  if (!Number.isInteger(quantity)) {
    throw new Error('La quantité à réapprovisionner doit être un nombre entier.');
  }
  if (product.deactivatedAt !== undefined) {
    throw new Error(`« ${product.name} » est désactivé : réactivez-le avant de le réapprovisionner.`);
  }
  const movement = createMovement({ type: 'purchase', product, delta: quantity, reason, by, date });
  return { product: withStock(product, movement.quantityAfter), movement };
}

// ---------------------------------------------------------------------------
// Ventes et annulations
// ---------------------------------------------------------------------------

export interface SaleMovementContext {
  saleId: string;
  saleNumber: string;
  reason?: string;
  by: StockActor;
  date?: Date;
}

/**
 * Mouvements d'une vente (`sale`, sortie) ou de son annulation (`return`, retour en stock),
 * un par produit (les lignes d'un même produit sont fusionnées). `products` est l'état AVANT
 * le mouvement ; un produit disparu du catalogue est ignoré.
 */
export function movementsForLines(
  type: 'sale' | 'return',
  products: readonly Pick<Product, 'id' | 'name' | 'stock'>[],
  lines: readonly CartLine[],
  context: SaleMovementContext
): StockMovement[] {
  const quantities = new Map<string, number>();
  for (const line of lines) quantities.set(line.productId, (quantities.get(line.productId) ?? 0) + line.quantity);
  const movements: StockMovement[] = [];
  for (const [productId, quantity] of quantities) {
    const product = products.find((candidate) => candidate.id === productId);
    if (!product || quantity <= 0) continue;
    movements.push(
      createMovement({
        type,
        product,
        delta: type === 'sale' ? -quantity : quantity,
        reason: context.reason,
        saleId: context.saleId,
        saleNumber: context.saleNumber,
        by: context.by,
        date: context.date,
      })
    );
  }
  return movements;
}

// ---------------------------------------------------------------------------
// Inventaire : comptage de plusieurs produits d'un coup
// ---------------------------------------------------------------------------

export interface InventoryVariance {
  product: Product;
  counted: number;
  /** Compté − théorique : négatif = manque, positif = surplus. */
  delta: number;
}

/**
 * Écarts d'un inventaire. Un produit absent de `counts` (ou dont la valeur n'est pas un
 * entier ≥ 0) est considéré non vérifié : il n'est ni compté ni corrigé.
 */
export function inventoryVariances(
  products: readonly Product[],
  counts: Readonly<Record<string, number | undefined>>
): InventoryVariance[] {
  const variances: InventoryVariance[] = [];
  for (const product of products) {
    const counted = counts[product.id];
    if (counted === undefined || !Number.isInteger(counted) || counted < 0) continue;
    if (counted !== product.stock) variances.push({ product, counted, delta: counted - product.stock });
  }
  return variances;
}

/** Nombre de produits réellement comptés (valeur entière ≥ 0). */
export function countedProducts(
  products: readonly Product[],
  counts: Readonly<Record<string, number | undefined>>
): number {
  return products.filter((product) => {
    const counted = counts[product.id];
    return counted !== undefined && Number.isInteger(counted) && counted >= 0;
  }).length;
}

/** Valeur, au prix d'achat, des écarts : négatif = perte, positif = surplus. */
export function inventoryImpact(variances: readonly InventoryVariance[]): number {
  return variances.reduce((sum, item) => sum + item.delta * item.product.costPrice, 0);
}

export interface InventoryResult {
  products: Product[];
  movements: StockMovement[];
  /** Produits comptés, écarts ou non. */
  counted: number;
}

/**
 * Applique un inventaire (pur) : chaque écart devient un mouvement `adjustment` portant
 * `reason`. Les produits conformes ne génèrent aucun mouvement.
 */
export function applyInventory(
  products: readonly Product[],
  counts: Readonly<Record<string, number | undefined>>,
  reason: string,
  by: StockActor,
  date: Date = new Date()
): InventoryResult {
  const variances = inventoryVariances(products, counts);
  const byId = new Map(variances.map((item) => [item.product.id, item]));
  const movements: StockMovement[] = [];
  const updated = products.map((product) => {
    const variance = byId.get(product.id);
    if (!variance) return product;
    const change = adjustProduct(product, { kind: 'count', quantity: variance.counted, reason }, by, date);
    movements.push(change.movement);
    return change.product;
  });
  return { products: updated, movements, counted: countedProducts(products, counts) };
}

/** Comptages au format d'API, limités aux produits réellement comptés. */
export function toInventoryCounts(
  products: readonly Product[],
  counts: Readonly<Record<string, number | undefined>>
): InventoryCount[] {
  return products.flatMap((product) => {
    const counted = counts[product.id];
    return counted !== undefined && Number.isInteger(counted) && counted >= 0
      ? [{ productId: product.id, counted }]
      : [];
  });
}

// ---------------------------------------------------------------------------
// Lecture du journal
// ---------------------------------------------------------------------------

export interface MovementFilter {
  productId?: string;
  type?: StockMovementType;
}

/** Mouvements filtrés, du plus récent au plus ancien (à égalité, l'ordre d'origine est conservé). */
export function filterMovements(
  movements: readonly StockMovement[],
  filter: MovementFilter = {}
): StockMovement[] {
  return movements
    .filter(
      (movement) =>
        (filter.productId === undefined || movement.productId === filter.productId) &&
        (filter.type === undefined || movement.type === filter.type)
    )
    .map((movement, index) => ({ movement, index }))
    .sort((a, b) =>
      a.movement.createdAt < b.movement.createdAt
        ? 1
        : a.movement.createdAt > b.movement.createdAt
          ? -1
          : a.index - b.index
    )
    .map((entry) => entry.movement);
}

/** Vrai pour un mouvement qui augmente le stock. */
export function isEntry(movement: Pick<StockMovement, 'quantity'>): boolean {
  return movement.quantity > 0;
}
