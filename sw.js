/* sw.js — Service Worker: offline cache + ağ öncelikli strateji */

const CACHE_NAME = 'okul-v1';

// Önbelleğe alınacak dosyalar
const STATIC_FILES = [
  './index.html',
  './styles.css',
  './app.js',
  './schedule.js',
  './subjects.js',
  './homework.js',
  './exams.js',
  './notes.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

// Kurulum: tüm dosyaları cache'le
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_FILES.map(f => {
        // icon dosyaları yoksa hata vermesin
        return fetch(f).then(r => r.ok ? cache.put(f, r) : null).catch(()=>null);
      })))
      .then(() => self.skipWaiting())
  );
});

// Aktivasyon: eski cache'leri temizle
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: önce ağ, başarısız olursa cache
self.addEventListener('fetch', event => {
  // Sadece GET isteklerini yakala
  if (event.request.method !== 'GET') return;

  // API isteklerini (alıntı, çeviri) her zaman ağdan al
  const url = event.request.url;
  if (url.includes('dummyjson.com') || url.includes('mymemory') || url.includes('fonts.')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Uygulama dosyaları: cache önce, yoksa ağ
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);
    })
  );
});
