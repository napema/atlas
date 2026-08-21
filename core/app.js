// app.js — l'avvio. Poche cose, in un ordine che conta.
//
// 1. la barra, subito: l'app deve sembrare presente prima di aver letto un dato
// 2. il router monta la vista chiesta dall'URL
// 3. i sync partono DOPO, in sottofondo: la rete non deve ritardare il primo tocco
// 4. il service worker per ultimo: serve al secondo avvio, non al primo

import { MODULI_IN_BARRA, avviaTuttiISync } from "./registro.js";
import { avviaRouter, osservaRotta, rottaCorrente, vaiA } from "./router.js";
import { osservaStato, configurato } from "./sync.js";
import { icona } from "./icone.js";
import { el } from "./ui.js";

// ------------------------------------------------------------------ barra --

function costruisciBarra() {
  const barra = document.getElementById("barra");
  barra.innerHTML = "";

  // Il marchio si vede solo da scrivania (il CSS lo nasconde sotto i 900px):
  // su iPhone c'e gia l'icona sulla schermata Home, in una colonna laterale
  // invece una finestra senza nome e disorientante.
  barra.append(el("div", { class: "marchio", testo: "ATLAS" }));
  for (const m of MODULI_IN_BARRA) {
    barra.append(el("a", {
      class: "scheda-barra",
      href: `#/${m.id}`,
      "data-modulo": m.id,
    }, [
      el("span", { html: icona(m.icona, 26) }),
      el("span", { testo: m.nome }),
    ]));
  }
}

function evidenziaBarra({ id }) {
  for (const s of document.querySelectorAll(".scheda-barra")) {
    const attiva = s.dataset.modulo === id;
    if (attiva) s.setAttribute("aria-current", "page");
    else s.removeAttribute("aria-current");
  }
}

// ------------------------------------------------------------------- tema --

// Il colore della barra di stato di iOS segue l'app, non viceversa.
function allineaBarraDiStato() {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) return;
  const colore = getComputedStyle(document.body).backgroundColor;
  if (colore) meta.setAttribute("content", colore);
}

function applicaTemaSalvato() {
  const t = localStorage.getItem("atlas.tema");
  if (t === "chiaro" || t === "scuro") document.documentElement.dataset.tema = t;
}

// ------------------------------------------------------------- stato sync --

// I pallini sono tanti quanti i moduli, ma l'utente ne vede uno: quello
// della vista che sta guardando. Mostra il peggio fra i canali, perché un
// solo modulo in errore è comunque un problema da vedere.
const statiCanali = new Map();
const PESO = { err: 3, corso: 2, off: 1, ok: 0, inattivo: 0 };

function aggiornaPallini() {
  let peggiore = configurato() ? "ok" : "off";
  let messaggio = "";
  for (const s of statiCanali.values()) {
    if ((PESO[s.stato] ?? 0) > (PESO[peggiore] ?? 0)) { peggiore = s.stato; messaggio = s.messaggio; }
  }
  const titolo = {
    off: "Sync non configurato: i dati restano su questo dispositivo",
    ok: "Sincronizzato",
    corso: "Sincronizzazione in corso",
    inattivo: "In attesa",
    err: `Errore di sincronizzazione — ${messaggio}`,
  }[peggiore] || "";
  for (const p of document.querySelectorAll(".sync-pallino")) {
    p.className = `sync-pallino is-${peggiore}`;
    p.title = titolo;
  }
}

// -------------------------------------------------------------------- via --

async function avvia() {
  applicaTemaSalvato();
  costruisciBarra();

  osservaRotta((r) => { evidenziaBarra(r); allineaBarraDiStato(); aggiornaPallini(); });
  osservaStato((s) => { statiCanali.set(s.id, s); aggiornaPallini(); });

  await avviaRouter(document.getElementById("vista"));
  evidenziaBarra(rottaCorrente());
  allineaBarraDiStato();

  // In sottofondo: i dati di tutti i moduli devono arrivare anche se stai
  // guardando una schermata sola, altrimenti la home dice cose vecchie.
  avviaTuttiISync();

  if ("serviceWorker" in navigator) {
    // Non dentro un listener di `load`: questo è un modulo ES chiamato dopo
    // un await, e a quel punto `load` è già passato — il listener non
    // scatterebbe mai e l'app resterebbe senza offline.
    navigator.serviceWorker.register("./sw.js").catch((e) => console.warn("[sw]", e));

    // Tocco su una notifica mentre l'app è già aperta: il service worker non
    // può cambiare rotta da solo, manda un messaggio e ci pensiamo noi.
    navigator.serviceWorker.addEventListener("message", (e) => {
      if (e.data?.tipo === "vai-a" && e.data.rotta) vaiA(e.data.rotta);
    });
  }
}

avvia();
