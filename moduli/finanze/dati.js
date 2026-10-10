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
    /* PERSONALE ERA DUE COSE. Barbiere e lavanderia sono cose che DEVI
       fare; shopping e tech sono cose che SCEGLI di fare. Sotto un budget
       solo non si capiva mai se avevi sforato per necessita' o per sfizio,
       e «Come spendi» le metteva nello stesso mucchio. */
    { id: "cura",      nome: "Cura e necessità", sub: ["Barbiere", "Lavanderia", "Farmacia e salute", "Igiene e cosmetica", "Integratori", "Studio"] },
    { id: "svago",     nome: "Svago e shopping", sub: ["Uscite e serate", "Abbigliamento", "Shopping", "Tech", "Sport e attrezzatura", "Regali", "Viaggi e hotel"] },
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
export const CATEGORIE_CASSA = ["spesa", "cibo", "cura", "svago", "casa", "auto", "trasporti"];

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
  cura:      "var(--viola)",
  svago:     "var(--giallo)",
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
  cibo: "🍝", cura: "🧼", svago: "🎟️", acc: "🏦", risp: "🌱",
};
export const emojiCat = (id) => EMOJI_CAT[id] || "•";

/* I BUDGET DI REGIME. Sommano a 1885 e non a 2041, e i 156 che mancano non
   sono un buco: sono il versamento al Fondo, che non e' una spesa e non e'
   una categoria. Le quattro destinazioni dello stipendio stanno in
   `VERSAMENTI`, e questa tabella e' solo la terza — «Vita».

   VITA E' ESATTAMENTE `CATEGORIE_CASSA`: spesa 220 + cibo 80 + cura 75 +
   auto 65 + svago 45 + casa 30 + trasporti 20 = 535. E' la proprieta' che
   rende vera la «quota di piano» in home — 535 / 30 giorni = 17,83 al
   giorno — e va mantenuta: se una categoria entra nella cassa senza entrare
   nei 535, la quota di piano smette di essere il piano.

   Via «Risparmio»: adesso c'e' il Fondo, e due posti per la stessa cosa
   vogliono dire due numeri che divergono. */
export function profiliIniziali() {
  return {
    reg: {
      nome: "Regime",
      b: { fisse: 1235, casa: 30, auto: 65, trasporti: 20, spesa: 220, cibo: 80, cura: 75, svago: 45, acc: 115, risp: 0 },
      cassaCats: [...CATEGORIE_CASSA], dal: 1, al: 31,
    },
  };
}

/**
 * Dove va lo stipendio, in centesimi. Quattro destinazioni e un ordine.
 *
 * `fisse` NON e' qui: si calcola ogni volta su quello che scade davvero
 * prima del prossimo stipendio (vedi `paga.js`). Un numero fisso per le
 * fisse e' il numero che va in deriva per primo, perche' le bollette non
 * arrivano tutti i mesi e le rate finiscono.
 *
 * `ing` e' quello che resta. A regime e' 115, ed e' lo stesso 115 che il
 * profilo chiama «acc»: e' la stessa cosa detta due volte, e qui vince
 * questa perche' e' quella che muove i soldi.
 */
export const VERSAMENTI = { fondo: 15600, vita: 53500, ing: 11500 };

/* LE ECCEZIONI, per data di stipendio.
 *
 * Il 23 ottobre non e' un mese come gli altri: la prima bolletta da 150 non
 * e' mai stata accantonata e il 1 novembre cade l'ultima rata AliExpress.
 * Il calcolo a regime darebbe le quote delle non-mensili, che qui
 * sarebbero un accantonamento sopra un arretrato — e il pocket Fisse
 * resterebbe scoperto lo stesso. Quindi per quella data i quattro numeri
 * sono scritti, e dal 23 novembre si torna al calcolo.
 */
export const ECCEZIONI_STIPENDIO = {
  "2026-10-23": { fondo: 15600, fisse: 132900, vita: 53500, ing: 2100 },
};

/**
 * L'OBIETTIVO. Un solo traguardo per volta, dentro `config`.
 *
 * Gli importi sono in centesimi come tutto il resto: il documento lo
 * descrive in euro, ma due unita' nello stesso archivio sono la trappola
 * che questo modulo ha gia' pagato una volta.
 *
 * `dal` e' la data da cui si contano i versamenti programmati, e non e'
 * decorativa: senza, «previsto a oggi» conterebbe anche gli stipendi
 * passati, in cui al fondo non e' mai andato niente, e l'obiettivo
 * nascerebbe gia' in ritardo di mesi.
 */
export const OBIETTIVO_INIZIALE = {
  nome: "Naso",
  target: 350000,
  provvisorio: true,
  data: "2027-08-01",
  dal: "2026-10-07",
  pocket: "fondo",
  versamento: 15600,
  extra: [{ id: "x-tredicesima", nome: "Tredicesima", imp: 130000, quando: "2026-12", stimato: true }],
};

export const PREDEFINITO = {
  v: 3,
  movs: [],       // { id, up, ts, data, tipo, imp, nota, cat, sub, rif, ecc, del? }
  cats: categorieIniziali(),
  profili: profiliIniziali(),
  rules: {},      // "testo normalizzato" → [cat, sub] — l'autocategorizzazione appresa
  // La lista d'attesa: l'unico modo di comprare sopra soglia senza finire
  // in «Fuori piano». Record con `id`, `up` e lapidi come i movimenti.
  lista: [],
  config: {
    entrate: 2041,
    // IL 23, non il 21. E se cade di sabato o domenica, il giorno
    // lavorativo prima: vedi `dataStipendio()` in calcolo.js.
    giornoStipendio: 23,
  },
  metaUp: 0,
  // I profili hanno un timestamp LORO, staccato da `metaUp`. Vedi
  // `scriviProfili()`. Zero di partenza: un profilo di fabbrica non deve
  // poter vincere contro uno che hai davvero impostato.
  profiliUp: 0,
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
/* UN PROFILO SOLO. Ad agosto ne scattava uno suo — spese diverse, budget
   diverso — ma era tarato su un agosto che non c'e' piu', e un profilo
   obsoleto che si accende da solo una volta l'anno e' peggio di nessun
   profilo: cambia i numeri sotto il naso senza che tu te lo ricordi.

   La chiave resta una funzione, non una costante, perche' il giorno che
   serve davvero un secondo profilo si riaccende qui e basta. */
export const chiaveProfilo = () => "reg";
/* Il ripiego non e' decorativo: un archivio sincronizzato da un dispositivo
   fermo a prima puo' ancora non avere `reg`, e senza questo ogni lettura di
   un budget esploderebbe. */
export const profiloDi = () => stato().profili?.[chiaveProfilo()] || profiliIniziali().reg;

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

/**
 * Come `scriviMeta`, ma alza anche `profiliUp`.
 *
 * I PROFILI ESCONO DAL CANCELLO DI `metaUp`, ed è la terza volta che questo
 * schema si ripete: prima i ricorrenti, poi i pocket, adesso i profili.
 *
 * Dentro il blocco `meta` bastava che un dispositivo con la configurazione
 * di fabbrica avesse un `metaUp` più fresco — e gliene bastava uno
 * qualunque, anche il check della sera — per sostituire i profili
 * dell'altro coi suoi. Nella cronologia di atlas-dati `cassaCats` rimbalza
 * fra 9 e 3 dal 26 agosto: non era un valore perso, erano due dispositivi
 * che se lo rimandavano.
 *
 * Con un timestamp suo, il confronto è fra le due versioni DEI PROFILI e
 * non fra due configurazioni qualsiasi. Chi li ha toccati per ultimo vince,
 * che è l'unica regola che qui abbia senso.
 */
export function scriviProfili(fn) {
  casella.aggiorna((s) => { fn(s); s.metaUp = Date.now(); s.profiliUp = Date.now(); });
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
  // Il Fondo non e' una riserva: una riserva la puoi attingere e l'app te
  // lo dice come costo. Questo no — esce dal conto di «quanto posso
  // spendere» del tutto, e toccarlo e' un fatto che si vede sull'obiettivo.
  obiettivo:  { nome: "Obiettivo" },
};

export function pocketIniziali() {
  return [
    // `saldo` NON è il saldo: è l'ANCORA, cioè quanto c'era il giorno di
    // `ancoraDa`. Il saldo vero lo calcola `saldoPocket()` sommandoci i
    // movimenti da quella data in poi, e non si salva da nessuna parte —
    // un saldo scritto è un saldo che va in deriva al primo movimento che
    // qualcuno registra in ritardo.
    { id: "principale", nome: "Principale",  tipo: "spendibile", saldo: 0, ancoraDa: null, external: false },
    // I CONTANTI SONO UN POCKET, non un metodo di pagamento.
    //
    // È la stessa distinzione dei pocket: i soldi non li paghi «in
    // contanti», li paghi CON i contanti che hai in tasca, e quelli sono un
    // posto dove il denaro sta. Prelevare è un giroconto Principale →
    // Contanti; spendere è un'uscita dai Contanti. Così il Principale cala
    // il giorno del prelievo — che è il giorno in cui quei soldi smettono
    // di essere disponibili per altro — e non due settimane dopo, quando
    // finisci di spenderli.
    //
    // È anche `spendibile` come il Principale, quindi entra nei conti della
    // settimana e della giornata insieme a lui: sono due tasche dello
    // stesso portafoglio, e sommarle è l'unica cosa che risponde alla
    // domanda «quanto posso spendere».
    { id: "contanti",   nome: "Contanti",    tipo: "spendibile", saldo: 0, ancoraDa: null, external: false },
    { id: "cassa",      nome: "Cassa",       tipo: "parcheggio", saldo: 0, ancoraDa: null, external: false },
    { id: "fisse",      nome: "Spese fisse", tipo: "fisse",      saldo: 0, ancoraDa: null, external: false },
    // ING è `external`: vive fuori dall'app, quindi le spese non lo toccano
    // e l'ancora la si riscrive a mano guardando l'estratto conto. Lo
    // muovono SOLO i travasi espliciti verso gli altri pocket.
    // IL FONDO. Non e' spendibile, non e' parcheggio, non e' riserva:
    // non entra in nessun calcolo di quota, e l'unica domanda a cui
    // risponde e' «sono in linea con l'obiettivo».
    { id: "fondo",      nome: "Fondo naso",  tipo: "obiettivo",  saldo: 0, ancoraDa: null, external: false },
    // ING ultimo: in home accanto al suo saldo c'e' il minimo previsto, ed
    // e' una riga in piu' che sta bene in fondo.
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
  /* GLI ABBONAMENTI SONO TRE COSE, NON UNA. Erano una riga sola da 55 il
     27, e una riga sola non si puo' disdire a pezzi: il giorno che Wellhub
     cambia prezzo o Claude si chiude, il numero resta quello e il pocket
     Fisse si scopre senza che niente lo dica. */
  return [
    r("affitto",      "Affitto",         85000, "fisse", 1),
    r("rata-auto",    "Rata prestito",   25000, "fisse", 25),
    r("wellhub",      "Wellhub",          3399, "fisse", 30),
    r("claude",       "Claude",           1800, "fisse", 27),
    r("windtre",      "WindTRE",           499, "fisse", 1),
    r("icloud",       "iCloud+",           299, "fisse", 9),
    // La bolletta arriva ogni due mesi e si accantona a quote: 150 ogni
    // due stipendi fa 75 al mese, ed e' la riga «quota bollette» del budget.
    r("utenze", "Gas, luce e acqua", 15000, "fisse", 31,
      { cadenza: "bimestrale", da: "2026-10-31", pocket: "fisse", sub: "Abbonamenti" }),
    // Bollo e assicurazione sono STIME, e restano modificabili anche a
    // configurazione bloccata: sono gli unici due numeri che l'app non puo'
    // sapere e che cambiano di anno in anno.
    r("assicurazione", "Assicurazione auto", 50000, "acc", 15,
      { cadenza: "semestrale", da: "2027-02-15", pocket: "ing", stima: true }),
    r("bollo", "Bollo auto", 36000, "acc", 31,
      { cadenza: "annuale", da: "2026-12-31", pocket: "ing", stima: true }),
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
  spesa: "necessario", auto: "necessario", cura: "necessario",
  cibo: "discrezionale", svago: "discrezionale", trasporti: "discrezionale",
};
export const CLASSI_SUB = {
  "auto|Manutenzione": "necessario",
  "auto|Carburante": "necessario",
  "auto|Lavaggio": "discrezionale",
  "auto|Multe": "discrezionale",

  "trasporti|Treno": "discrezionale",
  "trasporti|Mezzi urbani": "necessario",
};
export function classeDi(cat, sub) {
  return CLASSI_SUB[`${cat}|${sub}`] || CLASSE_CAT[cat] || "discrezionale";
}

export const SOGLIE_PREDEFINITE = {
  ingMinimo: 40000,      // sotto, il minimo PREVISTO di ING va in ambra
  catAvviso: 0.85,       // categoria all'85% del budget del ciclo
  spesaGrossa: 5000,     // sopra, il foglio chiede conferma
  // Sopra questa cifra un'uscita non alimentare e non prevista e' FUORI
  // PIANO. Non e' la stessa soglia di `spesaGrossa`: quella e' una
  // frizione al momento di registrare, questa e' una classificazione che
  // vale anche sui movimenti arrivati dall'estratto conto.
  fuoriPiano: 3000,
  // Sotto questa quota giornaliera la carta OGGI diventa rossa: non e' un
  // budget sforato, e' una giornata in cui non ci sta niente.
  quotaMinima: 1000,
  // Il pavimento del minimo PREVISTO di ING nei prossimi 12 mesi.
  ingPrevistoMin: 40000,
};

/* ------------------------------------------- da Personale a due ---------- */
/*
   LA DIVISIONE DI «PERSONALE», sui movimenti gia' registrati.

   Tre regole, e le prime due sono quelle che ci sono gia' costate care:

   1. SOLO DOPO AVER LETTO. Girare all'avvio su un archivio ancora vuoto
      vorrebbe dire segnarsi come fatta senza aver toccato niente, e poi il
      sync fa entrare duecento movimenti che a quel punto non rimappa piu'
      nessuno. Il gancio e' `canale.letturaFatta`, in contratto.js.
   2. `cats` E `profili` STANNO DENTRO `meta`, che si fonde a blocchi sotto
      il cancello di `metaUp`. Cambiarli nelle costanti serve solo a chi
      installa da zero: per l'archivio che esiste gia' vanno riscritti qui,
      e `metaUp` va alzato — altrimenti il prossimo pacchetto remoto li
      riporta a «personale».
   3. CHI HA GIA' UNA CATEGORIA NUOVA NON SI TOCCA. La rimappatura guarda
      solo `cat === "personale"`: ripassarci sopra non puo' spostare niente
      che tu abbia corretto a mano nel frattempo.

   Quello che non si riesce a classificare finisce in Svago SENZA
   sottocategoria e con `rivedi: true`: un badge nella lista, non un
   silenzio. Indovinare una sottocategoria per riempire una casella sarebbe
   il modo di non accorgersene mai piu'.
*/

export const BLOCCO_CATEGORIE = "2026-10-01-cura-svago";

/** Sottocategoria vecchia → [categoria, sottocategoria] nuove. */
const DA_PERSONALE = {
  "Barbiere": ["cura", "Barbiere"],
  "Cura personale": ["cura", "Igiene e cosmetica"],
  "Integratori": ["cura", "Integratori"],
  "Uscite e svago": ["svago", "Uscite e serate"],
  "Abbigliamento": ["svago", "Abbigliamento"],
  "Shopping": ["svago", "Shopping"],
  "Tech": ["svago", "Tech"],
  "Sport": ["svago", "Sport e attrezzatura"],
  "Regali": ["svago", "Regali"],
};

/* Per i movimenti SENZA sottocategoria, che sono tanti: si guarda la nota.
   L'ordine conta — la prima che combacia vince — quindi le piu' precise
   stanno prima. */
const DALLA_NOTA = [
  [/lavanderi/i,                      ["cura", "Lavanderia"]],
  [/medicin|farmaci|crem|redcare/i,   ["cura", "Farmacia e salute"]],
  [/stamp|sbobbin|libr/i,             ["cura", "Studio"]],
  [/booking|hotel|tassa di soggiorno/i, ["svago", "Viaggi e hotel"]],
  [/amazon|aliexpress|vinted/i,       ["svago", "Shopping"]],
];

export function dividiPersonale() {
  if (stato().config?.bloccoCategorie === BLOCCO_CATEGORIE) return false;

  const ora = Date.now();
  casella.aggiorna((s) => {
    // --- le categorie dell'archivio ---------------------------------------
    const nuove = categorieIniziali();
    const perId = new Map(nuove.map((c) => [c.id, c]));
    s.cats = (s.cats || [])
      .filter((c) => c.id !== "personale")
      .map((c) => perId.get(c.id) || c);
    for (const c of nuove) if (!s.cats.some((x) => x.id === c.id)) s.cats.push(c);

    // --- i movimenti -------------------------------------------------------
    for (const m of s.movs || []) {
      if (!m || m.del || m.cat !== "personale") continue;
      let dove = m.sub ? DA_PERSONALE[m.sub] : null;
      if (!dove) {
        const nota = String(m.nota || "");
        dove = (DALLA_NOTA.find(([re]) => re.test(nota)) || [])[1] || null;
      }
      if (dove) { m.cat = dove[0]; m.sub = dove[1]; delete m.rivedi; }
      else { m.cat = "svago"; m.sub = null; m.rivedi = true; }
      m.up = ora;
    }

    // --- i budget ----------------------------------------------------------
    s.profili = { ...(s.profili || {}), ...profiliIniziali() };
    delete s.profili.ago;              // Agosto e' obsoleto: via dalla scelta
    /* `cassaSettimanale: 0` = calcolalo dai budget. Era 140 scritto a mano
       e non c'entrava piu' niente con le categorie marcate cassa. */
    s.config = { ...(s.config || {}), entrate: 2041, cassaSettimanale: 0, bloccoCategorie: BLOCCO_CATEGORIE };

    // --- il ricorrente delle utenze ---------------------------------------
    for (const r of s.ricorrenti || []) {
      if (!r || r.del) continue;
      if (/gas|luce|acqua/i.test(String(r.nome || ""))) {
        r.cat = "fisse"; r.sub = "Abbonamenti"; r.pocket = "fisse"; r.up = ora;
      }
    }

    /* `metaUp` va alzato, o il prossimo pacchetto remoto riporta categorie e
       profili a com'erano: `meta` si fonde a blocchi e vince chi ha il
       timestamp piu' fresco. */
    s.metaUp = ora;
  });
  return true;
}

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
    !s.soglie || s.config?.giornoStipendio == null || (s.v || 0) < 7;
  // L'uscita anticipata è diventata un `if`: sotto c'è roba che deve girare
  // SEMPRE — `aggiungiContanti()` — e con il `return` non ci arrivava mai.
  if (serve) casella.aggiorna((st) => {
    if (!Array.isArray(st.pockets)) st.pockets = pocketIniziali();
    if (!Array.isArray(st.ricorrenti)) st.ricorrenti = ricorrentiIniziali();
    if (!st.soglie) st.soglie = { ...SOGLIE_PREDEFINITE };
    st.config = st.config || {};
    // Lo stipendio arriva il 23, non il 1. Tutti i calcoli di "quanto manca
    // alla fine del mese" usano il ciclo 23→22: con il mese solare i numeri
    // non tornavano mai, ed è il motivo per cui non tornavano. Il giorno
    // esatto lo aggiusta `dataStipendio()`: se il 23 cade nel fine
    // settimana, lo stipendio arriva il venerdi prima.
    if (st.config.giornoStipendio == null) st.config.giornoStipendio = 23;
    /* ZERO vuol dire «calcolalo»: il tetto settimanale lo ricava
       `tettoSettimanale()` dai budget marcati cassa. Un numero scritto a
       mano va in deriva — i budget cambiano e lui resta dov'era. */
    if (st.config.cassaSettimanale == null) st.config.cassaSettimanale = 0;
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

    /* --------------------------------------------------------------- v7 --
       Le caselle di v3: la lista d'attesa e l'obiettivo.

       Solo le caselle, vuote. I DATI li mette `allineaV3()`, che gira
       dopo la lettura del repo — qui siamo prima, e scrivere un obiettivo
       di fabbrica prima di aver letto vorrebbe dire sovrascriverne uno
       vero con uno a zero. Lo stesso motivo per cui la divisione delle
       categorie non sta qui.                                             */
    if (!Array.isArray(st.lista)) st.lista = [];
    if (st.config.chiusure == null) st.config.chiusure = {};
    if (st.config.sblocchi == null) st.config.sblocchi = [];
    st.v = 7;
  });

  // Gli aggiustamenti chiesti il 23 agosto 2026. Stanno FUORI dal blocco dei
  // campi nuovi e hanno un flag loro perché non sono una migrazione di
  // struttura ma un cambio di dati: se un domani l'affitto cambia ancora, lo
  // si cambia dall'interfaccia e questo non deve rimetterlo a 850.
  // Gli aggiustamenti restano legati a `serve`, esattamente com'erano.
  // Slegarli vorrebbe dire rimetterli in circolo su ogni avvio, e lì dentro
  // ci sono importi di fabbrica che a `up` pari batterebbero i tuoi.
  if (serve && !stato().config?.mig2608) casella.aggiorna(aggiustamenti2608);

  aggiungiContanti();
  aggiungiFondo();

}

/**
 * Il pocket del Fondo, se manca. Come `aggiungiContanti()`, e per lo stesso
 * motivo: un pocket in piu' si aggiunge a chiunque abbia l'archivio di
 * prima, e `up: 0` fa perdere questo zero contro qualunque saldo vero.
 */
function aggiungiFondo() {
  if ((stato().pockets || []).some((p) => p.id === "fondo")) return;
  casella.aggiorna((st) => {
    if (!Array.isArray(st.pockets)) return;
    if (st.pockets.some((p) => p.id === "fondo")) return;
    // Prima di ING, per lo stesso motivo dell'elenco di fabbrica.
    const i = st.pockets.findIndex((p) => p.id === "ing");
    st.pockets.splice(i < 0 ? st.pockets.length : i, 0, {
      id: "fondo", nome: "Fondo naso", tipo: "obiettivo",
      saldo: 0, ancoraDa: null, external: false, up: 0,
    });
  });
}

/* =========================================================================
   I TRAVASI A METÀ — il guasto del 19 settembre.

   Il modulo di inserimento mostrava il Principale come destinazione già
   scelta anche quando nei dati la destinazione era vuota (`pocketTo:
   null`). Salvando senza toccarla, un prelievo da ING usciva da ING e non
   entrava da nessuna parte: il 16 e il 18 settembre sono spariti così 22 e
   60 euro, e il Principale restava a −49 dopo il prelievo che doveva
   riportarlo sopra lo zero.

   Il modulo adesso non lo permette più. Questa funzione ripara quello che
   è già stato salvato così: un travaso o uno sforamento senza destinazione
   riceve il Principale, che è l'UNICA destinazione che quei movimenti
   possono avere — uno sforamento per definizione porta soldi da ING al
   Principale, un travaso dalla Cassa al Principale.

   È sicura da far girare a ogni avvio, e non ha bisogno di un segnalino di
   «già fatto»:
   - tocca SOLO record oggettivamente rotti, cioè con un estremo solo;
   - scrive l'unico valore possibile, quindi due dispositivi che la fanno
     girare insieme scrivono la stessa cosa;
   - una volta riparato il record non corrisponde più, quindi non la rifà;
   - se l'origine è già il Principale non indovina: lo lascia com'è, perché
     lì una destinazione giusta non esiste e inventarla sarebbe peggio.
   Il timbro `up` alzato è ciò che fa viaggiare la riparazione fino
   all'altro dispositivo invece di farla perdere nella fusione.
   ========================================================================= */
export function completaTravasi() {
  const rotti = (stato().movs || []).filter((m) => m && !m.del
    && (m.tipo === "giro" || m.tipo === "extra")
    && !m.pocketTo && m.pocket && m.pocket !== "principale");
  if (!rotti.length) return 0;
  const ids = new Set(rotti.map((m) => m.id));
  casella.aggiorna((st) => {
    for (const m of st.movs || []) {
      if (ids.has(m.id) && !m.pocketTo) { m.pocketTo = "principale"; m.up = Date.now(); }
    }
  });
  return rotti.length;
}

/* Il pocket Contanti, aggiunto agli archivi che non ce l'hanno.
     =======================================================================
     Sta FUORI dal blocco della migrazione e ha una guardia sua — «esiste?» —
     e non è pignoleria: alzare la soglia di `migra()` rimanda in esecuzione
     TUTTO il blocco su ogni dispositivo, e il 2 settembre è così che sono
     sparite le regole apprese e i check di due settimane. Un campo nuovo si
     aggiunge da solo, senza svegliare il resto.

     `up: 0` perché è un valore di fabbrica: nasce vuoto e deve perdere
     contro qualunque scrittura vera. Se il pocket arriva dall'altro
     dispositivo con un saldo dentro, quello vince e questo non lo tocca.

   I pocket si fondono per record, quindi basta che un dispositivo lo
   aggiunga: l'altro se lo trova alla prima lettura. */
function aggiungiContanti() {
  if (!(stato().pockets || []).some((p) => p.id === "contanti")) {
    casella.aggiorna((st) => {
      if (!Array.isArray(st.pockets)) return;
      if (st.pockets.some((p) => p.id === "contanti")) return;
      st.pockets.splice(1, 0, {
        id: "contanti", nome: "Contanti", tipo: "spendibile",
        saldo: 0, ancoraDa: null, external: false, up: 0,
      });
    });
  }
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
  // NIENTE `st.metaUp = Date.now()` qui, e la riga tolta vale una nota.
  // Questo blocco gira su ogni dispositivo dove manca `config.mig2608`,
  // cioè proprio su quello che ha la configurazione più povera: alzargli
  // `metaUp` voleva dire consegnargli il cancello del blocco meta e fargli
  // sovrascrivere quella buona dell'altro. Gli aggiustamenti sono valori di
  // fabbrica e ogni dispositivo se li applica da sé: non hanno bisogno di
  // vincere un confronto per propagarsi.
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
    // `up: 0`, NON `Date.now()`, ed è la riga che ha fatto ricomparire la
    // maxi rata in «In arrivo» quattro volte in tre giorni.
    //
    // Questo record è un valore di FABBRICA: lo scrive la migrazione, non
    // l'utente. Timbrandolo con l'ora di adesso, ogni dispositivo che
    // riparte con la memoria vuota lo rigenera `pagatoIl: null` col
    // timestamp più fresco che esista, e nella fusione batte quello vero
    // che dice «pagata il 30 agosto». Non è un dato che torna: è un dato
    // che ogni volta vince.
    //
    // `up: 0` vuol dire «questo valore non l'ha mai scritto nessuno», e
    // deve perdere contro qualunque scrittura vera. È la stessa regola che
    // vale già per i ricorrenti e per i pocket — qui era stata dimenticata.
    up: 0,
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

/* =========================================================================
   LA LISTA D'ATTESA.

   Sostituisce «Posso permettermelo?», e la differenza non e' estetica. Il
   simulatore rispondeva a una domanda che si fa davanti alla cassa, cioe'
   nel momento in cui la risposta non cambia piu' niente: si era gia'
   deciso, si cercava un permesso. Qui l'ordine e' invertito — prima si
   scrive, poi passano ventiquattro ore, poi si compra — e quelle
   ventiquattro ore sono l'unico meccanismo che ha mai fatto cambiare idea
   a qualcuno.

   E' anche l'UNICO modo di comprare sopra soglia senza finire in «Fuori
   piano»: la lista non e' un promemoria, e' il piano.

   Gli stati sono quattro, e uno dei quattro NON si scrive:
     attesa      da meno di 24 ore
     sbloccata   da piu' di 24 ore — CALCOLATO, vedi `statoVoce()`
     comprata    e' diventata un movimento
     scartata    lasciata perdere
   «Sbloccata» calcolato e non scritto perche' scriverlo vorrebbe dire
   scrivere qualcosa che cambia da se' col passare del tempo: servirebbe
   qualcuno che ci passi sopra a mezzanotte, e quel qualcuno non esiste.
   ========================================================================= */

export const ATTESA_ORE = 24;

export const vociLista = () => (stato().lista || []).filter((v) => v && !v.del);

/** Lo stato vero, col tempo dentro. */
export function statoVoce(v, adesso = Date.now()) {
  if (!v) return "scartata";
  if (v.stato && v.stato !== "attesa") return v.stato;
  return adesso - (v.ts || 0) >= ATTESA_ORE * 3600000 ? "sbloccata" : "attesa";
}

/** Quante ore mancano allo sblocco. Zero se e' gia' sbloccata. */
export const oreAttesa = (v, adesso = Date.now()) =>
  Math.max(0, Math.ceil(ATTESA_ORE - (adesso - (v.ts || 0)) / 3600000));

export function salvaVoce(v) {
  const ora = Date.now();
  casella.aggiorna((s) => {
    s.lista = s.lista || [];
    const i = s.lista.findIndex((x) => x.id === v.id);
    if (i >= 0) s.lista[i] = { ...s.lista[i], ...v, up: ora };
    else s.lista.push({ ts: ora, stato: "attesa", movId: null, ...v, up: ora });
  });
}

/** Lapide, non rimozione: senza, l'altro dispositivo la resuscita. */
export function eliminaVoce(id) {
  casella.aggiorna((s) => {
    const i = (s.lista || []).findIndex((x) => x.id === id);
    if (i >= 0) s.lista[i] = { id, del: true, up: Date.now() };
  });
}

export const cambiaStatoVoce = (id, nuovo, movId = null) =>
  salvaVoce({ id, stato: nuovo, ...(movId ? { movId } : {}) });

/* =========================================================================
   IL BLOCCO DELLA CONFIGURAZIONE.

   Budget, soglie, obiettivo e categorie si cambiano liberamente nelle 48
   ore dopo lo stipendio. Fuori da quella finestra servono due gesti e un
   motivo scritto.

   Non e' disciplina per il gusto della disciplina. Un budget che si puo'
   alzare nel momento in cui lo stai sforando non e' un budget: e' un campo
   di testo che registra quello che hai speso. La finestra dopo lo stipendio
   e' il momento in cui il budget si decide a freddo, coi numeri del mese
   appena chiuso davanti e nessuna spesa in sospeso.

   Lo sblocco NON e' per sempre: vale un'ora. Dopo si richiude da se',
   perche' uno sblocco permanente al primo strappo diventa la condizione
   normale e il blocco non esiste piu'.

   Bollo e assicurazione restano fuori dal blocco: sono stime che l'app non
   puo' sapere, e tenerle ferme vorrebbe dire proiettare ING su un numero
   che si sa falso.
   ========================================================================= */

export const ORE_LIBERE = 48;
const DURATA_SBLOCCO = 3600000;

/**
 * `{ bloccata, perche, fino }`. `perche` e' `"finestra"` dentro le 48 ore,
 * `"sblocco"` quando c'e' uno sblocco attivo.
 *
 * `ultimoStipendio` lo passa chi chiama — lo sa `calcolo.js` — perche' qui
 * importare `calcolo.js` chiuderebbe il giro degli import.
 */
export function statoConfig(ultimoStipendio, adesso = Date.now()) {
  const sblocco = Number(stato().config?.sbloccoFino) || 0;
  if (sblocco > adesso) return { bloccata: false, perche: "sblocco", fino: sblocco };
  const dallo = ultimoStipendio ? new Date(`${ultimoStipendio}T00:00:00`).getTime() : 0;
  const fino = dallo + ORE_LIBERE * 3600000;
  if (dallo && adesso < fino) return { bloccata: false, perche: "finestra", fino };
  return { bloccata: true, perche: null, fino: null };
}

/** Sblocca per un'ora e registra il motivo. Il motivo e' obbligatorio. */
export function sbloccaConfig(motivo, ciclo = null) {
  const testo = String(motivo || "").trim();
  if (!testo) return false;
  scriviMeta((s) => {
    s.config.sbloccoFino = Date.now() + DURATA_SBLOCCO;
    s.config.sblocchi = [...(s.config.sblocchi || []), { ts: Date.now(), motivo: testo, ciclo }]
      .slice(-50);
  });
  return true;
}

/** Quanti sblocchi in un ciclo. Va nel report settimanale. */
export const sblocchiDelCiclo = (ciclo) =>
  (stato().config?.sblocchi || []).filter((x) => x.ciclo === ciclo).length;

/* =========================================================================
   ALLINEAMENTO v3 — una volta sola, dopo la lettura.

   Fa tre cose, e sono tre cose diverse messe insieme solo perche' devono
   girare nello stesso istante:

   1. LA CONFIGURAZIONE. Budget di Vita, entrate 2041, giorno 23, obiettivo,
      soglie, ricorrenti veri. Stanno in `meta`, che si fonde a blocchi:
      cambiarli nelle costanti serve a chi installa da zero, per l'archivio
      che esiste vanno riscritti qui e `metaUp` va alzato.
   2. I MOVIMENTI DELL'ESTRATTO 1-7 OTTOBRE. Sei da aggiungere, quattro da
      correggere. Li cerca per data, importo e un pezzo di nota e NON per
      id, perche' gli id veri da qui non li conosce nessuno: quello che non
      trova lo lascia stare invece di indovinare.
   3. LE ANCORE DEI POCKET al 7 ottobre sera, scritte con `ancoraDa` all'8:
      l'ancora vale «quanto c'era all'inizio di quel giorno», quindi «fine
      del 7» e «inizio dell'8» sono lo stesso numero, e i movimenti del 7
      non vengono sottratti due volte.

   Gira una volta sola — il marchio e' `config.bloccoV3` — e DOPO la
   lettura del repo, per la ragione di sempre: una migrazione che scrive
   prima di aver letto si marca come fatta su un archivio vuoto, e poi i
   duecento movimenti che arrivano dal sync non li rimappa piu' nessuno.
   ========================================================================= */

export const BLOCCO_V3 = "2026-10-07-v3";

/** L'ancora dei pocket: «fine del 7 ottobre» = «inizio dell'8». */
const ANCORA_V3 = "2026-10-08";
const SALDI_V3 = { principale: 5710, contanti: 0, cassa: 12020, fisse: 302, fondo: 0, ing: 70976 };

/* I sei movimenti dell'estratto 1-7 ottobre che nell'app non c'erano. */
const DA_AGGIUNGERE = [
  { id: "v3-01", data: "2026-10-01", tipo: "out", imp: 140, nota: "Ars Vivendi",
    cat: "cibo", sub: "Bar e colazioni", pocket: "principale" },
  { id: "v3-02", data: "2026-10-03", tipo: "out", imp: 130, nota: "Bar Self Service Il Gi",
    cat: "cibo", sub: "Bar e colazioni", pocket: "principale" },
  { id: "v3-03", data: "2026-10-06", tipo: "out", imp: 3336, nota: "Amazon",
    cat: "svago", sub: "Shopping", pocket: "principale", fuoriPiano: true },
  { id: "v3-04", data: "2026-10-06", tipo: "out", imp: 7000, nota: "Tobia Franceschetti — nuoto",
    cat: "svago", sub: "Sport e attrezzatura", pocket: "principale", fuoriPiano: true },
  { id: "v3-05", data: "2026-10-07", tipo: "giro", imp: 6000, nota: "Cassa → Principale",
    cat: null, sub: null, pocket: "cassa", pocketTo: "principale" },
  { id: "v3-06", data: "2026-10-07", tipo: "in", imp: 11, nota: "Interessi Cassa 1–7 ott",
    cat: null, sub: null, pocket: "cassa", interessi: true },
];

/* LA RICARICA APPLE PAY CHE HA PAGATO IL MONITOR.

   Il monitor comprato il 6 non e' uscito da ING: e' uscito dal Principale
   dopo averlo ricaricato da ING. Registrarlo come uscita diretta da ING
   lasciava ING fermo — i pocket esterni li muovono solo `giro` ed `extra` —
   e il monitor fuori dal conto del Principale: due numeri sbagliati per un
   movimento solo.

   Qui c'e' solo la ricarica, che manca. L'uscita ESISTE GIA' e si CORREGGE
   sul posto (vedi sotto): aggiungerne una nuova e mettere la lapide su
   quella vecchia sembrava equivalente e non lo era — la firma
   `data|importo|nota` e' identica, quindi la nuova veniva scartata come
   doppione e la vecchia tombata, e il monitor spariva dal ciclo. */
const RICARICA_MONITOR = {
  id: "v3-07", data: "2026-10-06", tipo: "extra", imp: 10590,
  nota: "Ricarica Apple Pay *8595", cat: null, sub: null,
  pocket: "ing", pocketTo: "principale", pianificata: false,
};

/** Il primo movimento vivo che combacia per data, importo e un pezzo di nota. */
function trovaMov(movs, data, imp, frammento) {
  const f = normalizza(frammento);
  return (movs || []).find((m) => m && !m.del && m.data === data && m.imp === imp
    && normalizza(m.nota || "").includes(f));
}

export function allineaV3() {
  if (stato().config?.bloccoV3 === BLOCCO_V3) return false;

  const ora = Date.now();
  casella.aggiorna((s) => {
    s.movs = s.movs || [];
    const firme = new Set(s.movs.filter((m) => m && !m.del)
      .map((m) => `${m.data}|${m.imp}|${normalizza(m.nota || "")}`));

    /* --- 1. la configurazione ------------------------------------------ */
    s.profili = { ...(s.profili || {}), ...profiliIniziali() };
    s.config = {
      ...(s.config || {}),
      entrate: 2041,
      giornoStipendio: 23,
      cassaSettimanale: 0,
      obiettivo: s.config?.obiettivo || { ...OBIETTIVO_INIZIALE },
      versamenti: { ...VERSAMENTI },
      eccezioni: { ...ECCEZIONI_STIPENDIO, ...(s.config?.eccezioni || {}) },
      chiusure: s.config?.chiusure || {},
      sblocchi: s.config?.sblocchi || [],
      bloccoV3: BLOCCO_V3,
    };
    /* Le soglie di v3 si scrivono, non si ripiegano: `{...fabbrica,
       ...archivio}` lascerebbe `fuoriPiano` a quello che c'e' nell'archivio,
       cioe' a niente, e un `undefined` come soglia classifica tutto come
       fuori piano. */
    s.soglie = {
      ...SOGLIE_PREDEFINITE,
      ...(s.soglie || {}),
      ingMinimo: SOGLIE_PREDEFINITE.ingMinimo,
      fuoriPiano: SOGLIE_PREDEFINITE.fuoriPiano,
      quotaMinima: SOGLIE_PREDEFINITE.quotaMinima,
      ingPrevistoMin: SOGLIE_PREDEFINITE.ingPrevistoMin,
    };

    /* I RICORRENTI: si sostituisce l'elenco, con le lapidi su quelli che
       non esistono piu'. Lasciarli e spegnerli non basta — un ricorrente
       spento resta nella lista delle impostazioni e si riaccende per
       sbaglio — e togliere il record senza lapide lo farebbe resuscitare
       dall'altro dispositivo al primo sync. */
    const nuovi = ricorrentiIniziali();
    const idNuovi = new Set(nuovi.map((r) => r.id));
    const vecchi = new Map((s.ricorrenti || []).map((r) => [r.id, r]));
    s.ricorrenti = [
      // `pagato` e' storia dell'utente e non si riscrive.
      ...nuovi.map((r) => ({ ...r, pagato: vecchi.get(r.id)?.pagato ?? null, up: ora })),
      ...(s.ricorrenti || [])
        .filter((r) => r && !r.del && !idNuovi.has(r.id))
        .map((r) => ({ id: r.id, del: true, up: ora })),
    ];

    /* ALIEXPRESS: ne resta una, il 1 novembre, ed e' la terza. Quella del
       1/10 era registrata «1/3» quando era la 2/3, e quella del 1/12 non
       esiste perche' le rate sono tre e la terza cade a novembre. */
    s.previsti = (s.previsti || []).map((x) => {
      if (!x || x.del || !/aliexpress/i.test(String(x.nome || ""))) return x;
      if (x.quando === "2026-11-01") {
        return { ...x, nome: "3/3 Rata AliExpress", pocket: "fisse", up: ora };
      }
      if (x.quando === "2026-12-01") return { id: x.id, del: true, up: ora };
      return x;
    });
    const resta3 = s.previsti.some((x) => x && !x.del && x.quando === "2026-11-01"
      && /aliexpress/i.test(String(x.nome || "")));
    if (!resta3) {
      s.previsti.push({
        id: "v3-aliexpress-3", nome: "3/3 Rata AliExpress", imp: 1861,
        quando: "2026-11-01", pocket: "fisse", cat: "fisse",
        nota: "Ultima delle tre. Da confermare sull'app del pagamento a rate.",
        pagatoIl: null, up: ora,
      });
    }

    /* --- 2. i movimenti dell'estratto ---------------------------------- */
    for (const m of [...DA_AGGIUNGERE, RICARICA_MONITOR]) {
      const firma = `${m.data}|${m.imp}|${normalizza(m.nota)}`;
      if (firme.has(firma)) continue;
      s.movs.push({ rif: null, ecc: false, pocketTo: null, ...m, ts: ora, up: ora });
      firme.add(firma);
    }

    // Il bar del 2 ottobre: 3,51 sull'app, 3,50 sull'estratto.
    const bar = trovaMov(s.movs, "2026-10-02", 351, "circolo");
    if (bar) { bar.imp = 350; bar.up = ora; }

    /* Il monitor: l'uscita c'e' gia', esce dal pocket sbagliato. Si
       corregge sul posto — la ricarica che la paga l'ha aggiunta il ciclo
       sopra — e si marca `pending`, perche' il 7 ottobre non era ancora
       passata sull'estratto. */
    const monitor = s.movs.find((m) => m && !m.del && m.tipo === "out"
      && m.imp === 10590 && !String(m.id).startsWith("v3-"));
    if (monitor) {
      monitor.pocket = "principale";
      monitor.cat = "svago";
      monitor.sub = "Tech";
      monitor.pending = true;
      monitor.fuoriPiano = true;
      monitor.up = ora;
    } else {
      s.movs.push({
        id: "v3-08", data: "2026-10-06", tipo: "out", imp: 10590, nota: "Monitor PC",
        cat: "svago", sub: "Tech", pocket: "principale", pocketTo: null,
        pending: true, fuoriPiano: true, rif: null, ecc: false, ts: ora, up: ora,
      });
    }

    // La rata del 1 ottobre era la seconda, non la prima.
    const rata = s.movs.find((m) => m && !m.del && m.data === "2026-10-01"
      && /aliexpress/i.test(String(m.nota || "")));
    if (rata) { rata.nota = "2/3 Rata AliExpress"; rata.up = ora; }

    // La patente droni del 29 settembre: fuori piano, e non lo diceva.
    const droni = s.movs.find((m) => m && !m.del && /droni/i.test(String(m.nota || "")));
    if (droni) { droni.fuoriPiano = true; droni.up = ora; }

    /* --- 3. le ancore -------------------------------------------------- */
    for (const p of s.pockets || []) {
      if (!p || SALDI_V3[p.id] === undefined) continue;
      p.saldo = SALDI_V3[p.id];
      p.ancoraDa = ANCORA_V3;
      p.up = ora;
    }

    s.metaUp = ora;
    s.profiliUp = ora;
  });

  /* Le due voci iniziali della lista d'attesa. Fuori dal blocco di sopra
     perche' `salvaVoce` e' la via normale e qui non serve altro: se ci sono
     gia' (il sync le ha portate) non si rifanno. */
  const ids = new Set(vociLista().map((v) => v.id));
  if (!ids.has("v3-stampante")) {
    salvaVoce({ id: "v3-stampante", nome: "Stampante Brother + toner", imp: 12475 });
  }
  if (!ids.has("v3-profumo")) {
    salvaVoce({ id: "v3-profumo", nome: "Profumo Mancera", imp: 9548 });
  }
  return true;
}

/* ========================================================================
   LE SOTTOCATEGORIE CHE MANCAVANO — 10 ottobre 2026

   I cinque gruppi di `gruppi.js` sanno dire dove vanno i soldi, ma il
   grafico dentro un gruppo si legge per sottocategoria, e li' l'archivio
   aveva quattro buchi che rendevano illeggibile la meta' piu' grossa:

   - sette movimenti in categoria Fisse senza sottocategoria, cioe'
     «Altro · Fisse · 7 volte · 1.528 €»: il blocco piu' grande del ciclo
     e dentro non c'era scritto niente;
   - il Telepass in categoria Fisse, che non e' una spesa fissa: e' un
     pedaggio, e ING lo copre;
   - «Patente Droni» senza sottocategoria, perche' «Corsi» non esisteva;
   - la rata AliExpress senza legame col suo pagamento differito, quindi
     indistinguibile da una spesa decisa stamattina.

   Gira UNA VOLTA SOLA (il marchio e' `config.bloccoGruppi`) e DOPO la
   lettura del repo, per la ragione di sempre: una migrazione che scrive
   prima di aver letto si marca come fatta su un archivio vuoto, e i
   movimenti che arrivano dopo dal sync non li rimappa piu' nessuno.

   Assegna solo CATEGORIA e SOTTOCATEGORIA. Non tocca gli importi, non
   tocca i pocket, non tocca le date: un pocket sbagliato sposta dei saldi,
   e un saldo lo si corregge guardando l'estratto, non indovinando.
   ======================================================================== */

export const BLOCCO_GRUPPI = "2026-10-10-gruppi";

/* Da che pezzo di nota si riconosce una spesa fissa. L'ordine conta: la
   prima che combacia vince, e «rata» sta prima di tutto perche' una nota
   come «Rata prestito auto» contiene anche «auto». */
const SUB_FISSE = [
  [/\b(rata|prestito|finanziament)/, "Prestito"],
  [/\b(affitto|canone|locazione|agenzia)/, "Affitto"],
  [/\b(windtre|wind tre|wind|iliad|vodafone|tim|ho mobile|fastweb)\b/, "Telefono"],
  [/(icloud|claude|wellhub|netflix|spotify|abbonament|apple one|chatgpt|youtube|prime|disney)/, "Abbonamenti"],
];

/** La sottocategoria di una spesa fissa, dedotta dalla nota. `null` se non si sa. */
function subFisse(nota) {
  const n = normalizza(nota);
  for (const [re, sub] of SUB_FISSE) if (re.test(n)) return sub;
  return null;
}

export function sistemaGruppi() {
  if (stato().config?.bloccoGruppi === BLOCCO_GRUPPI) return false;

  const ora = Date.now();
  casella.aggiorna((s) => {
    s.cats = s.cats || [];
    s.movs = s.movs || [];
    s.previsti = s.previsti || [];

    /* --- 1. «Corsi»: la sottocategoria che mancava a Svago ------------- */
    const svago = s.cats.find((c) => c.id === "svago");
    if (svago && Array.isArray(svago.sub) && !svago.sub.includes("Corsi")) {
      svago.sub = [...svago.sub, "Corsi"];
    }

    for (const m of s.movs) {
      if (!m || m.del || m.tipo !== "out") continue;
      const n = normalizza(m.nota);

      /* --- 2. IL TELEPASS NON E' UNA SPESA FISSA ---------------------- */
      if (n.includes("telepass") && m.cat === "fisse") {
        m.cat = "auto";
        m.sub = "Pedaggio";
        m.up = ora;
        continue;
      }

      /* --- 3. «Patente Droni» e i corsi ------------------------------- */
      if (!m.sub && (n.includes("patente droni") || n.includes("corso"))) {
        m.cat = "svago";
        m.sub = "Corsi";
        m.up = ora;
        continue;
      }

      /* --- 4. LE FISSE SENZA SOTTOCATEGORIA --------------------------- */
      if (m.cat === "fisse" && !m.sub) {
        const sub = subFisse(m.nota);
        if (sub) { m.sub = sub; m.up = ora; }
      }
    }

    /* --- 5. LA RATA ALIEXPRESS 2/3 ------------------------------------
       Non e' una spesa fissa anche se esce dalla tasca delle bollette: e'
       una cosa comprata a giugno che si paga a rate. Il legame con un
       previsto e' l'unica cosa che lo dice — il pocket, da solo, mente.

       Il previsto nasce gia' `pagatoIl`: serve allo storico e al
       raggruppamento, non a «In arrivo», dove una rata del 1 ottobre
       comparirebbe come scaduta. */
    const rata2 = s.movs.find((m) => m && !m.del && m.tipo === "out"
      && normalizza(m.nota).includes("aliexpress") && m.data >= "2026-09-23" && !m.pian);
    if (rata2) {
      if (!s.previsti.some((p) => p && p.id === "v3-aliexpress-2")) {
        s.previsti.push({
          id: "v3-aliexpress-2", nome: "2/3 Rata AliExpress", imp: rata2.imp,
          quando: rata2.data, pocket: rata2.pocket || "fisse", cat: rata2.cat || "fisse",
          nota: "Pagamento differito in tre rate.", pagatoIl: rata2.data, up: ora,
        });
      }
      rata2.pian = "v3-aliexpress-2";
      rata2.up = ora;
    }

    s.config = { ...(s.config || {}), bloccoGruppi: BLOCCO_GRUPPI };
    s.metaUp = ora;
  });
  return true;
}

/* ------------------------------------------------- i travasi della paga -- */
/*
   Quali dei quattro travasi del giorno di paga sono stati fatti.

   Sta in `config.pagaFatta` come mappa `data dello stipendio → [id]`, non
   come lista di record: non serve una lapide, perche' due dispositivi che
   dicono «il travaso al fondo e' fatto» non hanno un conflitto da
   risolvere. Si unisce come i check, e per lo stesso motivo — e' storia,
   si aggiunge e non si toglie.
*/

export function segnaTravaso(dataStip, id) {
  scriviMeta((s) => {
    const m = { ...(s.config.pagaFatta || {}) };
    const fatti = new Set(m[dataStip] || []);
    fatti.add(id);
    m[dataStip] = [...fatti];
    // Dodici stipendi bastano: oltre e' archeologia.
    const chiavi = Object.keys(m).sort().slice(-12);
    s.config.pagaFatta = Object.fromEntries(chiavi.map((k) => [k, m[k]]));
  });
}

/* ---------------------------------------- le chiusure settimanali ------- */
/*
   Una chiusura e' la domenica in cui hai riconciliato l'estratto conto.
   Mappa `iso della domenica → { ts, saldoIng }`, stessa logica dei check.

   Il contatore «settimane chiuse di fila» e' l'unica cosa che ha fatto
   sopravvivere questo rito: un numero che cresce lo si difende, un
   promemoria lo si ignora.
*/

export const chiusuraFatta = (iso) => Boolean((stato().config?.chiusure || {})[iso]);

export function segnaChiusura(iso, saldoIng = null) {
  scriviMeta((s) => {
    const c = { ...(s.config.chiusure || {}), [iso]: { ts: Date.now(), saldoIng } };
    const chiavi = Object.keys(c).sort().slice(-60);
    s.config.chiusure = Object.fromEntries(chiavi.map((k) => [k, c[k]]));
  });
}

/** Da quante domeniche di fila chiudi la settimana. */
export function serieChiusure(domenica) {
  const c = stato().config?.chiusure || {};
  const giorno = (n) => new Date(new Date(`${domenica}T12:00:00`).getTime() - n * 7 * 86400000)
    .toISOString().slice(0, 10);
  let n = 0;
  for (let k = c[domenica] ? 0 : 1; k < 60; k++) {
    if (!c[giorno(k)]) break;
    n++;
  }
  return n;
}
