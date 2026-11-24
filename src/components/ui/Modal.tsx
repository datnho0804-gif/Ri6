import { X } from 'lucide-react';
import { type ReactNode, useEffect, useId, useRef } from 'react';

interface ModalProps {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  dismissOnBackdrop?: boolean;
  children: ReactNode;
  footer?: ReactNode;
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Accessible reusable Modal with focus trap, focus restoration, and Escape-to-close (T01 AC5).
 */
export function Modal({
  open,
  title,
  subtitle,
  onClose,
  dismissOnBackdrop = true,
  children,
  footer,
}: ModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;

    const dialog = dialogRef.current;
    const focusables = dialog ? Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)) : [];
    const firstFocusable = focusables[0];
    if (firstFocusable) {
      firstFocusable.focus();
    } else {
      dialog?.focus();
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key === 'Tab' && dialog) {
        const items = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
        if (items.length === 0) {
          event.preventDefault();
          return;
        }
        const first = items[0];
        const last = items[items.length - 1];
        const active = document.activeElement as HTMLElement | null;

        if (event.shiftKey) {
          if (active === first || !dialog.contains(active)) {
            event.preventDefault();
            last.focus();
          }
        } else if (active === last || !dialog.contains(active)) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-ink/60 backdrop-blur-[2px] sm:p-4"
      onClick={(e) => {
        if (dismissOnBackdrop && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="bg-white w-full sm:max-w-lg max-h-[90dvh] rounded-t-3xl sm:rounded-2xl border border-sand-200 shadow-2xl flex flex-col overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-sand-200 bg-sand flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-bold text-ink leading-snug">
              {title}
            </h2>
            {subtitle && <p className="text-sm text-ink-muted mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[48px] min-h-[48px] -mr-2 rounded-xl hover:bg-sand-200 text-ink flex items-center justify-center shrink-0 transition"
            aria-label="Đóng hộp thoại"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto text-base text-ink space-y-4">{children}</div>

        {footer && (
          <div className="px-5 py-4 border-t border-sand-200 bg-sand flex items-center justify-end gap-3 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
