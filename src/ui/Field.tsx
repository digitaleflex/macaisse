import { useId, type ChangeEvent, type InputHTMLAttributes, type ReactNode } from 'react';
import { t } from '@/content';
import { cn } from './cn';
import { Icon } from './Icon';

/** Habillage commun des champs : libellé, aide et message d'erreur. */
interface FieldShellProps {
  id: string;
  label?: string;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}

export function FieldShell({ id, label, hint, error, required, className, children }: FieldShellProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label !== undefined && (
        <label htmlFor={id} className="text-[13px] font-medium text-slate-700">
          {label}
          {required && <span className="text-rose-500 ml-0.5" aria-label={t.common.required}>*</span>}
        </label>
      )}
      {children}
      {error !== undefined ? (
        <span className="text-xs text-rose-600">{error}</span>
      ) : (
        hint !== undefined && <span className="text-xs text-slate-500">{hint}</span>
      )}
    </div>
  );
}

const CONTROL =
  'w-full h-11 rounded-xl bg-white text-sm text-ink-900 placeholder:text-slate-500 border outline-none transition-all ' +
  'focus:border-ink-900 focus:ring-4 focus:ring-ink-900/5';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  label?: string;
  value: string | number;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  hint?: ReactNode;
  icon?: string;
  suffix?: ReactNode;
  /** Contrôle interactif à droite du champ (ex. afficher/masquer le mot de passe). */
  action?: ReactNode;
}

export function Input({ label, error, hint, icon, suffix, action, required, className, id, name, ...rest }: InputProps) {
  const generated = useId();
  const inputId = id ?? name ?? generated;
  return (
    <FieldShell id={inputId} label={label} hint={hint} error={error} required={required} className={className}>
      <div className="relative flex items-center">
        {icon && <Icon name={icon} size={18} className="absolute left-3.5 text-slate-500 pointer-events-none" />}
        <input
          {...rest}
          id={inputId}
          name={name}
          required={required}
          aria-invalid={error !== undefined}
          className={cn(
            CONTROL,
            icon ? 'pl-10' : 'pl-3.5',
            action ? 'pr-12' : suffix ? 'pr-14' : 'pr-3.5',
            error !== undefined ? 'border-rose-300' : 'border-line hover:border-line-strong'
          )}
        />
        {action ? (
          <span className="absolute right-1.5 flex items-center">{action}</span>
        ) : (
          suffix && (
            <span className="absolute right-3.5 text-xs font-semibold text-muted pointer-events-none">{suffix}</span>
          )
        )}
      </div>
    </FieldShell>
  );
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  label?: string;
  name?: string;
  id?: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  options: readonly SelectOption[];
  error?: string;
  hint?: ReactNode;
  className?: string;
}

export function Select({ label, name, id, value, onChange, options, error, hint, className }: SelectProps) {
  const generated = useId();
  const selectId = id ?? name ?? generated;
  return (
    <FieldShell id={selectId} label={label} hint={hint} error={error} className={className}>
      <div className="relative flex items-center">
        <select
          id={selectId}
          name={name}
          value={value}
          onChange={onChange}
          aria-invalid={error !== undefined}
          className={cn(
            CONTROL,
            'appearance-none pl-3.5 pr-10 cursor-pointer',
            error !== undefined ? 'border-rose-300' : 'border-line hover:border-line-strong'
          )}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Icon name="expand_more" size={20} className="absolute right-3 text-slate-500 pointer-events-none" />
      </div>
    </FieldShell>
  );
}

export interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  id?: string;
  className?: string;
  trailing?: ReactNode;
}

/** Champ de recherche avec bouton d'effacement. */
export function SearchField({ value, onChange, placeholder, id, className, trailing }: SearchFieldProps) {
  return (
    <div className={cn('relative flex items-center', className)}>
      <Icon name="search" size={20} className="absolute left-3.5 text-slate-500 pointer-events-none" />
      <input
        id={id}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={cn(CONTROL, 'border-line hover:border-line-strong pl-11 pr-11 shadow-card [&::-webkit-search-cancel-button]:hidden')}
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label={t.common.clearSearch}
          className="absolute right-2 size-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-ink-900 hover:bg-slate-100 cursor-pointer"
        >
          <Icon name="close" size={18} />
        </button>
      ) : (
        trailing && <div className="absolute right-1.5">{trailing}</div>
      )}
    </div>
  );
}
