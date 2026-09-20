// credenziali.js — dove vive il token di GitHub. Cioè: non nel repo.
//
// Fino a settembre 2026 il token stava in `config.js`, in base64 spezzato
// in tre pezzi consecutivi. Il commento lì sopra lo chiamava "antiscraping"
// e lo dava per accettabile. Non lo era, per due motivi che vale la pena
// scrivere per esteso perché è l'errore più costoso di tutto ATLAS.
//
// Il primo: `config.js` lo serve GitHub Pages da un repo pubblico. Chiunque
// aprisse napema.github.io/atlas/config.js si portava a casa una chiave di
// lettura E SCRITTURA sul repo dei dati personali — stipendi, entrate, conti.
// Non "in teoria": rispondeva 200 a chiunque.
//
// Il secondo è peggiore, ed è controintuitivo. Spezzare il base64 in tre
// serviva a non farsi riconoscere dal secret scanner di GitHub, che un token
// intero in un repo pubblico lo intercetta e lo revoca d'ufficio. Cioè:
// l'unico allarme che c'era è stato disattivato di proposito. Senza quel
// trucco, il problema sarebbe durato un'ora invece che mesi.
//
// La morale generale: in un sito statico non esiste un nascondiglio.
// Tutto ciò che il browser scarica senza autenticarsi lo scarica chiunque —
// non cambia niente se il file ha un nome strano, se il valore è codificato
// o se è spezzato in pezzi. I posti veri sono due soli: un server che
// autentica (ATLAS non ce l'ha e non deve averlo) oppure il dispositivo.
// Qui si è scelto il dispositivo: lo incolli una volta, e resta.
//
// DUE DECISIONI CHE SEMBRANO DETTAGLI E NON LO SONO:
//
// 1. La chiave di localStorage sta FUORI dal prefisso `atlas.` di
//    storage.js. `esportaTutto()` raccoglie tutto ciò che comincia per
//    `atlas.` per farne un backup scaricabile: un backup con dentro il
//    token sarebbe la stessa perdita da un'altra porta, e stavolta dentro
//    un file che finisce nei Download, in mail, in un allegato.
//
// 2. Non passa da `apriCasella`. Una casella è ciò che un canale di sync
//    impacchetta e spedisce al repo. Il token non deve avere nemmeno la
//    strada per tornare lassù.
//
// Conviene un token PER DISPOSITIVO, non uno condiviso fra i due: si crea
// direttamente da Safari sul telefono, così il segreto non viaggia mai, e
// se perdi il telefono ne revochi uno solo.

const CHIAVE = "atlas-credenziali.v1";

const ascoltatori = new Set();

function leggiTutto() {
  try {
    return JSON.parse(localStorage.getItem(CHIAVE) || "{}") || {};
  } catch {
    return {};
  }
}

/** Il token di questo dispositivo, o stringa vuota. */
export function leggiToken() {
  return String(leggiTutto().token || "").trim();
}

/** C'è un token, quale che sia il suo valore. */
export const tokenPresente = () => leggiToken().length > 0;

/**
 * Salva il token su QUESTO dispositivo e avvisa chi osserva.
 *
 * Avvisare serve: i canali di sync che sono partiti senza token si sono
 * fermati subito (`stato: "off"`, nessun timer). Senza un segnale
 * resterebbero fermi fino al prossimo ricaricamento della pagina, e
 * l'utente vedrebbe un campo compilato e un sync spento.
 */
export function scriviToken(valore) {
  const t = String(valore || "").trim();
  try {
    if (t) localStorage.setItem(CHIAVE, JSON.stringify({ token: t }));
    else localStorage.removeItem(CHIAVE);
  } catch (e) {
    console.error("[credenziali] scrittura fallita", e);
  }
  for (const f of ascoltatori) {
    try { f(t); } catch (e) { console.error(e); }
  }
  return t;
}

/** Toglie il token da questo dispositivo. I dati locali restano. */
export const dimenticaToken = () => scriviToken("");

/** Registra un ascoltatore. Restituisce la funzione per staccarsi. */
export function osservaToken(fn) {
  ascoltatori.add(fn);
  return () => ascoltatori.delete(fn);
}

/**
 * Ha la forma di un token GitHub?
 *
 * Solo per dire all'utente "hai incollato mezza riga" prima di fargli
 * aspettare una chiamata di rete. Non è una validazione: quella la fa
 * GitHub, e la risposta vera è il 200 di `verificaAccesso()` in sync.js.
 */
export function sembraUnToken(valore) {
  const t = String(valore || "").trim();
  return /^(github_pat_|ghp_|gho_|ghs_)[A-Za-z0-9_]{20,}$/.test(t);
}
