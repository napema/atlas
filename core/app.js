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
  dipingiIcona();
}

/* L'ICONA DELLA SCHEDA LA CAMBIA IL JAVASCRIPT, e non è per capriccio.

   La prima versione era una SVG sola con dentro il proprio
   `prefers-color-scheme`. Sulla carta è la soluzione elegante — un file, e
   si adatta da sé — ma non funziona: le SVG usate come favicon Chrome le
   disegna UNA VOLTA e non le ridisegna quando il tema di sistema cambia,
   quindi resta congelata sulla versione chiara. L'attributo `media` su
   `<link rel="icon">` è supportato a macchia di leopardo e non copre
   comunque il caso che conta di più qui, cioè il tema scelto DENTRO ATLAS,
   che di `prefers-color-scheme` non sa niente.

   Quindi due file gemelli e uno scambio esplicito. La sorgente della
   verità è il tema effettivo dell'app: se hai scelto chiaro o scuro in
   Impostazioni comanda quello, altrimenti il sistema. */
const schemaScuro = window.matchMedia?.("(prefers-color-scheme: dark)");

export function dipingiIcona() {
  const link = document.getElementById("favicona");
  if (!link) return;
  const scelto = document.documentElement.dataset.tema;
  const scuro = scelto === "scuro" ? true
    : scelto === "chiaro" ? false
    : Boolean(schemaScuro?.matches);
  const voluto = `./assets/icons/icona-${scuro ? "scura" : "chiara"}.svg`;
  // Riscrivere lo stesso href fa ricaricare l'icona a ogni ridisegno: la
  // scheda sfarfalla e la rete lavora per niente.
  if (!link.getAttribute("href").startsWith(voluto)) link.setAttribute("href", voluto);
}

schemaScuro?.addEventListener?.("change", dipingiIcona);

// ------------------------------------------------------------- stato sync --

// I pallini sono tanti quanti i moduli, ma l'utente ne vede uno: quello
// della vista che sta guardando. Mostra il peggio fra i canali, perché un
// solo modulo in errore è comunque un problema da vedere.
const statiCanali = new Map();
const PESO = { err: 3, corso: 2, off: 1, ok: 0, inattivo: 0 };

const TITOLI = {
  off: "Sync non configurato: i dati restano su questo dispositivo",
  ok: "Sincronizzato",
  corso: "Sincronizzazione in corso",
  inattivo: "In attesa",
  err: "Errore di sincronizzazione",
};
// Le etichette accanto al pallino: minuscole, perché stanno dentro una riga
// di testo e non sono un titolo.
const ETICHETTE = {
  off: "non sincronizzato",
  ok: "sincronizzato",
  corso: "sincronizzo…",
  inattivo: "in attesa",
  err: "errore di sync",
};

// L'ultimo stato calcolato, tenuto qui perché serve anche a chi disegna un
// pallino NUOVO fra un evento e l'altro. Vedi `statoSync()`.
let ultimoStato = { stato: "off", titolo: TITOLI.off, etichetta: ETICHETTE.off };

/**
 * Lo stato del sync, aggregato su tutti i canali, per chi deve disegnarlo.
 *
 * Esiste perché `aggiornaPallini()` ritinge i pallini CHE CI SONO, e la home
 * si ridisegna da sola a ogni fatto scritto: il pallino appena creato non
 * aveva ancora ricevuto nessun evento, restava senza classe — quindi grigio
 * — accanto alla scritta «sincronizzato», che invece era fissa nel codice.
 * Il pallino diceva una cosa e la parola ne diceva un'altra.
 */
export const statoSync = () => ultimoStato;

function aggiornaPallini() {
  let peggiore = configurato() ? "ok" : "off";
  let messaggio = "";
  for (const s of statiCanali.values()) {
    if ((PESO[s.stato] ?? 0) > (PESO[peggiore] ?? 0)) { peggiore = s.stato; messaggio = s.messaggio; }
  }
  const titolo = peggiore === "err"
    ? `${TITOLI.err} — ${messaggio}`
    : (TITOLI[peggiore] || "");
  ultimoStato = { stato: peggiore, titolo, etichetta: ETICHETTE[peggiore] || "" };

  for (const p of document.querySelectorAll(".sync-pallino")) {
    p.className = `sync-pallino is-${peggiore}`;
    p.title = titolo;
  }
  // Chi mette una parola accanto al pallino la marca così, e la parola
  // cambia insieme al colore invece di restare quella scritta a mano.
  for (const t of document.querySelectorAll('[data-ruolo="sync-testo"]')) {
    t.textContent = ultimoStato.etichetta;
  }
}

// -------------------------------------------------------------------- via --

/**
 * Chiude il pizzico su Safari.
 *
 * `user-scalable=no` nel meta viewport Safari lo ignora dal 2016 — è una
 * scelta di accessibilità loro, non un bug — e `touch-action: pan-x pan-y`
 * ferma il doppio tocco ma non il pizzico. Restano questi tre eventi, che
 * esistono solo su WebKit e che nessun altro browser emette.
 *
 * Si annulla il gesto, non il tocco: lo scorrimento con un dito passa da
 * `touchmove` e non viene sfiorato. È la differenza fra togliere lo zoom e
 * rompere la pagina.
 *
 * `passive: false` è obbligatorio: senza, `preventDefault()` viene ignorato
 * e l'ascoltatore non fa niente pur essendo registrato.
 */
function bloccaZoom() {
  for (const e of ["gesturestart", "gesturechange", "gestureend"]) {
    document.addEventListener(e, (ev) => ev.preventDefault(), { passive: false });
  }
}

async function avvia() {
  bloccaZoom();
  applicaTemaSalvato();
  costruisciBarra();

  // La scheda si accende SUBITO, sull'`hashchange`, non quando il modulo ha
  // finito di montarsi.
  //
  // Gli ascoltatori del router girano in fondo a `disegna()`, cioè dopo il
  // caricamento pigro del modulo e del suo CSS. Fra il tocco e
  // l'illuminazione della scheda ci passava tutto quel tempo, e su una rete
  // lenta erano secondi in cui il tocco sembrava non essere arrivato: da lì
  // il toccare due o tre volte. Il contenuto ci mette quello che ci mette,
  // ma la barra deve rispondere all'istante.
  globalThis.addEventListener("hashchange", () => evidenziaBarra(rottaCorrente()));

  osservaRotta((r) => {
    evidenziaBarra(r);
    allineaBarraDiStato();
    aggiornaPallini();
  });
  osservaStato((s) => { statiCanali.set(s.id, s); aggiornaPallini(); });

  await avviaRouter(document.getElementById("vista"));
  const r = rottaCorrente();
  evidenziaBarra(r);
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
