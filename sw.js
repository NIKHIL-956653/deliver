/* sw.js — offline-first app shell for Neon Chain Reaction
 * Bump CACHE_VERSION on every release: old caches are deleted on activate.
 * Strategy: same-origin GET → cache first, refresh in background (stale-while-revalidate).
 * Cross-origin (leaderboard API, analytics) → network only, never cached. */
const CACHE_VERSION = "ncr-v14";
const SHELL = [
  "./", "./index.html", "./style.css", "./manifest.json",
  "./js/game.js", "./js/board.js", "./js/ai.js", "./js/ai.worker.js", "./js/fx.js", "./js/sound.js",
  "./js/storage.js", "./js/levels.js", "./js/player.js", "./js/matrix.js", "./js/magma.js",
  "./js/premium.js", "./js/haptics.js", "./js/analytics.js", "./js/leaderboard.js", "./js/leaderboard-config.js",
  "./js/renderer.js", "./js/online.js", "./js/sharecard.js", "./js/boardeditor.js",
  "./sounds/click.mp3", "./sounds/explode.mp3", "./sounds/win.mp3",
  "./icons/icon-192.png", "./icons/icon-512.png", "./icons/maskable-512.png", "./icons/apple-touch-icon.png",
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE_VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(cached => {
      const fresh = fetch(req).then(res => {
        if (res && res.ok) caches.open(CACHE_VERSION).then(c => c.put(req, res.clone()));
        return res;
      }).catch(() => cached);
      return cached || fresh;
    })
  );
});
self.addEventListener("message", e => { if (e.data === "skipWaiting") self.skipWaiting(); });
