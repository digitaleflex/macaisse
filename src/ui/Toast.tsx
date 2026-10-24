import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from './cn';
import { Icon } from './Icon';
import { subscribeToast, type Toast as ToastData, type ToastTone } from './toastBus';

const TONE: Record<ToastTone, { icon: string; className: string }> = {
  info: { icon: 'info', className: 'text-sky-300' },
  success: { icon: 'check_circle', className: 'text-zest-400' },
  error: { icon: 'error', className: 'text-rose-400' },
};

export function Toast({ toast }: { toast: ToastData }) {
  const tone = TONE[toast.tone];
  return (
    <div
      role={toast.tone === 'error' ? 'alert' : 'status'}
      aria-live={toast.tone === 'error' ? 'assertive' : 'polite'}
      className="pointer-events-auto max-w-[min(92vw,420px)] flex items-start gap-2.5 pl-3.5 pr-4 py-3 rounded-2xl bg-ink-900 text-white text-[13px] font-medium shadow-overlay ring-1 ring-white/10 animate-pop"
    >
      <Icon name={tone.icon} size={19} filled className={cn('mt-px', tone.className)} />
      <span className="leading-snug">{toast.message}</span>
    </div>
  );
}

/** À monter UNE SEULE FOIS dans le shell : s'abonne au `toastBus`. */
export function ToastHost() {
  const [toast, setToast] = useState<ToastData | null>(null);
  useEffect(() => subscribeToast(setToast), []);

  if (toast === null || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed z-[70] inset-x-0 top-3 lg:top-auto lg:bottom-6 lg:right-6 lg:left-auto flex justify-center lg:justify-end px-4 pointer-events-none">
      <Toast key={toast.id} toast={toast} />
    </div>,
    document.body
  );
}
