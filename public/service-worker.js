const STATIC_CACHE = "static-cache-v2";
const DATA_CACHE = "data-cache-v1";
const RUNTIME_CACHE = "runtime-cache";

const FILES_TO_CACHE = [
	'/',
	'/index.html',
	'/css/style.css',
	'/idb.js',
	'/index.js',
	'/manifest.webmanifest',
    '/icons/icon-72x72.png',
    '/icons/icon-96x96.png',
    '/icons/icon-128x128.png',
    '/icons/icon-144x144.png',
    '/icons/icon-152x152.png',
	'/icons/icon-192x192.png',
    '/icons/icon-384x384.png',
	'/icons/icon-512x512.png'
];


// this will Install lifecycle method
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(FILES_TO_CACHE))
      .then(self.skipWaiting())
  );
});

// cleans up old caches
self.addEventListener("activate", event => {
    const currentCaches = [STATIC_CACHE, RUNTIME_CACHE];
    event.waitUntil(
      caches.keys().then(cacheNames => {
        return cacheNames.filter(cacheName => !currentCaches.includes(cacheName));
      }).then(cachesToDelete => {
        return Promise.all(cachesToDelete.map(cacheToDelete => {
          return caches.delete(cacheToDelete);
        }));
      }).then(() => self.clients.claim())
    );
  });
  
// this will fetch 
self.addEventListener("fetch", event => {
    // non GET requests are not cached and requests to other origins are not cached
    if (
        event.request.method !== "GET" ||
        !event.request.url.startsWith(self.location.origin)
    ) {
        event.respondWith(fetch(event.request));
        return;
    }

    // handles the runtime "GET requests" for the data from api routes
    if (event.request.url.includes("/api/transaction")) {
        // make network request and fallback to cache if network request fails (offline)
        event.respondWith(
            caches.open(RUNTIME_CACHE).then(cache => {
                return fetch(event.request)
                    .then(response => {
                        cache.put(event.request, response.clone());
                        return response;
                    })
                    .catch(() => caches.match(event.request));
            })
        );
        return;
    }

    // use cache first for the performance 
    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            if (cachedResponse) {
                return cachedResponse;
            }

            // request is not in cache. make network request and cache the response
            return caches.open(RUNTIME_CACHE).then(cache => {
                return fetch(event.request).then(response => {
                    return cache.put(event.request, response.clone()).then(() => {
                        return response;
                    });
                });
            });
        })
    );
});