import {
  AlertCircle,
  ArrowLeft,
  Cloud,
  CloudOff,
  MoreVertical,
  RefreshCw,
  Settings,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { IconButton, type StatusDotTone } from './IconButton';

export type SyncHeaderTone = 'ok' | 'warn' | 'danger' | 'info' | 'neutral';

export interface TopAppBarProps {
  title: string;
  subtitle?: string;
  variant?: 'default' | 'overlay';
  onBack?: () => void;
  backLabel?: string;
  syncStatusDot?: StatusDotTone;
  syncTone?: SyncHeaderTone;
  syncText?: string;
  syncWideText?: string;
  syncSpinning?: boolean;
  syncLabel?: string;
  isOffline?: boolean;
  onSyncClick?: () => void;
  onSettingsClick?: () => void;
  settingsActive?: boolean;
  onMoreClick?: () => void;
  moreLabel?: string;
  rightActions?: ReactNode;
  preview?: boolean;
  className?: string;
}

const SYNC_PILL_CLASSES: Record<SyncHeaderTone, string> = {
  ok: 'bg-ok-container text-ok',
  warn: 'bg-warn-container text-warn',
  danger: 'bg-danger-container text-danger',
  info: 'bg-info-container text-info',
  neutral: 'bg-surface-2 text-text-2',
};

/**
 * Material 3 TopAppBar (64px default, 56px unsticky in landscape <=500px height per D01 AC5).
 * Displays visible sync status text + icon (SPEC §6) and supports `variant="overlay"` over full-bleed hero photos.
 */
export function TopAppBar({
  title,
  subtitle,
  variant = 'default',
  onBack,
  backLabel = 'Quay lại',
  syncStatusDot,
  syncTone,
  syncText,
  syncWideText,
  syncSpinning = false,
  syncLabel = 'Trạng thái đồng bộ',
  isOffline = false,
  onSyncClick,
  onSettingsClick,
  settingsActive = false,
  onMoreClick,
  moreLabel = 'Tùy chọn khác',
  rightActions,
  preview = false,
  className = '',
}: TopAppBarProps) {
  const logoSrc = `${import.meta.env.BASE_URL}icons/logo.svg`;

  if (variant === 'overlay') {
    return (
      <header
        className={[
          'absolute top-0 inset-x-0 z-20 flex items-center justify-between gap-2 px-2 py-2 safe-top',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {onBack ? (
          <IconButton variant="scrim" label={backLabel} onClick={onBack}>
            <ArrowLeft className="w-6 h-6" aria-hidden="true" />
          </IconButton>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-1">
          {rightActions}
          {onMoreClick && (
            <IconButton variant="scrim" label={moreLabel} onClick={onMoreClick}>
              <MoreVertical className="w-6 h-6" aria-hidden="true" />
            </IconButton>
          )}
        </div>
      </header>
    );
  }

  const effectiveTone: SyncHeaderTone =
    syncTone ?? (syncStatusDot === 'ok' ? 'ok' : syncStatusDot === 'danger' ? 'danger' : isOffline ? 'warn' : 'neutral');

  return (
    <header
      className={[
        'app-top-bar sticky top-0 z-30 h-16 bg-bg/95 backdrop-blur-sm border-b border-outline/70 safe-top',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="h-full max-w-5xl mx-auto px-2 sm:px-3 rail:px-6 flex items-center gap-1.5 sm:gap-2.5">
        {onBack ? (
          <IconButton label={backLabel} onClick={onBack} className="-ml-1">
            <ArrowLeft className="w-6 h-6" aria-hidden="true" />
          </IconButton>
        ) : (
          <div
            className={[
              'w-10 h-10 rounded-sm bg-surface shadow-e1 flex items-center justify-center shrink-0',
              preview ? '' : 'rail:hidden',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <img
              src={logoSrc}
              alt=""
              width={30}
              height={30}
              decoding="async"
              className="w-7.5 h-7.5 object-contain"
            />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h1 className="text-headline font-bold text-text leading-tight truncate">{title}</h1>
          {subtitle && (
            <p className="text-caption text-text-3 leading-tight truncate tabular-nums">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center gap-0 sm:gap-1 shrink-0">
          {rightActions}
          {onSyncClick &&
            (syncText ? (
              <button
                type="button"
                onClick={onSyncClick}
                aria-label={syncLabel}
                title={syncLabel}
                className="pressable min-h-12 min-w-12 px-0.5 flex items-center justify-center rounded-pill"
              >
                <span
                  className={[
                    'inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-pill text-label font-semibold leading-none whitespace-nowrap tabular-nums',
                    SYNC_PILL_CLASSES[effectiveTone],
                  ].join(' ')}
                >
                  {syncSpinning ? (
                    <RefreshCw
                      className="w-4 h-4 shrink-0 animate-spin motion-reduce:animate-none"
                      aria-hidden="true"
                    />
                  ) : effectiveTone === 'danger' ? (
                    <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                  ) : isOffline ? (
                    <CloudOff className="w-4 h-4 shrink-0" aria-hidden="true" />
                  ) : (
                    <Cloud className="w-4 h-4 shrink-0" aria-hidden="true" />
                  )}
                  {syncWideText ? (
                    <>
                      <span className="sm:hidden">{syncText}</span>
                      <span className="hidden sm:inline">{syncWideText}</span>
                    </>
                  ) : (
                    <span>{syncText}</span>
                  )}
                </span>
              </button>
            ) : (
              <IconButton
                label={syncLabel}
                statusDot={syncStatusDot ?? (isOffline ? 'warn' : 'neutral')}
                onClick={onSyncClick}
              >
                {isOffline ? (
                  <CloudOff className="w-6 h-6" aria-hidden="true" />
                ) : (
                  <Cloud className="w-6 h-6" aria-hidden="true" />
                )}
              </IconButton>
            ))}
          {onSettingsClick && (
            <IconButton
              label="Cài đặt"
              variant={settingsActive ? 'tonal' : 'standard'}
              aria-current={settingsActive ? 'page' : undefined}
              onClick={onSettingsClick}
              className={preview ? '' : 'rail:hidden'}
            >
              <Settings className="w-6 h-6" aria-hidden="true" />
            </IconButton>
          )}
        </div>
      </div>
    </header>
  );
}
