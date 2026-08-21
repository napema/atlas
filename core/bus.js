// bus.js — come i moduli si parlano senza conoscersi.
//
// REGOLA FERMA: un modulo non importa mai un altro modulo. Se Mobilità
// dovesse importare Abitudini, i due diventerebbero un pezzo solo: non si
// potrebbe più caricarli pigramente, né portarne uno senza toccare l'altro,
// né toglierne uno senza rompere il resto.
//
// Al posto dell'import c'è questo: chi ha fatto qualcosa lo ANNUNCIA, chi
// è interessato ASCOLTA. Nessuno dei due sa se l'altro esiste, e va bene
// così — un annuncio che nessuno ascolta non è un errore.
//
// I nomi degli eventi sono sempre `<modulo>:<cosa è successo>`, al passato:
// l'evento racconta un fatto avvenuto, non chiede un'azione. Chiedere a un
// altro modulo di fare qualcosa è esattamente l'accoppiamento che stiamo
// evitando.

const ascoltatori = new Map();   // evento → Set di funzioni
const jolly = new Set();         // chi ascolta tutto (la diagnostica)

// Gli ultimi eventi, per la schermata impostazioni. Serve quando un modulo
// "non reagisce" e bisogna capire se l'annuncio è partito o no.
const DIARIO_MAX = 50;
const diario = [];

/**
 * Annuncia un fatto.
 * @param {string} evento  "<modulo>:<fatto>", es. "mobilita:sessione-completata"
 * @param {object} [dati]
 */
export function annuncia(evento, dati = {}) {
  if (!/^[a-z-]+:[a-z-]+$/.test(evento)) {
    console.warn(`[bus] "${evento}" non ha la forma <modulo>:<fatto>`);
  }

  diario.unshift({ evento, dati, quando: Date.now() });
  if (diario.length > DIARIO_MAX) diario.length = DIARIO_MAX;

  // Un ascoltatore che esplode non deve fermare gli altri: sono moduli
  // indipendenti, e il guasto di uno non è affare degli altri.
  for (const f of ascoltatori.get(evento) || []) {
    try { f(dati, evento); } catch (e) { console.error(`[bus] ascoltatore di "${evento}"`, e); }
  }
  for (const f of jolly) {
    try { f(dati, evento); } catch (e) { console.error("[bus] ascoltatore jolly", e); }
  }
}

/**
 * Ascolta un fatto. Restituisce la funzione per smettere — chiamala in
 * `smonta()`, altrimenti ogni visita alla schermata ne aggiunge una copia.
 *
 * @param {string|"*"} evento
 * @param {Function} fn
 */
export function ascolta(evento, fn) {
  if (evento === "*") { jolly.add(fn); return () => jolly.delete(fn); }
  if (!ascoltatori.has(evento)) ascoltatori.set(evento, new Set());
  ascoltatori.get(evento).add(fn);
  return () => ascoltatori.get(evento)?.delete(fn);
}

/** Come `ascolta`, ma si stacca dopo il primo annuncio. */
export function ascoltaUnaVolta(evento, fn) {
  const stacca = ascolta(evento, (d, e) => { stacca(); fn(d, e); });
  return stacca;
}

/** Gli ultimi eventi, dal più recente. Per la diagnostica. */
export const ultimiEventi = () => [...diario];

/** Chi sta ascoltando cosa. Utile quando un annuncio sembra cadere nel vuoto. */
export function chiAscolta() {
  const out = {};
  for (const [e, s] of ascoltatori) if (s.size) out[e] = s.size;
  if (jolly.size) out["*"] = jolly.size;
  return out;
}

/* ---------------------------------------------------------------------
   Gli eventi che i moduli si scambiano. Non è un elenco chiuso — chiunque
   può annunciare quello che vuole — ma è l'elenco di quelli che qualcuno
   ASCOLTA davvero, e come tale va tenuto aggiornato: un evento rinominato
   senza aggiornare qui rompe in silenzio.

     giorno:cambiato           la mezzanotte è passata; { giorno }
     modulo:aperto             l'utente è entrato in un modulo; { id }
     fatto:scritto             un fatto del giorno è cambiato;
                               { modulo, chiave, valore, giorno }
     dati:arrivati             il sync ha portato roba nuova; { modulo }

   Da qui in avanti li aggiungono i moduli. Per esempio, quando Mobilità
   sarà dentro, annuncerà `mobilita:sessione-completata` e Abitudini
   spunterà da sola l'abitudine corrispondente — senza che i due si
   conoscano.
   --------------------------------------------------------------------- */
export const EVENTI = {
  GIORNO_CAMBIATO: "giorno:cambiato",
  MODULO_APERTO: "modulo:aperto",
  FATTO_SCRITTO: "fatto:scritto",
  DATI_ARRIVATI: "dati:arrivati",
};
