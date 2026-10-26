import { useEffect } from 'react';
import { readEnrollment, useLockStore } from '@/store/lock';

/** Verrouillage d'inactivité d'un appareil enrôlé (RG-A14). */
const INACTIVITY_MS = 15 * 60 * 1000;

/**
 * Verrouille la caisse après 15 min sans interaction — pertinent uniquement sur
 * un appareil enrôlé (un poste partagé). Le minuteur est réarmé à chaque
 * pointerdown / keydown et au retour d'onglet.
 */
export function useInactivityLock(enabled: boolean): void {
  const lock = useLockStore((state) => state.lock);

  useEffect(() => {
    if (!enabled || readEnrollment() === null) return;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const arm = () => {
      if (timer !== undefined) clearTimeout(timer);
      timer = setTimeout(() => lock(), INACTIVITY_MS);
    };

    window.addEventListener('pointerdown', arm);
    window.addEventListener('keydown', arm);
    document.addEventListener('visibilitychange', arm);
    arm();

    return () => {
      if (timer !== undefined) clearTimeout(timer);
      window.removeEventListener('pointerdown', arm);
      window.removeEventListener('keydown', arm);
      document.removeEventListener('visibilitychange', arm);
    };
  }, [enabled, lock]);
}
