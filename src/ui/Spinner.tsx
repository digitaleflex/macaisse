/**
 * Spinner — indicateur de chargement minimal, hérite de la couleur du texte
 * (`border-current`) pour rester lisible sur fond clair comme sur fond sombre.
 */

export type SpinnerSize = 'sm' | 'md' | 'lg';

export interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
}

const SIZE_CLASS: Record<SpinnerSize, string> = {
  sm: 'w-3.5 h-3.5 border-2',
  md: 'w-5 h-5 border-2',
  lg: 'w-8 h-8 border-[3px]',
};

export function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Chargement"
      className={`inline-block rounded-full border-current border-t-transparent animate-spin ${
        SIZE_CLASS[size]
      } ${className ?? ''}`}
    />
  );
}
