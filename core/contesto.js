// contesto.js — la lavagna del giorno, e chi decide che giorno è.
//
// Serve a risolvere il problema che nasce nel momento esatto in cui tre app
// diventano una: **la stessa cosa raccontata due volte**. La sessione serale
// di mobilità è anche un'abitudine da spuntare. Se Mobilità la segna nel suo
// archivio e Abitudini nel suo, uno dei due mente — e l'utente deve fare due
// gesti per lo stesso fatto.
//
// La soluzione non è farli parlare direttamente (vedi bus.js: mai un import
// fra moduli). È una lavagna comune, per giornata:
//
//   Mobilità scrive:   scriviFatto("mobilita", "sessione-serale", true)
//   Abitudini legge:   leggiFatto("mobilita", "sessione-serale")
//   Oggi legge tutto:  fattiDelGiorno()
//
// Chi scrive è sempre proprietario della sua area: `scriviFatto("mobilita", …)`
// lo può chiamare solo Mobilità. Nessuno può scrivere i fatti di un altro, e
// quindi nessuno può romperli.
//
// La lavagna si sincronizza come tutto il resto: un fatto scritto sull'iPhone
// arriva sul PC. Ed è POTATA — non è un archivio storico, è una lavagna: gli
// archivi stanno nei moduli, qui c'è solo la finestra dei giorni recenti.

import { apriCasella } from "./storage.js";
import { annuncia, EVENTI } from "./bus.js";
import { apriCanale } from "./sync.js";

const GIORNI_TENUTI = 14;   // quanto indietro va la lavagna

// Forma di quel che c'è dentro. Ogni fatto porta il proprio timestamp, e
// una cancellazione è una LAPIDE, non una chiave che sparisce:
//
//   giorni: {
//     "2026-08-21": {
//       mobilita: {
//         "sessione-serale": { v: true,     up: 1787314484149 },
//         "corsa":           { del: true,   up: 1787314491002 }
//       }
//     }
//   }
//
// Il timestamp per fatto è ciò che permette a due dispositivi di scrivere
// fatti diversi dello stesso modulo nello stesso giorno senza perderne uno.
// La lapide è ciò che permette a una cancellazione di viaggiare: senza,
// l'altro dispositivo rimanda indietro il fatto e la cancellazione si
// annulla da sola — provato, succede al primo giro di sync.
//
// Le lapidi non si potano a parte: sparisce il giorno intero dopo 14 giorni.
const casella = apriCasella("contesto", { giorni: {} });

// ------------------------------------------------------------- il giorno --

/**
 * Che giorno è. Sembra banale e non lo è: ATLAS resta aperta di notte
 * (la sessione serale finisce tardi) e a mezzanotte l'app non deve
 * continuare a scrivere nel giorno prima.
 */
export function giornoCorrente(d = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

let giornoVisto = giornoCorrente();

/** 0 = lunedì … 6 = domenica. L'italiano conta da lunedì, JavaScript no. */
export function giornoDellaSettimana(iso = giornoCorrente()) {
  return (new Date(`${iso}T12:00:00`).getDay() + 6) % 7;
}

export const NOMI_GIORNI = ["lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato", "domenica"];

// Il controllo è al minuto e non con un timer fino a mezzanotte: un timer
// lungo su un telefono che si addormenta non scatta quando dovrebbe.
setInterval(() => {
  const ora = giornoCorrente();
  if (ora !== giornoVisto) {
    giornoVisto = ora;
    pota();
    annuncia(EVENTI.GIORNO_CAMBIATO, { giorno: ora });
  }
}, 60000);

document.addEventListener("visibilitychange", () => {
  if (document.hidden) return;
  const ora = giornoCorrente();
  if (ora !== giornoVisto) {
    giornoVisto = ora;
    pota();
    annuncia(EVENTI.GIORNO_CAMBIATO, { giorno: ora });
  }
});

// ------------------------------------------------------------ la lavagna --

/**
 * Scrive un fatto sulla lavagna di oggi.
 *
 * @param {string} modulo  chi scrive. Deve essere il proprio id.
 * @param {string} chiave  cosa, in kebab-case: "sessione-serale"
 * @param {*} valore       true, un numero, una stringa. Niente oggetti grossi:
 *                         la lavagna non è l'archivio del modulo.
 * @param {string} [giorno]
 */
export function scriviFatto(modulo, chiave, valore, giorno = giornoCorrente()) {
  scrivi(modulo, chiave, { v: valore, up: Date.now() }, giorno);
  annuncia(EVENTI.FATTO_SCRITTO, { modulo, chiave, valore, giorno });
  return valore;
}

/**
 * Cancella un fatto. Vale come "non è più vero", non come "non è mai
 * successo": resta una lapide, che è ciò che fa arrivare la cancellazione
 * anche all'altro dispositivo.
 */
export function togliFatto(modulo, chiave, giorno = giornoCorrente()) {
  scrivi(modulo, chiave, { del: true, up: Date.now() }, giorno);
  annuncia(EVENTI.FATTO_SCRITTO, { modulo, chiave, valore: undefined, giorno });
}

function scrivi(modulo, chiave, record, giorno) {
  casella.aggiorna((s) => {
    ((s.giorni[giorno] ||= {})[modulo] ||= {})[chiave] = record;
  });
}

/** Legge un fatto scritto da chiunque. Leggere è libero; scrivere no. */
export function leggiFatto(modulo, chiave, giorno = giornoCorrente()) {
  const r = casella.leggi().giorni?.[giorno]?.[modulo]?.[chiave];
  return r && !r.del ? r.v : undefined;
}

/**
 * Tutti i fatti vivi di un giorno, già scartati: `{ mobilita: { chiave: valore } }`.
 * Chi legge non vede mai né le lapidi né i timestamp — sono contabilità
 * del sync, non roba che un modulo debba maneggiare.
 */
export function fattiDelGiorno(giorno = giornoCorrente()) {
  const grezzi = casella.leggi().giorni?.[giorno] || {};
  const out = {};
  for (const [modulo, chiavi] of Object.entries(grezzi)) {
    const vivi = {};
    for (const [k, r] of Object.entries(chiavi)) if (r && !r.del) vivi[k] = r.v;
    if (Object.keys(vivi).length) out[modulo] = vivi;
  }
  return out;
}

/**
 * Gli ultimi N giorni, dal più recente. Serve a chi disegna una striscia
 * (le serie delle abitudini, la costanza della mobilità).
 */
export function ultimiGiorni(quanti = 7) {
  const out = [];
  const d = new Date();
  for (let i = 0; i < quanti; i++) {
    const g = giornoCorrente(d);
    out.push({ giorno: g, fatti: fattiDelGiorno(g) });
    d.setDate(d.getDate() - 1);
  }
  return out;
}

function pota() {
  const limite = new Date();
  limite.setDate(limite.getDate() - GIORNI_TENUTI);
  const soglia = giornoCorrente(limite);
  casella.aggiorna((s) => {
    for (const g of Object.keys(s.giorni)) if (g < soglia) delete s.giorni[g];
  });
}

// -------------------------------------------------------------- il sync ---

/**
 * La lavagna si sincronizza da sé, senza appartenere a nessun modulo.
 *
 * La fusione è FATTO PER FATTO, confrontando gli `up`. Vale la pena dire
 * perché, perché la versione semplice sembra funzionare e non funziona:
 * fondere con uno spread (`{...remoto, ...locale}`) può solo AGGIUNGERE
 * chiavi. Una cancellazione locale sparisce al primo giro, perché il remoto
 * la chiave ce l'ha ancora e lo spread la rimette. La lapide con timestamp
 * è ciò che rende la cancellazione un fatto come gli altri — e quindi
 * qualcosa che può vincere il confronto.
 */
export function avviaSync() {
  const canale = apriCanale({
    id: "contesto",
    file: "contesto.json",
    impacchetta: () => ({ giorni: casella.leggi().giorni }),
    applica: (remoto) => {
      casella.aggiorna((s) => {
        for (const [giorno, moduli] of Object.entries(remoto.giorni || {})) {
          const mieiDelGiorno = (s.giorni[giorno] ||= {});
          for (const [modulo, fatti] of Object.entries(moduli)) {
            const miei = (mieiDelGiorno[modulo] ||= {});
            for (const [chiave, suo] of Object.entries(fatti)) {
              const mio = miei[chiave];
              // A parità di `up` vince il locale: è l'unico dei due di cui
              // sappiamo con certezza che l'utente l'ha appena visto.
              if (!mio || (suo?.up || 0) > (mio.up || 0)) miei[chiave] = suo;
            }
          }
        }
      }, { origine: "sync", tocca: false });
      annuncia(EVENTI.DATI_ARRIVATI, { modulo: "contesto" });
    },
  });

  // Una scrittura locale fa partire un giro; una applicata dal sync no,
  // altrimenti i due dispositivi si rimbalzano PUT a vicenda per sempre.
  casella.osserva((_, origine) => { if (origine !== "sync") canale.segnalaModifica(); });

  canale.avvia();
  return canale;
}
