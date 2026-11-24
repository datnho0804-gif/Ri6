import type { ButtonHTMLAttributes, ReactNode } from 'react';

export interface TypeTileProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  label: string;
  selected?: boolean;
}

/**
 * 3-column log-type selector tile (DESIGN §4 & mockup #3).
 */
export function TypeTile({
  icon,
  label,
  selected = false,
  disabled,
  className = '',
  type = 'button',
  ...rest
}: TypeTileProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      aria-pressed={selected}
      className={[
        'pressable min-h-17 px-2 py-2.5 rounded-md flex flex-col items-center justify-center gap-1 text-label font-semibold text-center',
        'disabled:opacity-45 disabled:cursor-not-allowed',
        selected
          ? 'bg-primary-container text-on-primary-container border-2 border-primary'
          : 'bg-surface text-text-2 border border-outline',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      <span className="shrink-0 inline-flex" aria-hidden="true">
        {icon}
      </span>
      <span className="leading-tight">{label}</span>
    </button>
  );
}
