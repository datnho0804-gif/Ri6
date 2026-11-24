import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type IconButtonVariant = 'standard' | 'tonal' | 'scrim' | 'surface';
export type StatusDotTone = 'ok' | 'warn' | 'danger' | 'neutral';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  variant?: IconButtonVariant;
  statusDot?: StatusDotTone;
  children: ReactNode;
}

const VARIANT_CLASSES: Record<IconButtonVariant, string> = {
  standard: 'bg-transparent text-text-2 hover:bg-surface-2',
  tonal: 'bg-primary-container text-on-primary-container',
  scrim: 'bg-hero-control text-on-primary backdrop-blur-sm',
  surface: 'bg-surface-2 text-text-2',
};

const DOT_CLASSES: Record<StatusDotTone, string> = {
  ok: 'bg-ok-accent',
  warn: 'bg-tertiary',
  danger: 'bg-danger',
  neutral: 'bg-outline-strong',
};

export function IconButton({
  label,
  variant = 'standard',
  statusDot,
  className = '',
  children,
  type = 'button',
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      className={[
        'pressable relative inline-flex items-center justify-center w-12 h-12 min-w-12 min-h-12 rounded-pill shrink-0',
        'disabled:opacity-45 disabled:cursor-not-allowed',
        VARIANT_CLASSES[variant],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
      {statusDot && (
        <span
          aria-hidden="true"
          className={`absolute right-2.5 top-2.5 w-2.5 h-2.5 rounded-pill ring-2 ring-bg ${DOT_CLASSES[statusDot]}`}
        />
      )}
    </button>
  );
}
