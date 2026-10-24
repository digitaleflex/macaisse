import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { t } from '@/content';
import { cn } from './cn';
import { Icon } from './Icon';
import { useOverlay } from './useOverlay';

/**
 * Modal — feuille basse sur mobile, boîte centrée à partir de `sm`.
 * `role="dialog"`, Échap, scroll verrouillé, focus géré, rendu en portail.
 * `headerVariant="dark"` : en-tête encre (reçu, export).
 */

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';
export type ModalHeaderVariant = 'light' | 'dark';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  icon?: string;
  footer?: ReactNode;
  size?: ModalSize;
  headerVariant?: ModalHeaderVariant;
  closeOnBackdrop?: boolean;
  bodyClassName?: string;
  /** Corps sans marge interne (contenu pleine largeur). */
  flush?: boolean;
  children: ReactNode;
}

const SIZE_CLASS: Record<ModalSize, string> = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-2xl',
};

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  icon,
  footer,
  size = 'md',
  headerVariant = 'light',
  closeOnBackdrop = true,
  bodyClassName,
  flush = false,
  children,
}: ModalProps) {
  const panelRef = useOverlay(open, onClose);

  if (!open || typeof document === 'undefined') return null;

  const dark = headerVariant === 'dark';
  const ariaLabel = typeof title === 'string' ? title : undefined;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-6 bg-ink-950/55 backdrop-blur-[2px] animate-fade-in"
      onMouseDown={(event) => {
        if (closeOnBackdrop && event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
        className={cn(
          'w-full bg-white shadow-overlay flex flex-col outline-none overflow-hidden',
          'rounded-t-3xl sm:rounded-3xl max-h-[92dvh] animate-slide-up sm:animate-pop',
          SIZE_CLASS[size]
        )}
      >
        <div className="sm:hidden flex justify-center pt-2.5 -mb-1 relative z-10">
          <span className={cn('h-1 w-10 rounded-full', dark ? 'bg-white/25' : 'bg-slate-200')} />
        </div>
        {title !== undefined && (
          <header
            className={cn(
              'flex items-center justify-between gap-3 px-5 sm:px-6 py-4',
              dark ? 'bg-ink-900 text-white bg-grid-ink' : 'border-b border-line'
            )}
          >
            <div className="flex items-center gap-3 min-w-0">
              {icon && (
                <span
                  className={cn(
                    'size-10 rounded-xl flex items-center justify-center shrink-0',
                    dark ? 'bg-zest-400 text-ink-950' : 'bg-slate-100 text-ink-900'
                  )}
                >
                  <Icon name={icon} size={20} />
                </span>
              )}
              <div className="min-w-0">
                <h2 className={cn('font-display font-bold text-base leading-tight', dark ? 'text-white' : 'text-ink-900')}>
                  {title}
                </h2>
                {subtitle && (
                  <p className={cn('text-xs mt-0.5 truncate', dark ? 'text-slate-400' : 'text-slate-500')}>{subtitle}</p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t.common.close}
              className={cn(
                'size-9 rounded-xl flex items-center justify-center shrink-0 transition-colors cursor-pointer',
                dark ? 'bg-white/10 text-white hover:bg-white/20' : 'text-slate-500 hover:text-ink-900 hover:bg-slate-100'
              )}
            >
              <Icon name="close" size={20} />
            </button>
          </header>
        )}

        <div className={cn(flush ? 'flex flex-col min-h-0' : 'px-5 sm:px-6 py-5 space-y-5', 'overflow-y-auto flex-1', bodyClassName)}>{children}</div>

        {footer !== undefined && footer !== null && (
          <footer className="px-5 sm:px-6 py-4 border-t border-line bg-slate-50/70 flex gap-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body
  );
}
