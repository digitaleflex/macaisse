/**
 * toastBus — bus pub/sub minimal reliant le store d'UI (qui possède
 * `showToast`) au rendu visuel (`ToastHost`), SANS que `ToastHost` n'importe
 * le store (la lane `store/` est propriétaire de `src/store/`).
 *
 * CONTRAT D'INTÉGRATION (lane store) :
 *   L'action `useUiStore.showToast(message, tone?)` de `src/store/useUiStore`
 *   DOIT déléguer à `pushToast` :
 *
 *     import { pushToast } from '@/ui/toastBus';
 *     // ...
 *     showToast: (message, tone = 'info') => pushToast(message, tone),
 *
 *   Ainsi `useUiStore` reste la seule source d'état métier, `ToastHost` ne
 *   dépend que de ce bus, et il n'existe aucune dépendance `ui/` → `store/`.
 *
 * Comportement :
 *   - `pushToast(message, tone?)` publie un toast (id interne, jamais `Date.now()`)
 *     et programme son effacement automatique après `DISMISS_AFTER_MS`.
 *   - `subscribeToast(listener)` notifie immédiatement de l'état courant puis à
 *     chaque changement (toast suivant, ou `null` après effacement).
 */

export type ToastTone = 'info' | 'success' | 'error';

export type Toast = { id: string; message: string; tone: ToastTone };

type ToastListener = (toast: Toast | null) => void;

const DISMISS_AFTER_MS = 3200;

let current: Toast | null = null;
let sequence = 0;
let dismissTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<ToastListener>();

function emit(): void {
  listeners.forEach((listener) => listener(current));
}

export function pushToast(message: string, tone: ToastTone = 'info'): void {
  sequence += 1;
  const toast: Toast = { id: `toast-${sequence}`, message, tone };
  current = toast;

  if (dismissTimer !== null) {
    clearTimeout(dismissTimer);
  }
  // N'efface que si aucun toast plus récent n'a été publié entre-temps.
  dismissTimer = setTimeout(() => {
    if (current === toast) {
      current = null;
      emit();
    }
    dismissTimer = null;
  }, DISMISS_AFTER_MS);

  emit();
}

export function subscribeToast(listener: ToastListener): () => void {
  listeners.add(listener);
  listener(current);
  return () => {
    listeners.delete(listener);
  };
}
