
/* ==========================================
   SERVICE WORKER
   Sistem Pelaporan Keuangan Dapur SPPG
   Yayasan Gawe Rancage Pasundan
========================================== */

// Ganti nomor versi setiap ada perubahan aset penting.
const CACHE_VERSION = "sppg-cache-v1";

const STATIC_CACHE = CACHE_VERSION + "-static";
const PAGE_CACHE = CACHE_VERSION + "-pages";

// Semua file menggunakan alamat relatif
// agar sesuai dengan GitHub Pages /new-web/.

const BASE_PATH = new URL("./", self.location).pathname;

const CORE_FILES = [
  BASE_PATH,
  BASE_PATH + "index.html",
  BASE_PATH + "background-sppg.png",
  BASE_PATH + "logo-yayasan.png"
];


/* ==========================================
   1. INSTALL
   Menyimpan file utama ke cache
========================================== */

self.addEventListener("install", event => {

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(CORE_FILES))
      .then(() => self.skipWaiting())
      .catch(error => {
        console.error("Service Worker install gagal:", error);
        throw error;
      })
  );

});


/* ==========================================
   2. ACTIVATE
   Menghapus cache versi lama
========================================== */

self.addEventListener("activate", event => {

  event.waitUntil(

    caches.keys().then(cacheNames => {

      return Promise.all(

        cacheNames
          .filter(name =>
            name.startsWith("sppg-cache-") &&
            name !== STATIC_CACHE &&
            name !== PAGE_CACHE
          )
          .map(name => caches.delete(name))

      );

    }).then(() => self.clients.claim())

  );

});


/* ==========================================
   3. FETCH
   Mengatur permintaan halaman dan aset
========================================== */

self.addEventListener("fetch", event => {

  const request = event.request;

  // Hanya menangani GET.
  // Login POST ke Apps Script tidak dicegat.

  if (request.method !== "GET") {
    return;
  }

  const requestURL = new URL(request.url);

  // Hanya menangani file dari domain sendiri.
  // Google Apps Script dan domain lain dilewatkan.

  if (requestURL.origin !== self.location.origin) {
    return;
  }

  // Jangan menangani file di luar folder aplikasi.

  if (!requestURL.pathname.startsWith(BASE_PATH)) {
    return;
  }


  /* --------------------------------------
     A. HALAMAN HTML
     Network first, cache sebagai cadangan
  -------------------------------------- */

  if (request.mode === "navigate") {

    event.respondWith(

      fetch(request)
        .then(response => {

          if (response && response.ok) {

            const responseCopy = response.clone();

            caches.open(PAGE_CACHE).then(cache => {
              cache.put(request, responseCopy);
            });

          }

          return response;

        })
        .catch(async () => {

          const cachedPage = await caches.match(request);

          if (cachedPage) {
            return cachedPage;
          }

          const offlinePage = await caches.match(
            BASE_PATH + "index.html"
          );

          if (offlinePage) {
            return offlinePage;
          }

          return new Response(
            "Koneksi internet tidak tersedia. Silakan coba kembali.",
            {
              status: 503,
              headers: {
                "Content-Type": "text/plain; charset=utf-8"
              }
            }
          );

        })

    );

    return;
  }


  /* --------------------------------------
     B. FILE GAMBAR, CSS, JAVASCRIPT
     Cache first, lalu jaringan
  -------------------------------------- */

  event.respondWith(

    caches.match(request).then(cachedResponse => {

      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then(response => {

        if (
          response &&
          response.ok &&
          response.type === "basic"
        ) {

          const responseCopy = response.clone();

          caches.open(STATIC_CACHE).then(cache => {
            cache.put(request, responseCopy);
          });

        }

        return response;

      });

    })

  );

});


/* ==========================================
   4. PESAN DARI HALAMAN APLIKASI
========================================== */

self.addEventListener("message", event => {

  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }

});

