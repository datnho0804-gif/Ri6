import { Loader2 } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'filled' | 'tonal' | 'outlined' | 'text' | 'danger';
export type ButtonSize = 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  filled: 'bg-primary text-on-primary shadow-e2 disabled:shadow-none',
  tonal: 'bg-primary-container text-on-primary-container',
  outlined: 'bg-surface text-primary border border-outline-strong',
  text: 'bg-transparent text-primary',
  danger: 'bg-danger text-on-primary shadow-e1 disabled:shadow-none',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  md: 'min-h-12 px-5 rounded-md text-body font-semibold gap-2',
  lg: 'min-h-14 px-6 rounded-md text-body font-semibold gap-2',
};

export function Button({
  variant = 'filled',
  size = 'md',
  loading = false,
  fullWidth = false,
  leadingIcon,
  trailingIcon,
  disabled,
  className = '',
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  const isDisabled = Boolean(disabled || loading);

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={[
        'pressable inline-flex items-center justify-center text-center leading-snug',
        'disabled:opacity-45 disabled:cursor-not-allowed',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        fullWidth ? 'w-full' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin shrink-0" aria-hidden="true" />
      ) : (
        leadingIcon && <span className="shrink-0 inline-flex">{leadingIcon}</span>
      )}
      <span>{children}</span>
      {!loading && trailingIcon && <span className="shrink-0 inline-flex">{trailingIcon}</span>}
    </button>
  );
}
