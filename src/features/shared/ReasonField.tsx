import { useId } from 'react';
import { FieldShell, cn } from '@/ui';

export interface ReasonFieldProps {
  label: string;
  hint?: string;
  error?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  required?: boolean;
  /** Motifs proposés d'un clic ; le texte reste libre. */
  suggestions?: readonly string[];
  suggestionsLabel?: string;
  maxLength?: number;
}

/** Motif saisi à la main, avec des suggestions cliquables (correction de stock, annulation…). */
export function ReasonField({
  label,
  hint,
  error,
  placeholder,
  value,
  onChange,
  onBlur,
  required,
  suggestions = [],
  suggestionsLabel,
  maxLength = 200,
}: ReasonFieldProps) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required}>
      <textarea
        id={id}
        value={value}
        rows={2}
        maxLength={maxLength}
        placeholder={placeholder}
        aria-invalid={error !== undefined}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        className={cn(
          'w-full rounded-xl bg-white text-sm text-ink-900 placeholder:text-slate-500 border px-3.5 py-2.5 outline-none',
          'transition-all focus:border-ink-900 focus:ring-4 focus:ring-ink-900/5',
          error ? 'border-rose-300' : 'border-line hover:border-line-strong'
        )}
      />
      {suggestions.length > 0 && (
        <div role="group" aria-label={suggestionsLabel} className="flex flex-wrap gap-1.5">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => onChange(suggestion)}
              className="px-2.5 py-1 rounded-lg bg-slate-100 text-xs font-medium text-slate-600 hover:bg-slate-200 cursor-pointer"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </FieldShell>
  );
}
