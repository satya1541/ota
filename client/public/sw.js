// Universal OTA - Service Worker
const CACHE_NAME = 'ota-manager-v2';
const RUNTIME_CACHE = 'ota-runtime-v2';

// Assets to cache immediately on install
const PRECACHE_ASSETS = [
  '/',
  '/site.webmanifest',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png'
];

// API routes that should use network-first strategy
const API_ROUTES = [
  '/api/devices',
  '/api/firmware',
  '/api/logs',
  '/api/audit-logs'
];

// Install event - precache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Precaching static assets');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Allow the app to trigger immediate activation
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - handle requests with appropriate strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip WebSocket connections
  if (url.protocol === 'ws:' || url.protocol === 'wss:') {
    return;
  }

  // Skip video/audio files - they use range requests (206) which can't be cached
  if (request.destination === 'video' || 
      request.destination === 'audio' ||
      url.pathname.endsWith('.mp4') ||
      url.pathname.endsWith('.webm') ||
      url.pathname.endsWith('.mp3') ||
      url.pathname.endsWith('.ogg')) {
    return; // Let browser handle directly
  }

  // API routes - Network first, fallback to cache
  if (API_ROUTES.some(route => url.pathname.startsWith(route))) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Static assets - Cache first, fallback to network
  if (request.destination === 'image' || 
      request.destination === 'font' ||
      url.pathname.endsWith('.js') ||
      url.pathname.endsWith('.css')) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // HTML navigation - Network first for fresh content
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  // Default - Network first
  event.respondWith(networkFirst(request));
});

// Cache-first strategy
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    // Only cache complete responses (status 200), not partial (206)
    if (networkResponse.ok && networkResponse.status === 200) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network request failed:', error);
    // Return offline fallback if available
    return caches.match('/') || new Response('Offline', { status: 503 });
  }
}

// Network-first strategy
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    // Only cache complete responses (status 200), not partial (206)
    if (networkResponse.ok && networkResponse.status === 200) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network request failed, trying cache:', error);
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/') || new Response('Offline', { status: 503 });
    }
    return new Response('Offline', { status: 503 });
  }
}

// Handle push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || 'New notification from Universal OTA',
    icon: '/android-chrome-192x192.png',
    badge: '/android-chrome-192x192.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
      dateOfArrival: Date.now()
    },
    actions: data.actions || [
      { action: 'view', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Universal OTA', options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Focus existing window if available
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-device-updates') {
    event.waitUntil(syncDeviceUpdates());
  }
});

async function syncDeviceUpdates() {
  // Sync any pending device updates when back online
  console.log('[SW] Syncing device updates...');
  // Implementation would depend on IndexedDB storage of pending actions
}

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-device-status') {
    event.waitUntil(checkDeviceStatus());
  }
});

async function checkDeviceStatus() {
  console.log('[SW] Periodic device status check...');
  // Could fetch device status and show notification if issues found
}
