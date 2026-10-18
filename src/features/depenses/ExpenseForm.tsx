import { useState, type FormEvent } from 'react';
import { Button, Input, Select } from '@/ui';
import type { SelectOption } from '@/ui';
import { parseMontant } from '@/domain/money';

/** Catégories proposées à la saisie d'une sortie de caisse. */
export type ExpenseCategory = 'Achat Stock' | 'Transport' | 'Factures' | 'Salaires' | 'Divers';

export interface ExpenseFormValues {
  title: string;
  amount: number;
  category: ExpenseCategory;
  hasReceipt: boolean;
}

export interface ExpenseFormProps {
  onSubmit: (values: ExpenseFormValues) => void;
  onCancel: () => void;
}

const CATEGORY_OPTIONS: SelectOption[] = [
  { value: 'Achat Stock', label: 'Achat Stock' },
  { value: 'Transport', label: 'Transport' },
  { value: 'Factures', label: 'Factures' },
  { value: 'Salaires', label: 'Salaires' },
  { value: 'Divers', label: 'Divers' },
];

const DEFAULT_AMOUNT = 5000;

function isExpenseCategory(value: string): value is ExpenseCategory {
  return CATEGORY_OPTIONS.some((option) => option.value === value);
}

/** Formulaire d'ajout d'une dépense (contrôlé localement, remonte des valeurs typées). */
export function ExpenseForm({ onSubmit, onCancel }: ExpenseFormProps) {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState<number>(DEFAULT_AMOUNT);
  const [category, setCategory] = useState<ExpenseCategory>('Divers');
  const [hasReceipt, setHasReceipt] = useState(true);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (trimmedTitle.length === 0 || amount <= 0) return;
    onSubmit({ title: trimmedTitle, amount, category, hasReceipt });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white p-3.5 rounded-xl border border-slate-300 shadow-sm flex flex-col gap-2.5"
    >
      <div className="flex items-center justify-between pb-1 border-b border-slate-100">
        <span className="text-xs font-bold text-slate-900">Nouvelle sortie de caisse</span>
        <button
          type="button"
          onClick={onCancel}
          className="text-slate-500 text-xs hover:text-slate-900 cursor-pointer"
        >
          Annuler
        </button>
      </div>

      <Input
        label="Motif de la dépense"
        name="expense-title"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Ex: Taxi livraison gros, Facture Eau..."
        required
      />

      <div className="grid grid-cols-2 gap-2">
        <Input
          label="Montant (FCFA)"
          name="expense-amount"
          type="number"
          value={amount}
          onChange={(event) => setAmount(parseMontant(event.target.value))}
          required
        />
        <Select
          label="Catégorie"
          name="expense-category"
          value={category}
          onChange={(event) => {
            if (isExpenseCategory(event.target.value)) setCategory(event.target.value);
          }}
          options={CATEGORY_OPTIONS}
        />
      </div>

      <div className="flex items-center justify-between pt-1">
        <label
          htmlFor="expense-receipt"
          className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer"
        >
          <input
            id="expense-receipt"
            type="checkbox"
            checked={hasReceipt}
            onChange={(event) => setHasReceipt(event.target.checked)}
            className="accent-slate-900"
          />
          <span>Justificatif / Reçu joint</span>
        </label>

        <Button type="submit" variant="secondary" size="sm">
          Enregistrer
        </Button>
      </div>
    </form>
  );
}
