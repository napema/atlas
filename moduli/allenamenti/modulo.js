// moduli/allenamenti — tredici settimane verso i 5 km sotto i venti minuti.
//
// Il modulo tiene UN blocco alla volta. Il piano è codice (vedi dati.js),
// l'archivio contiene solo quello che succede: le spunte, i giorni scelti,
// gli allenamenti importati dalla chat di fitness e le corse importate da
// Garmin.

import { el, aggiungi, intestazione, oggiISO, plurale } from "../../core/ui.js";
import { icona } from "../../core/icone.js";
import { apriCanale, fondiRecord, potaLapidi } from "../../core/sync.js";
import { scriviFatto, leggiFatto, giornoCorrente } from "../../core/contesto.js";
import { annuncia, ascolta } from "../../core/bus.js";
import {
  casella, stato, settimanaCorrente, settimanaDi, slotDi, fatto, SETTIMANE,
  pianoDi, OBIETTIVO,
} from "./dati.js";
import {
  progressoSettimana, restaSettimana, giorniRimasti, passoSettimana,
  kmFatti, settimaneAlTest, proiezione, km,
} from "./calcolo.js";
import {
  strisciaSettimane, testata, elencoSlot, vistaAndamento, apriImport,
  vistaImpostazioni,
} from "./viste.js";

let contenitore = null;
let settimana = settimanaCorrente();
let vista = "settimana";
const staccatori = [];

/* --------------------------------------------------------------- vista -- */

function disegna() {
  if (!contenitore) return;
  const scorrimento = globalThis.scrollY;
  contenitore.replaceChildren();

  aggiungi(contenitore, [
    intestazione("Allenamenti", "", el("button", {
      class: "btn-icona", type: "button", "aria-label": "Importa",
      html: icona("nuvola", 24),
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

/* ------------------------------------------------------------- lavagna -- */

/**
 * Quello che gli altri moduli possono sapere: due numeri, non l'archivio.
 * `aperti` insieme a `slot` perché «2» da solo non dice niente — due su sei
 * a inizio settimana e due su sei di sabato sono settimane diverse.
 */
function pubblicaSullaLavagna() {
  const n = settimanaDi(giornoCorrente());
  if (!n) return;
  const p = progressoSettimana(n);
  if (leggiFatto("allenamenti", "fatti") !== p.fatti) scriviFatto("allenamenti", "fatti", p.fatti);
  if (leggiFatto("allenamenti", "slot") !== p.totali) scriviFatto("allenamenti", "slot", p.totali);
}

/* ---------------------------------------------------------------- sync -- */

export function avviaSync() {
  const canale = apriCanale({
    id: "allenamenti",
    file: "allenamenti.json",
    impacchetta: () => {
      const s = stato();
      return { v: 1, slot: s.slot, corse: s.corse, config: s.config, configUp: s.configUp || 0 };
    },
    applica: (remoto) => {
      casella.aggiorna((s) => {
        s.slot = potaLapidi(fondiRecord(s.slot, remoto.slot));
        s.corse = potaLapidi(fondiRecord(s.corse, remoto.corse));
        // `config` non ha id: si confronta con un timestamp solo. Un remoto a
        // zero non deve poter vincere su un locale che è stato toccato.
        if ((remoto.configUp || 0) > (s.configUp || 0)) {
          s.config = { ...s.config, ...remoto.config };
          s.configUp = remoto.configUp;
        }
      }, { origine: "sync", tocca: false });   // applicare il remoto NON è una
                                               // modifica locale: senza questo
                                               // i due dispositivi si rimbalzano
                                               // PUT a vicenda per sempre
    },
    ridisegna: () => { pubblicaSullaLavagna(); if (contenitore) disegna(); },
  });

  pubblicaSullaLavagna();
  casella.osserva((_, origine) => { if (origine !== "sync") canale.segnalaModifica(); });
  canale.avvia();
  return canale;
}

/* ------------------------------------------------------------ contratto -- */

export default {
  async monta(cont, posizione) {
    contenitore = cont;
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

  /**
   * La scheda per la home. Sincrona e senza effetti collaterali.
   *
   * Dice quanto resta della SETTIMANA, non cosa tocca oggi: il piano non
   * assegna giorni, quindi «oggi tocca la lunga» sarebbe una cosa che
   * l'app si inventa.
   */
  oggi() {
    const iso = giornoCorrente();
    const n = settimanaDi(iso);
    if (!n) return null;           // fuori dal blocco: niente da dire

    const p = progressoSettimana(n);
    const aperti = p.totali - p.fatti;
    const giorni = giorniRimasti(n, iso);
    const ritmo = passoSettimana(n, iso);
    const piano = pianoDi(n);
    const resta = restaSettimana(n);

    return {
      titolo: "Allenamenti",
      valore: `${p.fatti} / ${p.totali}`,
      dettaglio: aperti === 0
        ? `Settimana ${n} chiusa · ${km(kmFatti(n))}`
        : `${plurale(aperti, "slot aperto", "slot aperti")} · ${plurale(giorni, "giorno", "giorni")}`,
      fatto: aperti === 0,
      mancaTesto: aperti === 0 ? null
        : aperti === 1 ? resta[0].nome.toLowerCase()
        : `${aperti} allenamenti`,
      avanzamento: p.frazione,
      // Urgente quando gli slot aperti sono più dei giorni che restano: non
      // è pessimismo, è aritmetica, ed è l'unico momento in cui dirlo serve.
      urgente: ritmo === "indietro" || ritmo === "persa",
      azione: { rotta: "#/allenamenti" },
    };
  },

  avviaSync,
};
