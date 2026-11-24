import type { ReactNode } from 'react';
import { type SemanticTone, TONE_CONTAINER_CLASSES } from './tones';

export interface StatusPillProps {
  tone: SemanticTone;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * StatusPill always pairs text with icon & semantic container colors (DESIGN §4, >=14px).
 */
export function StatusPill({ tone, icon, children, className = '' }: StatusPillProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-pill text-label font-semibold whitespace-nowrap tabular-nums',
        TONE_CONTAINER_CLASSES[tone],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {icon && (
        <span className="shrink-0 inline-flex items-center" aria-hidden="true">
          {icon}
        </span>
      )}
      <span>{children}</span>
    </span>
  );
}
