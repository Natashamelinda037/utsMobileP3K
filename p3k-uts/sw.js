const CACHE_NAME = 'p3k-offline-v3';

// 1. Saat pertama kali dibuka (Online), simpan halaman utama
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Mencache halaman utama...');
      return cache.addAll(['./', './index.html']);
    })
  );
  // Paksa Service Worker langsung aktif, tidak perlu tunggu yang lama
  self.skipWaiting();
});

// 2. Bersihkan cache lama saat ada versi baru
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Menghapus cache lama:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. RAHASIANYA DI SINI: Simpan gambar & file secara otomatis
self.addEventListener('fetch', (event) => {
  // HANYA tangani request GET dan HTTP/HTTPS (abaikan POST & chrome-extension)
  if (event.request.method !== 'GET' || 
      !event.request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Jika sudah ada di cache, langsung kasih
      if (response) {
        return response;
      }
      
      // Jika belum ada, ambil dari internet
      return fetch(event.request).then((networkResponse) => {
        // Jangan cache jika response error atau bukan 200 OK
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        
        // Simpan ke dalam cache untuk dipakai nanti
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        
        return networkResponse;
      }).catch(() => {
        // Jika gagal ambil dari internet dan tidak ada di cache
        console.log('Gagal fetch dan tidak ada di cache:', event.request.url);
      });
    })
  );
});