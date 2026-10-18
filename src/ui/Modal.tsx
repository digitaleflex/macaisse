import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Modal — primitive visuelle partagée (aucune connaissance métier).
 *
 * Backdrop & panel repris À L'IDENTIQUE de `ExportModal.tsx` :
 *   - backdrop : `fixed inset-0 z-50 flex items-end sm:items-center justify-center
 *     bg-[#0b1c30]/70 backdrop-blur-xs p-3 animate-fadeIn`
 *   - panel    : `w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden
 *     flex flex-col border border-slate-200/80 max-h-[92vh]`
 *
 * En-têtes (`headerVariant`) :
 *   - 'light' (défaut) → en-tête clair de la majorité des modales
 *     (Profil, Abonnement, Dépenses…) : `bg-slate-50 border-b border-slate-100`,
 *     titre seul + bouton de fermeture clair.
 *   - 'dark' → en-tête de `ExportModal.tsx` / `ReceiptModal.tsx` :
 *     `bg-slate-900 text-white`, structure icône (carré `bg-emerald-500`) +
 *     titre + sous-titre, bouton de fermeture translucide lisible sur fond sombre.
 *     À réserver à l'export comptable et au reçu (ticket de caisse) ; `light`
 *     par défaut partout ailleurs.
 *
 * Durcissement par rapport aux modales historiques :
 *   - `role="dialog"` + `aria-modal="true"` ;
 *   - fermeture par la touche Échap ;
 *   - verrouillage du scroll du <body> tant que la modale est ouverte ;
 *   - focus déplacé dans le dialogue à l'ouverture, restauré à la fermeture ;
 *   - rendu via `createPortal` dans `document.body` ;
 *   - `open === false` ⇒ ne rend rien (remplace les `if (!isOpen) return null`).
 *   - `size` : sm = max-w-sm, md = max-w-md (défaut), lg = max-w-lg.
 *   - `closeOnBackdrop` : vrai par défaut.
 */

export type ModalSize = 'sm' | 'md' | 'lg';

/**
 * `dark` est réservé aux modales Export et Reçu (ticket de caisse) ;
 * `light` (défaut) est utilisé par toutes les autres modales.
 */
export type ModalHeaderVariant = 'light' | 'dark';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  /** Sous-titre affiché uniquement en en-tête `dark` (export / reçu). */
  subtitle?: ReactNode;
  /** Icône affichée uniquement en en-tête `dark` — nom Material Symbol ou nœud React. */
  icon?: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;
  /** `dark` (export / reçu) ou `light` (défaut, toutes les autres modales). */
  headerVariant?: ModalHeaderVariant;
  closeOnBackdrop?: boolean;
  children: ReactNode;
}

const SIZE_CLASS: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
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
  children,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Échap pour fermer.
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

  // Verrouillage du scroll du document.
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  // Déplacement puis restauration du focus.
  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const raf = requestAnimationFrame(() => panelRef.current?.focus());
    return () => {
      cancelAnimationFrame(raf);
      previouslyFocused.current?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  if (typeof document === 'undefined') return null;

  const hasHeader = title !== undefined && title !== null;
  const hasSubtitle = subtitle !== undefined && subtitle !== null;
  const hasIcon = icon !== undefined && icon !== null;
  const ariaLabel = typeof title === 'string' ? title : undefined;

  const lightHeader = (
    <div className="p-4 flex items-center justify-between border-b border-slate-100 bg-slate-50">
      <h2 className="font-display font-bold text-sm text-slate-900">{title}</h2>
      <button
        type="button"
        onClick={onClose}
        aria-label="Fermer"
        className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-500 hover:text-slate-900 shadow-2xs border border-slate-200 cursor-pointer"
      >
        <span className="material-symbols-outlined text-[18px]">close</span>
      </button>
    </div>
  );

  // En-tête repris à l'identique de `ExportModal.tsx` (icône + titre + sous-titre).
  const darkHeader = (
    <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        {hasIcon && (
          <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center">
            {typeof icon === 'string' ? (
              <span className="material-symbols-outlined text-[20px]">{icon}</span>
            ) : (
              icon
            )}
          </div>
        )}
        <div>
          <h2 className="font-display font-bold text-sm text-white">{title}</h2>
          {hasSubtitle && <p className="text-[10px] text-slate-300">{subtitle}</p>}
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Fermer"
        className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
      >
        <span className="material-symbols-outlined text-[18px]">close</span>
      </button>
    </div>
  );

  const header = hasHeader ? (headerVariant === 'dark' ? darkHeader : lightHeader) : null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#0b1c30]/70 backdrop-blur-xs p-3 animate-fadeIn"
      onMouseDown={(event) => {
        if (closeOnBackdrop && event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
        className={`w-full ${SIZE_CLASS[size]} bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-slate-200/80 max-h-[92vh] outline-none`}
      >
        {header}

        <div className="p-4 space-y-4 overflow-y-auto flex-1">{children}</div>

        {footer !== undefined && footer !== null && (
          <div className="p-3 bg-slate-50 border-t border-slate-200/80 flex gap-2">{footer}</div>
        )}
      </div>
    </div>,
    document.body
  );
}
