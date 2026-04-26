const CACHE_NAME = "taskforce-v2";
const urlsToCache = [
    "/", "/index.html", "/styles.css", "/manifest.json",
    "/js/main.js", "/js/db.js", "/js/ui.js", "/js/utils.js",
    "/js/reminders.js", "/js/pomodoro.js", "/js/firebase.js",
    "/js/kanban.js", "/js/analytics.js", "/js/swipe.js", "/js/shortcuts.js",
    "/firebase-config.js"
];

self.addEventListener("install", event => {
    event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache)));
});
self.addEventListener("fetch", event => {
    event.respondWith(caches.match(event.request).then(response => response || fetch(event.request)));
});
