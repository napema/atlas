// contesto.ts — la lavagna del giorno, e chi decide che giorno è.
//
// Portato da `core/contesto.js` SENZA cambiare formato: stessa casella
// (`atlas.contesto.v1`), stesso file nel repo (`contesto.json`), stessa
// fusione fatto per fatto.
//
// Risolve il problema che nasce quando tre app diventano una: la stessa
// cosa raccontata due volte. La sessione serale di mobilità è anche
// un'abitudine da spuntare. La soluzione non è farli parlare direttamente
// (mai un import fra moduli): è una lavagna comune, per giornata.
//
//   Mobilità scrive:   scriviFatto("mobilita", "sessione-serale", true)
//   Abitudini legge:   leggiFatto("mobilita", "sessione-serale")
//   Oggi legge tutto:  fattiDelGiorno()
//
// Chi scrive è proprietario della sua area: nessuno può scrivere i fatti di
// un altro, e quindi nessuno può romperli.

import { apriCasella } from "./storage";
import { annuncia, EVENTI } from "./bus";
import { apriCanale } from "./sync";

const GIORNI_TENUTI = 14;   // quanto indietro va la lavagna

/* Ogni fatto porta il proprio timestamp, e una cancellazione è una LAPIDE,
   non una chiave che sparisce. Il timestamp per fatto permette a due
   dispositivi di scrivere fatti diversi dello stesso modulo nello stesso
   giorno senza perderne uno. La lapide permette a una cancellazione di
   viaggiare: senza, l'altro dispositivo rimanda indietro il fatto al primo
   giro di sync. */
type ValoreFatto = boolean | number | string | null;
interface RecordFatto { v?: ValoreFatto; del?: boolean; up: number }
interface StatoContesto { giorni: Record<string, Record<string, Record<string, RecordFatto>>>; up?: number }

const casella = apriCasella<StatoContesto>("contesto", { giorni: {} });

// ------------------------------------------------------------- il giorno --

/**
 * Che giorno è. Sembra banale e non lo è: ATLAS resta aperta di notte (la
 * sessione serale finisce tardi) e a mezzanotte l'app non deve continuare
 * a scrivere nel giorno prima.
 */
export function giornoCorrente(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

let giornoVisto = giornoCorrente();

/** 0 = lunedì … 6 = domenica. L'italiano conta da lunedì, JavaScript no. */
export function giornoDellaSettimana(iso = giornoCorrente()) {
  return (new Date(`${iso}T12:00:00`).getDay() + 6) % 7;
}

export const NOMI_GIORNI = ["lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato", "domenica"];

function controllaGiorno() {
  const ora = giornoCorrente();
  if (ora !== giornoVisto) {
    giornoVisto = ora;
    pota();
    annuncia(EVENTI.GIORNO_CAMBIATO, { giorno: ora });
  }
}

// Al minuto e non con un timer fino a mezzanotte: un timer lungo su un
// telefono che si addormenta non scatta quando dovrebbe.
setInterval(controllaGiorno, 60000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) controllaGiorno(); });

// ------------------------------------------------------------ la lavagna --

export function scriviFatto(modulo: string, chiave: string, valore: ValoreFatto, giorno = giornoCorrente()) {
  scrivi(modulo, chiave, { v: valore, up: Date.now() }, giorno);
  annuncia(EVENTI.FATTO_SCRITTO, { modulo, chiave, valore, giorno });
  return valore;
}

/** Cancella un fatto: resta una lapide, che è ciò che fa arrivare la
    cancellazione anche all'altro dispositivo. */
export function togliFatto(modulo: string, chiave: string, giorno = giornoCorrente()) {
  scrivi(modulo, chiave, { del: true, up: Date.now() }, giorno);
  annuncia(EVENTI.FATTO_SCRITTO, { modulo, chiave, valore: undefined, giorno });
}

function scrivi(modulo: string, chiave: string, record: RecordFatto, giorno: string) {
  casella.aggiorna((s) => {
    ((s.giorni[giorno] ||= {})[modulo] ||= {})[chiave] = record;
  });
}

/** Legge un fatto scritto da chiunque. Leggere è libero; scrivere no. */
export function leggiFatto(modulo: string, chiave: string, giorno = giornoCorrente()) {
  const r = casella.leggi().giorni?.[giorno]?.[modulo]?.[chiave];
  return r && !r.del ? r.v : undefined;
}

/** I fatti vivi di un giorno, già scartati: `{ mobilita: { chiave: valore } }`.
    Lapidi e timestamp sono contabilità del sync, non roba da moduli. */
export function fattiDelGiorno(giorno = giornoCorrente()) {
  const grezzi = casella.leggi().giorni?.[giorno] || {};
  const out: Record<string, Record<string, ValoreFatto | undefined>> = {};
  for (const [modulo, chiavi] of Object.entries(grezzi)) {
    const vivi: Record<string, ValoreFatto | undefined> = {};
    for (const [k, r] of Object.entries(chiavi)) if (r && !r.del) vivi[k] = r.v;
    if (Object.keys(vivi).length) out[modulo] = vivi;
  }
  return out;
}

/** Gli ultimi N giorni, dal più recente. */
export function ultimiGiorni(quanti = 7) {
  const out: { giorno: string; fatti: ReturnType<typeof fattiDelGiorno> }[] = [];
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

/** Per chi deve reagire (Svelte): ogni cambio della lavagna. */
export const osservaLavagna = (fn: () => void) => casella.osserva(() => fn());

// -------------------------------------------------------------- il sync ---

/**
 * La fusione è FATTO PER FATTO, confrontando gli `up`. La versione semplice
 * — uno spread `{...remoto, ...locale}` — sembra funzionare e non funziona:
 * può solo AGGIUNGERE chiavi, quindi una cancellazione locale sparisce al
 * primo giro perché il remoto la chiave ce l'ha ancora.
 */
export function avviaSync() {
  const canale = apriCanale({
    id: "contesto",
    file: "contesto.json",
    impacchetta: () => ({ giorni: casella.leggi().giorni }),
    applica: (remoto) => {
      casella.aggiorna((s) => {
        for (const [giorno, moduli] of Object.entries<any>(remoto.giorni || {})) {
          const mieiDelGiorno = (s.giorni[giorno] ||= {});
          for (const [modulo, fatti] of Object.entries<any>(moduli)) {
            const miei = (mieiDelGiorno[modulo] ||= {});
            for (const [chiave, suo] of Object.entries<any>(fatti)) {
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
