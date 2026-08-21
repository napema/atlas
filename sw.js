/* sw.js — service worker di ATLAS.
 *
 * Due regole e basta:
 *
 *  1. Il GUSCIO (html, css, js, font, icone) sta in cache e si serve da lì.
 *     La sessione serale di mobilità non può dipendere dalla rete.
 *  2. I DATI (api.github.com) non si mettono MAI in cache. Una risposta
 *     vecchia di sync è peggio di nessuna risposta: farebbe credere al
 *     dispositivo di essere allineato quando non lo è.
 *
 * VERSIONE: va alzata a ogni rilascio, altrimenti il vecchio guscio resta
 * appiccicato. È l'errore che costa più tempo a diagnosticare.
 */

const VERSIONE = "atlas-v4";
const GUSCIO = `guscio-${VERSIONE}`;

const DA_PRECARICARE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./config.js",
  "./styles/tokens.css",
  "./styles/base.css",
  "./core/app.js",
  "./core/registro.js",
  "./core/router.js",
  "./core/storage.js",
  "./core/sync.js",
  "./core/blobs.js",
  "./core/bus.js",
  "./core/contesto.js",
  "./core/ui.js",
  "./core/icone.js",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/apple-touch-icon.png",
  "./assets/fonts/sf-pro-text-regular.woff2",
  "./assets/fonts/sf-pro-text-medium.woff2",
  "./assets/fonts/sf-pro-text-semibold.woff2",
  "./assets/fonts/sf-pro-text-bold.woff2",
  "./assets/fonts/sf-pro-display-semibold.woff2",
  "./assets/fonts/sf-pro-display-bold.woff2",
];

// I moduli si caricano pigramente: non stanno nel precarico, ma la prima
// volta che li apri online finiscono in cache e da lì restano disponibili.

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(GUSCIO);
    // addAll fallisce in blocco se un solo file manca: qui si va a uno a uno,
    // così un'icona rinominata non impedisce l'installazione.
    await Promise.allSettled(DA_PRECARICARE.map((u) => c.add(new Request(u, { cache: "reload" }))));
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) {
      if (k !== GUSCIO) await caches.delete(k);
    }
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // I dati non si intercettano: passano diretti alla rete.
  if (url.hostname === "api.github.com" || url.hostname.endsWith(".githubusercontent.com")) return;
  if (url.origin !== self.location.origin) return;

  // Navigazione: sempre il guscio. Con l'hash routing ogni rotta è index.html.
  if (req.mode === "navigate") {
    e.respondWith((async () => {
      const c = await caches.open(GUSCIO);
      return (await c.match("./index.html")) || (await c.match("./")) || fetch(req);
    })());
    return;
  }

  // Tutto il resto: cache prima, rete come riserva, e aggiornamento silenzioso
  // in sottofondo perché il prossimo avvio trovi la versione nuova.
  e.respondWith((async () => {
    const c = await caches.open(GUSCIO);
    const salvata = await c.match(req);
    const dallaRete = fetch(req)
      .then((res) => { if (res.ok) c.put(req, res.clone()); return res; })
      .catch(() => null);
    return salvata || (await dallaRete) || new Response("", { status: 504, statusText: "offline" });
  })());
});

/* ------------------------------------------------------------- notifiche --
 * Mobilità e Abitudini hanno già le loro notifiche push, con due coppie
 * VAPID diverse. In ATLAS la coppia diventa una sola e il campo `modulo`
 * del messaggio dice chi ha parlato: è quello che decide dove aprire.
 */

self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { corpo: e.data?.text() || "" }; }

  const titolo = d.titolo || "ATLAS";
  const opzioni = {
    body: d.corpo || "",
    icon: "./assets/icons/icon-192.png",
    badge: "./assets/icons/icon-192.png",
    tag: d.tag || d.modulo || "atlas",
    renotify: Boolean(d.tag),
    data: { rotta: d.rotta || (d.modulo ? `#/${d.modulo}` : "#/oggi") },
    actions: d.azioni || [],
  };
  e.waitUntil(self.registration.showNotification(titolo, opzioni));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const rotta = e.notification.data?.rotta || "#/oggi";
  e.waitUntil((async () => {
    const finestre = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    // Se l'app è già aperta si porta in primo piano e si naviga: aprire una
    // seconda finestra della stessa PWA è disorientante.
    for (const f of finestre) {
      if (f.url.includes(self.registration.scope)) {
        await f.focus();
        f.postMessage({ tipo: "vai-a", rotta });
        return;
      }
    }
    await self.clients.openWindow(`./${rotta}`);
  })());
});
