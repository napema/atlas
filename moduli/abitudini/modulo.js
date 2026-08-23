// moduli/abitudini — le abitudini del giorno, marcate in un tocco.
//
// Portato da napema/habit-tracker-webapp. Del monolite restano lo schema
// (invariato: aveva già id, up e lapidi) e il motore delle serie, che è la
// parte pensata bene. Sono spariti il suo storage, il suo sync e le sue
// notifiche: ora sono di core, e valgono per tutti i moduli.

import { el, aggiungi, intestazione, avviso, oggiISO, piuGiorni, plurale } from "../../core/ui.js";
import { icona } from "../../core/icone.js";
import { apriCanale, fondiRecord, potaLapidi } from "../../core/sync.js";
import { scriviFatto, leggiFatto, giornoCorrente } from "../../core/contesto.js";
import { annuncia, ascolta } from "../../core/bus.js";
import { casella, stato, abitudiniVive, eFatta, alterna, idLog, alternaParte } from "./dati.js";
import { progressoGiorno, mancantiOggi, serie, eAttesa, promemoriaAdesso, restaOggi } from "./calcolo.js";
import { strisciaSettimana, riepilogo, elenco, apriModifica, vistaImpostazioni, vistaSerie } from "./viste.js";

let contenitore = null;
let giornoScelto = oggiISO();
let vista = "oggi";
const staccatori = [];

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

/* ------------------------------------------------------------- lavagna -- */

/**
 * Quello che gli altri moduli possono sapere di Abitudini: due numeri, non
 * l'archivio. `attese` insieme a `spuntate` perché "3" da solo non dice
 * niente — 3 di 3 e 3 di 7 sono giornate diverse.
 */
function pubblicaSullaLavagna() {
  const p = progressoGiorno(giornoCorrente());
  if (leggiFatto("abitudini", "spuntate") !== p.fatte) scriviFatto("abitudini", "spuntate", p.fatte);
  if (leggiFatto("abitudini", "attese") !== p.attese) scriviFatto("abitudini", "attese", p.attese);
}

/**
 * Il pezzo che giustifica ATLAS: se esiste un'abitudine che corrisponde
 * alla sessione di mobilità, si spunta da sé.
 *
 * Il riconoscimento è per nome, ed è volutamente grossolano: legare le due
 * cose con un id vorrebbe dire che Abitudini conosce Mobilità, che è
 * esattamente l'accoppiamento che il bus esiste per evitare. Un nome che
 * contiene "mobilit" o "stretch" è un'euristica che l'utente può cambiare
 * rinominando l'abitudine, e questo è un pregio.
 */
function spuntaDaSessione() {
  const oggi = giornoCorrente();
  const candidate = abitudiniVive().filter((h) => /mobilit|stretch|allungam/i.test(h.name));
  let spuntate = 0;
  for (const h of candidate) {
    if (eFatta(h.id, oggi)) continue;
    alterna(h.id, oggi);
    spuntate++;
  }
  if (spuntate) {
    avviso(spuntate === 1 ? "Abitudine spuntata dalla sessione." : `${spuntate} abitudini spuntate.`);
    disegna();
  }
}

/* ---------------------------------------------------------------- sync -- */

export function avviaSync() {
  const canale = apriCanale({
    id: "abitudini",
    file: "abitudini.json",
    impacchetta: () => {
      const s = stato();
      return {
        v: 1,
        habits: s.habits,
        logs: s.logs,
        meta: s.meta,
        metaUp: s.metaUp || 0,
      };
    },
    applica: (remoto) => {
      casella.aggiorna((s) => {
        s.habits = potaLapidi(fondiRecord(s.habits, remoto.habits));
        s.logs = potaLapidi(fondiRecord(s.logs, remoto.logs));
        // `meta` non ha id: si confronta con un solo timestamp.
        // Il caso `metaUp: 0` è reale — nell'app di partenza non è mai stato
        // scritto — quindi un remoto a zero non deve poter vincere su un
        // locale che invece è stato toccato.
        if ((remoto.metaUp || 0) > (s.metaUp || 0)) {
          s.meta = { ...s.meta, ...remoto.meta };
          s.metaUp = remoto.metaUp;
        }
      }, { origine: "sync", tocca: false });   // applicare il remoto NON è una
                                               // modifica locale: senza questo
                                               // i due dispositivi si rimbalzano
                                               // PUT a vicenda per sempre
    },
    ridisegna: () => { pubblicaSullaLavagna(); if (contenitore) disegna(); },
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
    giornoScelto = oggiISO();

    // Rotta #/abitudini/nuova: la scorciatoia della schermata Home.
    if (posizione?.resto?.[0] === "nuova") {
      queueMicrotask(() => apriModifica(null, disegna));
    }

    disegna();

    // Chi ascolta DEVE staccarsi in smonta(): senza, ogni visita alla
    // schermata lascia dietro una copia dell'ascoltatore, e i ridisegni
    // raddoppiano a ogni giro.
    staccatori.push(ascolta("mobilita:sessione-completata", spuntaDaSessione));
    staccatori.push(ascolta("giorno:cambiato", () => { giornoScelto = oggiISO(); disegna(); }));
  },

  smonta() {
    while (staccatori.length) staccatori.pop()();
    contenitore = null;
  },

  /**
   * Spuntare una parte dalla home, senza passare per la schermata.
   *
   * Sta nel contratto e non in un import perché `moduli/oggi` non conosce
   * Abitudini: chiede il modulo al registro e chiama questo.
   */
  spuntaParte(habitId, parteId) {
    alternaParte(habitId, parteId, giornoCorrente());
    pubblicaSullaLavagna();
    if (contenitore) disegna();
  },

  /**
   * Come sopra, ma per un'abitudine intera — quelle senza parti.
   *
   * Mancava, e la home ripiegava su `spuntaParte(id, null)`: la spunta
   * finiva sotto la chiave `<id>#null` invece che sotto `<id>`, quindi
   * veniva scritta e sincronizzata ma non la rileggeva nessuno. Toccare la
   * riga sembrava non fare niente, e il conteggio dei moduli restava fermo.
   */
  spunta(habitId) {
    alterna(habitId, giornoCorrente());
    pubblicaSullaLavagna();
    if (contenitore) disegna();
  },

  /** La sezione "Abitudini" di Impostazioni: elenco, archiviate, settimana. */
  impostazioni() {
    return vistaImpostazioni(() => { if (contenitore) disegna(); });
  },

  /** La scheda per la home. Sincrona, senza effetti collaterali. */
  oggi() {
    const p = progressoGiorno(giornoCorrente());
    if (!p.attese) return null;
    const mancano = mancantiOggi();
    const migliore = abitudiniVive().reduce((m, h) => Math.max(m, serie(h)), 0);

    const tutte = !mancano.length;
    return {
      titolo: "Abitudini",
      valore: `${p.fatte} / ${p.attese}`,
      dettaglio: tutte
        ? (migliore > 1 ? `Tutte spuntate · ${plurale(migliore, "giorno", "giorni")} di fila` : "Tutte spuntate")
        : mancano.length === 1 ? `Manca: ${mancano[0].name}`
        : `Mancano ${mancano.length}: ${mancano.slice(0, 2).map((h) => h.name).join(", ")}${mancano.length > 2 ? "…" : ""}`,
      fatto: tutte,
      // Come la home lo dice DENTRO una frase: «ti manca meditazione», non
      // «ti mancano abitudini», che è il nome di una schermata e non dice
      // niente su cosa devi fare.
      mancaTesto: tutte ? null
        : mancano.length === 1 ? mancano[0].name.toLowerCase()
        : `${mancano.length} abitudini`,
      serie: migliore,
      // La checklist unica della home: abitudini semplici e parti, mescolate
      // e ordinate per momento della giornata.
      resta: restaOggi(giornoCorrente()),
      // La barra della tessera dice a che punto sei, non è decorativa.
      avanzamento: p.attese ? p.fatte / p.attese : 0,
      // I promemoria della fascia in corso: la home non deve dire «ti
      // mancano 4 integratori», deve dire «prendi il magnesio».
      promemoria: promemoriaAdesso(giornoCorrente()),
      // Urgente solo di sera: prima è solo una giornata in corso.
      urgente: !tutte && new Date().getHours() >= 20,
      azione: { rotta: "#/abitudini" },
    };
  },

  avviaSync,
};
