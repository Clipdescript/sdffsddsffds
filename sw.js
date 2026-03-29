const CACHE_NAME = 'p2p-chat-v1';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  'https://unpkg.com/peerjs@1.5.2/dist/peerjs.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
