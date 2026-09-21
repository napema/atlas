// moduli/mobilita/contratto.js — sync, lavagna, e la scheda per la home.
//
// CONDIVISO FRA LE DUE APP, come `moduli/abitudini/contratto.js`: la app di
// prima lo usa da `modulo.js`, la app nuova (`app/`) dal registro. Il codice
// è quello di `modulo.js`, spostato e non riscritto; `quandoCambia()` è il
// solo pezzo nuovo, e serve solo alla vista vecchia.

import { plurale, durata as fmtDurata } from "../../core/ui.js";
import { apriCanale, fondiRecord, potaLapidi } from "../../core/sync.js";
import { scriviFatto, leggiFatto, giornoCorrente } from "../../core/contesto.js";
import { casella, stato, sessioniVive, TIPI_SESSIONE } from "./dati.js";
import { getState } from "./ponte.js";
import { costruisciSessione, tipoDelGiorno } from "./sessione.js";

let ridisegnaVista = () => {};

/** La vista vecchia registra qui il proprio `disegna()`. */
export function quandoCambia(fn) { ridisegnaVista = fn || (() => {}); }

/* ------------------------------------------------------------- lavagna -- */

export function pubblicaSullaLavagna() {
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
    // Il controllo dell'overlay aperto sta nella vista vecchia, dentro il
    // suo `quandoCambia`: è lei che ha un player da non smontare.
    ridisegna: () => { pubblicaSullaLavagna(); ridisegnaVista(); },
  });

  // La lavagna si aggiorna anche a modulo chiuso: la home la legge, e se si
  // scrivesse solo al montaggio mostrerebbe i numeri dell'ultima volta che
  // sei passato di qui.
  pubblicaSullaLavagna();

  casella.osserva((_, origine) => { if (origine !== "sync") canale.segnalaModifica(); });
  canale.avvia();
  return canale;
}

/* ------------------------------------------------ la scheda per la home -- */

/** Sincrona e senza effetti collaterali. */
export function oggi() {
  const s = getState();
  const sessioni = sessioniVive();
  const giorno = giornoCorrente();
  const fatta = sessioni.find((x) => x.data === giorno);
  const n = s.streak?.giorniConsecutivi || 0;

  // La differenza fra fatta e da fare deve essere la PRIMA cosa che si
  // legge. Prima entrambi i casi mostravano una durata e per capire quale
  // fosse quale bisognava leggere la riga sotto: sbagliato.
  if (fatta) {
    const dettagli = [TIPI_SESSIONE[fatta.tipo]?.nome, fmtDurata(fatta.durataSec)];
    if (n > 1) dettagli.push(`${plurale(n, "giorno", "giorni")} di fila`);
    return {
      titolo: "Mobilità",
      valore: "Fatta",
      dettaglio: dettagli.filter(Boolean).join(" · "),
      fatto: true,
      urgente: false,
      avanzamento: 1,
      serie: n,
      azione: { rotta: "#/mobilita" },
    };
  }

  const ora = new Date().getHours();
  const haCorso = s.giornoCorrente?.data === giorno ? Boolean(s.giornoCorrente.haCorso) : false;
  const tipo = tipoDelGiorno(s, haCorso);
  const { passi } = costruisciSessione(s, tipo);
  const minuti = Math.max(1, Math.round(passi.reduce((t, p) => t + p.durataSec, 0) / 60));

  return {
    titolo: "Mobilità",
    valore: "Da fare",
    dettaglio: n > 0
      ? `${TIPI_SESSIONE[tipo]?.nome} · ${minuti} min · non spezzare ${plurale(n, "giorno", "giorni")} di fila`
      : `${TIPI_SESSIONE[tipo]?.nome} · ${minuti} min`,
    fatto: false,
    mancaTesto: `la sessione di mobilità`,
    // La sessione entra nella checklist della home come le abitudini. Non
    // si spunta però: una sessione si FA, e toccarla apre il player.
    // LA SESSIONE È UNA COSA DELLA SERA, e adesso lo dice.
    //
    // Prima era «adesso» dalle sette del mattino: compariva in cima alla
    // checklist della home per tutto il giorno, quando è una cosa che si
    // fa dopo cena. Una voce che chiede attenzione dodici ore prima del
    // momento in cui la farai è una voce che si impara a scavalcare, e
    // quando poi arriva l'ora giusta non la vedi più.
    //
    // Stessa fascia degli integratori della sera, così la home la tratta
    // come tratta loro: prima delle 18 è «presto» e resta fuori da
    // «Adesso», dalle 18 tocca, dalle 22 è in ritardo.
    resta: [{
      chiave: "mobilita:sessione", apre: "#/mobilita/inizia",
      nome: TIPI_SESSIONE[tipo]?.nome || "Sessione",
      dentro: "Mobilità", emoji: "🤸", tint: "ciano",
      fascia: "sera", nomeFascia: `${minuti} min`,
      quando: ora < 18 ? "presto" : ora < 22 ? "adesso" : "tardi",
    }],
    serie: n,
    // Urgente di sera: è l'ora in cui la sessione salta davvero.
    urgente: new Date().getHours() >= 21,
    avanzamento: 0,
    azione: { rotta: "#/mobilita/inizia", etichetta: "Inizia" },
  };
}
