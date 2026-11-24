import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import type { ToastItem, ToastVariant } from '../../hooks/useToast';

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

const VARIANT_CLASSES: Record<ToastVariant, string> = {
  success: 'bg-durian-900 text-white border-durian-700',
  info: 'bg-ink text-white border-stone-700',
  warning: 'bg-status-warn text-white border-amber-800',
  danger: 'bg-status-danger text-white border-red-800',
};

const VARIANT_ICONS: Record<ToastVariant, typeof CheckCircle2> = {
  success: CheckCircle2,
  info: Info,
  warning: AlertTriangle,
  danger: XCircle,
};

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 inset-x-3 sm:left-auto sm:right-6 z-50 flex flex-col gap-2 pointer-events-none sm:max-w-md sm:w-full">
      {toasts.map((toast) => {
        const Icon = VARIANT_ICONS[toast.variant];
        const isError = toast.variant === 'danger';
        return (
          <div
            key={toast.id}
            role={isError ? 'alert' : 'status'}
            aria-live={isError ? 'assertive' : 'polite'}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-2.5 rounded-2xl border shadow-xl text-base font-medium ${VARIANT_CLASSES[toast.variant]}`}
          >
            <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
            <span className="flex-1 leading-snug">{toast.message}</span>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="min-w-[48px] min-h-[48px] -mr-2 rounded-xl hover:bg-white/15 flex items-center justify-center shrink-0 transition"
              aria-label="Đóng thông báo"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
