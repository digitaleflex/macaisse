import { useEffect, useState } from 'react';
import { t } from '@/content';
import { isDemoMode } from '@/config/env';
import { parseDate } from '@/domain/dates';
import { isApiError } from '@/services';
import { requestEmailVerification, verifyEmail } from '@/store/auth';
import { useAuthStore } from '@/store/useAuthStore';
import { useUiStore } from '@/store/useUiStore';
import { Button, Icon, Input, Modal } from '@/ui';

/**
 * Rappel de vérification d'e-mail (RG-A27/RG-A28).
 *
 * Choix produit : la vérification ne bloque **jamais** la connexion ni la caisse.
 * Un commerçant peut vendre immédiatement ; seules les fonctions qui dépendent
 * réellement de l'e-mail (récupération de mot de passe, envoi de reçus) sont
 * réservées au compte vérifié. La date limite (72 h) est affichée : pas de
 * compte à rebours, donc aucun calcul d'horloge pendant le rendu.
 */

const RESEND_COOLDOWN_S = 30;

/** « 28 octobre à 18:40 » (heure locale) — pur, aucun appel à `Date.now()`. */
function formatDeadline(iso: string): string {
  const date = parseDate(iso);
  if (date === null) return iso;
  return date.toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function VerifyEmailBanner() {
  const user = useAuthStore((state) => state.user);
  const showToast = useUiStore((state) => state.showToast);
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Un compte créé par téléphone n'a pas d'e-mail : rien à vérifier.
  if (!user || user.emailVerified || user.email.trim().length === 0) return null;

  const deadline = user.emailVerificationDueAt;
  const message =
    deadline === null
      ? t.auth.verifyEmail.bannerExpired
      : t.auth.verifyEmail.bannerText(formatDeadline(deadline));

  async function send() {
    setPending(true);
    setError(null);
    try {
      await requestEmailVerification();
      setCooldown(RESEND_COOLDOWN_S);
      showToast(t.auth.verifyEmail.sentTo(user?.email ?? ''), 'info');
    } catch (caught) {
      setError(isApiError(caught) ? caught.message : t.auth.errors.generic);
    } finally {
      setPending(false);
    }
  }

  function openModal() {
    setOpen(true);
    setCode('');
    setError(null);
    if (cooldown === 0) void send();
  }

  async function submit() {
    if (code.trim().length !== 6) {
      setError(t.auth.verifyEmail.code);
      return;
    }
    setPending(true);
    setError(null);
    try {
      await verifyEmail(code.trim());
      showToast(t.auth.verifyEmail.verified, 'success');
      setOpen(false);
    } catch (caught) {
      setError(isApiError(caught) ? caught.message : t.auth.errors.generic);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <div
        role="status"
        className="mx-4 sm:mx-6 lg:mx-8 mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
      >
        <Icon name="mark_email_unread" size={20} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{t.auth.verifyEmail.bannerTitle}</p>
          <p className="text-xs opacity-90">{message}</p>
        </div>
        <Button type="button" size="sm" variant="secondary" icon="verified" onClick={openModal}>
          {t.auth.verifyEmail.bannerAction}
        </Button>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t.auth.verifyEmail.title}
        icon="mark_email_unread"
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-slate-500">{t.auth.verifyEmail.subtitle}</p>
          <Input
            label={t.auth.verifyEmail.code}
            name="email-verify-code"
            value={code}
            onChange={(event) => {
              setCode(event.target.value.replace(/\D/g, '').slice(0, 6));
              setError(null);
            }}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            autoFocus
            error={error ?? undefined}
            hint={isDemoMode ? t.auth.verifyEmail.demoHint : undefined}
          />
          <Button type="button" size="lg" fullWidth loading={pending} icon="verified" onClick={() => void submit()}>
            {t.auth.verifyEmail.submit}
          </Button>
          <button
            type="button"
            disabled={pending || cooldown > 0}
            onClick={() => void send()}
            className="text-xs font-semibold text-slate-500 hover:text-ink-900 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            {cooldown > 0 ? t.auth.verifyEmail.resendIn(cooldown) : t.auth.verifyEmail.resend}
          </button>
        </div>
      </Modal>
    </>
  );
}
