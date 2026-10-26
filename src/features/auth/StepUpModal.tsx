import { useState } from 'react';
import { t } from '@/content';
import { describeError } from '@/services';
import { stepUp } from '@/store/auth';
import { useStepUpStore } from '@/store/stepUp';
import { Button, Icon, Input, Modal } from '@/ui';

/**
 * Modale de réauthentification (D9). Elle ne déconnecte pas : elle confirme une
 * identité pour une action sensible (enrôler un appareil, changer un rôle…).
 * L'action d'origine est rejouée par `withStepUp()` une fois la confirmation
 * obtenue.
 */
export function StepUpModal() {
  const open = useStepUpStore((state) => state.open);
  const resolve = useStepUpStore((state) => state.resolve);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async () => {
    if (password.length === 0) {
      setError(t.auth.errors.required);
      return;
    }
    setPending(true);
    setError(null);
    try {
      await stepUp(password);
      setPassword('');
      resolve(true);
    } catch (caught) {
      setError(describeError(caught).message);
    } finally {
      setPending(false);
    }
  };

  const cancel = () => {
    setPassword('');
    setError(null);
    resolve(false);
  };

  return (
    <Modal open={open} onClose={cancel} title={t.stepUp.title} icon="verified_user" size="sm">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-slate-500">{t.stepUp.subtitle}</p>
        {error && (
          <div role="alert" className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 text-sm text-rose-700">
            <Icon name="error" size={18} />
            {error}
          </div>
        )}
        <Input
          label={t.stepUp.password}
          name="step-up-password"
          type="password"
          autoComplete="current-password"
          autoFocus
          value={password}
          error={error ?? undefined}
          onChange={(event) => {
            setPassword(event.target.value);
            setError(null);
          }}
        />
        <div className="flex gap-2">
          <Button variant="ghost" size="lg" onClick={cancel}>
            {t.stepUp.cancel}
          </Button>
          <Button size="lg" fullWidth loading={pending} icon="lock_open" onClick={() => void submit()}>
            {t.stepUp.submit}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
