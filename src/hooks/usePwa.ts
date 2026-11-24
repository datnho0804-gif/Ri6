import { useCallback, useEffect, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * Registers VitePWA Service Worker (registerType: 'autoUpdate') and manages install/online state.
 * Note: Version-update Toast is emitted exclusively once in App.tsx after reload by comparing
 * Dexie `settings.lastSeenVersion` against `__APP_VERSION__` to avoid duplicate/stale toasts.
 */
export function usePwa() {
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isStandalone, setIsStandalone] = useState<boolean>(detectStandalone);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hadController = Boolean(navigator.serviceWorker?.controller);
    let reloading = false;

    const handleControllerChange = () => {
      // When a newer SW activates via skipWaiting/clientsClaim while running an older bundle,
      // reload once so the fresh bundle starts cleanly and triggers the single post-reload Toast.
      if (hadController && !reloading) {
        reloading = true;
        window.location.reload();
      }
    };

    navigator.serviceWorker?.addEventListener('controllerchange', handleControllerChange);

    registerSW({
      immediate: true,
    });

    return () => {
      navigator.serviceWorker?.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      setIsStandalone(true);
      setDeferredPrompt(null);
    };

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const onDisplayModeChange = () => setIsStandalone(detectStandalone());

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);
    mediaQuery.addEventListener('change', onDisplayModeChange);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
      mediaQuery.removeEventListener('change', onDisplayModeChange);
    };
  }, []);

  const triggerInstallPrompt = useCallback(async (): Promise<
    'accepted' | 'dismissed' | 'fallback'
  > => {
    if (!deferredPrompt) return 'fallback';
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (choice.outcome === 'accepted') {
      setIsStandalone(true);
    }
    return choice.outcome;
  }, [deferredPrompt]);

  return {
    isOnline,
    isStandalone,
    hasNativeInstallPrompt: Boolean(deferredPrompt),
    triggerInstallPrompt,
  };
}
