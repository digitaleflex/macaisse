import type { Toast as ToastData, ToastTone } from './toastBus';

/**
 * Toast — rendu visuel du toast. Reprend À L'IDENTIQUE le style existant de
 * `App.tsx` (lignes 203-208) : pill sombre arrondi, centré horizontalement
 * en haut (`top-22`), point coloré animé.
 *
 * Le point reprend la couleur d'accent existante :
 *   - info    → bg-sky-400
 *   - success → bg-emerald-400 (couleur historique)
 *   - error   → bg-rose-400
 */

export interface ToastProps {
  toast: ToastData;
}

const DOT_CLASS: Record<ToastTone, string> = {
  info: 'bg-sky-400',
  success: 'bg-emerald-400',
  error: 'bg-rose-400',
};

export function Toast({ toast }: ToastProps) {
  return (
    <div className="fixed top-22 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-slate-900/95 backdrop-blur-md text-white text-xs font-medium rounded-full shadow-xl border border-slate-700/60 flex items-center gap-2 animate-fadeIn">
      <span className={`w-2 h-2 rounded-full ${DOT_CLASS[toast.tone]} animate-pulse`} />
      <span>{toast.message}</span>
    </div>
  );
}
