// moduli/mobilita — la pratica quotidiana: RESET, MICRO e CARICO.
//
// Innesto, non riscrittura. Da napema/mobility-blueprint arrivano intatti il
// catalogo (esercizi.js), il motore del follow-along (engine.js) e le regole
// del programma (calcolo.js). Sono spariti solo il suo storage e il suo sync.
//
// LA SALVAGUARDIA DELL'ASSESSMENT, più sotto in `applica`, non è una
// precauzione teorica: nell'app di partenza uno stato locale vuoto ha
// sovrascritto il repo e cancellato un assessment intero. Non toglierla.

import { el, aggiungi, intestazione, avviso, oggiISO, plurale, durata as fmtDurata } from "../../core/ui.js";
import { icona } from "../../core/icone.js";
import { apriCanale, fondiRecord, potaLapidi } from "../../core/sync.js";
import { scriviFatto, leggiFatto, giornoCorrente } from "../../core/contesto.js";
import { annuncia, ascolta } from "../../core/bus.js";
import { casella, stato, sessioniVive, TIPI_SESSIONE } from "./dati.js";
import { costruisciSessione, tipoDelGiorno, serie, settimanaEffettiva } from "./calcolo.js";
import { vistaOggi, vistaProgressi, apriPlayer } from "./viste.js";

let contenitore = null;
const staccatori = [];
const vista = { scheda: "oggi" };

/* --------------------------------------------------------------- vista -- */

function disegna() {
  if (!contenitore) return;
  const scorrimento = globalThis.scrollY;
  contenitore.replaceChildren();

  aggiungi(contenitore, [
    intestazione("Mobilità", dataLunga()),
    el("div", { class: "mo-schede" }, [
      pillolaScheda("oggi", "Oggi"),
      pillolaScheda("progressi", "Progressi"),
    ]),
    vista.scheda === "oggi" ? vistaOggi(disegna, avvia) : vistaProgressi(),
  ]);

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

function avvia(tipo) {
  apriPlayer(tipo, (completata, dati) => {
    disegna();
    if (!completata) return;
    avviso("Sessione registrata.");
    // L'annuncio è ciò che permette ad Abitudini di spuntare da sé
    // l'abitudine corrispondente, senza che i due moduli si conoscano.
    annuncia("mobilita:sessione-completata", { tipo: dati.tipo, durataMin: Math.round(dati.durataSec / 60) });
  });
}

/* ------------------------------------------------------------- lavagna -- */

function pubblicaSullaLavagna() {
  const oggi = giornoCorrente();
  const fatta = sessioniVive().find((s) => s.data === oggi);
  if (!fatta) return;
  if (leggiFatto("mobilita", "sessione") !== fatta.tipo) scriviFatto("mobilita", "sessione", fatta.tipo);
  const min = Math.round((fatta.durataSec || 0) / 60);
  if (leggiFatto("mobilita", "durata-min") !== min) scriviFatto("mobilita", "durata-min", min);
}

/* ---------------------------------------------------------------- sync -- */

export function avviaSync() {
  const canale = apriCanale({
    id: "mobilita",
    file: "mobilita.json",
    impacchetta: () => {
      const s = stato();
      return { records: s.records, foto: s.foto, meta: s.meta, metaUp: s.metaUp || 0 };
    },
    applica: (remoto) => {
      casella.aggiorna((s) => {
        s.records = potaLapidi(fondiRecord(s.records, remoto.records));
        s.foto = potaLapidi(fondiRecord(s.foto, remoto.foto));

        // ---- la salvaguardia ----
        // Un assessment completato non deve MAI perdere contro uno vuoto,
        // qualunque cosa dicano i timestamp. Ma vale solo per un dispositivo
        // che non ha mai scritto (metaUp a zero): è lì che lo stato vuoto è
        // un caso da proteggere. Se invece l'assessment è stato azzerato
        // apposta, metaUp è recente e l'azzeramento deve poter viaggiare.
        const remotoHa = Boolean(remoto.meta?.assessment?.completato);
        const localeHa = Boolean(s.meta?.assessment?.completato);
        const maiScritto = !(s.metaUp > 0);

        if (remotoHa && !localeHa && maiScritto) {
          s.meta = remoto.meta;
          s.metaUp = Math.max(remoto.metaUp || 0, s.metaUp || 0);
          return;
        }
        if (localeHa && !remotoHa) return;   // il locale è più ricco: non toccarlo

        if ((remoto.metaUp || 0) > (s.metaUp || 0)) {
          s.meta = remoto.meta;
          s.metaUp = remoto.metaUp;
        }
      }, { origine: "sync", tocca: false });
    },
    ridisegna: () => { if (contenitore) disegna(); },
  });

  casella.osserva((_, origine) => { if (origine !== "sync") canale.segnalaModifica(); });
  canale.avvia();
  return canale;
}

/* ------------------------------------------------------------ contratto -- */

export default {
  async monta(cont, posizione) {
    contenitore = cont;
    const resto = posizione?.resto || [];
    if (resto[0] === "progressi") vista.scheda = "progressi";
    else vista.scheda = "oggi";

    disegna();

    if (resto[0] === "inizia") {
      const s = stato();
      const tipo = tipoDelGiorno(s.meta, sessioniVive(), Boolean(s.giornoCorrente?.haCorso));
      queueMicrotask(() => avvia(tipo));
    }

    staccatori.push(ascolta("giorno:cambiato", disegna));
  },

  smonta() {
    while (staccatori.length) staccatori.pop()();
    contenitore = null;
  },

  oggi() {
    const s = stato();
    const sessioni = sessioniVive();
    const giorno = giornoCorrente();
    const fatta = sessioni.find((x) => x.data === giorno);
    const n = serie(sessioni);

    if (fatta) {
      return {
        titolo: "Mobilità",
        valore: fmtDurata(fatta.durataSec),
        dettaglio: n > 1 ? `${TIPI_SESSIONE[fatta.tipo]?.nome} · ${plurale(n, "giorno", "giorni")} di fila` : TIPI_SESSIONE[fatta.tipo]?.nome,
        urgente: false,
        azione: { rotta: "#/mobilita" },
      };
    }

    const haCorso = s.giornoCorrente?.data === giorno ? Boolean(s.giornoCorrente.haCorso) : false;
    const tipo = tipoDelGiorno(s.meta, sessioni, haCorso);
    const { passi } = costruisciSessione(s.meta, sessioni, tipo);
    const minuti = Math.max(1, Math.round(passi.reduce((t, p) => t + p.durataSec, 0) / 60));

    return {
      titolo: "Mobilità",
      valore: `${minuti} min`,
      dettaglio: n > 0
        ? `${TIPI_SESSIONE[tipo]?.nome} · ${plurale(n, "giorno", "giorni")} di fila da non perdere`
        : TIPI_SESSIONE[tipo]?.nome,
      // Urgente di sera: è l'ora in cui la sessione salta davvero.
      urgente: new Date().getHours() >= 21,
      azione: { rotta: "#/mobilita" },
    };
  },

  avviaSync,
};
