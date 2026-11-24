import { useCallback, useEffect, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface UsePwaOptions {
  appVersion: string;
  onUpdated: (version: string) => void;
  onOfflineReady?: () => void;
}

function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function usePwa({ appVersion, onUpdated, onOfflineReady }: UsePwaOptions) {
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isStandalone, setIsStandalone] = useState<boolean>(detectStandalone);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  // Register VitePWA Service Worker (autoUpdate) & listen for controller updates
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hadController = Boolean(navigator.serviceWorker?.controller);
    let notifiedUpdate = false;

    const handleControllerChange = () => {
      if (hadController && !notifiedUpdate) {
        notifiedUpdate = true;
        onUpdated(appVersion);
      }
    };

    navigator.serviceWorker?.addEventListener('controllerchange', handleControllerChange);

    registerSW({
      immediate: true,
      onOfflineReady() {
        onOfflineReady?.();
      },
      onNeedRefresh() {
        // autoUpdate refreshes automatically; notify if active
        if (!notifiedUpdate) {
          notifiedUpdate = true;
          onUpdated(appVersion);
        }
      },
    });

    return () => {
      navigator.serviceWorker?.removeEventListener('controllerchange', handleControllerChange);
    };
  }, [appVersion, onOfflineReady, onUpdated]);

  // Listen for online/offline & beforeinstallprompt
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
