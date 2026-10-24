import { cn } from './cn';

/** Logotype « Ma Caisse » : ticket de caisse stylisé (SVG inline, aucune ressource externe). */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center justify-center rounded-xl bg-zest-400 text-ink-950 shrink-0', className)}>
      <svg viewBox="0 0 24 24" fill="none" className="size-[60%]" aria-hidden="true">
        <path d="M5 3.5h14v16.2l-2.33-1.4-2.34 1.4-2.33-1.4-2.33 1.4-2.34-1.4L5 19.7V3.5Z" fill="currentColor" />
        <path d="M8.5 8h7M8.5 11.5h7M8.5 15h4" stroke="#c5f441" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    </span>
  );
}
