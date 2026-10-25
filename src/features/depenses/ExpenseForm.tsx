import { useState, type FormEvent } from 'react';
import { t } from '@/content';
import { EXPENSE_CATEGORIES, type ExpenseCategory } from '@/config/reference';
import { parseMontant } from '@/domain/money';
import { validateExpenseForm, type ValidationCode } from '@/domain/validation';
import { Button, FormError, Input, Select, Switch } from '@/ui';

export type { ExpenseCategory };

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

const CATEGORY_OPTIONS = EXPENSE_CATEGORIES.map((category) => ({ value: category, label: category }));
const DEFAULT_AMOUNT = 5000;

function isExpenseCategory(value: string): value is ExpenseCategory {
  return (EXPENSE_CATEGORIES as readonly string[]).includes(value);
}

/** Formulaire d'ajout d'une dépense (état local, remonte des valeurs typées). */
export function ExpenseForm({ onSubmit, onCancel }: ExpenseFormProps) {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState<number>(DEFAULT_AMOUNT);
  const [category, setCategory] = useState<ExpenseCategory>('Divers');
  const [hasReceipt, setHasReceipt] = useState(true);
  const [error, setError] = useState<ValidationCode | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = title.trim();
    const code = validateExpenseForm({ title: trimmed, amount });
    if (code !== null) {
      setError(code);
      return;
    }
    setError(null);
    onSubmit({ title: trimmed, amount, category, hasReceipt });
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-line bg-slate-50/70 p-4 flex flex-col gap-3 animate-fade-in">
      <div className="text-sm font-semibold text-ink-900">{t.expenses.form.title}</div>
      <Input
        label={t.expenses.form.label}
        name="expense-title"
        required
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder={t.expenses.form.labelPlaceholder}
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          label={t.expenses.form.amount}
          name="expense-amount"
          type="number"
          inputMode="numeric"
          required
          suffix={t.common.currency}
          value={amount}
          min={0}
          step={1}
          onChange={(event) => {
            setAmount(parseMontant(event.target.value));
            setError(null);
          }}
        />
        <Select
          label={t.expenses.form.category}
          name="expense-category"
          value={category}
          onChange={(event) => {
            if (isExpenseCategory(event.target.value)) setCategory(event.target.value);
          }}
          options={CATEGORY_OPTIONS}
        />
      </div>
      <div className="flex items-center justify-between gap-3 pt-1">
        <label className="flex items-center gap-2.5 text-sm text-slate-600">
          <Switch checked={hasReceipt} onChange={setHasReceipt} label={t.expenses.form.receipt} />
          {t.expenses.form.receipt}
        </label>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            {t.common.cancel}
          </Button>
          <Button type="submit" variant="primary" size="sm" icon="check">
            {t.expenses.form.submit}
          </Button>
        </div>
      </div>
      <FormError message={error !== null ? t.validation[error] : null} />
    </form>
  );
}
