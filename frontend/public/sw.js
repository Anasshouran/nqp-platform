/* Service Worker - إشعارات الويب + العمل دون اتصال لمكافحة النواقل */

const VERSION = 'afyatna-v2.0.0';
const SHELL_CACHE = 'afyatna-shell-v2';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== SHELL_CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// يُستدعى عند تسجيل الخروج أو انتهاء الجلسة: يمسح كل ما خُزّن محلياً.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'PURGE_CACHES') {
    event.waitUntil(
      caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
    );
  }
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // استجابات الـ API مصادَق عليها (Bearer)، ويجب ألّا تُخزَّن: الكاش كان يحفظ
  // بيانات المتابعة كاملة (بؤر، حالات، مخزون) ويبقى بعد تسجيل الخروج، فيقرأها
  // مستخدم تالٍ من جهاز مشترك. نكتفي برسالة عدم الاتصال.
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => new Response(
        JSON.stringify({ status: 'error', data: null, message: 'غير متصل بالإنترنت — استخدم الوضع الميداني لتسجيل العمليات محليًا' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      ))
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
      fetch(request).then((response) => {
        if (response && response.status === 200) {
          const copy = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      }).catch(() =>
        caches.open(SHELL_CACHE).then((cache) =>
          cache.match(request).then((hit) => hit || new Response('', {
            status: 503,
            statusText: 'فشل تحميل المورد — تحقق من الاتصال وأعد المحاولة',
          }))
        )
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