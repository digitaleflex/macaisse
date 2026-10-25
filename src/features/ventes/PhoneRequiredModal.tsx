import { useState } from 'react';
import { t } from '@/content';
import { isApiError } from '@/services';
import { completeOnboarding } from '@/store/onboarding';
import { useCurrentSession } from '@/store/useSessionStore';
import { useUiStore } from '@/store/useUiStore';
import { Button, Input, Modal } from '@/ui';

/**
 * RG-A03 — un ticket ne peut pas être imprimé sans contact téléphonique.
 *
 * On ne bloque pas la caisse : on demande le numéro **au moment d'encaisser**,
 * une seule fois, puis on reprend le parcours normal. Le numéro est enregistré
 * sur le commerce (`POST /orgs/:orgId/onboarding`), donc il apparaît sur le
 * reçu et dans les exports.
 */
export interface PhoneRequiredModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function PhoneRequiredModal({ open, onClose, onSaved }: PhoneRequiredModalProps) {
  const { business, user } = useCurrentSession();
  const showToast = useUiStore((state) => state.showToast);
  const [phone, setPhone] = useState(business.phone || user.phone);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (phone.trim().length < 6) {
      setError(t.pos.phoneRequired.blocked);
      return;
    }
    setPending(true);
    setError(null);
    try {
      await completeOnboarding({
        name: business.name,
        city: business.city,
        phone: phone.trim(),
        activity: business.activity,
      });
      showToast(t.pos.phoneRequired.saved, 'success');
      onSaved();
    } catch (caught) {
      setError(isApiError(caught) ? caught.message : t.auth.errors.generic);
    } finally {
      setPending(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={t.pos.phoneRequired.title} icon="phone" size="sm">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-slate-500">{t.pos.phoneRequired.text}</p>
        <Input
          label={t.pos.phoneRequired.label}
          name="sale-contact-phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          autoFocus
          error={error ?? undefined}
          placeholder={t.auth.phonePlaceholder}
          onChange={(event) => {
            setPhone(event.target.value);
            setError(null);
          }}
        />
        <div className="flex gap-2">
          <Button type="button" variant="ghost" size="lg" onClick={onClose}>
            {t.pos.phoneRequired.cancel}
          </Button>
          <Button type="button" size="lg" fullWidth loading={pending} icon="check" onClick={() => void save()}>
            {t.pos.phoneRequired.save}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
