// sw.js
const CACHE_NAME = "flowstate-v1";
const urlsToCache = [
    "/",
    "/styles.css",
    "/js/main.js",
    "/js/db.js",
    "/js/utils.js",
    "/js/ui.js",
    "/js/reminders.js",
    "/js/pomodoro.js",
    "/manifest.json"
];

self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
    );
});

self.addEventListener("fetch", event => {
    event.respondWith(
        caches.match(event.request).then(response => response || fetch(event.request))
    );
});
