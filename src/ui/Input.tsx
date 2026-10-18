import { useId, type ChangeEvent } from 'react';

/**
 * Input — champ texte du design system.
 * Label et focus ring repris des formulaires existants (StockView / CreditsView) :
 *   label : `text-[11px] text-slate-500 uppercase font-semibold block mb-1`
 *   champ : `w-full h-10 px-3 rounded-xl bg-slate-50 text-xs text-slate-900
 *            outline-none border border-slate-200 focus:border-slate-800
 *            focus:bg-white transition-colors`
 * En état d'erreur : bordure rose (`--status-danger` / rose-300).
 */

export interface InputProps {
  label?: string;
  name?: string;
  value: string | number;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  placeholder?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  id?: string;
}

export function Input({
  label,
  name,
  value,
  onChange,
  type = 'text',
  placeholder,
  error,
  hint,
  required = false,
  className,
  id,
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? name ?? generatedId;

  return (
    <div className={className}>
      {label !== undefined && (
        <label
          htmlFor={inputId}
          className="text-[11px] text-slate-500 uppercase font-semibold block mb-1"
        >
          {label}
          {required && ' *'}
        </label>
      )}
      <input
        id={inputId}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        aria-invalid={error !== undefined}
        className={`w-full h-10 px-3 rounded-xl bg-slate-50 text-xs text-slate-900 outline-none border transition-colors focus:bg-white ${
          error !== undefined
            ? 'border-rose-300 focus:border-rose-500'
            : 'border-slate-200 focus:border-slate-800'
        }`}
      />
      {error !== undefined && (
        <span className="text-[10px] text-rose-600 block mt-1">{error}</span>
      )}
      {error === undefined && hint !== undefined && (
        <span className="text-[10px] text-slate-500 block mt-1">{hint}</span>
      )}
    </div>
  );
}
