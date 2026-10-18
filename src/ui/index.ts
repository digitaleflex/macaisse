/**
 * Barrel des primitives UI partagées (« ui/ »).
 * Aucune connaissance métier — uniquement des briques visuelles réutilisables.
 */

export { Modal } from './Modal';
export type { ModalProps, ModalSize, ModalHeaderVariant } from './Modal';

export { Drawer } from './Drawer';
export type { DrawerProps } from './Drawer';

export { Button } from './Button';
export type { ButtonProps, ButtonSize, ButtonVariant } from './Button';

export { Badge } from './Badge';
export type { BadgeProps, BadgeTone } from './Badge';

export { Card } from './Card';
export type { CardProps } from './Card';

export { Input } from './Input';
export type { InputProps } from './Input';

export { Select } from './Select';
export type { SelectProps, SelectOption } from './Select';

export { EmptyState } from './EmptyState';
export type { EmptyStateProps } from './EmptyState';

export { Spinner } from './Spinner';
export type { SpinnerProps, SpinnerSize } from './Spinner';

export { Toast } from './Toast';
export type { ToastProps } from './Toast';

export { ToastHost } from './ToastHost';

export { pushToast, subscribeToast } from './toastBus';
export type { Toast as ToastMessage, ToastTone } from './toastBus';
