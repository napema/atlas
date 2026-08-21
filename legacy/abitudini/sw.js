/* Abitudini — service worker
   ALZA IL NUMERO DI VERSIONE A OGNI DEPLOY. */
const CACHE = "abitudini-v4";

const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-512-maskable.png",
  "./apple-touch-icon.png",
  "./badge-96.png",
  "./favicon-64.png"
];

self.addEventListener("install", e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL).catch(() => {})));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;                 // non-GET passano dirette

  let url;
  try { url = new URL(req.url); } catch (_) { return; }

  if (url.hostname === "api.github.com") return;    // il sync non tocca mai la cache

  // Immagini emoji dal CDN: cache-first, così restano disponibili offline.
  if (url.hostname === "cdn.jsdelivr.net") {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(r => {
        if (r && r.ok) { const c = r.clone(); caches.open(CACHE).then(k => k.put(req, c)); }
        return r;
      }).catch(() => hit))
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  // index.html e config.js devono poter cambiare con un semplice reload.
  const critical = req.mode === "navigate" ||
    url.pathname.endsWith("/config.js") ||
    url.pathname.endsWith("/index.html") ||
    url.pathname.endsWith("/sw.js");

  if (critical) {
    e.respondWith(
      fetch(req).then(r => {
        if (r && r.ok) { const c = r.clone(); caches.open(CACHE).then(k => k.put(req, c)); }
        return r;
      }).catch(() => caches.match(req).then(hit => hit || caches.match("./index.html")))
    );
    return;
  }

  // resto della shell: cache-first
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(r => {
      if (r && r.ok) { const c = r.clone(); caches.open(CACHE).then(k => k.put(req, c)); }
      return r;
    }))
  );
});

/* ---------- push ---------- */
self.addEventListener("push", e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { body: e.data ? e.data.text() : "" }; }
  const title = d.title || "Abitudini";
  const opts = {
    body: d.body || "",
    icon: "./icon-192.png",
    badge: "./badge-96.png",
    tag: d.tag || "abitudini",
    renotify: false,
    data: { url: d.url || "./" }
  };
  e.waitUntil(self.registration.showNotification(title, opts));
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  const target = (e.notification.data && e.notification.data.url) || "./";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if ("focus" in c) return c.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })
  );
});
