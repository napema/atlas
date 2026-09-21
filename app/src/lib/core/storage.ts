// storage.ts — persistenza locale, una casella per modulo.
//
// Portato da `core/storage.js` SENZA cambiare comportamento: la chiave in
// localStorage è la stessa (`atlas.<id>.v1`), quindi la app nuova legge gli
// stessi dati della app di prima, sullo stesso dispositivo, senza migrazioni.
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

/** Da dove arriva una modifica. Chi ascolta deve poter non rimbalzarla. */
export type Origine = "locale" | "sync" | "azzeramento" | (string & {});

export interface OpzioniScrittura {
  origine?: Origine;
  /** `false` = non aggiornare `up`. Serve quando si applica il remoto. */
  tocca?: boolean;
}

export type Stato = Record<string, any> & { up?: number };
export type Ascoltatore<S> = (stato: S, origine: Origine) => void;

export interface Casella<S extends Stato = Stato> {
  readonly id: string;
  /** Lo stato corrente. Sola lettura per convenzione: per cambiarlo, `aggiorna`. */
  leggi(): S;
  /** Sostituisce lo stato per intero. Solo per import e migrazioni. */
  scrivi(nuovo: S, opz?: OpzioniScrittura): S;
  /** La via normale: la funzione modifica lo stato sul posto. */
  aggiorna(fn: (s: S) => void, opz?: OpzioniScrittura): S;
  /** Torna al default. Non tocca le altre caselle né i blob. */
  azzera(): S;
  /** Registra un ascoltatore. Restituisce la funzione per disiscriversi. */
  osserva(fn: Ascoltatore<S>): () => void;
}

const caselle = new Map<string, Casella<any>>();

/* CHI OSSERVA TUTTE LE CASELLE INSIEME.
   Non c'era nella app di prima, e non serviva: lì ogni modulo ridisegnava a
   mano, chiamando `disegna()` dopo ogni scrittura. In Svelte le viste si
   aggiornano da sole quando cambia il dato che leggono — ma il dato sta
   dentro una casella che Svelte non vede. Questo è il ponte: qualunque
   scrittura in qualunque casella avvisa qui, e `reattivo.svelte.ts` lo
   trasforma in un segnale che le viste ascoltano. */
const osservatoriGlobali = new Set<(id: string, origine: Origine) => void>();
export function osservaTutto(fn: (id: string, origine: Origine) => void) {
  osservatoriGlobali.add(fn);
  return () => { osservatoriGlobali.delete(fn); };
}

const chiaveDi = (id: string) => `${PREFISSO}.${id}.v${VERSIONE}`;

// Copia profonda di dati semplici. structuredClone c'è ovunque serva a noi
// (Safari 15.4+), il JSON è la rete di sicurezza.
function clona<T>(v: T): T {
  if (v === undefined) return v;
  try { return structuredClone(v); } catch { return JSON.parse(JSON.stringify(v)); }
}

// Fonde i valori mancanti dallo stato di default: aggiungere un campo nuovo
// al default non deve rompere uno stato salvato prima che quel campo
// esistesse.
function completa(salvato: any, predefinito: any): any {
  if (Array.isArray(predefinito)) return Array.isArray(salvato) ? salvato : clona(predefinito);
  if (predefinito && typeof predefinito === "object") {
    const out: Record<string, any> = { ...clona(predefinito) };
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
 * @param id          identificatore del modulo, es. "finanze"
 * @param predefinito stato iniziale completo: è anche lo schema
 */
export function apriCasella<S extends Stato>(id: string, predefinito: S = {} as S): Casella<S> {
  const gia = caselle.get(id);
  if (gia) return gia as Casella<S>;

  const chiave = chiaveDi(id);
  let stato: S;
  try {
    const grezzo = localStorage.getItem(chiave);
    stato = completa(grezzo ? JSON.parse(grezzo) : {}, predefinito);
  } catch (e) {
    console.warn(`[storage] casella "${id}" illeggibile, riparto dal default`, e);
    stato = clona(predefinito);
  }

  const ascoltatori = new Set<Ascoltatore<S>>();

  function persisti() {
    try {
      localStorage.setItem(chiave, JSON.stringify(stato));
    } catch (e) {
      // Quota piena: quasi sempre è un modulo che sta salvando binari dove
      // non deve. Le immagini vanno in blobs, non qui.
      console.error(`[storage] scrittura fallita per "${id}"`, e);
    }
  }

  function notifica(origine: Origine) {
    for (const f of ascoltatori) {
      try { f(stato, origine); } catch (e) { console.error(e); }
    }
    for (const f of osservatoriGlobali) {
      try { f(id, origine); } catch (e) { console.error(e); }
    }
  }

  const casella: Casella<S> = {
    id,
    leggi: () => stato,

    scrivi(nuovo, { origine = "locale", tocca = true } = {}) {
      stato = completa(nuovo, predefinito);
      if (tocca) stato.up = Date.now();
      persisti();
      notifica(origine);
      return stato;
    },

    /* `origine` distingue una modifica dell'utente da una arrivata dal
       sync: chi ascolta deve poter evitare di rimbalzare il dato indietro. */
    aggiorna(fn, { origine = "locale", tocca = true } = {}) {
      fn(stato);
      if (tocca) stato.up = Date.now();
      persisti();
      notifica(origine);
      return stato;
    },

    azzera() {
      stato = clona(predefinito);
      stato.up = Date.now();
      persisti();
      notifica("azzeramento");
      return stato;
    },

    osserva(fn) {
      ascoltatori.add(fn);
      return () => { ascoltatori.delete(fn); };
    },
  };

  caselle.set(id, casella);
  return casella;
}

/** Elenco delle caselle aperte in questa sessione. Serve alle impostazioni. */
export const caselleAperte = () => [...caselle.keys()];

/** Esporta tutto quanto sta in localStorage sotto ATLAS. Per il backup manuale. */
export function esportaTutto() {
  const out = {
    formato: "atlas-backup",
    versione: VERSIONE,
    quando: new Date().toISOString(),
    caselle: {} as Record<string, unknown>,
  };
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k?.startsWith(`${PREFISSO}.`)) continue;
    try { out.caselle[k] = JSON.parse(localStorage.getItem(k) ?? "null"); } catch { /* salta */ }
  }
  return out;
}
