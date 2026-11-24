import { X } from 'lucide-react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useOverlayBack } from '../../hooks/useOverlayBack';
import { Button } from './Button';
import { Dialog } from './Dialog';
import { IconButton } from './IconButton';

export interface BottomSheetProps {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  /** When true, attempting to close asks for confirmation before discarding changes (D01 AC3). */
  dirty?: boolean;
  discardTitle?: string;
  discardMessage?: string;
  children: ReactNode;
  footer?: ReactNode | ((helpers: { requestClose: () => void }) => ReactNode);
}

const DRAG_CLOSE_THRESHOLD = 96;

/**
 * Material 3 BottomSheet:
 * - Drag handle with pointer swipe-down to dismiss
 * - Sticky bottom action bar kept above virtual keyboard via visualViewport
 * - Dirty-form confirmation Dialog before discarding unsaved edits
 * - Focus trap, Esc, and Android Back history.state support
 */
export function BottomSheet(props: BottomSheetProps) {
  if (!props.open) return null;
  return <BottomSheetContent {...props} />;
}

function BottomSheetContent({
  title,
  subtitle,
  onClose,
  dirty = false,
  discardTitle = 'Bỏ thay đổi chưa lưu?',
  discardMessage = 'Các thông tin bạn vừa nhập trong biểu mẫu này sẽ bị mất.',
  children,
  footer,
}: BottomSheetProps) {
  const titleId = useId();
  const sheetRef = useRef<HTMLDivElement>(null);

  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);
  const [backRearmKey, setBackRearmKey] = useState(0);

  // Drag-to-close state
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startYRef = useRef<number | null>(null);
  const pointerIdRef = useRef<number | null>(null);

  // visualViewport keyboard inset & dynamic max-height so sticky footer stays visible
  const [viewportMetrics, setViewportMetrics] = useState<{
    bottomInset: number;
    maxHeight: number | null;
  }>(() => {
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    if (!vv) return { bottomInset: 0, maxHeight: null };
    return {
      bottomInset: Math.max(0, Math.round(window.innerHeight - (vv.height + vv.offsetTop))),
      maxHeight: Math.round(Math.max(280, vv.height * 0.92)),
    };
  });

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      const bottomInset = Math.max(0, Math.round(window.innerHeight - (vv.height + vv.offsetTop)));
      const maxHeight = Math.round(Math.max(280, vv.height * 0.92));
      setViewportMetrics({ bottomInset, maxHeight });
    };

    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

  const requestClose = useCallback(() => {
    if (dirty) {
      setConfirmDiscardOpen(true);
      return;
    }
    onClose();
  }, [dirty, onClose]);

  useFocusTrap(true, sheetRef, requestClose);
  useOverlayBack(true, requestClose, backRearmKey);

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    startYRef.current = e.clientY;
    pointerIdRef.current = e.pointerId;
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging || startYRef.current === null || pointerIdRef.current !== e.pointerId) return;
    const delta = Math.max(0, e.clientY - startYRef.current);
    setDragY(delta);
  };

  const handlePointerEnd = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging || pointerIdRef.current !== e.pointerId) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    const shouldDismiss = dragY >= DRAG_CLOSE_THRESHOLD;
    setDragging(false);
    setDragY(0);
    startYRef.current = null;
    pointerIdRef.current = null;
    if (shouldDismiss) {
      requestClose();
    }
  };

  const content = (
    <>
      <div
        className="fixed inset-x-0 top-0 z-50 flex items-end justify-center bg-scrim animate-fade-in"
        style={{ bottom: `${viewportMetrics.bottomInset}px` }}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) {
            requestClose();
          }
        }}
      >
        <div
          ref={sheetRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          style={{
            maxHeight: viewportMetrics.maxHeight ? `${viewportMetrics.maxHeight}px` : undefined,
            transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
            transition: dragging ? 'none' : undefined,
          }}
          className="sheet-panel w-full max-w-xl bg-bg rounded-t-xl shadow-sheet flex flex-col overflow-hidden focus:outline-none animate-sheet-enter"
        >
          {/* Drag zone */}
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
            className="touch-none pt-3 pb-1 px-4 cursor-grab active:cursor-grabbing shrink-0"
          >
            <div className="w-10 h-1.5 rounded-pill bg-outline-strong mx-auto" aria-hidden="true" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between gap-3 px-4 pb-3 shrink-0">
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="text-headline font-bold text-text leading-snug">
                {title}
              </h2>
              {subtitle && <p className="text-caption text-text-3 mt-0.5">{subtitle}</p>}
            </div>
            <IconButton label="Đóng biểu mẫu" onClick={requestClose} className="-mr-1">
              <X className="w-6 h-6" aria-hidden="true" />
            </IconButton>
          </div>

          {/* Scrollable form/detail body (tabIndex=0 for keyboard scrolling when content is read-only) */}
          <div
            tabIndex={0}
            className="flex-1 overflow-y-auto overscroll-contain px-4 pb-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
          >
            {children}
          </div>

          {/* Sticky bottom action bar (never obscured by keyboard) */}
          {footer && (
            <div className="shrink-0 border-t border-outline bg-bg px-4 pt-3 safe-bottom flex items-center gap-2.5">
              {typeof footer === 'function' ? footer({ requestClose }) : footer}
            </div>
          )}
        </div>
      </div>

      <Dialog
        open={confirmDiscardOpen}
        title={discardTitle}
        onClose={() => {
          setConfirmDiscardOpen(false);
          setBackRearmKey((k) => k + 1);
        }}
        maxWidthClass="max-w-sm"
        footer={
          <>
            <Button
              variant="text"
              onClick={() => {
                setConfirmDiscardOpen(false);
                setBackRearmKey((k) => k + 1);
              }}
            >
              Tiếp tục sửa
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setConfirmDiscardOpen(false);
                onClose();
              }}
            >
              Bỏ thay đổi
            </Button>
          </>
        }
      >
        <p>{discardMessage}</p>
      </Dialog>
    </>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
}
