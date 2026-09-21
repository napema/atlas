// moduli/mobilita — la pratica quotidiana: POST-CORSA, QUOTIDIANO, LOADED.
//
// INNESTO, NON RISCRITTURA. Il briefing lo diceva e la prima volta non è
// stato seguito: Mobilità era stata riscritta, e per strada aveva perso i
// video degli esercizi, l'assessment intero, le pillole del player, le
// schermate di preparazione e metà dei progressi.
//
// Adesso `oggi.js`, `sessione.js`, `progressi.js` e `assessment.js` sono i
// file di napema/mobility-blueprint **copiati come sono**, comprese le classi
// CSS: l'unica cosa che cambia è `stile.css`. Gli unici due innesti sono
// `ponte.js` (lo storage di ATLAS con la forma che quei file si aspettano) e
// `foto.js` (IndexedDB al posto del loro dialogo diretto con api.github.com,
// che la regola 1 vieta).
//
// Questo file è solo il guscio: monta le viste, tiene i due overlay che
// quelle viste cercano per id, e fa il contratto con ATLAS.

import { el, aggiungi, intestazione, avviso } from "../../core/ui.js";
import { icona } from "../../core/icone.js";
import { annuncia, ascolta } from "../../core/bus.js";
import { getState } from "./ponte.js";
// Sync, lavagna e la scheda della home stanno in `contratto.js`, CONDIVISO
// con la app nuova: una sola regola di fusione dei dati per tutte e due.
import { quandoCambia, pubblicaSullaLavagna, avviaSync, oggi } from "./contratto.js";
import { renderOggi } from "./oggi.js";
import { renderProgressi } from "./progressi.js";
import { renderAssessment } from "./assessment.js";
import {
  renderSessione, togglePausa, fermaSessione, tipoDelGiorno,
} from "./sessione.js";
import { vistaImpostazioni } from "./impostazioni.js";

let contenitore = null;
// Il gruppo della barra (vedi core/registro.js): quando c'e, il suo
// interruttore prende il posto del titolo invece di stargli sopra. Questa
// schermata ha gia le sue pillole sotto la testata, e interruttore + titolo
// + pillole sono tre righe di navigazione prima del primo dato.
let gruppo = null;
const staccatori = [];
const vista = { scheda: "oggi" };

/* --------------------------------------------------------------- vista -- */

function disegna() {
  if (!contenitore) return;
  const scorrimento = globalThis.scrollY;
  contenitore.replaceChildren();

  // I file portati scrivono nell'`innerHTML` di un contenitore che cercano
  // per id: sono gli stessi id dell'app di partenza, e restano tali perché è
  // ciò che permette di ri-copiarli quando cambiano di là.
  const corpoOggi = el("div", { id: "oggi-body" });
  const corpoProgressi = el("div", { id: "progressi-body" });

  aggiungi(contenitore, [
    intestazione(gruppo ? gruppo.interruttore() : "Mobilità"),
    el("div", { class: "mo-schede" }, [
      pillolaScheda("oggi", "Oggi"),
      pillolaScheda("progressi", "Progressi"),
    ]),
    vista.scheda === "oggi" ? corpoOggi : corpoProgressi,
    overlaySessione(),
    overlayAssessment(),
  ]);

  if (vista.scheda === "oggi") renderOggi(corpoOggi);
  else renderProgressi(corpoProgressi);

  pubblicaSullaLavagna();
  globalThis.scrollTo(0, scorrimento);
}

const dataLunga = () =>
  new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });

function pillolaScheda(id, testo) {
  return el("button", {
    class: "mo-scheda" + (vista.scheda === id ? " attiva" : ""),
    type: "button", testo,
    "aria-pressed": String(vista.scheda === id),
    onClick: () => { vista.scheda = id; disegna(); },
  });
}

/* ------------------------------------------------------------- overlay -- */
/* A schermo intero, sopra tutto: durante una sessione non deve esserci
   nient'altro, e la barra dei moduli è una via d'uscita accidentale a
   portata di pollice. Gli id sono quelli che `sessione.js` e
   `assessment.js` cercano con getElementById — non si rinominano. */

function overlaySessione() {
  return el("section", { class: "mo-overlay", id: "view-sessione", hidden: true }, [
    el("header", { class: "mo-overlay-testa" }, [
      el("button", {
        class: "btn-icona", id: "btn-chiudi-sessione", type: "button",
        "aria-label": "Chiudi sessione", html: icona("chiudi", 22),
        onClick: () => chiudiOverlay("sessione"),
      }),
      el("span", { id: "sessione-progress", class: "micro" }),
      el("button", {
        class: "btn-icona", id: "btn-pausa-sessione", type: "button",
        "aria-label": "Pausa", hidden: true, html: icona("pausa", 20),
        onClick: () => togglePausa(),
      }),
    ]),
    el("div", { class: "mo-overlay-corpo", id: "sessione-body" }),
  ]);
}

function overlayAssessment() {
  return el("section", { class: "mo-overlay", id: "view-assessment", hidden: true }, [
    el("header", { class: "mo-overlay-testa" }, [
      el("button", {
        class: "btn-icona", id: "btn-chiudi-assessment", type: "button",
        "aria-label": "Chiudi", html: icona("chiudi", 22),
        onClick: () => chiudiOverlay("assessment"),
      }),
      el("span", { class: "micro", testo: "Assessment" }),
      el("span"),
    ]),
    el("div", { class: "mo-overlay-corpo", id: "assessment-body" }),
  ]);
}

export function apriOverlay(nome, tipo) {
  const v = document.getElementById(`view-${nome}`);
  if (!v) return;
  v.hidden = false;
  document.body.style.overflow = "hidden";
  if (nome === "assessment") renderAssessment(document.getElementById("assessment-body"));
  if (nome === "sessione") renderSessione(document.getElementById("sessione-body"), tipo);
}

function chiudiOverlay(nome) {
  const v = document.getElementById(`view-${nome}`);
  if (v) v.hidden = true;
  document.body.style.overflow = "";
  if (nome === "sessione") fermaSessione();
  disegna();
}

const overlayAperto = () => Boolean(document.querySelector(".mo-overlay:not([hidden])"));

// Mai ridisegnare con un overlay aperto: la regola dice che il sync non
// ridisegna sotto le dita, e qui vorrebbe dire smontare il player a metà
// esercizio.
quandoCambia(() => { if (contenitore && !overlayAperto()) disegna(); });

/* ------------------------------------------------------------ contratto -- */

export default {
  async monta(cont, posizione) {
    contenitore = cont;
    gruppo = posizione?.gruppo || null;
    const resto = posizione?.resto || [];
    vista.scheda = resto[0] === "progressi" ? "progressi" : "oggi";

    disegna();

    // Il tipo di sessione lo decide l'app e viaggia sul pulsante stesso. È
    // l'aggancio dell'app di partenza, e resta delegato sul contenitore
    // perché `oggi.js` si ridisegna da solo: un ascoltatore attaccato al
    // pulsante morirebbe al primo ridisegno.
    const alClick = (e) => {
      const b = e.target.closest?.("#btn-inizia-sessione, #btn-rifai-assessment, #btn-apri-assessment");
      if (!b) return;
      if (b.id === "btn-inizia-sessione") apriOverlay("sessione", b.dataset.tipo || "quotidiano");
      else apriOverlay("assessment");
    };
    cont.addEventListener("click", alClick);
    staccatori.push(() => cont.removeEventListener("click", alClick));

    if (resto[0] === "inizia") {
      const s = getState();
      const tipo = tipoDelGiorno(s, Boolean(s.giornoCorrente?.haCorso));
      queueMicrotask(() => apriOverlay("sessione", tipo));
    }

    // I file portati annunciano così ogni scrittura.
    const suDati = () => { if (!overlayAperto()) disegna(); };
    document.addEventListener("dati-cambiati", suDati);
    staccatori.push(() => document.removeEventListener("dati-cambiati", suDati));

    const suChiusa = () => chiudiOverlay("sessione");
    document.addEventListener("sessione-chiusa", suChiusa);
    staccatori.push(() => document.removeEventListener("sessione-chiusa", suChiusa));

    const suCompletata = (e) => {
      avviso("Sessione registrata.");
      // L'annuncio è ciò che permette ad Abitudini di spuntare da sé
      // l'abitudine corrispondente, senza che i due moduli si conoscano.
      annuncia("mobilita:sessione-completata", e.detail || {});
    };
    document.addEventListener("sessione-completata", suCompletata);
    staccatori.push(() => document.removeEventListener("sessione-completata", suCompletata));

    staccatori.push(ascolta("giorno:cambiato", disegna));
  },

  smonta() {
    // Uscendo dal modulo col player acceso, il timer resterebbe a girare e
    // la voce a parlare da una schermata che non c'è più.
    fermaSessione();
    document.body.style.overflow = "";
    while (staccatori.length) staccatori.pop()();
    contenitore = null;
  },

  /** La sezione "Mobilità" di Impostazioni: programma, palestra, assessment. */
  impostazioni() {
    return vistaImpostazioni(() => { if (contenitore) disegna(); }, apriOverlay);
  },

  oggi,

  avviaSync,
};
