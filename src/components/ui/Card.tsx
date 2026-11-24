import type { HTMLAttributes, ReactNode } from 'react';
import { type SemanticTone, TONE_TEXT_CLASSES } from './tones';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  elevated?: boolean;
  children: ReactNode;
}

const PAD_CLASSES = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5',
};

export function Card({
  padding = 'md',
  elevated = true,
  className = '',
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={[
        'bg-surface rounded-lg overflow-hidden',
        elevated ? 'shadow-e1' : 'border border-outline',
        PAD_CLASSES[padding],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </div>
  );
}

export interface KpiCardProps {
  value: string | number;
  label: string;
  tone?: SemanticTone;
  onClick?: () => void;
  className?: string;
}

export function KpiCard({
  value,
  label,
  tone = 'neutral',
  onClick,
  className = '',
}: KpiCardProps) {
  const content = (
    <>
      <span className={`block text-kpi font-bold tabular-nums ${TONE_TEXT_CLASSES[tone]}`}>
        {value}
      </span>
      <span className="block text-label font-medium text-text-2 mt-1 leading-snug">{label}</span>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={[
          'pressable bg-surface rounded-lg shadow-e1 p-3.5 text-left w-full min-h-24 flex flex-col justify-between',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      className={[
        'bg-surface rounded-lg shadow-e1 p-3.5 min-h-24 flex flex-col justify-between',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {content}
    </div>
  );
}
