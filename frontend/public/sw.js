/* Service Worker - إشعارات الويب + العمل دون اتصال لمكافحة النواقل */

const VERSION = 'afyatna-v1.0.0';
const VECTOR_API_CACHE = 'vector-control-api-v1';
const SHELL_CACHE = 'afyatna-shell-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== VECTOR_API_CACHE && k !== SHELL_CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (url.pathname.startsWith('/api/v1/vector-control/')) {
    event.respondWith(
      caches.open(VECTOR_API_CACHE).then((cache) =>
        fetch(request).then((response) => {
          if (response && response.status === 200) cache.put(request, response.clone());
          return response;
        }).catch(() => cache.match(request).then((hit) => hit || new Response(
          JSON.stringify({ status: 'error', data: null, message: 'غير متصل بالإنترنت — استخدم الوضع الميداني لتسجيل العمليات محليًا' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        )))
      )
    );
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then((response) => {
        if (response && response.status === 200) {
          const copy = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put('index.html', copy));
        }
        return response;
      }).catch(() =>
        caches.open(SHELL_CACHE).then((cache) => cache.match('index.html').then((hit) => hit || caches.match('/')))
      )
    );
    return;
  }

  if (request.destination === 'script' || request.destination === 'style') {
    event.respondWith(
      caches.open(SHELL_CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          const fetchAndCache = fetch(request).then((response) => {
            if (response && response.status === 200) cache.put(request, response.clone());
            return response;
          }).catch(() => cached);
          return cached || fetchAndCache;
        })
      )
    );
  }
});

self.addEventListener('push', (event) => {
  let title = 'منصة الحجر الصحي القومي';
  let body = '';
  let url = '/services/tools';

  if (event.data) {
    try {
      const data = event.data.json();
      title = data.title || title;
      body = data.body || body;
      url = data.url || url;
    } catch {
      body = event.data.text() || body;
    }
  }

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      dir: 'rtl',
      lang: 'ar',
      data: { url },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/services/tools';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) {
          if ('navigate' in client) {
            client.navigate(url).catch(() => {});
          }
          client.focus();
          return;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});