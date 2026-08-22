// moduli/finanze/dati.js — lo schema e l'accesso all'archivio.
//
// Portato da napema/budget-tracker-webpage, registro.json v3. I movimenti
// avevano già `id`, `up` e le lapidi `del`: lo schema resta identico, così
// la migrazione è una copia e non una trasformazione.
//
// GLI IMPORTI SONO IN CENTESIMI, sempre, ovunque. `660` è 6,60 €.
// Non è pedanteria: i decimali in virgola mobile sui soldi producono totali
// che sbagliano di un centesimo e nessuno capisce perché. Tutto ciò che
// entra passa da `centesimi()`, tutto ciò che esce da `euro()`.
//
// Tre campi che si somigliano e non sono la stessa cosa:
//   ts    quando il movimento è stato CREATO
//   up    quando è stato TOCCATO l'ultima volta — è questo che usa il sync
//   data  il giorno a cui il movimento SI RIFERISCE
// Si registra oggi una spesa di ieri: qualunque raggruppamento per giorno
// usa `data`, mai `ts`.

import { apriCasella } from "../../core/storage.js";

/**
 * I sei tipi di movimento.
 *
 * NON tutto quello che si muove è una spesa, ed è la distinzione che rende
 * leggibile il totale: i rimborsi degli amici gonfiavano sia le entrate sia
 * le uscite, e la spesa vera non si capiva più. Solo `out` e `in` toccano il
 * budget; `giro`, `rimb` e `reso` restano registrati ma non contano.
 *
 * `rimb` e `reso` puntano all'uscita che riducono, tramite `rif`.
 */
export const TIPI = {
  out:   { nome: "Uscita",         segno: -1, budget: true },
  in:    { nome: "Entrata",        segno: +1, budget: true },
  rimb:  { nome: "Rimborso",       segno: +1, budget: false },
  reso:  { nome: "Reso",           segno: +1, budget: false },
  giro:  { nome: "Giroconto",      segno:  0, budget: false },   // fra pocket: neutro
  extra: { nome: "Ricarica extra", segno: -1, budget: false },   // sforamento, non spesa
};

export function categorieIniziali() {
  return [
    { id: "fisse",     nome: "Fisse",            sub: ["Prestito", "Affitto", "Abbonamenti", "Telefono"] },
    { id: "casa",      nome: "Casa e utenze",    sub: ["Luce e gas", "Acqua", "Internet casa", "Casalinghi", "Arredo", "Altro casa"] },
    { id: "auto",      nome: "Auto",             sub: ["Carburante", "Lavaggio", "Parcheggio", "Pedaggio", "Manutenzione", "Multe"] },
    { id: "spesa",     nome: "Spesa alimentare", sub: ["Supermercato", "Alimentari freschi", "Acqua e bibite"] },
    { id: "trasporti", nome: "Trasporti",        sub: ["Treno", "Mezzi urbani", "Taxi", "Aereo"] },
    { id: "cibo",      nome: "Cibo fuori",       sub: ["Ristorante", "Pizzeria", "Bar e colazioni", "Delivery", "Gelateria", "Aperitivo", "Fast food"] },
    { id: "personale", nome: "Personale",        sub: ["Uscite e svago", "Abbigliamento", "Barbiere", "Cura personale", "Integratori", "Sport", "Shopping", "Regali", "Tech"] },
    { id: "acc",       nome: "Accantonamenti",   sub: ["Assicurazione", "Bollo", "Tagliando", "Fondo emergenze"] },
    { id: "risp",      nome: "Risparmio",        sub: ["Deposito", "Investimenti"] },
  ];
}

/**
 * La cassa settimanale copre SOLO le categorie che dipendono da decisioni
 * giornaliere. Fisse, casa, auto, trasporti, accantonamenti e risparmio sono
 * addebiti automatici o fondi: metterli nel tetto settimanale renderebbe il
 * tetto ingovernabile, perché sforerebbe da solo il giorno dell'affitto.
 */
export const CATEGORIE_CASSA = ["spesa", "cibo", "personale"];

/**
 * I colori delle categorie: tinte di SISTEMA, non esadecimali inventati.
 *
 * Sono l'unica eccezione alla regola "una tinta per schermata": qui il
 * colore non è un accento ma un'etichetta, e servono nove valori distinti
 * per leggere una ciambella. Ma restano token, così in scuro schiariscono
 * insieme a tutto il resto invece di restare i colori pensati per il chiaro.
 */
export const COLORI_CAT = {
  fisse:     "var(--grigio)",
  casa:      "var(--blu)",
  auto:      "var(--arancio)",
  spesa:     "var(--verde)",
  trasporti: "var(--indaco)",
  cibo:      "var(--rosa)",
  personale: "var(--viola)",
  acc:       "var(--menta)",
  risp:      "var(--ciano)",
};
export const coloreCat = (id) => COLORI_CAT[id] || "var(--grigio)";

/**
 * Un simbolo per categoria.
 *
 * Non è decorazione: in una griglia di nove tessere il simbolo si riconosce
 * prima del nome, e a quel punto il nome serve solo a confermare. Senza,
 * nove tessere identiche vanno lette una per una.
 */
export const EMOJI_CAT = {
  fisse: "📄", casa: "🏠", auto: "🚗", spesa: "🛒", trasporti: "🚆",
  cibo: "🍝", personale: "🧴", acc: "🏦", risp: "🌱",
};
export const emojiCat = (id) => EMOJI_CAT[id] || "•";

export function profiliIniziali() {
  return {
    ago: {
      nome: "Agosto",
      b: { fisse: 455, casa: 50, auto: 300, spesa: 100, trasporti: 200, cibo: 150, personale: 120, acc: 125, risp: 0 },
      cassa: 90, cassaCats: [...CATEGORIE_CASSA], dal: 1, al: 31,
    },
    reg: {
      nome: "Regime",
      b: { fisse: 1055, casa: 185, auto: 120, spesa: 220, trasporti: 90, cibo: 120, personale: 100, acc: 125, risp: 85 },
      cassa: 100, cassaCats: [...CATEGORIE_CASSA], dal: 1, al: 31,
    },
  };
}

export const PREDEFINITO = {
  v: 3,
  movs: [],       // { id, up, ts, data, tipo, imp, nota, cat, sub, rif, ecc, del? }
  cats: categorieIniziali(),
  profili: profiliIniziali(),
  rules: {},      // "testo normalizzato" → [cat, sub] — l'autocategorizzazione appresa
  config: { casaBase: 870, affitto: 600, entrate: 2100 },
  metaUp: 0,
};

export const casella = apriCasella("finanze", PREDEFINITO);
export const stato = () => casella.leggi();

/** I movimenti vivi. Le viste leggono sempre questo, mai l'array grezzo. */
export const movimentiVivi = () => stato().movs.filter((m) => m && !m.del);

export const categoriaPerId = (id) => stato().cats.find((c) => c.id === id) || null;

/**
 * Il profilo di budget di un mese. Agosto ha il suo — le spese d'agosto non
 * somigliano a quelle degli altri mesi e usare lo stesso budget produce uno
 * sforamento annunciato ogni anno.
 */
export const chiaveProfilo = (mese) => (Number(mese.split("-")[1]) === 8 ? "ago" : "reg");
export const profiloDi = (mese) => stato().profili[chiaveProfilo(mese)];

// ------------------------------------------------------------- scritture --

export function salvaMovimento(m) {
  const ora = Date.now();
  casella.aggiorna((s) => {
    const i = s.movs.findIndex((x) => x.id === m.id);
    if (i >= 0) s.movs[i] = { ...s.movs[i], ...m, up: ora };
    else s.movs.push({ ts: ora, rif: null, ecc: false, ...m, up: ora });
  });
}

/** Cancella con la lapide. Togliere il record lo farebbe resuscitare. */
export function eliminaMovimento(id) {
  casella.aggiorna((s) => {
    const i = s.movs.findIndex((x) => x.id === id);
    if (i >= 0) s.movs[i] = { id, del: true, up: Date.now() };
  });
}

export function scriviMeta(fn) {
  casella.aggiorna((s) => { fn(s); s.metaUp = Date.now(); });
}

/** Impara una corrispondenza nota → categoria. La usa autoCategoria(). */
export function impara(nota, cat, sub) {
  const n = normalizza(nota);
  if (!n || n.length < 3) return;
  scriviMeta((s) => { s.rules[n] = [cat, sub || null]; });
}

/** Minuscolo, senza accenti, senza punteggiatura. La chiave di `rules`. */
export function normalizza(s) {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFD").replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
