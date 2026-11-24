import type { ButtonHTMLAttributes, ReactNode } from 'react';

export interface FabProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon: ReactNode;
  variant?: 'primary' | 'secondary' | 'tonal';
}

const VARIANT_CLASSES = {
  primary: 'bg-primary text-on-primary shadow-e2',
  secondary: 'bg-secondary text-on-secondary shadow-e2',
  tonal: 'bg-primary-container text-on-primary-container shadow-e2',
};

export function Fab({
  label,
  icon,
  variant = 'primary',
  className = '',
  type = 'button',
  ...rest
}: FabProps) {
  return (
    <button
      type={type}
      aria-label={label}
      className={[
        'pressable inline-flex items-center justify-center w-14 h-14 rounded-fab',
        'disabled:opacity-45 disabled:cursor-not-allowed',
        VARIANT_CLASSES[variant],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {icon}
    </button>
  );
}

export interface ExtendedFabProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  label: string;
  hidden?: boolean;
  variant?: 'primary' | 'secondary' | 'tonal';
}

export function ExtendedFab({
  icon,
  label,
  hidden = false,
  variant = 'primary',
  className = '',
  type = 'button',
  ...rest
}: ExtendedFabProps) {
  return (
    <button
      type={type}
      aria-hidden={hidden || undefined}
      tabIndex={hidden ? -1 : undefined}
      className={[
        'pressable inline-flex items-center justify-center h-14 pl-4 pr-5 gap-2 rounded-fab text-body font-semibold whitespace-nowrap',
        'transition-all duration-200 disabled:opacity-45 disabled:cursor-not-allowed',
        hidden ? 'translate-y-24 opacity-0 pointer-events-none' : 'translate-y-0 opacity-100',
        VARIANT_CLASSES[variant],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      <span className="shrink-0 inline-flex" aria-hidden="true">
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}
