import { useState } from 'react';
import { t } from '@/content';
import { describeError } from '@/services';
import { deleteAccount } from '@/store/auth';
import { useUiStore } from '@/store/useUiStore';
import { Button, Icon, Input, Modal } from '@/ui';

/**
 * Suppression de compte (RG-A21). Deux verrous : saisie du mot de passe et du
 * mot-clé `SUPPRIMER`. La suppression est immédiate pour les accès ; les pièces
 * comptables sont anonymisées (obligation légale), ce que l'écran explique.
 */
export function DeleteAccountModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const showToast = useUiStore((state) => state.showToast);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (confirmation.trim() !== 'SUPPRIMER') {
      setError(t.auth.errors.confirmationMismatch);
      return;
    }
    setPending(true);
    setError(null);
    try {
      await deleteAccount({ password, confirmation: confirmation.trim() });
      showToast(t.accountDeletion.done, 'success');
    } catch (caught) {
      setError(describeError(caught).message);
    } finally {
      setPending(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={t.accountDeletion.title} icon="delete_forever" size="sm">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-slate-600">{t.accountDeletion.subtitle}</p>
        {error && (
          <div role="alert" className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 text-sm text-rose-700">
            <Icon name="error" size={18} />
            {error}
          </div>
        )}
        <Input
          label={t.accountDeletion.password}
          name="delete-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            setError(null);
          }}
        />
        <Input
          label={t.accountDeletion.confirmLabel}
          name="delete-confirm"
          value={confirmation}
          onChange={(event) => {
            setConfirmation(event.target.value);
            setError(null);
          }}
        />
        <div className="flex gap-2">
          <Button variant="ghost" size="lg" onClick={onClose}>
            {t.accountDeletion.cancel}
          </Button>
          <Button variant="danger" size="lg" fullWidth loading={pending} icon="delete_forever" onClick={() => void submit()}>
            {t.accountDeletion.confirm}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
