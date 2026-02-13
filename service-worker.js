const CACHE_NAME = 'tes-speaking-v2';
const URLS_TO_CACHE = [
    '/',
    '/index.html',
    '/css/style.css',
    '/js/supabase.js',
    '/favicon.png',
    '/manifest.json'
];

// Install Event - cache essential files & activate immediately
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache:', CACHE_NAME);
                return cache.addAll(URLS_TO_CACHE);
            })
    );
    // Skip waiting - activate new SW immediately
    self.skipWaiting();
});

// Fetch Event - Network First strategy
// Always tries network first, falls back to cache if offline
self.addEventListener('fetch', event => {
    event.respondWith(
        fetch(event.request)
            .then(response => {
                // Got network response - cache it and return
                if (response && response.status === 200) {
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME)
                        .then(cache => {
                            cache.put(event.request, responseToCache);
                        });
                }
                return response;
            })
            .catch(() => {
                // Network failed - try cache
                return caches.match(event.request);
            })
    );
});

// Activate Event - clean up old caches & claim all clients
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            // Take control of all open pages immediately
            return self.clients.claim();
        })
    );
});
