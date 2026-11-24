import { useEffect } from 'react';

/**
 * Synchronizes <meta name="theme-color"> with the active screen's top bar background (DESIGN §6).
 */
export function useThemeColor(color: string) {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    const previous = meta.content;
    meta.content = color;
    return () => {
      if (meta) {
        meta.content = previous || '#faf8f5';
      }
    };
  }, [color]);
}
