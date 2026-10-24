import { t } from '@/content';
import { cn } from './cn';

export type SpinnerSize = 'sm' | 'md' | 'lg';

export interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
}

const SIZE_CLASS: Record<SpinnerSize, string> = {
  sm: 'size-3.5 border-2',
  md: 'size-5 border-2',
  lg: 'size-8 border-[3px]',
};

export function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={t.common.loading}
      className={cn(
        'inline-block rounded-full border-current border-t-transparent animate-spin',
        SIZE_CLASS[size],
        className
      )}
    />
  );
}
