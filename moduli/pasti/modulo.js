// moduli/pasti — il database dei pasti, la settimana che ne esce, e il conto.
//
// Il piano è il registro: l'archivio tiene solo gli scostamenti. Il perché
// sta in `dati.js` e nel briefing, e conviene leggerlo prima di toccare
// qualsiasi cosa qui dentro.

import { el, aggiungi, intestazione } from "../../core/ui.js";
import { icona } from "../../core/icone.js";
import { giornoCorrente } from "../../core/contesto.js";
import { ascolta } from "../../core/bus.js";
import { lunediDi } from "./dati.js";
// Sync, lavagna e la scheda della home stanno in `contratto.js`, CONDIVISO
// con la app nuova: una sola regola di fusione dei dati per tutte e due.
import { quandoCambia, pubblicaSullaLavagna, avviaSync, oggi } from "./contratto.js";
import {
  testataGiorno, elencoFasce, elencoScostamenti, vistaSettimana,
  apriImport, vistaImpostazioni,
} from "./viste.js";

let contenitore = null;
let vista = "oggi";
let lunedi = lunediDi();
const staccatori = [];

quandoCambia(() => { if (contenitore) disegna(); });

/* --------------------------------------------------------------- vista -- */

function disegna() {
  if (!contenitore) return;
  const scorrimento = globalThis.scrollY;
  const iso = giornoCorrente();
  contenitore.replaceChildren();

  aggiungi(contenitore, [
    intestazione("Pasti", "", el("button", {
      class: "btn-icona", type: "button", "aria-label": "Importa",
      html: icona("importa", 23, 1.9),
      onClick: () => apriImport(disegna),
    })),

    el("div", { class: "pa-schede" }, [
      pillola("oggi", "Oggi"),
      pillola("settimana", "Settimana"),
    ]),

    ...(vista === "settimana"
      ? [vistaSettimana(lunedi, disegna)]
      : [testataGiorno(iso), elencoFasce(iso, disegna), elencoScostamenti(iso, disegna)].filter(Boolean)),
  ]);

  pubblicaSullaLavagna();
  globalThis.scrollTo(0, scorrimento);
}

function pillola(id, testo) {
  return el("button", {
    class: "pa-scheda" + (vista === id ? " attiva" : ""),
    type: "button", testo,
    "aria-pressed": String(vista === id),
    onClick: () => { vista = id; disegna(); },
  });
}

/* ------------------------------------------------------------ contratto -- */

export default {
  async monta(cont, posizione) {
    contenitore = cont;
    lunedi = lunediDi(giornoCorrente());
    const resto = posizione?.resto || [];
    vista = resto[0] === "settimana" ? "settimana" : "oggi";

    disegna();

    if (resto[0] === "importa") queueMicrotask(() => apriImport(disegna));

    // Chi ascolta DEVE staccarsi in smonta(): senza, ogni visita lascia
    // dietro una copia dell'ascoltatore e i ridisegni raddoppiano.
    staccatori.push(ascolta("giorno:cambiato", () => { lunedi = lunediDi(giornoCorrente()); disegna(); }));
  },

  smonta() {
    while (staccatori.length) staccatori.pop()();
    contenitore = null;
  },

  impostazioni() {
    return vistaImpostazioni(() => { if (contenitore) disegna(); });
  },

  oggi,

  avviaSync,
};
