import { ArrowLeft, Cloud, CloudOff, MoreVertical, Settings } from 'lucide-react';
import type { ReactNode } from 'react';
import { IconButton, type StatusDotTone } from './IconButton';

export interface TopAppBarProps {
  title: string;
  subtitle?: string;
  variant?: 'default' | 'overlay';
  onBack?: () => void;
  backLabel?: string;
  syncStatusDot?: StatusDotTone;
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

/**
 * Material 3 TopAppBar (64px default, 56px unsticky in landscape <=500px height per D01 AC5).
 * Also supports transparent `variant="overlay"` over full-bleed hero tree photos (DESIGN §3 & §4).
 */
export function TopAppBar({
  title,
  subtitle,
  variant = 'default',
  onBack,
  backLabel = 'Quay lại',
  syncStatusDot,
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

  return (
    <header
      className={[
        'app-top-bar sticky top-0 z-30 h-16 bg-bg/95 backdrop-blur-sm border-b border-outline/70 safe-top',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="h-full max-w-5xl mx-auto px-3 rail:px-6 flex items-center gap-3">
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

        <div className="flex items-center gap-0.5 shrink-0">
          {rightActions}
          {onSyncClick && (
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
          )}
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
