/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';

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
