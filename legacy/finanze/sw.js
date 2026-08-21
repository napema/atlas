/* Registro — service worker. ALZA LA VERSIONE a ogni modifica dei file. */
const CACHE = "registro2-v8";
const ASSETS = ["./", "./index.html", "./config.js", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./icon-1024.png", "./icon-180.png"];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(ASSETS.map(a => c.add(a))))
      .then(() => self.skipWaiting())
  );
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
  if(req.method !== "GET") return;                      // le PUT del sync passano dirette
  const url = new URL(req.url);
  if(url.hostname === "api.github.com") return;         // il sync non va MAI in cache
  if(url.origin !== location.origin){                   // font e risorse esterne
    e.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }
  const isCritical = req.mode === "navigate"
    || url.pathname.endsWith("config.js")
    || url.pathname.endsWith("index.html")
    || url.pathname.endsWith("/");
  if(isCritical){
    // NETWORK-FIRST: config e pagina sempre freschi, cache solo offline.
    e.respondWith(
      fetch(req).then(res => {
        if(res && res.ok) caches.open(CACHE).then(c => c.put(req, res.clone()));
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }
  // resto della shell (icone, manifest): cache-first con aggiornamento in background
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req).then(res => {
        if(res && res.ok) caches.open(CACHE).then(c => c.put(req, res.clone()));
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
