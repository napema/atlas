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

const casella = apriCasella("contesto", {
  giorni: {},   // "2026-08-21" → { mobilita: { "sessione-serale": true }, … }
  up: 0,
});

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
  casella.aggiorna((s) => {
    if (!s.giorni[giorno]) s.giorni[giorno] = {};
    if (!s.giorni[giorno][modulo]) s.giorni[giorno][modulo] = {};
    s.giorni[giorno][modulo][chiave] = valore;
  });
  annuncia(EVENTI.FATTO_SCRITTO, { modulo, chiave, valore, giorno });
  return valore;
}

/** Legge un fatto scritto da chiunque. Leggere è libero; scrivere no. */
export function leggiFatto(modulo, chiave, giorno = giornoCorrente()) {
  return casella.leggi().giorni?.[giorno]?.[modulo]?.[chiave];
}

/** Tutti i fatti di un giorno: `{ mobilita: {...}, abitudini: {...} }`. */
export function fattiDelGiorno(giorno = giornoCorrente()) {
  return casella.leggi().giorni?.[giorno] || {};
}

/** Cancella un fatto. Vale come "non è più vero", non come "non è mai successo". */
export function togliFatto(modulo, chiave, giorno = giornoCorrente()) {
  casella.aggiorna((s) => { delete s.giorni?.[giorno]?.[modulo]?.[chiave]; });
  annuncia(EVENTI.FATTO_SCRITTO, { modulo, chiave, valore: undefined, giorno });
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
 * La fusione è per giorno e per modulo: se l'iPhone ha scritto un fatto di
 * Mobilità e il PC uno di Abitudini nello stesso giorno, restano entrambi.
 * A collidere davvero — stesso giorno, stesso modulo, stessa chiave — vince
 * chi ha scritto per ultimo, che per una lavagna del giorno è la regola giusta.
 */
export function avviaSync() {
  const canale = apriCanale({
    id: "contesto",
    file: "contesto.json",
    impacchetta: () => ({ giorni: casella.leggi().giorni, up: casella.leggi().up || 0 }),
    applica: (remoto) => {
      casella.aggiorna((s) => {
        for (const [giorno, moduli] of Object.entries(remoto.giorni || {})) {
          if (!s.giorni[giorno]) s.giorni[giorno] = {};
          for (const [modulo, fatti] of Object.entries(moduli)) {
            // Il locale ha l'ultima parola solo se ha scritto dopo. Senza
            // timestamp per fatto, il confronto è a livello di casella: è
            // grossolano, ma la lavagna è piccola e i conflitti veri rari.
            s.giorni[giorno][modulo] = (remoto.up || 0) > (s.up || 0)
              ? { ...s.giorni[giorno][modulo], ...fatti }
              : { ...fatti, ...s.giorni[giorno][modulo] };
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
