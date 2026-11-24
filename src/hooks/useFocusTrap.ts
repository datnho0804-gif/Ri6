import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const activeOverlayStack: symbol[] = [];

/**
 * Shared accessible focus trap + Escape key + body scroll lock supporting nested overlays.
 */
export function useFocusTrap(
  open: boolean,
  containerRef: React.RefObject<HTMLElement | null>,
  onEscape: () => void,
) {
  const onEscapeRef = useRef(onEscape);
  useEffect(() => {
    onEscapeRef.current = onEscape;
  });

  useEffect(() => {
    if (!open) return;

    const token = Symbol('overlay');
    activeOverlayStack.push(token);

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    if (activeOverlayStack.length === 1) {
      document.body.style.overflow = 'hidden';
    }

    const focusFirst = () => {
      const container = containerRef.current;
      if (!container) return;
      const focusables = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      const target = focusables[0] ?? container;
      target.focus();
    };

    const timer = window.setTimeout(focusFirst, 10);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (activeOverlayStack[activeOverlayStack.length - 1] !== token) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        onEscapeRef.current();
        return;
      }

      if (event.key !== 'Tab') return;
      const container = containerRef.current;
      if (!container) return;
      const focusables = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusables.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey) {
        if (document.activeElement === first || !container.contains(document.activeElement)) {
          event.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last || !container.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('keydown', handleKeyDown);
      const idx = activeOverlayStack.lastIndexOf(token);
      if (idx !== -1) {
        activeOverlayStack.splice(idx, 1);
      }
      if (activeOverlayStack.length === 0) {
        document.body.style.overflow = prevOverflow;
      }
      previouslyFocused?.focus();
    };
  }, [open, containerRef]);
}
