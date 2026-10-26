import { useEffect, useState } from 'react';
import { t } from '@/content';
import { isDemoMode } from '@/config/env';
import { validatePassword } from '@/domain/password';
import { describeError } from '@/services';
import { requestPasswordReset, resetPassword } from '@/store/auth';
import { useUiStore } from '@/store/useUiStore';
import { Button, Icon, Input, Modal } from '@/ui';
import { PASSWORD_ISSUE_MESSAGE } from './passwordMessage';

/**
 * Mot de passe oublié (D4) : **code à usage unique**, jamais de question secrète
 * et aucun lien long-vivant (voir D5). Le code vit 10 min ; un e-mail inconnu
 * reçoit exactement la même réponse qu'un e-mail connu (RG-A09).
 */
export interface ForgotPasswordModalProps {
  open: boolean;
  initialEmail: string;
  onClose: () => void;
}

const RESEND_COOLDOWN_S = 30;

export function ForgotPasswordModal({ open, initialEmail, onClose }: ForgotPasswordModalProps) {
  const showToast = useUiStore((state) => state.showToast);
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const send = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError(t.auth.errors.emailInvalid);
      return;
    }
    setPending(true);
    setError(null);
    try {
      await requestPasswordReset(email.trim());
      setStep('reset');
      setCooldown(RESEND_COOLDOWN_S);
      showToast(t.auth.forgot.sentTo(email.trim()), 'info');
    } catch (caught) {
      setError(describeError(caught).message);
    } finally {
      setPending(false);
    }
  };

  const submit = async () => {
    if (code.trim().length !== 6) {
      setError(t.auth.forgot.code);
      return;
    }
    const [issue] = validatePassword(password, { email });
    if (issue !== undefined) {
      setError(PASSWORD_ISSUE_MESSAGE[issue]);
      return;
    }
    setPending(true);
    setError(null);
    try {
      await resetPassword({ email: email.trim(), code: code.trim(), password });
      showToast(t.auth.forgot.done, 'success');
      onClose();
    } catch (caught) {
      setError(describeError(caught).message);
    } finally {
      setPending(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={t.auth.forgot.title} icon="lock_reset" size="sm">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-slate-500">{t.auth.forgot.subtitle}</p>

        {error && (
          <div role="alert" className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 text-sm text-rose-700">
            <Icon name="error" size={18} />
            {error}
          </div>
        )}

        {step === 'request' ? (
          <>
            <Input
              label={t.auth.forgot.email}
              name="reset-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              autoFocus
              required
              icon="mail"
              onChange={(event) => {
                setEmail(event.target.value);
                setError(null);
              }}
              placeholder={t.auth.emailPlaceholder}
            />
            <Button type="button" size="lg" fullWidth loading={pending} icon="sms" onClick={() => void send()}>
              {t.auth.forgot.send}
            </Button>
          </>
        ) : (
          <>
            <Input
              label={t.auth.forgot.code}
              name="reset-code"
              value={code}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              autoFocus
              onChange={(event) => {
                setCode(event.target.value.replace(/\D/g, '').slice(0, 6));
                setError(null);
              }}
              hint={isDemoMode ? t.auth.forgot.demoHint : undefined}
            />
            <Input
              label={t.auth.forgot.newPassword}
              name="reset-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              required
              icon="lock"
              hint={t.auth.passwordHint}
              action={
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? t.auth.hidePassword : t.auth.showPassword}
                  className="size-9 rounded-lg flex items-center justify-center text-slate-500 hover:text-ink-900 hover:bg-slate-100 cursor-pointer"
                >
                  <Icon name={showPassword ? 'visibility_off' : 'visibility'} size={20} />
                </button>
              }
              onChange={(event) => {
                setPassword(event.target.value);
                setError(null);
              }}
            />
            <Button type="button" size="lg" fullWidth loading={pending} icon="check" onClick={() => void submit()}>
              {t.auth.forgot.submit}
            </Button>
            <button
              type="button"
              disabled={pending || cooldown > 0}
              onClick={() => void send()}
              className="text-xs font-semibold text-slate-500 hover:text-ink-900 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              {cooldown > 0 ? t.auth.phoneResendIn(cooldown) : t.auth.phoneResend}
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}
