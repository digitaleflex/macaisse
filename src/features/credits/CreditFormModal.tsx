import { useState, type FormEvent } from 'react';
import type { CreditInput } from '@/store/useCreditsStore';
import { t } from '@/content';
import { addDays, toIsoDate } from '@/domain/dates';
import { DEFAULT_CREDIT_TERM_DAYS, initialsFrom } from '@/domain/credits';
import { validateCreditForm, type ValidationCode } from '@/domain/validation';
import { Button, FormError, Input, Modal } from '@/ui';

/** Enregistrement d'un nouveau crédit client (création déléguée au parent). */
export interface CreditFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: CreditInput) => void;
}

const DEFAULT_AMOUNT = 30000;

export function CreditFormModal({ open, onClose, onSubmit }: CreditFormModalProps) {
  const [clientName, setClientName] = useState('');
  const [phone, setPhone] = useState<string>(t.credits.form.defaultPhonePrefix);
  const [place, setPlace] = useState('');
  const [amount, setAmount] = useState<number>(DEFAULT_AMOUNT);
  const [dueDate, setDueDate] = useState(() => toIsoDate(addDays(new Date(), DEFAULT_CREDIT_TERM_DAYS)));
  const [error, setError] = useState<ValidationCode | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = clientName.trim();
    const code = validateCreditForm({ clientName: name, amount, dueDate });
    if (code !== null) {
      setError(code);
      return;
    }
    setError(null);
    onSubmit({
      clientName: name,
      initials: initialsFrom(name),
      shopOrLocation: place.trim() || t.credits.form.defaultPlace,
      phone: phone.trim(),
      remainingAmount: Math.round(amount),
      totalInitial: Math.round(amount),
      dueDate,
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={t.credits.form.title} subtitle={t.credits.form.subtitle} icon="person_add" size="lg">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label={t.credits.form.name}
          name="credit-name"
          required
          icon="person"
          value={clientName}
          onChange={(event) => setClientName(event.target.value)}
          placeholder={t.credits.form.namePlaceholder}
        />
        <div className="grid sm:grid-cols-2 gap-3">
          <Input
            label={t.credits.form.phone}
            name="credit-phone"
            type="tel"
            icon="call"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder={t.credits.form.phonePlaceholder}
          />
          <Input
            label={t.credits.form.place}
            name="credit-place"
            icon="storefront"
            value={place}
            onChange={(event) => setPlace(event.target.value)}
            placeholder={t.credits.form.placePlaceholder}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label={t.credits.form.amount}
            name="credit-amount"
            required
            type="number"
            inputMode="numeric"
            suffix={t.common.currency}
            min={0}
            step={1}
            value={amount}
            onChange={(event) => {
              setAmount(Number(event.target.value));
              setError(null);
            }}
          />
          <Input
            label={t.credits.form.dueDate}
            name="credit-due"
            type="date"
            required
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
          />
        </div>
        <FormError message={error !== null ? t.validation[error] : null} />
        <Button type="submit" variant="primary" size="lg" fullWidth icon="check">
          {t.credits.form.submit}
        </Button>
      </form>
    </Modal>
  );
}
