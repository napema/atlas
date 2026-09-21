// moduli/allenamenti — tredici settimane verso i 5 km sotto i venti minuti.
//
// Il modulo tiene UN blocco alla volta. Il piano è codice (vedi dati.js),
// l'archivio contiene solo quello che succede: le spunte, i giorni scelti,
// gli allenamenti importati dalla chat di fitness e le corse importate da
// Garmin.

import { el, aggiungi, intestazione } from "../../core/ui.js";
import { icona } from "../../core/icone.js";
import { ascolta } from "../../core/bus.js";
import { settimanaCorrente } from "./dati.js";
// Sync, lavagna e la scheda della home stanno in `contratto.js`, CONDIVISO
// con la app nuova: una sola regola di fusione dei dati per tutte e due.
import { quandoCambia, pubblicaSullaLavagna, avviaSync, oggi } from "./contratto.js";
import {
  strisciaSettimane, testata, elencoSlot, vistaAndamento, apriImport,
  vistaImpostazioni,
} from "./viste.js";

let contenitore = null;
// Il gruppo della barra (vedi core/registro.js): quando c'e, il suo
// interruttore prende il posto del titolo invece di stargli sopra. Questa
// schermata ha gia le sue pillole sotto la testata, e interruttore + titolo
// + pillole sono tre righe di navigazione prima del primo dato.
let gruppo = null;
let settimana = settimanaCorrente();
let vista = "settimana";
const staccatori = [];

quandoCambia(() => { if (contenitore) disegna(); });

/* --------------------------------------------------------------- vista -- */

function disegna() {
  if (!contenitore) return;
  const scorrimento = globalThis.scrollY;
  contenitore.replaceChildren();

  aggiungi(contenitore, [
    intestazione(gruppo ? gruppo.interruttore() : "Allenamenti", "", el("button", {
      class: "btn-icona", type: "button", "aria-label": "Importa",
      html: icona("importa", 23, 1.9),
      onClick: () => apriImport(disegna, vista === "andamento" ? "corse" : "allenamenti"),
    })),

    el("div", { class: "al-schede" }, [
      pillola("settimana", "Settimana"),
      pillola("andamento", "Andamento"),
    ]),

    ...(vista === "andamento" ? [vistaAndamento(disegna)] : [
      strisciaSettimane(settimana, (n) => { settimana = n; disegna(); }),
      testata(settimana),
      elencoSlot(settimana, disegna),
    ]),
  ]);

  pubblicaSullaLavagna();
  globalThis.scrollTo(0, scorrimento);
}

function pillola(id, testo) {
  return el("button", {
    class: "al-scheda" + (vista === id ? " attiva" : ""),
    type: "button", testo,
    "aria-pressed": String(vista === id),
    onClick: () => { vista = id; disegna(); },
  });
}

/* ------------------------------------------------------------ contratto -- */

export default {
  async monta(cont, posizione) {
    contenitore = cont;
    gruppo = posizione?.gruppo || null;
    settimana = settimanaCorrente();
    const resto = posizione?.resto || [];
    vista = resto[0] === "andamento" ? "andamento" : "settimana";

    disegna();

    if (resto[0] === "importa") queueMicrotask(() => apriImport(disegna, "corse"));

    // Chi ascolta DEVE staccarsi in smonta(): senza, ogni visita lascia
    // dietro una copia dell'ascoltatore e i ridisegni raddoppiano.
    staccatori.push(ascolta("giorno:cambiato", () => { settimana = settimanaCorrente(); disegna(); }));
  },

  smonta() {
    while (staccatori.length) staccatori.pop()();
    contenitore = null;
  },

  impostazioni() {
    return vistaImpostazioni();
  },

  oggi,

  avviaSync,
};
