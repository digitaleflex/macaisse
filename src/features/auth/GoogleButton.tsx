import { t } from '@/content';
import { GoogleMark, Spinner, cn } from '@/ui';

/**
 * Bouton « Continuer avec Google » conforme à l'identité Google : fond blanc,
 * bordure neutre, logo « G » officiel à gauche et libellé en français.
 * Le pictogramme ne doit jamais être recoloré ni déformé (`ui/GoogleMark.tsx`).
 */
export interface GoogleButtonProps {
  onClick: () => void;
  loading?: boolean;
  className?: string;
}

export function GoogleButton({ onClick, loading = false, className }: GoogleButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={cn(
        'w-full h-11 inline-flex items-center justify-center gap-3 rounded-xl bg-white',
        'border border-[#dadce0] text-[#1f1f1f] text-sm font-medium',
        'transition-colors hover:bg-[#f8f9fa] hover:border-[#c4c7c5] active:bg-[#f1f3f4]',
        'cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed',
        className
      )}
    >
      {loading ? <Spinner size="sm" /> : <GoogleMark size={18} />}
      <span>{t.auth.google}</span>
    </button>
  );
}
