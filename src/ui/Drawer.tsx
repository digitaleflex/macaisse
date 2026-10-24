import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { t } from '@/content';
import { cn } from './cn';
import { Icon } from './Icon';
import { useOverlay } from './useOverlay';

/** Drawer — panneau latéral droit (notifications). Monté en permanence pour la transition. */
export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}

export function Drawer({ open, onClose, title, subtitle, actions, children }: DrawerProps) {
  const panelRef = useOverlay(open, onClose);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={cn('fixed inset-0 z-[60] transition-opacity duration-300', open ? 'opacity-100' : 'opacity-0 pointer-events-none')}
      aria-hidden={!open}
    >
      <div className="absolute inset-0 bg-ink-950/50 backdrop-blur-[2px]" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        tabIndex={-1}
        className={cn(
          'absolute top-0 right-0 h-full w-full sm:max-w-md bg-white shadow-overlay flex flex-col outline-none transition-transform duration-300 ease-out',
          open ? 'visible translate-x-0' : 'invisible translate-x-full'
        )}
      >
        <header className="px-5 py-4 border-b border-line flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-display font-bold text-base text-ink-900">{title}</h2>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-1">
            {actions}
            <button
              type="button"
              onClick={onClose}
              aria-label={t.common.close}
              className="size-9 rounded-xl flex items-center justify-center text-slate-500 hover:text-ink-900 hover:bg-slate-100 cursor-pointer"
            >
              <Icon name="close" size={20} />
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-3">{children}</div>
      </div>
    </div>,
    document.body
  );
}
