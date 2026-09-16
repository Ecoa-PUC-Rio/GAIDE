// Bump this on every change to any shell file below — activate() deletes any
// cache that isn't this name, which is how an already-installed phone
// actually picks up a new version (plan.md). v5: specs/task-calendar/ adds
// data.js/calendar.js/render.js as separate ES modules the browser fetches
// alongside app.js (task 10's module split) — all three must be cached too,
// or an offline reload after this update would fail to load the app at all.
const CACHE_NAME = 'todo-v5';

const SHELL_FILES = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './data.js',
  './calendar.js',
  './render.js',
  './manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

// Cache-first for the static shell only — task data lives in localStorage,
// never in this cache, so there's nothing here that can go stale in a way
// that loses data, only in a way that shows an old UI (fixed by bumping
// CACHE_NAME above).
self.addEventListener('fetch', (event) => {
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});
