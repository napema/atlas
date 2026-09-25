// moduli/allenamenti/contratto.js — sync, lavagna, e la scheda per la home.
//
// CONDIVISO FRA LE DUE APP, come `moduli/abitudini/contratto.js`: la app di
// prima lo usa da `modulo.js`, la app nuova (`app/`) dal registro. Il codice
// è quello di `modulo.js`, spostato e non riscritto; `quandoCambia()` è il
// solo pezzo nuovo, e serve solo alla vista vecchia.

import { avviso, plurale } from "../../core/ui.js";
import { apriCanale, fondiRecord, potaLapidi, svegliaWorkflow } from "../../core/sync.js";
import { scriviFatto, leggiFatto, giornoCorrente } from "../../core/contesto.js";
import { agenda, casella, stato, settimanaDi, pianoDi } from "./dati.js";
import {
  progressoSettimana, restaSettimana, giorniRimasti, passoSettimana, kmFatti, km,
} from "./calcolo.js";

let ridisegnaVista = () => {};

/* L'ultima agenda per cui abbiamo svegliato il calendario, e se abbiamo già
   detto una volta che manca il permesso. Vivono qui e non nella casella: non
   sono dati, sono fatti di questa sessione. */
let ultimaAgenda = null;
let avvisatoDelPermesso = false;

/** La vista vecchia registra qui il proprio `disegna()`. */
export function quandoCambia(fn) { ridisegnaVista = fn || (() => {}); }

/* ------------------------------------------------------------- lavagna -- */

/**
 * Quello che gli altri moduli possono sapere: due numeri, non l'archivio.
 * `aperti` insieme a `slot` perché «2» da solo non dice niente — due su sei
 * a inizio settimana e due su sei di sabato sono settimane diverse.
 */
export function pubblicaSullaLavagna() {
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
      /* `agenda` è DERIVATA: esce di qui e non rientra mai. La scriviamo
         perché il job del calendario non può ricavarsi i nomi degli
         allenamenti — stanno nel piano, che è codice dell'altro repo — e
         ricopiarglieli vorrebbe dire tenere allineati due piani. In
         `applica` non si legge: quello che conta resta `slot`. */
      return {
        v: 1, slot: s.slot, corse: s.corse, settimane: s.settimane || [],
        config: s.config, configUp: s.configUp || 0,
        agenda: agenda(),
      };
    },
    /* IL CALENDARIO, SUBITO.

       Il workflow del calendario gira da sé quattro volte al giorno più la
       sveglia esterna nelle fasce dei promemoria: pianificare un allenamento
       alle tre del pomeriggio vorrebbe dire vederlo comparire alle otto di
       sera. Qui lo svegliamo appena l'agenda è FINITA sul repo — non prima,
       o leggerebbe la versione vecchia.

       Solo se l'agenda è cambiata davvero. Una spunta, un chilometro
       importato, un giorno tolto a una settimana che il calendario non
       guarda: sono scritture che non spostano nessun evento, e ogni sveglia
       inutile è un minuto di Actions su un piano che ne ha duemila. */
    dopoScrittura: (pacco) => {
      const ora = JSON.stringify(pacco?.agenda || []);
      if (ora === ultimaAgenda) return;
      ultimaAgenda = ora;
      svegliaWorkflow("calendario.yml").then((e) => {
        if (!e.ok && e.motivo === "permesso" && !avvisatoDelPermesso) {
          avvisatoDelPermesso = true;
          /* SI DICE, non si logga. Una riga in console su un iPhone non la
             legge nessuno, e il guasto sarebbe silenzioso esattamente come
             quello delle notifiche: funziona, ma con ore di ritardo, e non
             si capisce perché. */
          avviso("Calendario: si aggiorna più tardi. Al token manca il permesso «Actions».", { tono: "male", durata: 5200 });
        }
      });
    },

    applica: (remoto) => {
      casella.aggiorna((s) => {
        s.slot = potaLapidi(fondiRecord(s.slot, remoto.slot));
        s.corse = potaLapidi(fondiRecord(s.corse, remoto.corse));
        s.settimane = potaLapidi(fondiRecord(s.settimane || [], remoto.settimane));
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
    ridisegna: () => { pubblicaSullaLavagna(); ridisegnaVista(); },
  });

  pubblicaSullaLavagna();
  casella.osserva((_, origine) => { if (origine !== "sync") canale.segnalaModifica(); });
  canale.avvia();
  return canale;
}

/* ------------------------------------------------ la scheda per la home -- */

/**
 * La scheda per la home. Sincrona e senza effetti collaterali.
 *
 * Dice quanto resta della SETTIMANA, non cosa tocca oggi: il piano non
 * assegna giorni, quindi «oggi tocca la lunga» sarebbe una cosa che
 * l'app si inventa.
 */
export function oggi() {
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
}
