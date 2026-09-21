// moduli/abitudini — le abitudini del giorno, marcate in un tocco.
//
// Portato da napema/habit-tracker-webapp. Del monolite restano lo schema
// (invariato: aveva già id, up e lapidi) e il motore delle serie, che è la
// parte pensata bene. Sono spariti il suo storage, il suo sync e le sue
// notifiche: ora sono di core, e valgono per tutti i moduli.

import { el, aggiungi, intestazione, avviso, oggiISO, piuGiorni, plurale } from "../../core/ui.js";
import { icona } from "../../core/icone.js";
import { ascolta } from "../../core/bus.js";
// Sync, lavagna e ciò che la home chiede stanno in `contratto.js`, CONDIVISO
// con la app nuova: una sola regola di fusione dei dati per tutte e due.
import {
  quandoCambia, pubblicaSullaLavagna, avviaSync,
  spunta, spuntaParte, oggi,
} from "./contratto.js";
import {
  strisciaSettimana, riepilogo, elenco,
  apriModifica, vistaImpostazioni, vistaSerie,
} from "./viste.js";

let contenitore = null;
let giornoScelto = oggiISO();
let vista = "oggi";
const staccatori = [];

quandoCambia(() => { if (contenitore) disegna(); });

/* --------------------------------------------------------------- vista -- */

function disegna() {
  if (!contenitore) return;
  const scorrimento = globalThis.scrollY;
  contenitore.replaceChildren();

  aggiungi(contenitore, [
    intestazione("Abitudini", "", el("button", {
      class: "btn-icona", type: "button", "aria-label": "Nuova abitudine",
      html: icona("piu", 26),
      onClick: () => apriModifica(null, disegna),
    })),
    el("div", { class: "ab-schede" }, [
      pillolaScheda("oggi", "Oggi"),
      pillolaScheda("serie", "Serie"),
    ]),
    ...(vista === "serie" ? [vistaSerie(disegna)] : [
      strisciaSettimana(giornoScelto, (g) => { giornoScelto = g; disegna(); }),
      /* NIENTE PANNELLI QUI, ed e' una correzione.
         Erano «Da fare 2 di 7», «Spuntate 5 · 71% del giorno», «Serie 1»,
         «Attive 7»: i primi due sono lo stesso fatto detto due volte, e la
         lista qui sotto lo dice una terza. «Attive» poi non e' nemmeno un
         dato del giorno — e' una proprieta' della configurazione.
         I pannelli servono dove i numeri vivono in schede DIVERSE e
         metterli insieme fa risparmiare uno scorrimento. Qui sta gia'
         tutto in una schermata. */
      riepilogo(giornoScelto),
      elenco(giornoScelto, disegna),
    ]),
  ]);

  pubblicaSullaLavagna();
  globalThis.scrollTo(0, scorrimento);
}

function pillolaScheda(id, testo) {
  return el("button", {
    class: "ab-scheda" + (vista === id ? " attiva" : ""),
    type: "button", testo,
    "aria-pressed": String(vista === id),
    onClick: () => { vista = id; disegna(); },
  });
}

function etichettaGiorno() {
  const oggi = oggiISO();
  if (giornoScelto === oggi) return "oggi";
  if (giornoScelto === piuGiorni(oggi, -1)) return "ieri";
  return new Date(`${giornoScelto}T12:00:00`)
    .toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });
}

/* ------------------------------------------------------------ contratto -- */

export default {
  async monta(cont, posizione) {
    contenitore = cont;
    giornoScelto = oggiISO();

    // Rotta #/abitudini/nuova: la scorciatoia della schermata Home.
    if (posizione?.resto?.[0] === "nuova") {
      queueMicrotask(() => apriModifica(null, disegna));
    }

    disegna();

    // Chi ascolta DEVE staccarsi in smonta(): senza, ogni visita alla
    // schermata lascia dietro una copia dell'ascoltatore, e i ridisegni
    // raddoppiano a ogni giro.
    staccatori.push(ascolta("giorno:cambiato", () => { giornoScelto = oggiISO(); disegna(); }));
  },

  smonta() {
    while (staccatori.length) staccatori.pop()();
    contenitore = null;
  },

  // Le azioni che la home chiede: vivono nel contratto condiviso.
  spuntaParte,
  spunta,

  /** La sezione "Abitudini" di Impostazioni: elenco, archiviate, settimana. */
  impostazioni() {
    return vistaImpostazioni(() => { if (contenitore) disegna(); });
  },

  oggi,

  avviaSync,
};
