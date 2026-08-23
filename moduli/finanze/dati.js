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

/* =========================================================================
   REGISTRO v2 — pocket, ricorrenti, ciclo dello stipendio.

   Tutto quello che segue è AGGIUNTO, mai sostituito. I 161 movimenti
   esistenti restano com'erano: i campi nuovi (`pocket`, `pocketTo`,
   `rimborsoDi`) sono opzionali e chi non ce l'ha viene letto con un valore
   di riposo. È la ragione per cui `migra()` più sotto non trasforma niente
   e si limita a riempire i vuoti.
   ========================================================================= */

/**
 * I pocket. Non è un budget: è dove stanno i soldi davvero.
 *
 *   ING        la riserva. Non si spende da qui, alimenta gli altri.
 *   FISSE      addebiti automatici. Non si tocca.
 *   CASSA      le settimane future del mese. Parcheggio, non spendibile.
 *   PRINCIPALE la settimana corrente. L'unico conto da cui si spende.
 *
 * Ogni lunedì un travaso fisso Cassa → Principale: quello è il budget della
 * settimana, e quando il Principale è a zero la settimana è finita.
 */
export const TIPI_POCKET = {
  spendibile: { nome: "Spendibile" },
  parcheggio: { nome: "Parcheggio" },
  fisse:      { nome: "Spese fisse" },
  riserva:    { nome: "Riserva" },
};

export function pocketIniziali() {
  return [
    { id: "principale", nome: "Principale",  tipo: "spendibile", saldo: 0, external: false },
    { id: "cassa",      nome: "Cassa",       tipo: "parcheggio", saldo: 0, external: false },
    { id: "fisse",      nome: "Spese fisse", tipo: "fisse",      saldo: 0, external: false },
    // ING è `external`: il saldo non si deduce dai movimenti, lo si scrive a
    // mano, perché è un conto che vive fuori dall'app.
    { id: "ing",        nome: "ING",         tipo: "riserva",    saldo: 0, external: true },
  ];
}

/**
 * Le uscite ricorrenti. Alimentano la sezione "In arrivo" della home.
 *
 * `fissa` è un importo certo; `variabile` è una stima con un intervallo, e
 * nelle proiezioni si usa sempre `stimaMax` — prudenziale, perché una
 * bolletta sottostimata è esattamente il caso in cui il pocket Fisse non
 * basta e lo sforamento arriva dal nulla.
 */
export function ricorrentiIniziali() {
  const r = (id, nome, imp, cat, giorno, extra = {}) => ({
    id, nome, imp, cat, pocket: "fisse", tipo: "fissa",
    // `mese` ancora le cadenze non mensili: senza, un annuale cadeva ogni
    // anno nel mese in cui lo stavi guardando. 1-12, ignorato se mensile.
    cadenza: "mensile", giorno, mese: null,
    stimaMin: null, stimaMax: null, attivo: true, ...extra,
  });
  return [
    r("rata-auto",    "Rata prestito", 40000, "fisse", 25),
    r("affitto",      "Affitto",       65000, "fisse", 1),
    r("abbonamenti",  "Abbonamenti",    5500, "fisse", 27),
    r("condominio",   "Condominio",     5000, "casa",  1),
    r("utenze", "Gas, luce e acqua", 0, "casa", 3,
      { tipo: "variabile", cadenza: "bimestrale", mese: 1, stimaMin: 18000, stimaMax: 35000 }),
    r("assicurazione", "Assicurazione auto", 0, "acc", 15,
      { cadenza: "annuale", mese: 6, tipo: "variabile", pocket: "ing", stimaMin: 40000, stimaMax: 55000 }),
    r("bollo", "Bollo auto", 0, "acc", 31,
      { cadenza: "annuale", mese: 12, tipo: "variabile", pocket: "ing", stimaMin: 15000, stimaMax: 22000 }),
  ];
}

/**
 * Automatico / necessario / discrezionale, per sottocategoria.
 *
 * Serve alla card "come spendi", che risponde a "dove vanno i soldi" meglio
 * di qualunque torta: una barra sola, due numeri. La chiave è
 * `"<cat>|<sub>"`; una categoria senza sottocategoria ricade sulla classe
 * della categoria in `CLASSE_CAT`.
 */
export const CLASSE_CAT = {
  fisse: "automatico", casa: "automatico", acc: "automatico", risp: "automatico",
  spesa: "necessario", auto: "necessario",
  cibo: "discrezionale", personale: "discrezionale", trasporti: "discrezionale",
};
export const CLASSI_SUB = {
  "auto|Manutenzione": "necessario",
  "auto|Carburante": "necessario",
  "auto|Lavaggio": "discrezionale",
  "auto|Multe": "discrezionale",
  "personale|Cura personale": "necessario",
  "personale|Integratori": "necessario",
  "trasporti|Treno": "discrezionale",
  "trasporti|Mezzi urbani": "necessario",
};
export function classeDi(cat, sub) {
  return CLASSI_SUB[`${cat}|${sub}`] || CLASSE_CAT[cat] || "discrezionale";
}

export const SOGLIE_PREDEFINITE = {
  ingMinimo: 90000,      // sotto, la riserva va in ambra
  catAvviso: 0.85,       // categoria all'85% del budget del ciclo
  spesaGrossa: 5000,     // sopra, il foglio chiede conferma
};

/* ---------------------------------------------------------- migrazione -- */

/**
 * Riempie i campi di v4 lasciando intatto tutto il resto.
 *
 * Gira a ogni avvio ed è idempotente: se i campi ci sono già non tocca
 * niente, quindi non fa partire il sync e non produce un `up` nuovo su
 * record che non sono cambiati. È l'unico modo sicuro di far evolvere uno
 * schema quando i dati veri sono già su due dispositivi.
 */
export function migra() {
  const s = stato();
  const serve =
    !Array.isArray(s.pockets) || !Array.isArray(s.ricorrenti) ||
    !s.soglie || s.config?.giornoStipendio == null || (s.v || 0) < 4;
  if (!serve) return;

  casella.aggiorna((st) => {
    if (!Array.isArray(st.pockets)) st.pockets = pocketIniziali();
    if (!Array.isArray(st.ricorrenti)) st.ricorrenti = ricorrentiIniziali();
    if (!st.soglie) st.soglie = { ...SOGLIE_PREDEFINITE };
    st.config = st.config || {};
    // Lo stipendio arriva il 21, non il 1. Tutti i calcoli di "quanto manca
    // alla fine del mese" usano il ciclo 21→20: con il mese solare i numeri
    // non tornavano mai, ed è il motivo per cui non tornavano.
    if (st.config.giornoStipendio == null) st.config.giornoStipendio = 21;
    if (st.config.cassaSettimanale == null) st.config.cassaSettimanale = 13000;
    if (st.config.pendenti == null) st.config.pendenti = [];
    // Da oggi in avanti i movimenti muovono i pocket. Prima è storico.
    if (st.config.pocketDa == null) st.config.pocketDa = new Date().toISOString().slice(0, 10);
    // I movimenti vecchi non hanno `pocket`: sono tutti usciti dal
    // Principale, che è l'unico conto da cui si spende.
    for (const m of st.movs) {
      if (!m || m.del) continue;
      if (m.pocket == null) m.pocket = m.tipo === "in" ? "ing" : "principale";
      if (m.pocketTo === undefined) m.pocketTo = null;
      if (m.rimborsoDi === undefined) m.rimborsoDi = m.rif ?? null;
    }
    st.v = 4;
  });
}

/* ----------------------------------------------------------- scritture -- */

export const pocketPerId = (id) => (stato().pockets || []).find((p) => p.id === id) || null;

export function scriviPocket(id, patch) {
  scriviMeta((s) => {
    const p = (s.pockets || []).find((x) => x.id === id);
    if (p) Object.assign(p, patch);
  });
}

export function salvaRicorrente(r) {
  scriviMeta((s) => {
    s.ricorrenti = s.ricorrenti || [];
    const i = s.ricorrenti.findIndex((x) => x.id === r.id);
    if (i >= 0) s.ricorrenti[i] = { ...s.ricorrenti[i], ...r };
    else s.ricorrenti.push(r);
  });
}

export function eliminaRicorrente(id) {
  scriviMeta((s) => { s.ricorrenti = (s.ricorrenti || []).filter((x) => x.id !== id); });
}

/**
 * Le spese messe in sospeso da «ci dormo su».
 *
 * Non sono movimenti: sono intenzioni. Vivono in `config` e non nell'array
 * dei movimenti proprio perché non devono comparire in nessun totale finché
 * non vengono confermate. Decadono da sole dopo sette giorni.
 */
export const pendenti = () => (stato().config?.pendenti || []).filter((p) => !scaduta(p));
const scaduta = (p) => (Date.now() - (p.ts || 0)) > 7 * 86400000;

export function metteInSospeso(bozza) {
  scriviMeta((s) => {
    s.config.pendenti = (s.config.pendenti || []).filter((p) => (Date.now() - (p.ts || 0)) <= 7 * 86400000);
    s.config.pendenti.push({ ...bozza, ts: Date.now() });
  });
}

export function togliDaSospeso(id) {
  scriviMeta((s) => {
    s.config.pendenti = (s.config.pendenti || []).filter((p) => p.id !== id);
  });
}

/* ================================================== il check giornaliero ==
   Un giorno chiuso è un giorno in cui hai guardato i conti e hai detto «sì,
   è tutto segnato». Non è un dato contabile — non sposta un centesimo — ma è
   l'unica cosa che tiene in piedi il registro: un registro si rompe quando
   smetti di segnare, e smetti di segnare quando nessuno ti chiede se l'hai
   fatto.

   Sta in `config.checks` come mappa `iso → timestamp` e non come lista di
   record perché non ha bisogno di lapidi: se un dispositivo dice che il 23
   il check c'è stato, il 23 il check c'è stato, e due dispositivi che dicono
   la stessa cosa non hanno un conflitto da risolvere. Si pota a 120 giorni:
   la serie più lunga che ha senso mostrare è molto più corta di così.
   ========================================================================= */

const GIORNI_CHECK = 120;

export const checkFatto = (iso) => Boolean((stato().config?.checks || {})[iso]);

export function segnaCheck(iso) {
  scriviMeta((s) => {
    const c = { ...(s.config.checks || {}), [iso]: Date.now() };
    const taglio = new Date(Date.now() - GIORNI_CHECK * 86400000).toISOString().slice(0, 10);
    s.config.checks = Object.fromEntries(Object.entries(c).filter(([g]) => g >= taglio));
  });
}

/**
 * Da quanti giorni di fila chiudi il check.
 *
 * Oggi non conta finché non l'hai fatto: partire da 1 la mattina prima di
 * aver guardato niente sarebbe una serie regalata, e una serie regalata non
 * la si difende. Se oggi è ancora aperto la serie è quella di ieri, che è
 * quella che stai per allungare o per perdere.
 */
export function serieCheck(oggi) {
  const checks = stato().config?.checks || {};
  const giorno = (n) => new Date(new Date(`${oggi}T12:00:00`).getTime() - n * 86400000)
    .toISOString().slice(0, 10);

  let n = 0;
  for (let k = checks[oggi] ? 0 : 1; k < GIORNI_CHECK; k++) {
    if (!checks[giorno(k)]) break;
    n++;
  }
  return n;
}
