import { AlertCircle, Calendar } from 'lucide-react';
import { useId, useRef } from 'react';
import { todayVN } from '../../lib/date';
import { formatDateFieldLabelVN } from '../../lib/format';
import type { ISODate } from '../../types/models';

export interface DateFieldProps {
  label: string;
  value: ISODate | '';
  onChange: (next: ISODate) => void;
  placeholder?: string;
  min?: ISODate;
  max?: ISODate;
  disabled?: boolean;
  error?: string;
  helperText?: string;
  showTodayAction?: boolean;
  className?: string;
}

export function DateField({
  label,
  value,
  onChange,
  placeholder = 'Chưa đặt',
  min,
  max,
  disabled = false,
  error,
  helperText,
  showTodayAction = false,
  className = '',
}: DateFieldProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const today = todayVN();
  const displayLabel = value ? formatDateFieldLabelVN(value, today) : placeholder;
  const errorId = error ? `${id}-err` : undefined;
  const helperId = helperText ? `${id}-help` : undefined;

  return (
    <div className={className}>
      <div className="flex items-stretch gap-2">
        <div
          className={[
            'relative flex-1 min-h-14 rounded-sm px-3 py-2 flex items-center justify-between gap-1.5 transition-colors',
            disabled
              ? 'bg-surface-2 border border-dashed border-outline-strong cursor-not-allowed'
              : error
                ? 'bg-surface border-2 border-danger'
                : 'bg-surface border border-outline-strong focus-within:border-2 focus-within:border-primary',
          ].join(' ')}
        >
          <div className="min-w-0 flex-1 pointer-events-none">
            <span
              className={`block text-label font-semibold leading-tight ${
                error ? 'text-danger' : 'text-text-3'
              }`}
            >
              {label}
            </span>
            <span
              className={`block text-body font-medium tabular-nums truncate mt-0.5 ${
                value ? 'text-text' : 'text-text-3'
              }`}
            >
              {displayLabel}
            </span>
          </div>
          <Calendar className="w-5 h-5 text-text-3 shrink-0 pointer-events-none" aria-hidden="true" />
          <input
            ref={inputRef}
            id={id}
            type="date"
            value={value}
            min={min}
            max={max}
            disabled={disabled}
            aria-label={`${label}: ${displayLabel}`}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={[errorId, helperId].filter(Boolean).join(' ') || undefined}
            onChange={(e) => {
              if (e.target.value) {
                onChange(e.target.value);
              }
            }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />
        </div>

        {showTodayAction && value !== today && !disabled && (
          <button
            type="button"
            onClick={() => onChange(today)}
            className="pressable min-h-14 px-3.5 rounded-sm bg-primary-container text-on-primary-container text-label font-semibold whitespace-nowrap shrink-0"
          >
            Hôm nay
          </button>
        )}
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
