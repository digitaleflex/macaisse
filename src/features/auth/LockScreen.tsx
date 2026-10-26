import { useState } from 'react';
import { t } from '@/content';
import { logout } from '@/store/auth';
import { readEnrollment, useLockStore } from '@/store/lock';
import { useSessionStore } from '@/store/useSessionStore';
import { BrandMark, Button, Icon, Input } from '@/ui';

/**
 * Verrouillage local de la caisse (D6). Affiché par-dessus l'application quand
 * un appareil est enrôlé : le PIN est vérifié **localement**, donc l'écran
 * fonctionne hors réseau. « Changer d'utilisateur » passe par la déconnexion
 * complète (purge des données, RG-A13).
 */
export function LockScreen() {
  const session = useSessionStore((state) => state.session);
  const locked = useLockStore((state) => state.locked);
  const unlock = useLockStore((state) => state.unlock);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  const enrollment = readEnrollment();
  if (!locked || session === null || enrollment === null) return null;
  // L'enrôlement appartient à une autre organisation : il ne verrouille pas cet espace.
  if (enrollment.organizationId !== session.business.id) return null;

  const submit = () => {
    if (pin.length < 4) {
      setError(t.devices.errors.weak);
      return;
    }
    if (!unlock(pin)) {
      setError(t.devices.errors.invalid);
      setPin('');
      return;
    }
    setError(null);
    setPin('');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.devices.lockScreen.title}
      className="fixed inset-0 z-[75] flex items-center justify-center bg-canvas/95 backdrop-blur-sm p-5"
    >
      <div className="w-full max-w-sm bg-surface rounded-card border border-line shadow-overlay p-6 flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <BrandMark className="size-10" />
          <div className="min-w-0">
            <div className="font-display font-extrabold text-lg text-ink-900">{t.devices.lockScreen.title}</div>
            <div className="text-xs text-slate-500 truncate">
              {t.devices.lockScreen.subtitle(enrollment.memberName || session.business.name)}
            </div>
          </div>
        </div>

        {error && (
          <div role="alert" className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 text-sm text-rose-700">
            <Icon name="error" size={18} />
            {error}
          </div>
        )}

        <Input
          label={t.devices.pin}
          name="lock-pin"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={6}
          autoFocus
          value={pin}
          onChange={(event) => {
            setPin(event.target.value.replace(/\D/g, '').slice(0, 6));
            setError(null);
          }}
        />

        <Button type="button" size="lg" fullWidth icon="lock_open" onClick={submit}>
          {t.devices.lockScreen.unlock}
        </Button>
        <button
          type="button"
          onClick={() => void logout()}
          className="text-xs font-semibold text-slate-500 hover:text-ink-900 cursor-pointer"
        >
          {t.devices.lockScreen.switchUser}
        </button>
      </div>
    </div>
  );
}
