import { cn } from './cn';

/** Icône Material Symbols (police chargée dans `index.html`). Décorative par défaut. */
export interface IconProps {
  name: string;
  size?: number;
  filled?: boolean;
  className?: string;
  label?: string;
}

export function Icon({ name, size = 20, filled = false, className, label }: IconProps) {
  return (
    <span
      className={cn('material-symbols-outlined shrink-0', filled && 'is-filled', className)}
      style={{ fontSize: size, width: size, height: size }}
      aria-hidden={label === undefined}
      aria-label={label}
      role={label === undefined ? undefined : 'img'}
    >
      {name}
    </span>
  );
}
