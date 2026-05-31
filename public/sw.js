// public/sw.js
const CACHE_NAME = "pillmind-offline-cache-v2";
const OFFLINE_URLS = [
  "/kontrol",
  "/manifest.json",
  "/globe.svg",
  "/favicon.ico"
];

// Service Worker Kurulumu ve Statik Dosyaların Önbelleğe Alınması
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(OFFLINE_URLS);
    })
  );
  self.skipWaiting();
});

// Eski Önbellek Temizleme Aktivasyonu
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("[PillMind SW] Eski Önbellek Silindi:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// İstek Yakalama ve Çevrimdışı Sürüm Yönetimi (Resilient Caching)
self.addEventListener("fetch", (event) => {
  // Yalnızca GET isteklerini işliyoruz
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // API İsteklerinde ve Next.js Serverless rotalarında önbellekleme yapılmaz, ağ kesilirse JSON hatası fırlatılır
  if (url.pathname.startsWith("/api") || url.pathname.includes("_next")) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(
          JSON.stringify({ error: "İnternet bağlantısı yok. Yerel tarama yapılıyor." }),
          {
            status: 503,
            headers: { "Content-Type": "application/json" }
          }
        );
      })
    );
    return;
  }

  // Statik içerikler için Cache-First stratejisi
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      
      return fetch(event.request)
        .then((networkResponse) => {
          // Geçerli yanıtları önbelleğe kaydet
          if (networkResponse && networkResponse.status === 200) {
            const cacheCopy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, cacheCopy);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Ağ hatası oluştuğunda ve kullanıcı sayfa değiştirmeye çalıştığında /kontrol portalını yükle
          if (event.request.mode === "navigate") {
            return caches.match("/kontrol");
          }
        });
    })
  );
});
