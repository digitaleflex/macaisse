/**
 * CreditFormModal — enregistrement d'un nouveau crédit client.
 *
 * Formulaire présentationnel construit avec les primitives `Modal`, `Input` et
 * `Button` (en-tête clair). La création (`addCredit`) est déclenchée par le
 * parent via `onSubmit`.
 */

import { useState, type ChangeEvent, type FormEvent } from 'react';
import type { CreditInput } from '@/store/useCreditsStore';
import { Modal } from '@/ui/Modal';
import { Input } from '@/ui/Input';
import { Button } from '@/ui/Button';

export interface CreditFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: CreditInput) => void;
}

const DEFAULT_AMOUNT = 30000;
const DEFAULT_DUE_DATE = '30 Novembre 2024';
const DEFAULT_PHONE = '+221 ';
const DEFAULT_SHOP = 'Client comptoir';
const DEFAULT_PHONE_FALLBACK = '+221 77 000 00 00';

export function CreditFormModal({ open, onClose, onSubmit }: CreditFormModalProps) {
  const [clientName, setClientName] = useState('');
  const [phone, setPhone] = useState(DEFAULT_PHONE);
  const [shop, setShop] = useState('');
  const [amount, setAmount] = useState<number>(DEFAULT_AMOUNT);
  const [dueDate, setDueDate] = useState(DEFAULT_DUE_DATE);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = clientName.trim();
    if (name.length === 0 || amount <= 0) return;

    const initials =
      name
        .split(' ')
        .map((word) => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'CL';

    onSubmit({
      clientName: name,
      initials,
      shopOrLocation: shop.trim() || DEFAULT_SHOP,
      phone: phone.trim() || DEFAULT_PHONE_FALLBACK,
      remainingAmount: amount,
      totalInitial: amount,
      dueDate,
    });

    setClientName('');
    setAmount(DEFAULT_AMOUNT);
  };

  return (
    <Modal open={open} onClose={onClose} title="Enregistrer un nouveau crédit client">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Input
          label="Nom complet du client"
          required
          value={clientName}
          onChange={(event: ChangeEvent<HTMLInputElement>) => setClientName(event.target.value)}
          placeholder="Ex: M. Ba Ousmane, Mme Ndiaye..."
        />

        <div className="grid grid-cols-2 gap-2">
          <Input
            label="Numéro de téléphone"
            value={phone}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setPhone(event.target.value)}
            placeholder="+221 77 ..."
          />
          <Input
            label="Commerce / Repère"
            value={shop}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setShop(event.target.value)}
            placeholder="Boutique en face..."
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Input
            label="Montant de la créance (FCFA)"
            required
            type="number"
            value={amount}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setAmount(Number(event.target.value))
            }
          />
          <Input
            label="Date d'échéance convenue"
            value={dueDate}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setDueDate(event.target.value)}
            placeholder="Ex: 30 Novembre 2024"
          />
        </div>

        <div className="mt-2">
          <Button variant="secondary" size="md" fullWidth type="submit">
            <span className="material-symbols-outlined text-[18px] text-emerald-400">check</span>
            <span>Valider le carnet de crédit</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
}
