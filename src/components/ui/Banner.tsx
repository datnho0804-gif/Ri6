import type { ReactNode } from 'react';
import { type SemanticTone, TONE_CONTAINER_CLASSES } from './tones';

export type BannerTone = Extract<SemanticTone, 'ok' | 'warn' | 'danger' | 'info' | 'tc' | 'sec'> | 'season';

export interface BannerProps {
  tone: BannerTone;
  icon?: ReactNode;
  title?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function Banner({
  tone,
  icon,
  title,
  children,
  action,
  className = '',
}: BannerProps) {
  const isAlert = tone === 'danger';

  if (tone === 'season') {
    return (
      <div
        role="region"
        aria-label={title ?? 'Thông tin mùa vụ'}
        className={[
          'season-banner rounded-lg p-4 flex items-start gap-3.5',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {icon && (
          <div
            className="w-11 h-11 rounded-tile bg-season-border text-on-tertiary-container flex items-center justify-center shrink-0"
            aria-hidden="true"
          >
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          {title && (
            <h2 className="text-body font-bold text-on-tertiary-container leading-snug">{title}</h2>
          )}
          <div className="text-caption text-on-tertiary-container mt-0.5 leading-snug">{children}</div>
          {action && <div className="mt-3">{action}</div>}
        </div>
      </div>
    );
  }

  return (
    <div
      role={isAlert ? 'alert' : 'status'}
      className={[
        'rounded-tile px-3.5 py-3 flex items-start gap-2.5 text-label font-medium',
        TONE_CONTAINER_CLASSES[tone],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {icon && (
        <span className="shrink-0 mt-0.5 inline-flex" aria-hidden="true">
          {icon}
        </span>
      )}
      <div className="flex-1 min-w-0 leading-snug">
        {title && <div className="font-bold text-body leading-snug mb-0.5">{title}</div>}
        <div>{children}</div>
        {action && <div className="mt-2.5">{action}</div>}
      </div>
    </div>
  );
}
