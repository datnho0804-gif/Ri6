export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
}

export interface SegmentedButtonProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}

export function SegmentedButton<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className = '',
}: SegmentedButtonProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={[
        'grid bg-surface-2 rounded-tile p-1 gap-1',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={selected}
            disabled={opt.disabled}
            onClick={() => onChange(opt.value)}
            className={[
              'pressable min-h-12 px-1 rounded-sm text-label font-semibold whitespace-nowrap truncate',
              'disabled:opacity-45 disabled:cursor-not-allowed',
              selected ? 'bg-surface text-text shadow-e1' : 'bg-transparent text-text-2',
            ].join(' ')}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
