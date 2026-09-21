/* sw.js — il service worker della app nuova.
 *
 * Le due regole di sempre:
 *
 *  1. Il GUSCIO sta in cache e si serve da lì: la sessione serale non può
 *     dipendere dalla rete.
 *  2. I DATI (api.github.com) non si mettono MAI in cache. Una risposta di
 *     sync vecchia farebbe credere al dispositivo di essere allineato.
 *
 * LA VERSIONE LA SCRIVE LA BUILD. `__VERSIONE__` qui sotto viene sostituito
 * da `vite.config.ts` a ogni compilazione. Nella app di prima andava alzata a
 * mano, ed era la regola 10 di CLAUDE.md proprio perché ce se ne dimenticava:
 * un guscio nuovo servito con la versione vecchia resta appiccicato.
 *
 * Niente elenco di file da precaricare: i nomi dei file compilati cambiano a
 * ogni build (contengono l'impronta del contenuto). Si mettono in cache al
 * primo passaggio, e la app li chiede tutti appena ha un attimo libero
 * (App.svelte): dopo la prima apertura c'è tutto anche offline.
 */

const VERSIONE = "__VERSIONE__";
const GUSCIO = `atlas2-guscio-${VERSIONE}`;
/* I FILE PESANTI — font, icone, i video degli esercizi — stanno in una
   cache che non porta la versione, e NON si svuota ai rilasci. Il nome è lo
   stesso della app di prima, apposta: i sessanta mega di video che il
   telefono ha già messo da parte una sessione alla volta restano lì, e la
   app nuova li trova invece di riscaricarli. */
const PESANTI = "atlas-pesanti-v1";

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(GUSCIO);
    await Promise.allSettled(["./", "./index.html", "./manifest.webmanifest"]
      .map((u) => c.add(new Request(u, { cache: "reload" }))));
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    // Il guscio vecchio se ne va — il proprio e quello della app di prima
    // (`guscio-atlas-v…`), che dopo il passaggio non serve più a nessuno.
    // I pesanti restano: sono gli stessi file.
    for (const k of await caches.keys()) {
      const mio = k.startsWith("atlas2-") && k !== GUSCIO;
      const vecchio = k.startsWith("guscio-atlas-");
      if (mio || vecchio) await caches.delete(k);
    }
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // api.github.com passa diretto

  // Navigazione: rete prima, index.html come riserva. Con le rotte a hash
  // ogni indirizzo è index.html.
  if (req.mode === "navigate") {
    e.respondWith(reteConRiserva(req));
    return;
  }

  // I VIDEO DEGLI ESERCIZI: dalla cache, e ci restano. Si salvano uno alla
  // volta, il giorno che quell'esercizio esce nella rotazione.
  //
  // Le richieste con `Range` passano alla rete: Safari chiede i video a
  // pezzi, e a un pezzo si risponde 206 con quel pezzo. Rispondere 200 con
  // tutto il file, che è quello che fa `cache.match()`, manda in errore il
  // player — video nero e nessun messaggio.
  if (url.pathname.includes("/mobilita/clip/")) {
    if (req.headers.has("range")) return;
    e.respondWith(prima(PESANTI, req));
    return;
  }

  // Font e icone della app di prima (l'emoji Apple, 45 MB): stessi nomi,
  // stesso contenuto, dalla cache dei pesanti.
  if (/\.(woff2?|png|jpe?g|svg|ico)$/.test(url.pathname) && !url.pathname.includes("/assets/")) {
    e.respondWith(prima(PESANTI, req));
    return;
  }

  // I file compilati hanno l'impronta nel nome: se il nome è lo stesso, il
  // contenuto è lo stesso. Dalla cache, per sempre.
  if (url.pathname.includes("/assets/")) {
    e.respondWith(prima(PESANTI_O_GUSCIO(url), req));
    return;
  }

  e.respondWith(cacheSubitoPoiRete(req));
});

// I font vanno fra i pesanti, che sopravvivono ai rilasci: riscaricare
// mezzo megabyte di SF Pro a ogni versione non ha senso.
const PESANTI_O_GUSCIO = (url) => (/\.(woff2?|png|svg)$/.test(url.pathname) ? PESANTI : GUSCIO);

async function prima(nome, req) {
  const c = await caches.open(nome);
  const salvata = await c.match(req);
  if (salvata) return salvata;
  const res = await fetch(req).catch(() => null);
  if (res?.ok) c.put(req, res.clone());
  return res || new Response("", { status: 504, statusText: "offline" });
}

async function cacheSubitoPoiRete(req) {
  const c = await caches.open(GUSCIO);
  const salvata = await c.match(req);
  const dallaRete = fetch(req)
    .then((res) => { if (res.ok) c.put(req, res.clone()); return res; })
    .catch(() => null);
  if (salvata) return salvata;
  return (await dallaRete) || new Response("", { status: 504, statusText: "offline" });
}

async function reteConRiserva(req) {
  const c = await caches.open(GUSCIO);
  try {
    const res = await fetch(req);
    if (res.ok) c.put("./index.html", res.clone());
    return res;
  } catch {
    return (await c.match("./index.html")) || (await c.match("./"))
      || new Response("", { status: 504, statusText: "offline" });
  }
}

/* ------------------------------------------------------------- notifiche --
 * Stesso formato della app di prima: il campo `modulo` o `rotta` del
 * messaggio dice dove aprire. Le rotte sono le stesse nelle due app. */

self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { corpo: e.data?.text() || "" }; }
  e.waitUntil(self.registration.showNotification(d.titolo || "ATLAS", {
    body: d.corpo || "",
    icon: "./icons/icon-192.png",
    badge: "./icons/icon-192.png",
    tag: d.tag || d.modulo || "atlas",
    renotify: Boolean(d.tag),
    data: { rotta: d.rotta || (d.modulo ? `#/${d.modulo}` : "#/oggi") },
    actions: d.azioni || [],
  }));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const rotta = e.notification.data?.rotta || "#/oggi";
  e.waitUntil((async () => {
    const finestre = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const f of finestre) {
      if (f.url.startsWith(self.registration.scope)) {
        await f.focus();
        f.postMessage({ tipo: "vai-a", rotta });
        return;
      }
    }
    await self.clients.openWindow(`./${rotta}`);
  })());
});
