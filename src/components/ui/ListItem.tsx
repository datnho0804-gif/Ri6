import { Check, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { type SemanticTone, TONE_CONTAINER_CLASSES } from './tones';

export interface ListItemProps {
  title: string;
  subtitle?: string;
  leadingIcon?: ReactNode;
  leadingTone?: SemanticTone;
  trailing?: ReactNode;
  showChevron?: boolean;
  checked?: boolean;
  onToggleCheck?: () => void;
  checkLabel?: string;
  onClick?: () => void;
  divider?: boolean;
  className?: string;
}

export function ListItem({
  title,
  subtitle,
  leadingIcon,
  leadingTone = 'neutral',
  trailing,
  showChevron = false,
  checked,
  onToggleCheck,
  checkLabel,
  onClick,
  divider = false,
  className = '',
}: ListItemProps) {
  const rowClasses = [
    'flex items-center gap-3 px-4 py-3 min-h-17 w-full text-left',
    divider ? 'border-t border-surface-2' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const leadingNode = leadingIcon && (
    <div
      className={`w-11 h-11 rounded-tile flex items-center justify-center shrink-0 ${TONE_CONTAINER_CLASSES[leadingTone]}`}
      aria-hidden="true"
    >
      {leadingIcon}
    </div>
  );

  const textNode = (
    <div className="flex-1 min-w-0">
      <div className="text-body font-semibold text-text leading-snug break-words">{title}</div>
      {subtitle && (
        <div className="text-caption text-text-3 leading-snug mt-0.5 tabular-nums break-words">
          {subtitle}
        </div>
      )}
    </div>
  );

  const trailingNode = (
    <>
      {trailing && <div className="shrink-0 text-label font-semibold text-text-2">{trailing}</div>}
      {typeof checked === 'boolean' && onToggleCheck && (
        <button
          type="button"
          role="checkbox"
          aria-checked={checked}
          aria-label={checkLabel ?? `Đánh dấu xong: ${title}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleCheck();
          }}
          className="pressable w-12 h-12 -mr-2 rounded-pill flex items-center justify-center shrink-0"
        >
          <span
            className={`w-7 h-7 rounded-pill border-2 flex items-center justify-center transition ${
              checked
                ? 'bg-primary border-primary text-on-primary'
                : 'bg-surface border-outline-strong text-transparent'
            }`}
          >
            <Check className="w-4 h-4" strokeWidth={2.5} aria-hidden="true" />
          </span>
        </button>
      )}
      {showChevron && <ChevronRight className="w-5 h-5 text-text-3 shrink-0" aria-hidden="true" />}
    </>
  );

  if (onClick) {
    return (
      <div className={rowClasses}>
        <button
          type="button"
          onClick={onClick}
          className="pressable flex items-center gap-3 flex-1 min-w-0 text-left rounded-sm -m-1.5 p-1.5 min-h-12"
        >
          {leadingNode}
          {textNode}
        </button>
        {trailingNode}
      </div>
    );
  }

  return (
    <div className={rowClasses}>
      {leadingNode}
      {textNode}
      {trailingNode}
    </div>
  );
}
