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

import { el, aggiungi, intestazione, avviso, plurale, durata as fmtDurata } from "../../core/ui.js";
import { icona } from "../../core/icone.js";
import { apriCanale, fondiRecord, potaLapidi } from "../../core/sync.js";
import { scriviFatto, leggiFatto, giornoCorrente } from "../../core/contesto.js";
import { annuncia, ascolta } from "../../core/bus.js";
import { casella, stato, sessioniVive, TIPI_SESSIONE } from "./dati.js";
import { getState } from "./ponte.js";
import { renderOggi } from "./oggi.js";
import { renderProgressi } from "./progressi.js";
import { renderAssessment } from "./assessment.js";
import {
  renderSessione, togglePausa, fermaSessione, costruisciSessione, tipoDelGiorno,
} from "./sessione.js";
import { vistaImpostazioni } from "./impostazioni.js";

let contenitore = null;
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
    intestazione("Mobilità"),
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
    // Mai ridisegnare con un overlay aperto: la regola dice che il sync non
    // ridisegna sotto le dita, e qui vorrebbe dire smontare il player a metà
    // esercizio.
    ridisegna: () => { pubblicaSullaLavagna(); if (contenitore && !overlayAperto()) disegna(); },
  });

  // La lavagna si aggiorna anche a modulo chiuso: la home la legge, e se si
  // scrivesse solo al montaggio mostrerebbe i numeri dell'ultima volta che
  // sei passato di qui.
  pubblicaSullaLavagna();

  casella.osserva((_, origine) => { if (origine !== "sync") canale.segnalaModifica(); });
  canale.avvia();
  return canale;
}

/* ------------------------------------------------------------ contratto -- */

export default {
  async monta(cont, posizione) {
    contenitore = cont;
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

  oggi() {
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
  },

  avviaSync,
};
