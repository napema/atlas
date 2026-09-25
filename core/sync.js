// sync.js — sincronizzazione iOS ⇄ Windows via GitHub Contents API.
//
// Il sito è statico e non c'è backend: i dati vivono in un repo PRIVATO,
// letti e scritti direttamente dal browser. localStorage resta la copia
// locale che fa funzionare tutto offline; il repo è la fonte condivisa.
//
// Ciclo unico, uguale per ogni modulo:  GET → fondi → salva locale → PUT.
//
// DIFFERENZA RISPETTO ALLE TRE APP DI PARTENZA: lì c'era un file per app e
// un motore di sync copiato tre volte. Qui il motore è uno solo e ogni
// modulo apre il proprio CANALE su un proprio file dentro lo stesso repo.
// Un file per modulo, non uno unico: gli sha restano indipendenti, e due
// moduli che salvano nello stesso istante non si annullano a vicenda.

import { annuncia as annunciaSulBus } from "./bus.js";
import { leggiToken, osservaToken } from "./credenziali.js";

// `config.js` dà il RECAPITO (owner, repo, branch, cartella): è pubblico e
// va benissimo che lo sia, il nome di un repo privato non apre niente. La
// CHIAVE invece non è mai stata roba da config.js e ora sta sul dispositivo:
// il perché per esteso è in `credenziali.js`, e merita i due minuti.
const CFG = (() => {
  const c = globalThis.ATLAS_CFG || {};
  return { owner: c.owner, repo: c.repo, branch: c.branch || "main", cartella: c.cartella || "" };
})();

const INTERVALLO_MS = 20000;   // poll: ogni quanto si controlla il remoto
const DEBOUNCE_MS   = 1500;    // quanto si aspetta dopo una modifica locale
const GIORNI_LAPIDE = 90;      // dopo quanto una cancellazione smette di viaggiare

// Si rilegge ogni volta, non si fotografa all'avvio: il token può arrivare
// a pagina già aperta, incollato in Impostazioni.
export const configurato = () => Boolean(leggiToken() && CFG.owner && CFG.repo);

/** Il recapito, per chi deve mostrarlo (Impostazioni). Mai la chiave. */
export const recapito = () => ({ owner: CFG.owner, repo: CFG.repo, branch: CFG.branch });

const urlDi = (file) => {
  const p = CFG.cartella ? `${CFG.cartella.replace(/\/+$/, "")}/${file}` : file;
  return `https://api.github.com/repos/${CFG.owner}/${CFG.repo}/contents/${p}`;
};

const intestazioni = () => ({
  Authorization: `Bearer ${leggiToken()}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
});

/**
 * Prova il token contro il repo dei dati, senza scrivere niente.
 *
 * Distinguere 401 da 404 è tutto il valore di questa funzione: sono i due
 * errori che si fanno incollando un token, e portano a rimedi opposti.
 * 401 = il token è sbagliato o scaduto, rifallo. 404 = il token è valido ma
 * non vede questo repo, cioè in fase di creazione hai scelto l'account
 * sbagliato o non gli hai dato "Contents". Senza questa distinzione l'utente
 * rigenera dieci volte un token che andava già bene.
 */
export async function verificaAccesso() {
  if (!leggiToken()) return { ok: false, motivo: "Manca il token." };
  if (!CFG.owner || !CFG.repo) return { ok: false, motivo: "Manca il repo in config.js." };
  try {
    const res = await fetch(`https://api.github.com/repos/${CFG.owner}/${CFG.repo}`, {
      headers: intestazioni(), cache: "no-store",
    });
    if (res.status === 401) return { ok: false, motivo: "Token rifiutato da GitHub: sbagliato o scaduto." };
    if (res.status === 403) return { ok: false, motivo: "Token valido ma senza permesso su questo repo." };
    if (res.status === 404) return { ok: false, motivo: `Il token non vede ${CFG.owner}/${CFG.repo}: controlla l'account e il permesso «Contents».` };
    if (!res.ok) return { ok: false, motivo: `GitHub ha risposto ${res.status}.` };
    const j = await res.json();
    return { ok: true, motivo: `Collegato a ${j.full_name}${j.private ? " (privato)" : " — ATTENZIONE: è pubblico"}.` };
  } catch (e) {
    return { ok: false, motivo: `Rete non raggiungibile: ${e.message || e}` };
  }
}

// btoa da solo esplode sugli accenti: serve il giro via UTF-8.
/**
 * Sveglia un workflow del repo dei dati.
 *
 * Sta QUI e non nel modulo per la regola numero uno: a `api.github.com` ci
 * parla il motore di sync e nessun altro. Un modulo che si apre una sua
 * strada verso GitHub è un secondo posto dove sbagliare intestazioni,
 * branch e token.
 *
 * Il permesso è a parte: il token del dispositivo nasce con `Contents`, e
 * per svegliare un workflow serve anche `Actions`. Senza, GitHub risponde
 * 403 o 404 — 404 perché nasconde persino l'esistenza di ciò che non puoi
 * vedere — e qui non è un guasto: vuol dire soltanto che l'aggiornamento
 * arriverà al prossimo giro programmato invece che fra venti secondi.
 */
export async function svegliaWorkflow(file) {
  if (!configurato()) return { ok: false, motivo: "non configurato" };
  try {
    const res = await fetch(
      `https://api.github.com/repos/${CFG.owner}/${CFG.repo}/actions/workflows/${file}/dispatches`,
      { method: "POST", headers: intestazioni(), body: JSON.stringify({ ref: CFG.branch }) },
    );
    if (res.status === 204) return { ok: true };
    if (res.status === 403 || res.status === 404) return { ok: false, motivo: "permesso" };
    return { ok: false, motivo: `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, motivo: e?.message || "rete" };
  }
}

export const b64enc = (s) => btoa(String.fromCharCode(...new TextEncoder().encode(s)));
export const b64dec = (s) => new TextDecoder().decode(
  Uint8Array.from(atob(s.replace(/\s/g, "")), (c) => c.charCodeAt(0))
);

// ===================== strumenti di fusione =====================
//
// Il modello è sempre lo stesso: liste di record con `id` stabile e `up`
// (millisecondi dell'ultima modifica). Vince il più recente, per record.
// Chi cancella non toglie il record: mette `del: true`. Senza la lapide,
// l'altro dispositivo rimanderebbe indietro il record cancellato.

/** Fonde due liste di record. A parità di `up`, il locale ha ragione. */
export function fondiRecord(locale, remoto) {
  const mappa = new Map();
  for (const r of [...(remoto || []), ...(locale || [])]) {  // il locale passa per ultimo
    if (!r || r.id == null) continue;
    const gia = mappa.get(r.id);
    if (!gia || (r.up || 0) >= (gia.up || 0)) mappa.set(r.id, r);
  }
  return [...mappa.values()];
}

/** Toglie le lapidi troppo vecchie: senza potatura il file cresce per sempre. */
export function potaLapidi(record, giorni = GIORNI_LAPIDE) {
  const limite = Date.now() - giorni * 86400000;
  return (record || []).filter((r) => !(r.del && (r.up || 0) < limite));
}

/** I record vivi. Le viste leggono sempre questo, mai l'array grezzo. */
export const vivi = (record) => (record || []).filter((r) => !r.del);

/** Marca un record come cancellato invece di rimuoverlo. */
export function seppellisci(record, id) {
  const i = (record || []).findIndex((r) => r.id === id);
  if (i >= 0) record[i] = { id, del: true, up: Date.now() };
  return record;
}

// ===================== stato visibile =====================

const ascoltatoriStato = new Set();

/** Ascolta i cambi di stato del sync (per il pallino in interfaccia). */
export function osservaStato(fn) {
  ascoltatoriStato.add(fn);
  return () => ascoltatoriStato.delete(fn);
}

function annuncia(canale) {
  for (const f of ascoltatoriStato) {
    try {
      f({ id: canale.id, stato: canale.stato, messaggio: canale.messaggio, ultimo: canale.ultimo });
    } catch (e) { console.error(e); }
  }
}

// Il sync non deve MAI ridisegnare l'interfaccia sotto le dita: i dati
// arrivano sempre, il ridisegno aspetta che l'utente abbia finito.
function interfacciaOccupata() {
  const a = document.activeElement;
  const staScrivendo = a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA" || a.isContentEditable);
  const modaleAperta = document.querySelector("dialog[open], .sovrapposta:not([hidden])") !== null;
  return Boolean(staScrivendo || modaleAperta);
}

// ===================== la coda delle scritture =====================
//
// I canali sono indipendenti nei DATI — un file per modulo, sha separati —
// ma non nel BRANCH: le commit vanno tutte su main, e GitHub rifiuta con 409
// due commit che partono dallo stesso punto. Con quattro canali che si
// svegliano insieme all'avvio, tre su quattro fallivano.
//
// La coda serializza le sole PUT. Le GET restano parallele: leggere non crea
// commit e non ha niente da serializzare.

let ultimaScrittura = Promise.resolve();

function inCoda(fn) {
  const mio = ultimaScrittura.then(fn, fn);
  // La catena non deve spezzarsi se una scrittura fallisce, altrimenti da
  // quel momento in poi la coda non scorre più.
  ultimaScrittura = mio.catch(() => {});
  return mio;
}

// ===================== il canale =====================

const canali = new Map();

/**
 * Apre il canale di sincronizzazione di un modulo.
 *
 * @param {object}   opz
 * @param {string}   opz.id           id del modulo, es. "finanze"
 * @param {string}   opz.file         nome del file nel repo dati, es. "finanze.json"
 * @param {Function} opz.impacchetta  () => oggetto da scrivere sul repo
 * @param {Function} opz.applica      (remoto) => void, scrive nello stato locale
 * @param {Function} [opz.ridisegna]  () => void, quando arriva roba nuova
 */
export function apriCanale({ id, file, impacchetta, applica, ridisegna = () => {} }) {
  if (canali.has(id)) return canali.get(id);

  const canale = {
    id,
    file,
    sha: null,
    occupato: false,
    letturaFatta: false,      // finché è false, questo dispositivo non può SCRIVERE
    ridisegnoInSospeso: false,
    stato: configurato() ? "inattivo" : "off",
    messaggio: "",
    ultimo: null,
    timerDebounce: null,
    timerPoll: null,
  };

  function segnala(stato, messaggio = "") {
    canale.stato = stato;
    canale.messaggio = messaggio;
    annuncia(canale);
  }

  // Normalizza prima di confrontare. Senza questo, ogni giro vede una
  // differenza fantasma (ordine delle chiavi, ordine dei record) e fa una
  // PUT inutile: un commit ogni venti secondi, per sempre.
  function impronta(p) {
    if (!p) return "";
    return JSON.stringify(p, (chiave, v) => {
      if (Array.isArray(v)) {
        return [...v].sort((a, b) =>
          String(a?.id ?? JSON.stringify(a)).localeCompare(String(b?.id ?? JSON.stringify(b))));
      }
      if (v && typeof v === "object") {
        return Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)));
      }
      return v;
    });
  }

  function pianificaRidisegno() {
    if (interfacciaOccupata()) canale.ridisegnoInSospeso = true;
    else { canale.ridisegnoInSospeso = false; ridisegna(); }
  }

  async function scarica() {
    const res = await fetch(`${urlDi(file)}?ref=${CFG.branch}`, {
      headers: intestazioni(),
      cache: "no-store",
    });
    if (res.status === 404) { canale.sha = null; return null; }  // primo giro: il file non c'è ancora
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const j = await res.json();
    canale.sha = j.sha || null;
    try { return JSON.parse(b64dec(j.content || "")); }
    catch { throw new Error("il file remoto non è JSON valido"); }
  }

  async function carica(pacco) {
    // Un dispositivo che non ha ancora LETTO non deve poter SCRIVERE.
    // Senza questa regola uno stato locale vuoto (primo avvio, cache
    // svuotata, dati azzerati) sovrascrive i dati buoni sul repo. È
    // successo davvero, in una delle app di partenza, e ha cancellato
    // un assessment intero.
    if (!canale.letturaFatta) return;

    const corpo = {
      message: `${id}: ${new Date().toISOString()}`,
      content: b64enc(JSON.stringify(pacco, null, 2)),
      branch: CFG.branch,
    };
    if (canale.sha) corpo.sha = canale.sha;

    const res = await inCoda(() => fetch(urlDi(file), {
      method: "PUT",
      headers: intestazioni(),
      body: JSON.stringify(corpo),
    }));
    if (res.status === 409 || res.status === 422) {
      // sha vecchio: qualcun altro ha scritto nel frattempo. Azzera e lascia
      // che sia il giro dopo a rifare GET → fondi → PUT.
      canale.sha = null;
      throw new Error("conflitto, riprovo al prossimo giro");
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const j = await res.json();
    canale.sha = j.content?.sha || null;
  }

  async function giro() {
    if (!configurato() || canale.occupato) return;
    canale.occupato = true;
    segnala("corso");
    try {
      const remoto = await scarica();
      if (remoto) {
        applica(remoto);
        // L'annuncio lo fa il canale, non i moduli: così nessuno può
        // dimenticarselo. Senza, la schermata Oggi disegnava una volta sola
        // all'avvio e restava ferma sui numeri di prima anche dopo che il
        // sync aveva portato i dati veri.
        annunciaSulBus("dati:arrivati", { modulo: id });
      }
      canale.letturaFatta = true;

      const mio = impacchetta();
      if (impronta(mio) !== impronta(remoto)) await carica(mio);

      canale.ultimo = new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
      segnala("ok");
      pianificaRidisegno();
    } catch (e) {
      segnala("err", e.message || String(e));
    } finally {
      canale.occupato = false;
    }
  }

  canale.ora = giro;

  /** Da chiamare dopo una modifica locale. Accorpa le raffiche di scritture. */
  canale.segnalaModifica = () => {
    if (!configurato()) return;
    clearTimeout(canale.timerDebounce);
    canale.timerDebounce = setTimeout(giro, DEBOUNCE_MS);
  };

  canale.avvia = () => {
    if (!configurato()) { segnala("off"); return; }
    giro();
    clearInterval(canale.timerPoll);
    canale.timerPoll = setInterval(() => { if (!document.hidden) giro(); }, INTERVALLO_MS);
  };

  canale.ferma = () => {
    clearInterval(canale.timerPoll);
    clearTimeout(canale.timerDebounce);
  };

  canale.ridisegnaSeInSospeso = () => {
    if (canale.ridisegnoInSospeso && !interfacciaOccupata()) {
      canale.ridisegnoInSospeso = false;
      ridisegna();
    }
  };

  canali.set(id, canale);
  return canale;
}

/** Tutti i canali aperti. */
export const canaliAperti = () => [...canali.values()];

/** Forza un giro su tutti i canali: al ritorno online e al rientro in primo piano. */
export function sincronizzaTutto() {
  for (const c of canali.values()) c.ora();
}

// Il token arriva quasi sempre a pagina GIÀ APERTA: al primo avvio su un
// dispositivo nuovo i canali partono senza, si fermano subito (`off`, nessun
// timer) e lì resterebbero fino a un ricaricamento. Con questo, incollare il
// token in Impostazioni accende il sync all'istante.
//
// `ferma()` prima di `avvia()` non è ridondante: quando il token viene TOLTO,
// `avvia()` esce subito segnalando `off` e non arriva mai a spegnere il poll,
// che continuerebbe a bussare a GitHub senza chiave.
osservaToken(() => {
  for (const c of canali.values()) { c.ferma(); c.avvia(); }
});

// Il rientro in primo piano è il momento in cui il dato remoto ha più
// probabilità di essere cambiato: l'altro dispositivo ha lavorato mentre
// questo dormiva.
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) sincronizzaTutto();
});
globalThis.addEventListener("online", sincronizzaTutto);
document.addEventListener("focusout", () => {
  for (const c of canali.values()) c.ridisegnaSeInSospeso();
});
