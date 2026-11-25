/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { createDexieSyncStore, loadSwSyncConfig } from './db/syncStore';
import { registerBackgroundSync } from './sw/sync';

declare let self: ServiceWorkerGlobalScope;

// Required for registerType: 'autoUpdate' when using injectManifest (SPEC §7.0)
void self.skipWaiting();
clientsClaim();

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// Serve cached index.html for offline navigation across any route under app scope
const navigationHandler = createHandlerBoundToURL('index.html');
const navigationRoute = new NavigationRoute(navigationHandler);
registerRoute(navigationRoute);

// T04 AC8: Background Sync (tag 'ri6-sync') reading settings/data directly from Dexie
registerBackgroundSync(self, {
  store: createDexieSyncStore(),
  loadConfig: () => loadSwSyncConfig(),
});
