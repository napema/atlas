// moduli/finanze — il registro di entrate e uscite.
//
// Portato da napema/budget-tracker-webpage. Il primo tentativo l'aveva
// riscritto e gli aveva tolto metà delle funzioni: Analisi ridotta a due
// pannelli su nove, niente import dell'estratto conto, niente drill-down
// sulle sottocategorie, niente giroconti. Questa versione è quella vera,
// funzione per funzione — cambiano solo lo stile e il font.
//
// Tre schermate: Riepilogo, Movimenti, Analisi. Il Setup è la sezione
// "Finanze" di Impostazioni — tutte le impostazioni in un posto solo.

import { el, aggiungi, intestazione } from "../../core/ui.js";
import { icona } from "../../core/icone.js";
import { ascolta } from "../../core/bus.js";
import { meseDi, spostaMese, nomeMese } from "./calcolo.js";
// Sync, lavagna e la scheda della home stanno in `contratto.js`, CONDIVISO
// con la app nuova: una sola regola di fusione dei dati per tutte e due.
import { quandoCambia, pubblicaSullaLavagna, avviaSync, oggi } from "./contratto.js";
import {
  vistaHome, vistaMovimenti, vistaAnalisi, vistaSetup,
  apriMovimento, apriCategoria, apriSottocategoria, apriDettaglio,
  apriRicarica, apriRicaricaSettimanale, apriSaldoING, apriSetupPocket,
} from "./viste.js";

let contenitore = null;
const staccatori = [];

// Come stai guardando i dati, non un dato: non va nella casella e non si
// sincronizza. Altrimenti cambiare scheda sull'iPhone la cambierebbe sul PC.
const vista = { scheda: "home", mese: meseDi(), grafico: "settimana", filtro: "tutti" };

// Il Setup non è più una scheda qui dentro: è la sezione "Finanze" della
// schermata Impostazioni, insieme a quelle degli altri moduli. Sparso nei
// moduli non lo trovava nessuno.
const SCHEDE = [["home", "Riepilogo"], ["movimenti", "Movimenti"], ["analisi", "Analisi"]];

quandoCambia(() => { if (contenitore) disegna(); });

/* --------------------------------------------------------------- vista -- */

function ridisegna(patch = {}) {
  Object.assign(vista, patch);
  disegna();
}

// I fogli hanno bisogno di riaprirsi a vicenda (categoria → sottocategoria →
// dettaglio) senza che le viste conoscano il modulo: si passano queste.
// Le azioni che la home può far partire ma non sa costruire: il flusso di
// ricarica e il saldo di ING, che vivono nei fogli.
const azioniHome = {
  ricarica: () => apriRicarica(disegna),
  saldoING: () => apriSaldoING(disegna),
  pocketSetup: () => apriSetupPocket(disegna),
};

const aperture = {
  cat: (id) => apriCategoria(vista.mese, id, disegna, aperture.sub, aperture.dett),
  sub: (cid, s) => apriSottocategoria(vista.mese, cid, s, disegna, aperture.dett),
  dett: (id) => apriDettaglio(id, disegna, aperture.dett),
};

function disegna() {
  if (!contenitore) return;
  const scorrimento = globalThis.scrollY;
  contenitore.replaceChildren();

  aggiungi(contenitore, [
    // Il mese non va nel sottotitolo: lo dice già il navigatore qui sotto,
    // e scritto due volte a due centimetri di distanza sembra un errore.
    intestazione("Finanze"),

    navigatoreMese(),
    barraAzioni(),

    el("div", { class: "fi-schede" }, SCHEDE.map(([id, testo]) => el("button", {
      class: "fi-scheda" + (vista.scheda === id ? " attiva" : ""),
      type: "button", testo, "aria-pressed": String(vista.scheda === id),
      onClick: () => ridisegna({ scheda: id }),
    }))),

    vista.scheda === "home"      ? vistaHome(vista.mese, vista.grafico, ridisegna, aperture.cat, azioniHome)
    : vista.scheda === "movimenti" ? vistaMovimenti(vista.mese, vista.filtro, ridisegna, aperture.dett)
    : vistaAnalisi(vista.mese, aperture.cat, aperture.sub),
  ]);

  pubblicaSullaLavagna();
  globalThis.scrollTo(0, scorrimento);
}

/**
 * Uscita · Entrata · ⋯ — le tre azioni dell'app di partenza, e sono tornate
 * com'erano.
 *
 * Le avevo sostituite con un "+" tondo unico: un pulsante solo per due gesti
 * che non sono lo stesso gesto. Registrare un'uscita è la cosa che fai dieci
 * volte a settimana, registrare un'entrata due volte al mese: nasconderle
 * dietro lo stesso tondo, e per giunta senza dire quale delle due parte,
 * costa un tocco e un dubbio ogni volta.
 *
 * Il "⋯" apre lo stesso foglio sul tipo "ricarica extra", e da lì le pillole
 * dei tipi arrivano a giroconto, rimborso e reso: sono i movimenti rari, e
 * stare un livello sotto è giusto.
 */
function barraAzioni() {
  const apri = (tipo) => apriMovimento({ ridisegna: disegna, tipo });
  return el("div", { class: "fi-azioni" }, [
    el("button", { class: "btn fi-uscita", type: "button", testo: "Uscita", onClick: () => apri("out") }),
    el("button", { class: "btn fi-entrata", type: "button", testo: "Entrata", onClick: () => apri("in") }),
    el("button", {
      class: "btn morbido fi-altro", type: "button", testo: "⋯",
      "aria-label": "Altri movimenti", title: "Giroconto, rimborso, reso, ricarica extra",
      onClick: () => apri("extra"),
    }),
  ]);
}

function navigatoreMese() {
  const corrente = meseDi();
  return el("div", { class: "fi-mese" }, [
    el("button", {
      class: "btn-icona", type: "button", "aria-label": "Mese precedente",
      html: icona("indietro", 20),
      onClick: () => ridisegna({ mese: spostaMese(vista.mese, -1) }),
    }),
    el("button", {
      class: "fi-mese-nome", type: "button", testo: nomeMese(vista.mese),
      title: "Torna al mese corrente",
      onClick: () => ridisegna({ mese: corrente }),
    }),
    el("button", {
      class: "btn-icona", type: "button", "aria-label": "Mese successivo",
      html: icona("freccia", 20),
      disabled: vista.mese >= corrente,
      onClick: () => ridisegna({ mese: spostaMese(vista.mese, +1) }),
    }),
  ]);
}

/* ------------------------------------------------------------ contratto -- */

export default {
  async monta(cont, posizione) {
    contenitore = cont;
    vista.mese = meseDi();

    const resto = posizione?.resto || [];
    if (SCHEDE.some(([id]) => id === resto[0])) vista.scheda = resto[0];
    else vista.scheda = "home";

    disegna();

    if (resto[0] === "nuovo") queueMicrotask(() => apriMovimento({ ridisegna: disegna }));
    // La rotta su cui atterra la notifica del lunedì. Apre direttamente il
    // foglio: dalla notifica alla conferma non deve esserci una schermata
    // in mezzo, altrimenti il «un tap solo» ne diventano tre.
    if (resto[0] === "ricarica") queueMicrotask(() => apriRicaricaSettimanale(disegna));
    staccatori.push(ascolta("giorno:cambiato", () => { vista.mese = meseDi(); disegna(); }));
  },

  smonta() {
    while (staccatori.length) staccatori.pop()();
    contenitore = null;
  },

  /** La sezione "Finanze" di Impostazioni: budget, cassa, casa, import. */
  impostazioni() {
    return vistaSetup(meseDi(), () => { if (contenitore) disegna(); });
  },

  oggi,

  avviaSync,
};
