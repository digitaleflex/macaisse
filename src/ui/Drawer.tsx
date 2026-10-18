import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Drawer — panneau latéral glissant depuis la droite (ex. NotificationDrawer).
 *
 * Backdrop & header repris de `NotificationDrawer.tsx` (fond `bg-white`,
 * header `bg-slate-50 border-b border-slate-100`). Le panneau est monté en
 * permanence dans `document.body` afin de permettre une vraie transition
 * `translate-x` (`duration-300 ease-out`) ; à l'état fermé il est `invisible`
 * (donc hors tabulation) et `pointer-events-none`.
 *
 * Comme Modal : `role="dialog"`, `aria-modal`, Échap pour fermer, scroll du
 * body verrouillé, focus déplacé/restauré.
 */

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
}

export function Drawer({ open, onClose, title, children }: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const raf = requestAnimationFrame(() => panelRef.current?.focus());
    return () => {
      cancelAnimationFrame(raf);
      previouslyFocused.current?.focus?.();
    };
  }, [open]);

  if (typeof document === 'undefined') return null;

  const hasHeader = title !== undefined && title !== null;
  const ariaLabel = typeof title === 'string' ? title : undefined;

  return createPortal(
    <div
      className={`fixed inset-0 z-50 transition-opacity duration-300 ${
        open ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      aria-hidden={!open}
    >
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs" onClick={onClose} />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
        className={`absolute top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl border-l border-slate-200/80 flex flex-col outline-none transition-transform duration-300 ease-out ${
          open ? 'visible translate-x-0' : 'invisible translate-x-full'
        }`}
      >
        {hasHeader && (
          <div className="p-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <span className="font-display font-bold text-xs text-slate-900">{title}</span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-slate-500 hover:text-slate-900 shadow-2xs border border-slate-200 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-3">{children}</div>
      </div>
    </div>,
    document.body
  );
}
