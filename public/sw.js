const STATIC_CACHE_NAME = 'cctv-app-static-v3';
const DATA_CACHE_NAME = 'cctv-requests-cache-v3';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/index.css',
        '/favicon.ico',
      ]);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  const allowedCaches = [STATIC_CACHE_NAME, DATA_CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!allowedCaches.includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Dedicated caching mechanism for My Requests data API (/api/requests and /api/my-requests)
  if (url.pathname === '/api/requests' || url.pathname === '/api/my-requests') {
    if (event.request.method === 'GET') {
      event.respondWith(
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(DATA_CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache.clone());
                cache.put('/api/requests', responseToCache);
              });
            }
            return networkResponse;
          })
          .catch(async () => {
            // Device is offline: retrieve cached My Requests history
            const dataCache = await caches.open(DATA_CACHE_NAME);
            const cachedResponse = (await dataCache.match(event.request)) || (await dataCache.match('/api/requests'));
            if (cachedResponse) {
              const headers = new Headers(cachedResponse.headers);
              headers.set('X-From-SW-Cache', 'true');
              const blob = await cachedResponse.blob();
              return new Response(blob, {
                status: 200,
                statusText: 'OK (From Service Worker Offline Cache)',
                headers: headers
              });
            }
            // Fallback response if cache has not yet been populated
            return new Response(JSON.stringify([]), {
              status: 200,
              headers: { 
                'Content-Type': 'application/json',
                'X-From-SW-Cache': 'empty'
              }
            });
          })
      );
      return;
    }
  }

  // Skip other API routes (Gemini, third-party, etc.)
  if (event.request.method !== 'GET' || url.pathname.startsWith('/api/')) {
    return;
  }

  // Network First, Fallback to Cache strategy for static assets and HTML
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Cache successful responses
        if (networkResponse && networkResponse.status === 200 && (networkResponse.type === 'basic' || networkResponse.type === 'cors')) {
          const responseToCache = networkResponse.clone();
          caches.open(STATIC_CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        // If network fails, try cache
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // If it's a navigation request and we're offline, return index.html
        if (event.request.mode === 'navigate') {
          return (await caches.match('/index.html')) || (await caches.match('/'));
        }
      })
  );
});

// ==========================================
// Web Push & Service Worker Notifications
// ==========================================

// Listen for incoming Push events (even when tab is closed)
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: '🔔 อัปเดตสถานะคำร้อง CCTV', body: event.data.text() };
    }
  }

  const title = data.title || '🔔 อัปเดตสถานะคำร้อง CCTV';
  const requestId = data.requestId || '';
  const status = data.status || '';

  // Determine badge or highlights based on Approved / Completed status
  const isApprovedOrCompleted = status === 'approved' || status === 'completed' || status === 'closed';

  const options = {
    body: data.body || (isApprovedOrCompleted ? 'คำร้องของคุณได้รับการอนุมัติหรือดำเนินการเสร็จสิ้นแล้ว' : 'มีการปรับปรุงสถานะคำร้องของคุณ'),
    icon: data.icon || '/favicon.ico',
    badge: data.badge || '/favicon.ico',
    tag: data.tag || `cctv-status-${requestId || Date.now()}`,
    data: {
      url: data.url || (requestId ? `/?trackId=${encodeURIComponent(requestId)}` : '/'),
      requestId: requestId,
      status: status
    },
    vibrate: isApprovedOrCompleted ? [200, 100, 200, 100, 300] : [200, 100, 200],
    requireInteraction: true,
    actions: [
      {
        action: 'view_details',
        title: '🔍 ดูรายละเอียดคำร้อง'
      },
      {
        action: 'close',
        title: 'ปิด'
      }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const targetUrl = (event.notification.data && event.notification.data.url) 
    ? event.notification.data.url 
    : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if an existing tab is open for this origin
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return;
        }
      }
      // If no window tab is open, open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Handle custom message commands from the client
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    if (self.registration && self.registration.showNotification) {
      event.waitUntil(self.registration.showNotification(title, options));
    }
  }

  // Client requests to proactively cache My Requests data in Service Worker cache storage
  if (event.data.type === 'CACHE_MY_REQUESTS') {
    const requests = event.data.payload || [];
    const jsonStr = JSON.stringify(requests);
    const cachedResponse = new Response(jsonStr, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-SW-Cached-At': new Date().toISOString(),
        'X-SW-Item-Count': String(requests.length)
      }
    });

    event.waitUntil(
      caches.open(DATA_CACHE_NAME).then((cache) => {
        return Promise.all([
          cache.put('/api/requests', cachedResponse.clone()),
          cache.put('/api/my-requests', cachedResponse)
        ]);
      }).then(() => {
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({ success: true, count: requests.length });
        }
      }).catch((err) => {
        console.error('[ServiceWorker] Failed to cache requests in DATA_CACHE_NAME:', err);
      })
    );
  }

  // Client queries cached My Requests from Service Worker cache storage
  if (event.data.type === 'GET_CACHED_MY_REQUESTS') {
    event.waitUntil(
      caches.open(DATA_CACHE_NAME).then(async (cache) => {
        const match = (await cache.match('/api/requests')) || (await cache.match('/api/my-requests'));
        if (match) {
          const list = await match.json();
          if (event.ports && event.ports[0]) {
            event.ports[0].postMessage({ success: true, requests: list, fromCache: true });
          }
        } else {
          if (event.ports && event.ports[0]) {
            event.ports[0].postMessage({ success: true, requests: [], fromCache: false });
          }
        }
      }).catch((err) => {
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({ success: false, error: err.message, requests: [] });
        }
      })
    );
  }
});
