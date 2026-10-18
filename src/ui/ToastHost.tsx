import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { subscribeToast, type Toast as ToastData } from './toastBus';
import { Toast } from './Toast';

/**
 * ToastHost — à monter UNE SEULE FOIS dans `app/App.tsx`.
 *
 * S'abonne au `toastBus` (aucun import du store : c'est `useUiStore.showToast`
 * qui doit appeler `pushToast`), puis rend le composant `Toast` dans un portal.
 * L'effacement automatique (~3.2 s) est géré par le bus qui republie `null`.
 */

export function ToastHost() {
  const [toast, setToast] = useState<ToastData | null>(null);

  useEffect(() => subscribeToast(setToast), []);

  if (toast === null) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(<Toast toast={toast} />, document.body);
}
