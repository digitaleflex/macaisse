// Règles de validation des formulaires : fonctions pures, sans React ni texte.
// Le domaine renvoie un CODE ; l'interface le traduit via `content/fr.ts`.

/** Motif de refus d'une saisie (traduit côté UI). */
export type ValidationCode =
  | 'required'
  | 'amount_positive'
  | 'amount_not_negative'
  | 'quantity_positive'
  | 'quantity_negative'
  | 'not_integer';

export interface ProductFormValues {
  name: string;
  price: number;
  costPrice: number;
  stock: number;
  minStockAlert: number;
}

export interface CreditFormValues {
  clientName: string;
  amount: number;
  dueDate: string;
}

export interface ExpenseFormValues {
  title: string;
  amount: number;
}

/** Montant monétaire : fini, entier, strictement positif. */
function checkAmount(value: number): ValidationCode | null {
  if (!Number.isFinite(value) || value <= 0) return 'amount_positive';
  if (!Number.isInteger(value)) return 'not_integer';
  return null;
}

/** Montant facultatif (prix d'achat) : fini, entier, jamais négatif. */
function checkOptionalAmount(value: number): ValidationCode | null {
  if (!Number.isFinite(value) || value < 0) return 'amount_not_negative';
  if (!Number.isInteger(value)) return 'not_integer';
  return null;
}

/** Quantité de stock : fini, entier, jamais négatif. */
function checkStock(value: number): ValidationCode | null {
  if (!Number.isFinite(value) || value < 0) return 'quantity_negative';
  if (!Number.isInteger(value)) return 'not_integer';
  return null;
}

/** Formulaire produit (création / édition). */
export function validateProductForm(input: ProductFormValues): ValidationCode | null {
  if (input.name.trim().length === 0) return 'required';
  return (
    checkAmount(input.price) ??
    checkOptionalAmount(input.costPrice) ??
    checkStock(input.stock) ??
    checkStock(input.minStockAlert)
  );
}

/** Formulaire de crédit client. */
export function validateCreditForm(input: CreditFormValues): ValidationCode | null {
  if (input.clientName.trim().length === 0) return 'required';
  const amount = checkAmount(input.amount);
  if (amount !== null) return amount;
  if (input.dueDate.trim().length === 0) return 'required';
  return null;
}

/** Formulaire de dépense. */
export function validateExpenseForm(input: ExpenseFormValues): ValidationCode | null {
  if (input.title.trim().length === 0) return 'required';
  return checkAmount(input.amount);
}

/** Quantité de réapprovisionnement. */
export function validateRestock(quantity: number): ValidationCode | null {
  if (!Number.isFinite(quantity) || quantity <= 0) return 'quantity_positive';
  if (!Number.isInteger(quantity)) return 'not_integer';
  return null;
}
