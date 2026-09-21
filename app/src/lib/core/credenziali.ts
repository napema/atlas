// credenziali.ts — dove vive il token di GitHub. Cioè: non nel repo.
//
// Portato da `core/credenziali.js`. La chiave in localStorage è la STESSA
// (`atlas-credenziali.v1`): chi ha già incollato il token nella app di prima
// non deve rifarlo in questa.
//
// Perché il token sta sul dispositivo e non in un file: fino a settembre
// 2026 stava in `config.js`, servito da GitHub Pages da un repo pubblico —
// chiunque aprisse quell'indirizzo si portava a casa una chiave di lettura E
// SCRITTURA sui dati personali. In un sito statico non esiste un
// nascondiglio: tutto ciò che il browser scarica senza autenticarsi lo
// scarica chiunque. I posti veri sono due: un server che autentica, o il
// dispositivo. ATLAS ha scelto il dispositivo.
//
// DUE DECISIONI CHE SEMBRANO DETTAGLI E NON LO SONO:
//
// 1. La chiave sta FUORI dal prefisso `atlas.` dell'archivio. Il backup
//    raccoglie tutto ciò che comincia per `atlas.`: un backup con dentro il
//    token sarebbe la stessa perdita da un'altra porta.
// 2. Non passa da `apriCasella`. Una casella è ciò che un canale di sync
//    impacchetta e spedisce al repo: il token non deve avere nemmeno la
//    strada per tornare lassù.

const CHIAVE = "atlas-credenziali.v1";

const ascoltatori = new Set<(t: string) => void>();

function leggiTutto(): { token?: string } {
  try {
    return JSON.parse(localStorage.getItem(CHIAVE) || "{}") || {};
  } catch {
    return {};
  }
}

export const leggiToken = () => String(leggiTutto().token || "").trim();
export const tokenPresente = () => leggiToken().length > 0;

/**
 * Salva il token su QUESTO dispositivo e avvisa chi osserva: i canali di
 * sync partiti senza token si sono fermati subito, e senza un segnale
 * resterebbero fermi fino al prossimo ricaricamento.
 */
export function scriviToken(valore: string) {
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

export const dimenticaToken = () => scriviToken("");

export function osservaToken(fn: (t: string) => void) {
  ascoltatori.add(fn);
  return () => { ascoltatori.delete(fn); };
}

/**
 * Ha la FORMA di un token GitHub? Solo per dire «hai incollato mezza riga»
 * prima di far aspettare una chiamata di rete. La validazione vera la fa
 * GitHub, con `verificaAccesso()` in sync.ts.
 */
export function sembraUnToken(valore: string) {
  return /^(github_pat_|ghp_|gho_|ghs_)[A-Za-z0-9_]{20,}$/.test(String(valore || "").trim());
}
