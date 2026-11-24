import type { ReactNode } from 'react';
import { Card } from './Card';

export interface Ri6ProgressProps {
  /** Days since xổ nhụy (0 to 105+). */
  day: number;
  subtitle?: string;
  children?: ReactNode;
  className?: string;
}

const MAX_DAYS = 105;

/**
 * Ri6 fruit development timeline (0 -> 105 days) showing Kali 55-65, Lên cơm 60-65, Thu hoạch 90-105 (DESIGN §4).
 */
export function Ri6Progress({ day, subtitle, children, className = '' }: Ri6ProgressProps) {
  const clamped = Math.max(0, Math.min(MAX_DAYS, day));
  const pct = (clamped / MAX_DAYS) * 100;

  return (
    <Card padding="md" className={className}>
      <div className="flex items-baseline justify-between gap-2 flex-wrap">
        <strong className="text-headline font-bold text-text tabular-nums">Ngày {day}</strong>
        {subtitle && <span className="text-caption text-text-3 tabular-nums">{subtitle}</span>}
      </div>

      <div
        role="progressbar"
        aria-label="Tiến độ nuôi trái Ri6"
        aria-valuemin={0}
        aria-valuemax={MAX_DAYS}
        aria-valuenow={clamped}
        aria-valuetext={`Ngày ${day} trên ${MAX_DAYS} ngày`}
        className="relative h-3 rounded-pill bg-surface-2 my-3.5"
      >
        {/* Kali 55-65 band (52.4%..61.9%) */}
        <span
          aria-hidden="true"
          className="absolute -top-0.5 -bottom-0.5 rounded-sm bg-tertiary/35"
          style={{ left: `${(55 / MAX_DAYS) * 100}%`, width: `${(10 / MAX_DAYS) * 100}%` }}
        />
        {/* Harvest 90-105 band (85.7%..100%) */}
        <span
          aria-hidden="true"
          className="absolute -top-0.5 -bottom-0.5 rounded-sm bg-tertiary/60"
          style={{ left: `${(90 / MAX_DAYS) * 100}%`, width: `${(15 / MAX_DAYS) * 100}%` }}
        />
        {/* Current fill */}
        <span
          aria-hidden="true"
          className="ri6-track-fill absolute left-0 top-0 bottom-0 rounded-pill"
          style={{ width: `${pct}%` }}
        />
        {/* Today vertical indicator */}
        <span
          aria-hidden="true"
          className="absolute -top-1.5 w-1 h-6 rounded-pill bg-primary -translate-x-0.5"
          style={{ left: `${pct}%` }}
        />
      </div>

      <div className="flex items-center justify-between gap-2 text-caption font-medium text-text-3 tabular-nums flex-wrap">
        <span>Kali 55–65</span>
        <span>Lên cơm 60–65</span>
        <span>Thu 90–105</span>
      </div>

      {children && <div className="mt-3 space-y-2">{children}</div>}
    </Card>
  );
}
