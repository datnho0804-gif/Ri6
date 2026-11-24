import { useEffect, useRef } from 'react';

let overlayCounter = 0;

/**
 * Integrates an overlay (BottomSheet, Dialog, Lightbox) with browser/Android Back button via history.state (DESIGN §6).
 */
export function useOverlayBack(open: boolean, onBackRequest: () => void, rearmKey = 0) {
  const onBackRef = useRef(onBackRequest);
  useEffect(() => {
    onBackRef.current = onBackRequest;
  });

  const stateIdRef = useRef<string | null>(null);
  const pushedRef = useRef(false);

  useEffect(() => {
    if (!open || typeof window === 'undefined') return;

    const id = `ri6-overlay-${++overlayCounter}`;
    stateIdRef.current = id;
    const currentState =
      window.history.state && typeof window.history.state === 'object'
        ? (window.history.state as Record<string, unknown>)
        : {};
    window.history.pushState({ ...currentState, ri6Overlay: id }, '');
    pushedRef.current = true;

    const handlePopState = () => {
      if (!pushedRef.current) return;
      const st = window.history.state as Record<string, unknown> | null;
      if (st?.ri6Overlay !== id) {
        pushedRef.current = false;
        onBackRef.current();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (pushedRef.current) {
        pushedRef.current = false;
        const st = window.history.state as Record<string, unknown> | null;
        if (st?.ri6Overlay === id) {
          window.history.back();
        }
      }
      stateIdRef.current = null;
    };
  }, [open, rearmKey]);
}
