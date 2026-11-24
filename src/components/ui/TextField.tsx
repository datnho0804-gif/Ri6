import { AlertCircle } from 'lucide-react';
import { useId } from 'react';
import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';

interface BaseFieldProps {
  label: string;
  helperText?: string;
  error?: string;
  suffix?: ReactNode;
  containerClassName?: string;
}

export type TextFieldProps =
  | (BaseFieldProps &
      Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & {
        multiline?: false;
      })
  | (BaseFieldProps &
      TextareaHTMLAttributes<HTMLTextAreaElement> & {
        multiline: true;
      });

export function TextField(props: TextFieldProps) {
  const autoId = useId();
  const {
    label,
    helperText,
    error,
    suffix,
    containerClassName = '',
    id,
    disabled,
    className = '',
    multiline,
    ...rest
  } = props;

  const fieldId = id ?? autoId;
  const helperId = helperText ? `${fieldId}-help` : undefined;
  const errorId = error ? `${fieldId}-err` : undefined;
  const describedBy = [errorId, helperId].filter(Boolean).join(' ') || undefined;

  const boxClasses = [
    'rounded-sm px-3.5 py-2 transition-colors',
    disabled
      ? 'bg-surface-2 border border-dashed border-outline-strong text-text-2 cursor-not-allowed'
      : error
        ? 'bg-surface border-2 border-danger focus-within:border-danger'
        : 'bg-surface border border-outline-strong focus-within:border-2 focus-within:border-primary',
  ].join(' ');

  const labelClasses = [
    'block text-label font-semibold leading-tight',
    error ? 'text-danger' : disabled ? 'text-text-3' : 'text-primary',
  ].join(' ');

  const inputClasses = [
    'w-full bg-transparent text-body font-medium text-text placeholder:text-text-3 focus:outline-none mt-0.5',
    'disabled:cursor-not-allowed',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={containerClassName}>
      <div className={boxClasses}>
        <label htmlFor={fieldId} className={labelClasses}>
          {label}
        </label>
        <div className="flex items-center gap-2 min-h-8">
          {multiline ? (
            <textarea
              id={fieldId}
              disabled={disabled}
              aria-invalid={Boolean(error) || undefined}
              aria-describedby={describedBy}
              rows={3}
              className={`${inputClasses} resize-y min-h-16`}
              {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)}
            />
          ) : (
            <input
              id={fieldId}
              disabled={disabled}
              aria-invalid={Boolean(error) || undefined}
              aria-describedby={describedBy}
              className={inputClasses}
              {...(rest as InputHTMLAttributes<HTMLInputElement>)}
            />
          )}
          {suffix && <span className="shrink-0 text-label font-semibold text-text-3">{suffix}</span>}
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
