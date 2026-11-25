import type { ReactNode } from 'react';
import { RI6 } from '../../lib/agronomy';
import { Card } from './Card';

export interface Ri6ProgressProps {
  /** Days since xổ nhụy (0 to RI6.harvest[1]+). */
  day: number;
  subtitle?: string;
  children?: ReactNode;
  className?: string;
}

const MAX_DAYS = RI6.harvest[1];
const [KALI_START, KALI_END] = RI6.potassium;
const [FLESH_START, FLESH_END] = RI6.fleshFilling;
const [HARVEST_START, HARVEST_END] = RI6.harvest;

/**
 * Ri6 fruit development timeline (0 -> RI6.harvest[1] days) reading all bands from src/lib/agronomy.ts (DESIGN §4).
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
        {/* Potassium band from RI6.potassium */}
        <span
          aria-hidden="true"
          className="absolute -top-0.5 -bottom-0.5 rounded-sm bg-tertiary/35"
          style={{
            left: `${(KALI_START / MAX_DAYS) * 100}%`,
            width: `${((KALI_END - KALI_START) / MAX_DAYS) * 100}%`,
          }}
        />
        {/* Harvest band from RI6.harvest */}
        <span
          aria-hidden="true"
          className="absolute -top-0.5 -bottom-0.5 rounded-sm bg-tertiary/60"
          style={{
            left: `${(HARVEST_START / MAX_DAYS) * 100}%`,
            width: `${((HARVEST_END - HARVEST_START) / MAX_DAYS) * 100}%`,
          }}
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
        <span>
          Kali {KALI_START}–{KALI_END}
        </span>
        <span>
          Lên cơm {FLESH_START}–{FLESH_END}
        </span>
        <span>
          Thu {HARVEST_START}–{HARVEST_END}
        </span>
      </div>

      {children && <div className="mt-3 space-y-2">{children}</div>}
    </Card>
  );
}
