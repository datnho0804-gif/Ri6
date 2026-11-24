import { Camera } from 'lucide-react';
import type { ReactNode } from 'react';
import { StatusPill } from './StatusPill';
import type { SemanticTone } from './tones';

export interface PhotoTileProps {
  code: string;
  src?: string | null;
  alt?: string;
  statusTone?: SemanticTone;
  statusIcon?: ReactNode;
  statusLabel?: string;
  emptyLabel?: string;
  onClick?: () => void;
  className?: string;
}

/**
 * 1:1 rounded-md tree photo tile with code chip & StatusPill, or dashed empty capture state (DESIGN §4).
 */
export function PhotoTile({
  code,
  src,
  alt,
  statusTone = 'ok',
  statusIcon,
  statusLabel,
  emptyLabel = 'Chụp ảnh gốc',
  onClick,
  className = '',
}: PhotoTileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'pressable relative aspect-square w-full min-w-12 min-h-12 rounded-md overflow-hidden text-left block',
        src
          ? 'bg-surface-2 shadow-e1'
          : 'bg-surface border-2 border-dashed border-outline-strong',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className="absolute left-1.5 top-1.5 z-10 bg-hero-pill text-text text-label font-bold px-2 py-0.5 rounded-pill leading-tight shadow-e1">
        {code}
      </span>

      {src ? (
        <img
          src={src}
          alt={alt ?? `Ảnh cây ${code}`}
          width={480}
          height={480}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="w-full h-full flex flex-col items-center justify-center gap-0.5 px-2 pt-7 pb-9 text-text-2 text-center">
          <Camera className="w-5 h-5 text-primary shrink-0" aria-hidden="true" />
          <span className="text-label font-semibold leading-tight truncate max-w-full">
            {emptyLabel}
          </span>
        </span>
      )}

      {statusLabel && (
        <span className="absolute left-1.5 bottom-1.5 right-1.5 z-10 flex justify-center">
          <StatusPill
            tone={statusTone}
            icon={statusIcon}
            className="max-w-full truncate px-2 py-0.5 gap-1"
          >
            {statusLabel}
          </StatusPill>
        </span>
      )}
    </button>
  );
}
