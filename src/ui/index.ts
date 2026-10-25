/**
 * Primitives UI partagées (« ui/ ») — aucune connaissance métier.
 */
export { cn } from './cn';
export { useMediaQuery } from './useMediaQuery';
export { Icon, type IconProps } from './Icon';
export { Spinner, type SpinnerProps, type SpinnerSize } from './Spinner';
export {
  Button,
  IconButton,
  type ButtonProps,
  type ButtonSize,
  type ButtonVariant,
  type IconButtonProps,
} from './Button';
export { Badge, type BadgeProps, type BadgeTone } from './Badge';
export { Card, type CardProps } from './Card';
export { StatCard, type StatCardProps, type StatTone } from './StatCard';
export {
  FieldShell,
  Input,
  Select,
  SearchField,
  type InputProps,
  type SelectProps,
  type SelectOption,
  type SearchFieldProps,
} from './Field';
export { Switch, type SwitchProps } from './Switch';
export { SegmentedControl, type SegmentOption, type SegmentedControlProps } from './SegmentedControl';
export { Chip, type ChipProps, type ChipDot } from './Chip';
export {
  EmptyState,
  FormError,
  ProgressBar,
  Avatar,
  Skeleton,
  PageHeader,
  SectionTitle,
  type EmptyStateProps,
  type ProgressBarProps,
  type AvatarProps,
  type PageHeaderProps,
  type FormErrorProps,
} from './Feedback';
export { Modal, type ModalProps, type ModalSize, type ModalHeaderVariant } from './Modal';
export { Drawer, type DrawerProps } from './Drawer';
export { Toast, ToastHost } from './Toast';
export { BrandMark } from './BrandMark';
export { pushToast, subscribeToast } from './toastBus';
export type { Toast as ToastMessage, ToastTone } from './toastBus';
