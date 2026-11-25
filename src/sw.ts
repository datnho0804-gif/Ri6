/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import {
  createDexieSyncStore,
  loadSwNotifySettings,
  loadSwSyncConfig,
  saveSwNotifySettings,
} from './db/syncStore';
import { registerAgendaNotifications } from './sw/agenda';
import { registerNotificationClick } from './sw/notification';
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

const syncStore = createDexieSyncStore();

// T04 AC8: Background Sync (tag 'ri6-sync') reading settings/data directly from Dexie
registerBackgroundSync(self, {
  store: syncStore,
  loadConfig: () => loadSwSyncConfig(),
});

// T05 AC5: Periodic Background Sync (tag 'ri6-agenda') & notification click -> #/agenda
registerAgendaNotifications(self, {
  loadState: syncStore.loadState,
  loadNotify: () => loadSwNotifySettings(),
  saveNotify: (notify) => saveSwNotifySettings(notify),
});
registerNotificationClick(self);
