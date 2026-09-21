// bus.ts — come i moduli si parlano senza conoscersi.
//
// Portato da `core/bus.js`, identico nel comportamento.
//
// REGOLA FERMA: un modulo non importa mai un altro modulo. Se Mobilità
// importasse Abitudini, i due diventerebbero un pezzo solo: non si potrebbe
// più caricarli pigramente, né portarne uno senza toccare l'altro.
//
// Al posto dell'import c'è questo: chi ha fatto qualcosa lo ANNUNCIA, chi è
// interessato ASCOLTA. Nessuno dei due sa se l'altro esiste.
//
// I nomi sono sempre `<modulo>:<fatto>`, al passato: l'evento racconta un
// fatto avvenuto, non chiede un'azione.

export type Dati = Record<string, any>;
export type Ascoltatore = (dati: Dati, evento: string) => void;

const ascoltatori = new Map<string, Set<Ascoltatore>>();
const jolly = new Set<Ascoltatore>();

// Gli ultimi eventi, per la diagnostica in Impostazioni.
const DIARIO_MAX = 50;
const diario: { evento: string; dati: Dati; quando: number }[] = [];

export function annuncia(evento: string, dati: Dati = {}) {
  if (!/^[a-z-]+:[a-z-]+$/.test(evento)) {
    console.warn(`[bus] "${evento}" non ha la forma <modulo>:<fatto>`);
  }
  diario.unshift({ evento, dati, quando: Date.now() });
  if (diario.length > DIARIO_MAX) diario.length = DIARIO_MAX;

  // Un ascoltatore che esplode non deve fermare gli altri.
  for (const f of ascoltatori.get(evento) ?? []) {
    try { f(dati, evento); } catch (e) { console.error(`[bus] ascoltatore di "${evento}"`, e); }
  }
  for (const f of jolly) {
    try { f(dati, evento); } catch (e) { console.error("[bus] ascoltatore jolly", e); }
  }
}

/**
 * Ascolta un fatto. Restituisce la funzione per smettere — va chiamata
 * quando il componente sparisce, altrimenti ogni visita alla schermata ne
 * aggiunge una copia: un ridisegno, poi due, poi quattro.
 */
export function ascolta(evento: string | "*", fn: Ascoltatore): () => void {
  if (evento === "*") { jolly.add(fn); return () => { jolly.delete(fn); }; }
  let s = ascoltatori.get(evento);
  if (!s) { s = new Set(); ascoltatori.set(evento, s); }
  s.add(fn);
  return () => { ascoltatori.get(evento)?.delete(fn); };
}

export function ascoltaUnaVolta(evento: string, fn: Ascoltatore) {
  const stacca = ascolta(evento, (d, e) => { stacca(); fn(d, e); });
  return stacca;
}

export const ultimiEventi = () => [...diario];

export function chiAscolta() {
  const out: Record<string, number> = {};
  for (const [e, s] of ascoltatori) if (s.size) out[e] = s.size;
  if (jolly.size) out["*"] = jolly.size;
  return out;
}

/* Gli eventi che qualcuno ASCOLTA davvero. Un evento rinominato senza
   aggiornare qui rompe in silenzio. */
export const EVENTI = {
  GIORNO_CAMBIATO: "giorno:cambiato",
  MODULO_APERTO: "modulo:aperto",
  FATTO_SCRITTO: "fatto:scritto",
  DATI_ARRIVATI: "dati:arrivati",
} as const;
