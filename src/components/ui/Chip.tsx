import { Check } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ChipVariant = 'filter' | 'choice' | 'suggestion';

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ChipVariant;
  selected?: boolean;
  leadingIcon?: ReactNode;
  children: ReactNode;
}

export function Chip({
  variant = 'filter',
  selected = false,
  leadingIcon,
  disabled,
  className = '',
  children,
  type = 'button',
  ...rest
}: ChipProps) {
  const showCheck = variant === 'filter' && selected && !leadingIcon;

  return (
    <button
      type={type}
      disabled={disabled}
      aria-pressed={variant === 'suggestion' ? undefined : selected}
      className={[
        'pressable inline-flex items-center justify-center min-h-12 px-4 gap-2 rounded-sm text-label font-semibold whitespace-nowrap',
        'disabled:opacity-45 disabled:cursor-not-allowed',
        selected
          ? 'bg-primary-container text-on-primary-container border border-transparent'
          : 'bg-surface text-text-2 border border-outline-strong',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {showCheck ? (
        <Check className="w-5 h-5 shrink-0" aria-hidden="true" />
      ) : (
        leadingIcon && (
          <span className="w-5 h-5 inline-flex items-center justify-center shrink-0">
            {leadingIcon}
          </span>
        )
      )}
      <span>{children}</span>
    </button>
  );
}
