import { AlertCircle, ChevronDown } from 'lucide-react';
import { useId } from 'react';
import type { SelectHTMLAttributes } from 'react';

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
}

export interface SelectFieldProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label: string;
  options: Array<SelectOption>;
  helperText?: string;
  error?: string;
  containerClassName?: string;
}

/**
 * Material 3 outlined SelectField matching TextField (>=56px height, >=14px label/helper/error).
 */
export function SelectField({
  label,
  options,
  helperText,
  error,
  containerClassName = '',
  id,
  disabled,
  className = '',
  ...rest
}: SelectFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const errorId = error ? `${fieldId}-err` : undefined;
  const helperId = helperText ? `${fieldId}-help` : undefined;
  const describedBy = [errorId, helperId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={containerClassName}>
      <div
        className={[
          'relative rounded-sm px-3.5 py-2 min-h-14 transition-colors',
          disabled
            ? 'bg-surface-2 border border-dashed border-outline-strong text-text-2 cursor-not-allowed'
            : error
              ? 'bg-surface border-2 border-danger focus-within:border-danger'
              : 'bg-surface border border-outline-strong focus-within:border-2 focus-within:border-primary',
        ].join(' ')}
      >
        <label
          htmlFor={fieldId}
          className={[
            'block text-label font-semibold leading-tight',
            error ? 'text-danger' : disabled ? 'text-text-3' : 'text-primary',
          ].join(' ')}
        >
          {label}
        </label>
        <div className="relative flex items-center mt-0.5">
          <select
            id={fieldId}
            disabled={disabled}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={describedBy}
            className={[
              'w-full appearance-none bg-transparent pr-7 text-body font-medium text-text focus:outline-none cursor-pointer disabled:cursor-not-allowed',
              className,
            ]
              .filter(Boolean)
              .join(' ')}
            {...rest}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className="w-5 h-5 text-text-3 pointer-events-none absolute right-0"
            aria-hidden="true"
          />
        </div>
      </div>

      {error && (
        <p id={errorId} role="alert" className="mt-1.5 px-1 flex items-start gap-1.5 text-caption font-medium text-danger">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
      {!error && helperText && (
        <p id={helperId} className="mt-1.5 px-1 text-caption text-text-3">
          {helperText}
        </p>
      )}
    </div>
  );
}
