import { useId, type ChangeEvent } from 'react';

/**
 * Select — liste déroulante cohérente avec `Input` (mêmes tokens de surface,
 * de bordure et de label ; cf. StockView / DepensesModal).
 */

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  label?: string;
  name?: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  options: SelectOption[];
  error?: string;
  placeholder?: string;
  className?: string;
  id?: string;
}

export function Select({
  label,
  name,
  value,
  onChange,
  options,
  error,
  placeholder,
  className,
  id,
}: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? name ?? generatedId;

  return (
    <div className={className}>
      {label !== undefined && (
        <label
          htmlFor={selectId}
          className="text-[11px] text-slate-500 uppercase font-semibold block mb-1"
        >
          {label}
        </label>
      )}
      <select
        id={selectId}
        name={name}
        value={value}
        onChange={onChange}
        aria-invalid={error !== undefined}
        className={`w-full h-10 px-2 rounded-xl bg-slate-50 text-xs text-slate-900 outline-none border transition-colors cursor-pointer focus:bg-white ${
          error !== undefined
            ? 'border-rose-300 focus:border-rose-500'
            : 'border-slate-200 focus:border-slate-800'
        }`}
      >
        {placeholder !== undefined && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error !== undefined && (
        <span className="text-[10px] text-rose-600 block mt-1">{error}</span>
      )}
    </div>
  );
}
