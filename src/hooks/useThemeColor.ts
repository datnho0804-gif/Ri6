import { useEffect } from 'react';

export type ThemeBarRole = 'bg' | 'dark';

const ROLE_CSS_VAR: Record<ThemeBarRole, string> = {
  bg: '--color-bg',
  dark: '--color-text',
};

/**
 * Synchronizes <meta name="theme-color"> with semantic design tokens (DESIGN §6).
 */
export function useThemeColor(role: ThemeBarRole) {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    const previous = meta.content;
    const resolved = getComputedStyle(document.documentElement)
      .getPropertyValue(ROLE_CSS_VAR[role])
      .trim();
    if (resolved) {
      meta.content = resolved;
    }
    return () => {
      if (meta && previous) {
        meta.content = previous;
      }
    };
  }, [role]);
}
