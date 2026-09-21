// moduli/pasti/contratto.js — sync, lavagna, e la scheda per la home.
//
// CONDIVISO FRA LE DUE APP, come `moduli/abitudini/contratto.js`: la app di
// prima lo usa da `modulo.js`, la app nuova (`app/`) dal registro. Il codice
// è quello di `modulo.js`, spostato e non riscritto; `quandoCambia()` è il
// solo pezzo nuovo, e serve solo alla vista vecchia.

import { apriCanale, fondiRecord, potaLapidi } from "../../core/sync.js";
import { scriviFatto, leggiFatto, giornoCorrente } from "../../core/contesto.js";
import { casella, stato, semina, regimeDi } from "./dati.js";
import { bersagli, giornata, previstoFascia } from "./calcolo.js";
import { assicuraPianiUtili } from "./piano.js";

let ridisegnaVista = () => {};

/** La vista vecchia registra qui il proprio `disegna()`. */
export function quandoCambia(fn) { ridisegnaVista = fn || (() => {}); }

/* ------------------------------------------------------------- lavagna -- */

/** Due numeri soli, non l'archivio: quanto è entrato e quanto ne serve. */
export function pubblicaSullaLavagna() {
  const t = giornata(giornoCorrente()).totale;
  const b = bersagli();
  if (leggiFatto("pasti", "kcal") !== t.kcal) scriviFatto("pasti", "kcal", t.kcal);
  if (leggiFatto("pasti", "bersaglio") !== b.kcal) scriviFatto("pasti", "bersaglio", b.kcal);
}

/* ---------------------------------------------------------------- sync -- */

export function avviaSync() {
  const canale = apriCanale({
    id: "pasti",
    file: "pasti.json",
    impacchetta: () => {
      const s = stato();
      return {
        v: 1,
        pasti: s.pasti, piani: s.piani, registro: s.registro, pesi: s.pesi,
        profilo: s.profilo, profiloUp: s.profiloUp || 0,
        semi: s.semi || [],
      };
    },
    applica: (remoto) => {
      casella.aggiorna((s) => {
        s.pasti = potaLapidi(fondiRecord(s.pasti, remoto.pasti));
        s.piani = potaLapidi(fondiRecord(s.piani, remoto.piani));
        s.registro = potaLapidi(fondiRecord(s.registro, remoto.registro));
        s.pesi = fondiRecord(s.pesi, remoto.pesi);   // le pesate non si potano: sono la storia

        // Il profilo non ha id: si confronta con un timestamp solo. Un remoto
        // a zero non deve poter vincere su un locale che è stato toccato.
        if ((remoto.profiloUp || 0) > (s.profiloUp || 0)) {
          s.profilo = { ...s.profilo, ...remoto.profilo };
          s.profiloUp = remoto.profiloUp;
        }

        // I SEMI SI UNISCONO, non si sostituiscono. È un insieme di
        // marcatori che si possono solo aggiungere: così un dispositivo che
        // sincronizza con uno stato vecchio non può PERDERE la memoria di
        // una semina già fatta e riseminare pasti che erano stati cancellati.
        s.semi = [...new Set([...(s.semi || []), ...(remoto.semi || [])])];
      }, { origine: "sync", tocca: false });   // applicare il remoto NON è una
                                               // modifica locale: senza questo
                                               // i due dispositivi si rimbalzano
                                               // PUT a vicenda per sempre
    },
    ridisegna: () => { preparaQuandoPronto(canale); pubblicaSullaLavagna(); ridisegnaVista(); },
  });

  pubblicaSullaLavagna();
  casella.osserva((_, origine) => { if (origine !== "sync") canale.segnalaModifica(); });
  canale.avvia();
  preparaQuandoPronto(canale);
  return canale;
}

/**
 * La semina e la generazione del piano, SOLO dopo la prima lettura.
 *
 * Sono le due scritture che partono da sé in questo modulo, cioè la
 * categoria che in ATLAS ha già resuscitato dati cancellati due volte. Un
 * telefono appena installato che semina e pianifica prima di aver letto il
 * repo rimette in tavola i pasti che l'altro dispositivo aveva tolto e
 * sovrascrive la settimana che era già stata sistemata a mano.
 *
 * `stato === "off"` è l'altro caso legittimo: il sync non è configurato, il
 * dispositivo è l'unica fonte che esista, e aspettare una lettura che non
 * arriverà mai vorrebbe dire un'app vuota per sempre.
 */
function preparaQuandoPronto(canale) {
  if (!canale.letturaFatta && canale.stato !== "off") return;
  try {
    semina();
    assicuraPianiUtili(giornoCorrente());
  } catch (e) {
    console.error("[pasti] preparazione non riuscita", e);
  }
}

/* ------------------------------------------------ la scheda per la home -- */

/**
 * Sincrona e senza effetti collaterali.
 *
 * DUE COSE SOLE: cosa c'è per cena, e quante proteine mancano. Non il
 * totale delle calorie, non una percentuale, non un semaforo.
 *
 * «Non voglio essere fissato»: una home che ogni mattina apre con un
 * numero rosso su quanto hai sgarrato ieri è esattamente l'app che si
 * disinstalla a gennaio. Il tono è quello di un promemoria.
 */
export function oggi() {
  const iso = giornoCorrente();
  const b = bersagli();
  if (!b.kcal) return null;                 // profilo non compilato: niente da dire

  const t = giornata(iso).totale;
  const mancanoProt = Math.max(0, b.p - t.p);

  const cena = regimeDi(iso, "cena") === "casa"
    ? previstoFascia(iso, "cena").nome
    : null;

  return {
    titolo: "Pasti",
    valore: cena || `${Math.round(t.kcal)} kcal`,
    dettaglio: mancanoProt > 0
      ? `mancano ${Math.round(mancanoProt)} g di proteine`
      : `proteine a posto · ${Math.round(t.kcal)} di ${b.kcal} kcal`,
    fatto: mancanoProt === 0,
    avanzamento: b.kcal ? Math.min(1, t.kcal / b.kcal) : 0,
    // Mai urgente: questo modulo non ha emergenze, e un riquadro che si
    // accende ogni sera perché non hai ancora cenato è rumore.
    urgente: false,
    azione: { rotta: "#/pasti" },
  };
}
