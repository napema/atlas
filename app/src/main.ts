// main.ts — l'avvio. Ordine: stile → guscio → sync → service worker.
//
// Il guscio si monta PRIMA di aprire i canali: la prima schermata legge
// quello che c'è sul dispositivo e appare subito, i dati del repo arrivano
// dopo e la aggiornano da soli (vedi `reattivo.svelte.ts`).

import "./lib/stili/app.css";
import { mount } from "svelte";
import App from "./App.svelte";
import { avviaTuttiISync } from "./lib/core/registro";
import { vaiA } from "./lib/core/router.svelte";

/**
 * Il pizzico su Safari. `user-scalable=no` lo ignora per scelta, e
 * `touch-action` ferma il doppio tocco ma non il pizzico: restano questi
 * tre eventi, che esistono solo su WebKit. Si annulla il gesto, non il
 * tocco — lo scorrimento non passa di qui. `passive: false` è obbligatorio,
 * altrimenti `preventDefault()` viene ignorato.
 */
for (const e of ["gesturestart", "gesturechange", "gestureend"]) {
  document.addEventListener(e, (ev) => ev.preventDefault(), { passive: false });
}

mount(App, { target: document.getElementById("app")! });

// In sottofondo: i dati di TUTTI i moduli, anche di quelli che non guardi,
// altrimenti la home racconta la giornata di ieri.
avviaTuttiISync();

if ("serviceWorker" in navigator) registraServiceWorker();

// Va letto PRIMA della registrazione: dopo, `controller` c'è anche al primo
// avvio e non si distingue più l'installazione dall'aggiornamento.
const controlloreIniziale = Boolean(navigator.serviceWorker?.controller);

/**
 * Il service worker e il suo aggiornamento. Alzare la versione non basta:
 * servono `updateViaCache: "none"` (altrimenti il browser si serve sw.js
 * dalla sua cache e non vede i byte nuovi), `update()` a ogni ritorno sulla
 * finestra (una PWA resta aperta per giorni), e un ricaricamento quando il
 * worker nuovo prende il comando (altrimenti gira il codice vecchio già in
 * memoria). Imparato nella app di prima, una cosa per volta.
 */
async function registraServiceWorker() {
  // In locale niente worker, e quello installato si toglie: la sua cache
  // risponde prima della rete e fa guardare la schermata di dieci minuti fa.
  if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
    try {
      for (const r of await navigator.serviceWorker.getRegistrations()) {
        // Solo il proprio: quello della app di prima sta sullo stesso
        // indirizzo e non è affar nostro.
        if (r.scope === new URL("./", location.href).href) await r.unregister();
      }
    } catch (e) { console.warn("[sw] pulizia locale", e); }
    return;
  }

  // Tocco su una notifica con la app già aperta: il worker non può cambiare
  // rotta da solo, manda un messaggio.
  navigator.serviceWorker.addEventListener("message", (e) => {
    if (e.data?.tipo === "vai-a" && e.data.rotta) vaiA(e.data.rotta);
  });

  let giaRicaricato = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (giaRicaricato || !controlloreIniziale) return;
    giaRicaricato = true;
    location.reload();
  });

  let reg: ServiceWorkerRegistration;
  try {
    reg = await navigator.serviceWorker.register("./sw.js", { scope: "./", updateViaCache: "none" });
  } catch (e) {
    console.warn("[sw]", e);
    return;
  }
  reg.update().catch(() => {});
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) reg.update().catch(() => {});
  });
}
