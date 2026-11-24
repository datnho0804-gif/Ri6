import { AlertCircle, Minus, Plus } from 'lucide-react';
import { useId } from 'react';
import { formatNumberVN } from '../../lib/format';

export interface NumberStepperProps {
  label?: string;
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  disabled?: boolean;
  error?: string;
  helperText?: string;
  ariaLabel?: string;
  className?: string;
}

export function NumberStepper({
  label,
  value,
  onChange,
  min = 0,
  max = 9999,
  step = 1,
  unit,
  disabled = false,
  error,
  helperText,
  ariaLabel,
  className = '',
}: NumberStepperProps) {
  const id = useId();
  const errorId = error ? `${id}-err` : undefined;
  const helperId = helperText ? `${id}-help` : undefined;

  const decimals = Number.isInteger(step) ? 0 : Math.min(2, String(step).split('.')[1]?.length ?? 1);
  const clamp = (n: number) => {
    const rounded = Number(n.toFixed(decimals));
    return Math.min(max, Math.max(min, rounded));
  };

  const canDec = !disabled && value > min;
  const canInc = !disabled && value < max;

  const handleDecrement = () => {
    if (!canDec) return;
    onChange(clamp(value - step));
  };

  const handleIncrement = () => {
    if (!canInc) return;
    onChange(clamp(value + step));
  };

  const groupLabel = label ?? ariaLabel ?? unit ?? 'Giá trị số';

  return (
    <div className={className}>
      {label && (
        <span id={`${id}-lbl`} className="block text-label font-semibold text-text-2 mb-1.5">
          {label}
        </span>
      )}
      <div
        role="group"
        aria-labelledby={label ? `${id}-lbl` : undefined}
        aria-label={label ? undefined : groupLabel}
        aria-describedby={[errorId, helperId].filter(Boolean).join(' ') || undefined}
        className={[
          'flex items-center justify-between min-h-14 rounded-sm px-1 py-1 transition-colors',
          disabled
            ? 'bg-surface-2 border border-dashed border-outline-strong'
            : error
              ? 'bg-surface border-2 border-danger'
              : 'bg-surface border border-outline-strong focus-within:border-2 focus-within:border-primary',
        ].join(' ')}
      >
        <button
          type="button"
          onClick={handleDecrement}
          disabled={!canDec}
          aria-label={`Giảm ${groupLabel}`}
          className="pressable w-12 h-12 min-w-12 min-h-12 rounded-sm bg-surface-2 text-text flex items-center justify-center shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Minus className="w-5 h-5" aria-hidden="true" />
        </button>

        <div className="flex-1 min-w-0 text-center px-0.5">
          <div className="text-title font-bold text-text tabular-nums leading-tight">
            {formatNumberVN(value, decimals)}
          </div>
          {unit && <div className="text-caption text-text-3 leading-tight mt-0.5">{unit}</div>}
        </div>

        <button
          type="button"
          onClick={handleIncrement}
          disabled={!canInc}
          aria-label={`Tăng ${groupLabel}`}
          className="pressable w-12 h-12 min-w-12 min-h-12 rounded-sm bg-surface-2 text-text flex items-center justify-center shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus className="w-5 h-5" aria-hidden="true" />
        </button>
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
