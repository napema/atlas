// moduli/abitudini/contratto.js — sync, lavagna, e ciò che la home può chiedere.
//
// CONDIVISO FRA LE DUE APP. La app di prima lo usa da `modulo.js`, la app
// nuova (`app/`, Svelte + TypeScript) dal registro. Stava tutto dentro
// `modulo.js`, mescolato al ridisegno della vista vecchia: separarlo è ciò
// che permette di avere UNA regola di fusione dei dati invece di due che
// col tempo divergono.
//
// Il codice qui sotto è quello di `modulo.js`, spostato e non riscritto.
// L'unica cosa nuova è `quandoCambia()`: la vista vecchia deve sapere quando
// ridisegnarsi, la nuova no (si aggiorna da sola quando cambiano i dati).
//
// Gli import di `../../core/…` nella app nuova vengono girati sul nucleo
// TypeScript dal plugin «nucleo unico» di `app/vite.config.ts`.

import { avviso, plurale } from "../../core/ui.js";
import { apriCanale, fondiRecord, potaLapidi } from "../../core/sync.js";
import { scriviFatto, leggiFatto, giornoCorrente } from "../../core/contesto.js";
import { ascolta } from "../../core/bus.js";
import { casella, stato, abitudiniVive, eFatta, alterna, alternaParte, semina } from "./dati.js";
import { progressoGiorno, mancantiOggi, serie, promemoriaAdesso, restaOggi } from "./calcolo.js";

let ridisegnaVista = () => {};

/** La vista vecchia registra qui il proprio `disegna()`. */
export function quandoCambia(fn) { ridisegnaVista = fn || (() => {}); }

/* ------------------------------------------------------------- lavagna -- */

/**
 * Quello che gli altri moduli possono sapere di Abitudini: due numeri, non
 * l'archivio. `attese` insieme a `spuntate` perché "3" da solo non dice
 * niente — 3 di 3 e 3 di 7 sono giornate diverse.
 */
export function pubblicaSullaLavagna() {
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
 * esattamente l'accoppiamento che il bus esiste per evitare.
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
  if (!spuntate) return;
  avviso(spuntate === 1 ? "Abitudine spuntata dalla sessione." : `${spuntate} abitudini spuntate.`);
  // La lavagna prima del disegno: la home legge quella, e se il modulo è
  // chiuso — cioè quasi sempre, quando finisci una sessione — è l'unica
  // cosa che le arriva.
  pubblicaSullaLavagna();
  ridisegnaVista();
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
        // Le routine già composte. Viaggia perché il suo scopo è proprio
        // non ricomporle sul secondo dispositivo.
        semi: s.semi || [],
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
        // I semi si fondono per UNIONE, e NON passano dal cancello di
        // metaUp. È la forma che regge il guasto di questo archivio: un
        // insieme che cresce e basta non può perdere un confronto, mentre
        // tutto ciò che sta dentro meta lo perde in blocco appena un
        // dispositivo arriva con un metaUp di fabbrica.
        s.semi = [...new Set([...(s.semi || []), ...(remoto.semi || [])])];
      }, { origine: "sync", tocca: false });   // applicare il remoto NON è una
                                               // modifica locale: senza questo
                                               // i due dispositivi si rimbalzano
                                               // PUT a vicenda per sempre
    },
    ridisegna: () => { seminaQuandoPronto(); pubblicaSullaLavagna(); ridisegnaVista(); },
  });

  // La lavagna si aggiorna anche a modulo chiuso: la home la legge, e se si
  // scrivesse solo al montaggio mostrerebbe i numeri dell'ultima volta che
  // sei passato di qui.
  pubblicaSullaLavagna();

  casella.osserva((_, origine) => { if (origine !== "sync") canale.segnalaModifica(); });

  // L'ASCOLTO DELLA SESSIONE STA QUI, e non dove si disegna la vista: gli
  // ascoltatori della vista vivono finché la schermata è aperta, e quando
  // finisci una sessione di Mobilità la schermata Abitudini è chiusa —
  // sempre, per definizione. `avviaSync()` gira una volta all'avvio e non si
  // stacca mai: è il posto degli ascolti che devono funzionare a modulo
  // chiuso.
  ascolta("mobilita:sessione-completata", spuntaDaSessione);

  /* LE ROUTINE SI COMPONGONO DOPO LA PRIMA LETTURA, mai prima.
     Seminare all'avvio è lo stesso errore dello scrivere prima di aver
     letto: un dispositivo appena installato ricrea l'abitudine che hai
     cancellato dall'altro, con un `up` più fresco della lapide, e te la
     ritrovi indietro. */
  const seminaQuandoPronto = () => {
    // `off` vuol dire che il sync non è configurato: non c'è nessuna
    // lettura da aspettare e continuare a rimandare non seminerebbe mai.
    if (!canale.letturaFatta && canale.stato !== "off") return;
    if (!semina().length) return;
    pubblicaSullaLavagna();
    ridisegnaVista();
  };

  canale.avvia();
  seminaQuandoPronto();   // il caso senza sync: qui non arriva nessuna lettura
  return canale;
}

/* ---------------------------------------------- ciò che la home chiede -- */

/**
 * Spuntare una parte dalla home, senza passare per la schermata. Sta nel
 * contratto e non in un import perché la home non conosce Abitudini: chiede
 * il modulo al registro e chiama questo.
 */
export function spuntaParte(habitId, parteId) {
  alternaParte(habitId, parteId, giornoCorrente());
  pubblicaSullaLavagna();
  ridisegnaVista();
}

/**
 * Come sopra, ma per un'abitudine intera — quelle senza parti.
 *
 * Mancava, e la home ripiegava su `spuntaParte(id, null)`: la spunta finiva
 * sotto la chiave `<id>#null`, che non la rilegge nessuno. Toccare la riga
 * sembrava non fare niente.
 */
export function spunta(habitId) {
  alterna(habitId, giornoCorrente());
  pubblicaSullaLavagna();
  ridisegnaVista();
}

/** La scheda per la home. Sincrona, senza effetti collaterali. */
export function oggi() {
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
    // «ti mancano abitudini», che è il nome di una schermata.
    mancaTesto: tutte ? null
      : mancano.length === 1 ? mancano[0].name.toLowerCase()
      : `${mancano.length} abitudini`,
    serie: migliore,
    // La checklist unica della home: abitudini semplici e parti, mescolate
    // e ordinate per momento della giornata.
    resta: restaOggi(giornoCorrente()),
    // `frazione` è già questo conto: due copie della stessa regola sono due
    // posti da cui può scappare.
    avanzamento: p.frazione,
    // I promemoria della fascia in corso: la home non deve dire «ti mancano
    // 4 integratori», deve dire «prendi il magnesio».
    promemoria: promemoriaAdesso(giornoCorrente()),
    // Urgente solo di sera: prima è solo una giornata in corso.
    urgente: !tutte && new Date().getHours() >= 20,
    azione: { rotta: "#/abitudini" },
  };
}
