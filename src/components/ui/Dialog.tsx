import { X } from 'lucide-react';
import { useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useOverlayBack } from '../../hooks/useOverlayBack';
import { IconButton } from './IconButton';

export interface DialogProps {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  dismissOnBackdrop?: boolean;
  maxWidthClass?: string;
}

/**
 * Material 3 accessible centered Dialog with focus trap, Esc, and Android Back support (DESIGN §3 & §4).
 */
export function Dialog({
  open,
  title,
  subtitle,
  onClose,
  children,
  footer,
  dismissOnBackdrop = true,
  maxWidthClass = 'max-w-lg',
}: DialogProps) {
  const titleId = useId();
  const descId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useFocusTrap(open, dialogRef, onClose);
  useOverlayBack(open, onClose);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-scrim backdrop-blur-xs animate-fade-in"
      onMouseDown={(e) => {
        if (dismissOnBackdrop && e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitle ? descId : undefined}
        tabIndex={-1}
        className={[
          'dialog-panel w-full bg-surface rounded-xl shadow-e2 flex flex-col overflow-hidden focus:outline-none animate-screen-enter',
          maxWidthClass,
        ].join(' ')}
      >
        <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-3 border-b border-outline">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-headline font-bold text-text leading-snug">
              {title}
            </h2>
            {subtitle && (
              <p id={descId} className="text-caption text-text-3 mt-1 leading-snug">
                {subtitle}
              </p>
            )}
          </div>
          <IconButton label="Đóng hộp thoại" onClick={onClose} className="-mr-2 -mt-1">
            <X className="w-6 h-6" aria-hidden="true" />
          </IconButton>
        </div>

        <div className="px-6 py-4 overflow-y-auto flex-1 text-body text-text-2 leading-relaxed">
          {children}
        </div>

        {footer && (
          <div className="px-6 py-4 border-t border-outline bg-bg flex flex-wrap items-center justify-end gap-2.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
