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
 * VERSIONE: va alzata a ogni rilascio. Da sola però NON basta, e crederlo è
 * costato un pomeriggio: perché la versione nuova arrivi davvero servono
 * anche `updateViaCache: "none"` e il ricaricamento su `controllerchange`,
 * che stanno in core/app.js. Il perché è scritto lì.
 */

const VERSIONE = "atlas-v54";
const GUSCIO = `guscio-${VERSIONE}`;

/* I FILE PESANTI STANNO IN UNA CACHE CHE NON PORTA LA VERSIONE.
   =========================================================================
   `GUSCIO` ha il numero di versione nel nome, e all'attivazione si cancella
   tutto ciò che non è il guscio corrente. È giusto per html, css e js — è
   proprio così che il codice vecchio se ne va — ma lì dentro finivano anche
   le due cose grosse dell'app:

     · AppleColorEmoji.woff, 45 MB
     · i video degli esercizi, una sessantina di MB messi da parte una
       sessione alla volta

   Cioè: OGNI RILASCIO le buttava via. Il 3 settembre ne ho fatti cinque in
   una giornata, e da fuori si vedeva così — le emoji tornavano quelle di
   Segoe, perché finché i 45 MB non erano riscaricati il `font-display:
   swap` mostrava il ripiego. Non le avevo tolte: le stavo buttando via
   cinque volte al giorno.

   Questi file non cambiano mai a parità di nome, e quando cambiano cambia
   il nome (`?v=` sulle icone). Quindi vivono in una cache loro, che
   sopravvive ai rilasci.
   ========================================================================= */
const PESANTI = "atlas-pesanti-v1";
const ePesante = (p) => /\.(woff2?|png|jpe?g|svg|ico|mp4|mkv|webp|avif)$/i.test(p);

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
  "./core/notifiche.js",
  "./core/ui.js",
  "./core/icone.js",

  // I moduli si caricano pigramente all'apertura, ma nel precarico ci vanno
  // lo stesso: la prima volta che apri Finanze offline è proprio il caso in
  // cui servono, e "arrivano quando c'è rete" lì vuol dire non averli.
  "./moduli/oggi/modulo.js",
  "./moduli/oggi/stile.css",
  "./moduli/impostazioni/modulo.js",
  "./moduli/impostazioni/stile.css",
  "./moduli/finanze/modulo.js",
  "./moduli/finanze/dati.js",
  "./moduli/finanze/calcolo.js",
  "./moduli/finanze/viste.js",
  "./moduli/finanze/grafici.js",
  "./moduli/finanze/importa.js",
  "./moduli/finanze/esporta.js",
  "./moduli/finanze/stile.css",
  "./moduli/mobilita/modulo.js",
  "./moduli/mobilita/dati.js",
  "./moduli/mobilita/sessione.js",
  "./moduli/mobilita/oggi.js",
  "./moduli/mobilita/progressi.js",
  "./moduli/mobilita/assessment.js",
  "./moduli/mobilita/impostazioni.js",
  "./moduli/mobilita/ponte.js",
  "./moduli/mobilita/foto.js",
  "./moduli/mobilita/esercizi.js",
  "./moduli/mobilita/clip.js",
  "./moduli/mobilita/engine.js",
  "./moduli/mobilita/stile.css",
  "./moduli/abitudini/modulo.js",
  "./moduli/abitudini/dati.js",
  "./moduli/abitudini/calcolo.js",
  "./moduli/abitudini/viste.js",
  "./moduli/abitudini/stile.css",

  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/apple-touch-icon.png",
  "./assets/fonts/sf-pro-text-regular.woff2",
  "./assets/fonts/sf-pro-text-medium.woff2",
  "./assets/fonts/sf-pro-text-semibold.woff2",
  "./assets/fonts/sf-pro-text-bold.woff2",
  "./assets/fonts/sf-pro-display-semibold.woff2",
  "./assets/fonts/sf-pro-display-bold.woff2",
  // AppleColorEmoji.woff NON sta qui: sono 45 MB, e nel precarico vorrebbe
  // dire che la prima apertura non finisce mai. Lo prende la regola
  // cache-first sui font al primo uso, e da lì in poi c'è anche offline.
];




self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const guscio = await caches.open(GUSCIO);
    const pesanti = await caches.open(PESANTI);
    // addAll fallisce in blocco se un solo file manca: qui si va a uno a uno,
    // così un'icona rinominata non impedisce l'installazione.
    await Promise.allSettled(DA_PRECARICARE.map((u) =>
      (ePesante(u) ? pesanti : guscio).add(new Request(u, { cache: "reload" }))));
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) {
      if (k !== GUSCIO && k !== PESANTI) await caches.delete(k);
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

  // Navigazione: rete prima, guscio come riserva. Con l'hash routing ogni
  // rotta è index.html.
  if (req.mode === "navigate") {
    e.respondWith(reteConRiserva(req, "./index.html"));
    return;
  }

  // I VIDEO DEGLI ESERCIZI: dalla cache, e ci restano.
  //
  // Non stanno nel precarico — sono sessanta megabyte, e scaricarli tutti
  // alla prima apertura vorrebbe dire un'installazione che non finisce mai
  // su una connessione da telefono. Si salvano uno alla volta, il giorno
  // che quell'esercizio esce nella rotazione, e da lì in poi ci sono anche
  // in aereo. Dopo una settimana di sessioni la libreria è completa da sé.
  //
  // `Range` a parte: Safari chiede i video a pezzi, e a una richiesta con
  // Range si deve rispondere 206 con quel pezzo. Rispondere 200 con tutto,
  // che è quello che fa `cache.match()`, manda in errore il player — video
  // nero e nessun messaggio. Quelle richieste passano alla rete.
  if (url.pathname.includes("/mobilita/clip/")) {
    if (req.headers.has("range")) return;
    e.respondWith((async () => {
      const c = await caches.open(PESANTI);
      const salvata = await c.match(req);
      if (salvata) return salvata;
      const res = await fetch(req).catch(() => null);
      if (res?.ok) c.put(req, res.clone());
      return res || new Response("", { status: 504, statusText: "offline" });
    })());
    return;
  }

  // Font e icone non cambiano mai a parità di nome: quelli dalla cache, sono
  // i file pesanti ed è lì che l'offline si gioca davvero.
  if (/\.(woff2?|png|jpe?g|svg|ico)$/.test(url.pathname)) {
    e.respondWith((async () => {
      const c = await caches.open(PESANTI);
      const salvata = await c.match(req);
      if (salvata) return salvata;
      const res = await fetch(req).catch(() => null);
      if (res?.ok) c.put(req, res.clone());
      return res || new Response("", { status: 504, statusText: "offline" });
    })());
    return;
  }

  // IL CODICE DELL'APP — html, css, js — dalla cache SUBITO, e intanto si
  // rinfresca in sottofondo.
  //
  // Era rete-prima, e l'avevo scelto io per un motivo che sembrava buono:
  // dopo un rilascio la prima apertura mostrava la versione precedente. Il
  // prezzo però lo pagava ogni singolo tocco della barra. I moduli si
  // caricano pigramente, quindi aprire Finanze vuol dire scaricare
  // `modulo.js` più i suoi import più `stile.css`: con una tacca di segnale
  // sono secondi in cui non succede niente, e chi guarda lo schermo tocca
  // di nuovo. «La barra è lenta e devo cliccare più volte» era questo.
  //
  // Il problema della versione vecchia non torna, perché nel frattempo è
  // stato risolto dove andava risolto: `updateViaCache: "none"` fa
  // ricontrollare sw.js a ogni avvio, il cambio di `VERSIONE` fa installare
  // il nuovo guscio e cancellare quello vecchio, e il ricaricamento su
  // `controllerchange` porta l'app alla versione nuova entro un giro. La
  // cache non è più «la versione di sempre»: è la versione di adesso, già
  // pronta.
  e.respondWith(cacheSubitoPoiRete(req));
});

/**
 * Cache subito, rete in sottofondo.
 *
 * La risposta parte dalla copia salvata senza aspettare niente; la rete
 * viene interrogata comunque e aggiorna la cache per la volta dopo. Se in
 * cache non c'è nulla si aspetta la rete, che è il primo avvio.
 *
 * L'aggiornamento in sottofondo NON deve far fallire la risposta: se la rete
 * non c'è, `catch` e via — la copia salvata è già partita.
 */
async function cacheSubitoPoiRete(req) {
  const c = await caches.open(GUSCIO);
  const salvata = await c.match(req);

  const dallaRete = fetch(req)
    .then((res) => { if (res.ok) c.put(req, res.clone()); return res; })
    .catch(() => null);

  if (salvata) return salvata;
  return (await dallaRete) || new Response("", { status: 504, statusText: "offline" });
}

/** Rete, e se non risponde la copia in cache (`riserva` o la richiesta stessa). */
async function reteConRiserva(req, riserva = null) {
  const c = await caches.open(GUSCIO);
  try {
    const res = await fetch(req);
    if (res.ok) c.put(riserva || req, res.clone());
    return res;
  } catch {
    return (await c.match(riserva || req))
      || (riserva && await c.match("./"))
      || new Response("", { status: 504, statusText: "offline" });
  }
}

/* ------------------------------------------------------------- notifiche --
 * Mobilità e Abitudini avevano due sistemi di push identici e incompatibili,
 * con due coppie VAPID. Qui la coppia è una sola e il campo `modulo` del
 * messaggio dice chi ha parlato: è quello che decide dove aprire.
 *
 * Chi manda è il workflow `promemoria.yml` dentro il repo atlas-dati: gira
 * ogni dieci minuti, legge i file dei moduli e spedisce quello che è scaduto.
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
