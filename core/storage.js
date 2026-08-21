// storage.js — persistenza locale, una casella per modulo.
//
// Regola di ATLAS: nessun modulo tocca localStorage direttamente. Chiede
// una casella (`apriCasella`) e lavora solo dentro quella. Così due moduli
// non possono pestarsi le chiavi a vicenda, e il reset di un modulo non
// porta via i dati degli altri.
//
// La casella è anche il punto in cui nasce il timestamp `up`: ogni scrittura
// lo aggiorna. Il sync legge da qui e non ha bisogno di sapere altro.

const PREFISSO = "atlas";
const VERSIONE = 1;

const caselle = new Map();

function chiaveDi(id) {
  return `${PREFISSO}.${id}.v${VERSIONE}`;
}

// Copia profonda di dati semplici. structuredClone c'è ovunque serva a noi
// (Safari 15.4+), il JSON è la rete di sicurezza per contesti più vecchi.
function clona(v) {
  if (v === undefined) return undefined;
  try { return structuredClone(v); } catch { return JSON.parse(JSON.stringify(v)); }
}

// Fonde i valori mancanti dallo stato di default: aggiungere un campo nuovo
// al default non deve rompere uno stato salvato prima che quel campo esistesse.
function completa(salvato, predefinito) {
  if (Array.isArray(predefinito)) return Array.isArray(salvato) ? salvato : clona(predefinito);
  if (predefinito && typeof predefinito === "object") {
    const out = { ...clona(predefinito) };
    if (salvato && typeof salvato === "object") {
      for (const k of Object.keys(salvato)) {
        out[k] = k in predefinito ? completa(salvato[k], predefinito[k]) : salvato[k];
      }
    }
    return out;
  }
  return salvato === undefined ? clona(predefinito) : salvato;
}

/**
 * Apre (o riapre) la casella di un modulo.
 *
 * @param {string} id          identificatore del modulo, es. "finanze"
 * @param {object} predefinito stato iniziale completo: è anche lo schema
 * @returns {{leggi, scrivi, aggiorna, azzera, osserva, id}}
 */
export function apriCasella(id, predefinito = {}) {
  if (caselle.has(id)) return caselle.get(id);

  const chiave = chiaveDi(id);
  let stato = predefinito;
  try {
    const grezzo = localStorage.getItem(chiave);
    stato = completa(grezzo ? JSON.parse(grezzo) : {}, predefinito);
  } catch (e) {
    console.warn(`[storage] casella "${id}" illeggibile, riparto dal default`, e);
    stato = clona(predefinito);
  }

  const ascoltatori = new Set();

  function persisti() {
    try {
      localStorage.setItem(chiave, JSON.stringify(stato));
    } catch (e) {
      // Quota piena: quasi sempre è un modulo che sta salvando binari dove
      // non deve. Le immagini vanno in blobs.js, non qui.
      console.error(`[storage] scrittura fallita per "${id}"`, e);
    }
  }

  function notifica(origine) {
    for (const f of ascoltatori) {
      try { f(stato, origine); } catch (e) { console.error(e); }
    }
  }

  const casella = {
    id,

    /** Lo stato corrente. Sola lettura per convenzione: per cambiarlo, `aggiorna`. */
    leggi: () => stato,

    /** Sostituisce lo stato per intero. Usalo solo per import e migrazioni. */
    scrivi(nuovo, { origine = "locale", tocca = true } = {}) {
      stato = completa(nuovo, predefinito);
      if (tocca) stato.up = Date.now();
      persisti();
      notifica(origine);
      return stato;
    },

    /**
     * La via normale per cambiare qualcosa. La funzione riceve lo stato e lo
     * modifica sul posto; il timestamp e il salvataggio sono automatici.
     *
     *   casella.aggiorna(s => { s.movimenti.push(m); });
     *
     * `origine` distingue una modifica dell'utente da una arrivata dal sync:
     * chi ascolta deve poter evitare di rimbalzare il dato indietro.
     */
    aggiorna(fn, { origine = "locale", tocca = true } = {}) {
      fn(stato);
      if (tocca) stato.up = Date.now();
      persisti();
      notifica(origine);
      return stato;
    },

    /** Torna al default. Non tocca le altre caselle né i blob. */
    azzera() {
      stato = clona(predefinito);
      stato.up = Date.now();
      persisti();
      notifica("azzeramento");
      return stato;
    },

    /** Registra un ascoltatore. Restituisce la funzione per disiscriversi. */
    osserva(fn) {
      ascoltatori.add(fn);
      return () => ascoltatori.delete(fn);
    },
  };

  caselle.set(id, casella);
  return casella;
}

/** Elenco delle caselle aperte in questa sessione. Serve alle impostazioni. */
export function caselleAperte() {
  return [...caselle.keys()];
}

/** Esporta tutto quanto sta in localStorage sotto ATLAS. Per il backup manuale. */
export function esportaTutto() {
  const out = { formato: "atlas-backup", versione: VERSIONE, quando: new Date().toISOString(), caselle: {} };
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k?.startsWith(`${PREFISSO}.`)) continue;
    try { out.caselle[k] = JSON.parse(localStorage.getItem(k)); } catch {}
  }
  return out;
}
