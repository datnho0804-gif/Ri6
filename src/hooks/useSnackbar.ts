import { useCallback, useEffect, useRef, useState } from 'react';

export type SnackbarTone = 'ok' | 'info' | 'warn' | 'danger';

export interface SnackbarItem {
  id: string;
  message: string;
  tone: SnackbarTone;
  actionLabel?: string;
  onAction?: () => void;
}

export interface ShowSnackbarOptions {
  tone?: SnackbarTone;
  actionLabel?: string;
  onAction?: () => void;
  durationMs?: number;
}

export function useSnackbar() {
  const [items, setItems] = useState<SnackbarItem[]>([]);
  const timersRef = useRef<Map<string, number>>(new Map());

  const dismissSnackbar = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const showSnackbar = useCallback(
    (message: string, options: ShowSnackbarOptions = {}) => {
      const { tone = 'ok', actionLabel, onAction } = options;
      const durationMs = options.durationMs ?? (onAction ? 5000 : 4000);
      const id = `sb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      setItems((prev) => [...prev.slice(-2), { id, message, tone, actionLabel, onAction }]);

      const timer = window.setTimeout(() => {
        timersRef.current.delete(id);
        setItems((prev) => prev.filter((item) => item.id !== id));
      }, durationMs);
      timersRef.current.set(id, timer);

      return id;
    },
    [],
  );

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const timer of timers.values()) {
        window.clearTimeout(timer);
      }
      timers.clear();
    };
  }, []);

  return { items, showSnackbar, dismissSnackbar };
}
