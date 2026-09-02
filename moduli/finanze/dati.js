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
  config: { entrate: 2100 },
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
    // `saldo` NON è il saldo: è l'ANCORA, cioè quanto c'era il giorno di
    // `ancoraDa`. Il saldo vero lo calcola `saldoPocket()` sommandoci i
    // movimenti da quella data in poi, e non si salva da nessuna parte —
    // un saldo scritto è un saldo che va in deriva al primo movimento che
    // qualcuno registra in ritardo.
    { id: "principale", nome: "Principale",  tipo: "spendibile", saldo: 0, ancoraDa: null, external: false },
    { id: "cassa",      nome: "Cassa",       tipo: "parcheggio", saldo: 0, ancoraDa: null, external: false },
    { id: "fisse",      nome: "Spese fisse", tipo: "fisse",      saldo: 0, ancoraDa: null, external: false },
    // ING è `external`: vive fuori dall'app, quindi le spese non lo toccano
    // e l'ancora la si riscrive a mano guardando l'estratto conto. Lo
    // muovono SOLO i travasi espliciti verso gli altri pocket.
    { id: "ing",        nome: "ING",         tipo: "riserva",    saldo: 0, ancoraDa: null, external: true },
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
    !s.soglie || s.config?.giornoStipendio == null || (s.v || 0) < 6;
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

    /* --------------------------------------------------------------- v5 --
       Due campi nuovi sui ricorrenti e una lista nuova accanto.

       `da`   la data prima della quale il ricorrente non esiste. Serviva:
              le utenze partono a settembre ma la prima bolletta arriva a
              fine ottobre, e senza una data d'inizio l'unico modo di dirlo
              era spegnere il ricorrente e ricordarsi di riaccenderlo.
       `pagato` l'ultima scadenza già saldata. È quello che fa sparire una
              voce da «In arrivo» quando la paghi in anticipo, senza
              cancellare il ricorrente.
       `previsti` i pagamenti una tantum futuri — la maxi rata d'agosto. Non
              sono movimenti (non sono ancora usciti) e non sono ricorrenti
              (non tornano): sono la terza cosa, e finché non c'era andavano
              tenuti a mente.                                              */
    for (const r of st.ricorrenti) {
      if (r.da === undefined) r.da = null;
      if (r.pagato === undefined) r.pagato = null;
      // `up` a zero e non a `Date.now()`: un record senza timestamp è un
      // record che non ha mai vinto un confronto, ed è quello che deve
      // fare. Riempirlo con l'ora della migrazione lo farebbe sembrare la
      // modifica più recente su OGNI dispositivo che apre l'app.
      if (r.up === undefined) r.up = 0;
    }
    // Stesso trattamento ai pocket, e per lo stesso motivo: `up: 0` vuol
    // dire «questo valore non l'ha mai scritto nessuno», e deve perdere
    // contro qualunque saldo scritto sul serio.
    for (const p of st.pockets || []) if (p.up === undefined) p.up = 0;

    /* --------------------------------------------------------------- v6 --
       L'ancora diventa PER POCKET.

       Prima la data spartiacque era una sola per tutti (`config.pocketDa`):
       correggere il saldo di ING spostava anche quella del Principale, e i
       movimenti della settimana in corso smettevano di contare su un
       pocket che nessuno aveva toccato. Adesso ogni pocket porta la SUA
       data, e correggerne uno non tocca gli altri.

       `config.pocketDa` resta come ripiego per i record che non hanno
       ancora la loro: toglierlo vorrebbe dire che al primo avvio dopo
       l'aggiornamento i saldi ripartono dalla notte dei tempi.          */
    /* Qui `up` NON si alza, ed è voluto — al contrario di ogni altra
       scrittura su un record.

       Il backfill non è una decisione dell'utente: è una supposizione fatta
       in locale, e su un dispositivo dove `pocketDa` non c'è vale `null`.
       Alzando `up` quel `null` diventerebbe il record più recente e
       vincerebbe sull'ancora vera scritta sull'altro dispositivo: i saldi
       ripartirebbero da zero proprio sul telefono che ne sa meno.

       Lasciandolo com'è, la supposizione perde sempre contro una scrittura
       vera e non fa danni. Il prezzo è che due dispositivi possono restare
       fermi allo stesso `up` con due valori diversi e rimandarseli a vicenda
       — è successo il 27 agosto — ma da quello si esce con un tocco su
       «Salva i saldi», che riancora davvero e alza `up`. Dal caso opposto,
       cioè un saldo azzerato, non si esce. */
    for (const p of st.pockets || []) {
      if (p.ancoraDa === undefined) p.ancoraDa = st.config.pocketDa || null;
    }

    // La regola del costo casa: tolta. Serviva a confrontare gli affitti
    // mentre si cercava casa, il contratto è firmato, e da allora mostrava
    // un risparmio che non esiste. Un numero sbagliato nelle impostazioni
    // è peggio di nessun numero.
    delete st.config.casaBase;
    delete st.config.affitto;

    // Il travaso del lunedì: giorno e ora, configurabili.
    if (st.config.ricarica == null) st.config.ricarica = { giorno: 1, ora: "08:00" };
    if (!Array.isArray(st.previsti)) st.previsti = previstiIniziali();
    st.v = 6;
  });

  // Gli aggiustamenti chiesti il 23 agosto 2026. Stanno FUORI dal blocco dei
  // campi nuovi e hanno un flag loro perché non sono una migrazione di
  // struttura ma un cambio di dati: se un domani l'affitto cambia ancora, lo
  // si cambia dall'interfaccia e questo non deve rimetterlo a 850.
  if (!stato().config?.mig2608) casella.aggiorna(aggiustamenti2608);
}

/** Vedi sopra: una tantum, e mai più ripetuta. */
function aggiustamenti2608(st) {
  const tocca = (id, patch) => {
    const r = (st.ricorrenti || []).find((x) => x.id === id);
    if (r) Object.assign(r, patch);
    return r;
  };

  tocca("rata-auto", { imp: 25000 });
  // L'affitto sale a 850 e parte da ottobre: settembre è dentro la maxi rata.
  tocca("affitto", { imp: 85000, da: "2026-10-01" });
  // Il condominio non sparisce, si spegne: è dentro gli 850 dell'affitto, e
  // cancellarlo perderebbe lo storico dei mesi in cui è uscito davvero.
  tocca("condominio", { attivo: false });
  // Utenze: ogni due mesi, la prima a fine ottobre. `da` fa anche da ancora
  // della cadenza, quindi ottobre–dicembre–febbraio e non gennaio–marzo.
  tocca("utenze", { tipo: "fissa", imp: 15000, cadenza: "bimestrale",
    giorno: 31, mese: 10, da: "2026-10-31", stimaMin: null, stimaMax: null });
  tocca("bollo", { tipo: "fissa", imp: 36000, stimaMin: null, stimaMax: null });
  // L'assicurazione si paga in due rate a febbraio e giugno, che non sono
  // una cadenza: quattro mesi e poi otto. Due ricorrenti annuali ancorati a
  // due mesi diversi sono l'unico modo di dirlo senza mentire al calcolo.
  tocca("assicurazione", { nome: "Assicurazione auto · 1ª rata", tipo: "fissa",
    imp: 50000, cadenza: "annuale", mese: 2, giorno: 15, stimaMin: null, stimaMax: null });
  if (!(st.ricorrenti || []).some((x) => x.id === "assicurazione-2")) {
    st.ricorrenti.push({
      id: "assicurazione-2", nome: "Assicurazione auto · 2ª rata", imp: 50000,
      cat: "acc", pocket: "ing", tipo: "fissa", cadenza: "annuale",
      giorno: 15, mese: 6, da: null, pagato: null,
      stimaMin: null, stimaMax: null, attivo: true,
    });
  }

  st.config.mig2608 = true;
  st.metaUp = Date.now();
}

/* ----------------------------------------------------------- scritture -- */

export const pocketPerId = (id) => (stato().pockets || []).find((p) => p.id === id) || null;

/**
 * `up` su ogni pocket, e non è un dettaglio: dentro c'è il saldo.
 *
 * I pocket viaggiavano dentro `meta`, che si fonde tutta insieme sul
 * confronto di un solo `metaUp`. Un dispositivo che non aveva mai ricevuto
 * i saldi — perché li avevi scritti sull'altro mentre lui aveva già una
 * configurazione più recente, e allora `applica` gli rifiuta l'INTERO
 * blocco remoto — teneva i suoi quattro zeri e poi li spediva. Alle 17:19
 * i saldi sono passati da 251,59 / 390,02 / 455 / 3795,59 a zero secchi in
 * una scrittura sola.
 *
 * Con `up` per pocket, quattro zeri mai toccati (`up: 0`) non possono più
 * vincere su un saldo scritto davvero. È la regola 5, applicata alla cosa
 * che di tutto lo stato è la più importante.
 */
export function scriviPocket(id, patch) {
  scriviMeta((s) => {
    const p = (s.pockets || []).find((x) => x.id === id);
    if (p) Object.assign(p, patch, { up: Date.now() });
  });
}

/**
 * Riscrive l'ANCORA di un pocket: «al giorno d'oggi qui dentro c'è tanto».
 *
 * È l'unica scrittura che tocca un saldo, e non scrive un saldo: scrive il
 * punto da cui ricominciare a contare. Da lì in poi lo muovono i movimenti,
 * e nessuno lo corregge più a mano — un saldo corretto a mano è un saldo
 * che va in deriva al primo movimento registrato in ritardo.
 *
 * La data è OGGI e non è un parametro: l'unico momento in cui si conosce il
 * saldo vero di un conto è quando lo si sta guardando.
 */
export function riancoraPocket(id, saldo, quando = new Date().toISOString().slice(0, 10)) {
  scriviPocket(id, { saldo, ancoraDa: quando });
}

/* =============================================== i ricorrenti si fondono ==
   Ogni ricorrente ha `up`, e cancellarlo lascia una lapide.

   NON è pignoleria di schema: è la regola 5 del contratto, e qui mancava.
   Fino al 23 agosto i ricorrenti viaggiavano dentro `meta`, che si fonde
   come un blocco unico sul confronto di un solo `metaUp`. Bastava che un
   dispositivo con una copia vecchia della configurazione scrivesse
   QUALUNQUE cosa — anche solo di aver fatto il check di oggi — perché il
   suo `metaUp` diventasse il più recente e l'intero elenco dei ricorrenti
   dell'altro dispositivo venisse sostituito da quello vecchio. È successo:
   tre ricorrenti aggiunti sul telefono sono spariti, e ne è tornato uno
   cancellato mezz'ora prima.

   Con `up` per record e le lapidi, due dispositivi che modificano due
   ricorrenti diversi tengono tutti e due, e uno vecchio non può cancellare
   niente perché non cancella: sovrascrive solo ciò che ha davvero toccato.
   ========================================================================= */

/** I ricorrenti vivi. Le viste e il calcolo leggono sempre questo. */
export const ricorrentiVivi = () => (stato().ricorrenti || []).filter((r) => r && !r.del);

export function salvaRicorrente(r) {
  scriviMeta((s) => {
    s.ricorrenti = s.ricorrenti || [];
    const i = s.ricorrenti.findIndex((x) => x.id === r.id);
    if (i >= 0) s.ricorrenti[i] = { ...s.ricorrenti[i], ...r, up: Date.now() };
    else s.ricorrenti.push({ ...r, up: Date.now() });
  });
}

/** Lapide, non rimozione: senza, l'altro dispositivo lo resuscita. */
export function eliminaRicorrente(id) {
  scriviMeta((s) => {
    const i = (s.ricorrenti || []).findIndex((x) => x.id === id);
    if (i >= 0) s.ricorrenti[i] = { id, del: true, up: Date.now() };
  });
}

/**
 * Segna una scadenza come già pagata, senza toccare il ricorrente.
 *
 * `pagato` è l'ultima scadenza saldata, e `prossimaScadenza()` salta tutto
 * ciò che non la supera. È così che una rata pagata tre giorni in anticipo
 * sparisce da «In arrivo» invece di restarci a dire una cosa falsa fino al
 * giorno giusto.
 */
export function segnaScadenzaPagata(id, quando) {
  scriviMeta((s) => {
    const i = (s.ricorrenti || []).findIndex((x) => x.id === id);
    // `up: Date.now()`, e non è una formalità: senza, il gesto viaggia a metà.
    //
    // Premere «Paga» fa due cose — il movimento e la spunta sulla scadenza.
    // Il movimento nasce con il suo `up` e arriva sull'altro dispositivo; la
    // spunta finiva dentro il record senza alzarne l'`up`, e da lì in poi i
    // due telefoni non riuscivano più a mettersi d'accordo: `fondiRecord`
    // confronta gli `up` e a parità dà ragione al locale, quindi ognuno dei
    // due teneva la propria versione e la rimandava indietro al giro dopo.
    // Windows la vedeva pagata, l'iPhone la vedeva da pagare, e il repo
    // rimbalzava fra le due per sempre. Il 26 agosto è successo con l'
    // abbonamento Claude: i 18 € erano usciti davvero e la scadenza continuava
    // a chiederli.
    //
    // Chi scrive dentro un record che si fonde per `up` DEVE alzarlo. Vale
    // qui come in `scriviRicorrente` e `scriviPocket`.
    if (i >= 0) s.ricorrenti[i] = { ...s.ricorrenti[i], pagato: quando, up: Date.now() };
  });
}

/* =================================================== i pagamenti previsti ==
   Una tantum futuri: la maxi rata d'agosto, il deposito, la caparra.

   Non sono movimenti — non sono ancora usciti, e metterli fra i movimenti
   falserebbe ogni totale del mese. Non sono ricorrenti — non tornano, e un
   ricorrente «una volta sola» è una cadenza inventata che poi qualcuno deve
   ricordarsi di spegnere. Sono la terza cosa, e stanno in una lista loro.

   Ognuno dice DA DOVE uscirà (`pocket`), che è l'unica informazione che
   permette di rispondere alla domanda vera: quando arriva, i soldi ci sono?
   ========================================================================= */

export const previsti = () => (stato().previsti || []).filter((p) => p && !p.del && !p.pagatoIl);

/** Anche quelli già pagati: servono allo storico, non a «In arrivo». */
export const previstiTutti = () => (stato().previsti || []).filter((p) => p && !p.del);

export function previstiIniziali() {
  return [{
    id: "maxi-rata-set",
    nome: "Maxi rata: 2 mesi di affitto + agenzia",
    imp: 257600,
    quando: "2026-08-28",
    pocket: "ing",
    cat: "fisse",
    nota: "Copre settembre e ottobre. Da ottobre riparte l'affitto mensile.",
    pagatoIl: null,
    up: Date.now(),
  }];
}

export function salvaPrevisto(p) {
  scriviMeta((s) => {
    s.previsti = s.previsti || [];
    const i = s.previsti.findIndex((x) => x.id === p.id);
    if (i >= 0) s.previsti[i] = { ...s.previsti[i], ...p, up: Date.now() };
    else s.previsti.push({ pagatoIl: null, ...p, up: Date.now() });
  });
}

/** Lapide, non rimozione: la lista si sincronizza fra due dispositivi. */
export function eliminaPrevisto(id) {
  scriviMeta((s) => {
    const i = (s.previsti || []).findIndex((x) => x.id === id);
    if (i >= 0) s.previsti[i] = { id, del: true, up: Date.now() };
  });
}

/* ------------------------------------------- la ricarica della settimana --
   Quale settimana è già stata ricaricata.

   Serve a due cose che sembrano una sola e non lo sono: non far comparire
   la schermata di ricarica se l'hai già fatta, e non far mandare al
   mittente il promemoria del martedì. La chiave è il LUNEDÌ di quella
   settimana, non la data in cui hai confermato: ricaricare martedì con un
   giorno di ritardo resta la ricarica di quella settimana, e segnarla
   sotto martedì la farebbe ricomparire il lunedì dopo come se niente fosse.
*/

/** Il lunedì della settimana che contiene `iso`. */
export function lunediDi(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  t.setUTCDate(t.getUTCDate() - ((t.getUTCDay() + 6) % 7));
  return t.toISOString().slice(0, 10);
}

export const ricaricaFatta = (iso) =>
  Boolean((stato().config?.ricariche || {})[lunediDi(iso)]);

export function segnaRicarica(iso) {
  scriviMeta((s) => {
    const r = { ...(s.config.ricariche || {}), [lunediDi(iso)]: Date.now() };
    // Dodici settimane bastano: servono a non ripetere l'avviso, non a fare
    // archivio. Lo storico vero sono i movimenti.
    const taglio = lunediDi(new Date(Date.now() - 84 * 86400000).toISOString().slice(0, 10));
    s.config.ricariche = Object.fromEntries(Object.entries(r).filter(([g]) => g >= taglio));
  });
}

export function segnaPrevistoPagato(id, quando) {
  scriviMeta((s) => {
    const p = (s.previsti || []).find((x) => x.id === id);
    if (p) { p.pagatoIl = quando; p.up = Date.now(); }
  });
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
