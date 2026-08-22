// app.js — l'avvio. Poche cose, in un ordine che conta.
//
// 1. la barra, subito: l'app deve sembrare presente prima di aver letto un dato
// 2. il router monta la vista chiesta dall'URL
// 3. i sync partono DOPO, in sottofondo: la rete non deve ritardare il primo tocco
// 4. il service worker per ultimo: serve al secondo avvio, non al primo

import { MODULI_IN_BARRA, avviaTuttiISync, prendiModulo } from "./registro.js";
import { avviaRouter, osservaRotta, rottaCorrente, vaiA } from "./router.js";
import { osservaStato, configurato } from "./sync.js";
import { icona } from "./icone.js";
import { el } from "./ui.js";

// ------------------------------------------------------------------ barra --

function costruisciBarra() {
  const barra = document.getElementById("barra");
  barra.replaceChildren();

  // Il marchio si vede solo da scrivania (il CSS lo nasconde sotto i 900px):
  // su iPhone c'è già l'icona sulla schermata Home, mentre una colonna
  // laterale senza nome è disorientante.
  barra.append(el("div", { class: "marchio", testo: "ATLAS" }));

  for (const m of MODULI_IN_BARRA) {
    barra.append(el("a", {
      class: "tab",
      href: `#/${m.id}`,
      "data-modulo": m.id,
    }, [
      el("span", { html: icona(m.icona, 24) }),
      el("span", { testo: m.nome }),
    ]));
  }
}

function evidenziaBarra({ id }) {
  for (const s of document.querySelectorAll(".tab")) {
    if (s.dataset.modulo === id) s.setAttribute("aria-current", "page");
    else s.removeAttribute("aria-current");
  }
}

/**
 * Il tasto tondo: una sola azione, quella del modulo che stai guardando.
 *
 * Non è una scorciatoia in più — è L'azione. Registrare una spesa, iniziare
 * la sessione, aggiungere un'abitudine: sono le tre cose per cui apri l'app,
 * e devono stare tutte sotto lo stesso pollice. Un modulo che non ha
 * un'azione ovvia non lo mostra affatto, invece di mostrarne una debole.
 */
let bottoneAzione = null;

function aggiornaAzione(mod) {
  const a = mod?.azionePrincipale?.();
  if (!a) { bottoneAzione?.remove(); bottoneAzione = null; return; }

  if (!bottoneAzione) {
    bottoneAzione = el("button", { class: "azione-tonda", type: "button" });
    document.body.append(bottoneAzione);
  }
  bottoneAzione.innerHTML = icona(a.icona || "piu", 26);
  bottoneAzione.setAttribute("aria-label", a.etichetta || "Azione");
  bottoneAzione.onclick = a.fai;
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

  osservaRotta((r) => {
    evidenziaBarra(r);
    aggiornaAzione(r.modulo);
    allineaBarraDiStato();
    aggiornaPallini();
  });
  osservaStato((s) => { statiCanali.set(s.id, s); aggiornaPallini(); });

  await avviaRouter(document.getElementById("vista"));
  const r = rottaCorrente();
  evidenziaBarra(r);
  aggiornaAzione(await prendiModulo(r.id));
  allineaBarraDiStato();

  // In sottofondo: i dati di tutti i moduli devono arrivare anche se stai
  // guardando una schermata sola, altrimenti la home dice cose vecchie.
  avviaTuttiISync();

  if ("serviceWorker" in navigator) registraServiceWorker();
}

/**
 * Registrazione del service worker e — soprattutto — il suo aggiornamento.
 *
 * Alzare `VERSIONE` in sw.js non basta, e per un po' ho creduto di sì. Perché
 * la versione nuova arrivi davvero servono tre cose, e ne mancavano tutte e
 * tre:
 *
 *  1. `updateViaCache: "none"`. Senza, il browser può servirsi `sw.js` dalla
 *     propria cache HTTP: i byte nuovi non li vede, quindi non installa
 *     niente, quindi la versione resta quella di ieri per sempre.
 *  2. `update()` a ogni avvio e ogni volta che torni sulla finestra. Un'app
 *     installata resta aperta per giorni: se il controllo lo fai solo alla
 *     registrazione, non lo fai mai.
 *  3. Il ricaricamento quando il worker nuovo prende il comando. Senza,
 *     la pagina continua a girare col codice vecchio già caricato in memoria
 *     e "ho ricaricato e non è cambiato niente" è letteralmente vero.
 */
async function registraServiceWorker() {
  // Tocco su una notifica mentre l'app è già aperta: il service worker non
  // può cambiare rotta da solo, manda un messaggio e ci pensiamo noi.
  navigator.serviceWorker.addEventListener("message", (e) => {
    if (e.data?.tipo === "vai-a" && e.data.rotta) vaiA(e.data.rotta);
  });

  // Un ricaricamento solo, mai due: `controllerchange` scatta anche alla
  // primissima installazione, quando non c'era ancora un controllore e non
  // c'è niente di vecchio da buttare.
  let giaRicaricato = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (giaRicaricato || !controlloreIniziale) return;
    giaRicaricato = true;
    location.reload();
  });

  let reg;
  try {
    // Non dentro un listener di `load`: questo è un modulo ES chiamato dopo
    // un await, e a quel punto `load` è già passato — il listener non
    // scatterebbe mai e l'app resterebbe senza offline.
    reg = await navigator.serviceWorker.register("./sw.js", { updateViaCache: "none" });
  } catch (e) {
    console.warn("[sw]", e);
    return;
  }

  reg.update().catch(() => { /* offline: riproveremo al prossimo giro */ });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) reg.update().catch(() => {});
  });
}

// Va letto PRIMA della registrazione: dopo, `controller` è già valorizzato
// anche al primo avvio e non si distingue più l'installazione dall'aggiornamento.
const controlloreIniziale = Boolean(navigator.serviceWorker?.controller);

avvia();
