import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import type { SnackbarItem, SnackbarTone } from '../../hooks/useSnackbar';

interface SnackbarProps {
  items: SnackbarItem[];
  onDismiss: (id: string) => void;
}

const TONE_ICONS: Record<SnackbarTone, typeof Info> = {
  ok: CheckCircle2,
  info: Info,
  warn: AlertTriangle,
  danger: AlertCircle,
};

const TONE_ICON_CLASSES: Record<SnackbarTone, string> = {
  ok: 'text-primary-container',
  info: 'text-info-container',
  warn: 'text-tertiary-container',
  danger: 'text-danger-container',
};

/**
 * Material 3 Snackbar with high-contrast dark surface and optional "Hoàn tác" action (DESIGN §4 & §6).
 * Portaled to document.body at z-70 so toasts remain visible above BottomSheet (z-50) and Dialog (z-60).
 */
export function Snackbar({ items, onDismiss }: SnackbarProps) {
  if (items.length === 0) return null;

  const content = (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="fixed bottom-24 rail:bottom-6 inset-x-4 z-70 flex flex-col items-center gap-2 pointer-events-none"
    >
      {items.map((item) => {
        const Icon = TONE_ICONS[item.tone];
        return (
          <div
            key={item.id}
            role={item.tone === 'danger' ? 'alert' : 'status'}
            className="pointer-events-auto w-full max-w-md bg-text text-surface rounded-md shadow-e2 pl-4 pr-1.5 py-1.5 flex items-center gap-2.5 animate-screen-enter"
          >
            <Icon className={`w-5 h-5 shrink-0 ${TONE_ICON_CLASSES[item.tone]}`} aria-hidden="true" />
            <p className="flex-1 min-w-0 text-label font-medium text-surface leading-snug py-2">
              {item.message}
            </p>
            {item.actionLabel && item.onAction && (
              <button
                type="button"
                onClick={() => {
                  item.onAction?.();
                  onDismiss(item.id);
                }}
                className="pressable min-h-12 px-3 rounded-sm text-label font-bold text-primary-container whitespace-nowrap shrink-0"
              >
                {item.actionLabel}
              </button>
            )}
            <button
              type="button"
              onClick={() => onDismiss(item.id)}
              aria-label="Đóng thông báo"
              className="pressable w-12 h-12 min-w-12 min-h-12 rounded-pill flex items-center justify-center text-surface shrink-0"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
}
