import { useState, type FormEvent } from 'react';
import type { CreditInput } from '@/store/useCreditsStore';
import { t } from '@/content';
import { addDays, toIsoDate } from '@/domain/dates';
import { Button, Input, Modal } from '@/ui';

/** Enregistrement d'un nouveau crédit client (création déléguée au parent). */
export interface CreditFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: CreditInput) => void;
}

const DEFAULT_AMOUNT = 30000;
const DEFAULT_TERM_DAYS = 30;

function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter((word) => word.length > 0 && !/^(m\.|mme|mlle)$/i.test(word))
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'CL'
  );
}

export function CreditFormModal({ open, onClose, onSubmit }: CreditFormModalProps) {
  const [clientName, setClientName] = useState('');
  const [phone, setPhone] = useState<string>(t.credits.form.defaultPhonePrefix);
  const [place, setPlace] = useState('');
  const [amount, setAmount] = useState<number>(DEFAULT_AMOUNT);
  const [dueDate, setDueDate] = useState(() => toIsoDate(addDays(new Date(), DEFAULT_TERM_DAYS)));

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = clientName.trim();
    if (name.length === 0 || amount <= 0) return;
    onSubmit({
      clientName: name,
      initials: initialsOf(name),
      shopOrLocation: place.trim() || t.credits.form.defaultPlace,
      phone: phone.trim(),
      remainingAmount: amount,
      totalInitial: amount,
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
            value={amount}
            onChange={(event) => setAmount(Number(event.target.value))}
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
        <Button type="submit" variant="primary" size="lg" fullWidth icon="check">
          {t.credits.form.submit}
        </Button>
      </form>
    </Modal>
  );
}
