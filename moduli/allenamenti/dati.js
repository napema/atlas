// moduli/allenamenti/dati.js — il blocco, e quello che è successo davvero.
//
// LA DIVISIONE CHE REGGE TUTTO IL MODULO: il piano è CODICE, il resto è DATI.
//
// Le settimane stanno qui sotto come costante. Non vengono seminate
// nell'archivio, non si sincronizzano, non possono essere sovrascritte da un
// dispositivo appena installato — perché non sono un dato dell'utente, sono
// il programma scritto dal suo allenatore. Tutta la classe di guasti che ha
// morso ATLAS quattro volte (un valore di fabbrica con un `up` fresco che
// batte la scrittura vera) qui non può nemmeno presentarsi.
//
// Nell'archivio ci va solo quello che succede: le spunte, i giorni scelti e
// le corse importate. Quelli sì hanno `id`, `up` e lapidi, come vuole
// core/sync.js.

import { apriCasella } from "../../core/storage.js";
import { daISO, piuGiorni, oggiISO } from "../../core/ui.js";

/* =========================================================================
   IL BLOCCO — 7 settimane.

   PARTE LUNEDÌ 14 SETTEMBRE, non il 15 come diceva il foglio. Non è un
   capriccio: il 15 era un martedì, e far partire la settimana 1 di martedì
   avrebbe spezzato in due ogni conteggio settimanale. Dal 14 le settimane
   sono lunedì→domenica pulite.

   ERANO TREDICI, fino al test di dicembre. Il test è stato anticipato a
   fine ottobre e il blocco si è accorciato a sette: la 7 finisce domenica
   1 novembre, con il test dentro. Le settimane 1 e 2 sono rimaste quelle
   che erano — sono passate, e riscrivere il passato perché somigli al
   piano nuovo vuol dire perdere cosa hai fatto davvero.

   I SEI SLOT NON HANNO UN GIORNO, ed è il piano a volerlo: «3 corse + 3
   palestre a settimana, giorni liberi. Domenica pianifichi la settimana e
   piazzi i 6 slot». Quindi qui non c'è una griglia lunedì-domenica da
   riempire: c'è una settimana con sei caselle, e quando farle lo decidi tu.
   Il giorno, se lo scegli, è un dato tuo e sta nell'archivio.
   ========================================================================= */

export const INIZIO = "2026-10-05";
/* SETTE, non tredici. Il test dei 5 km e' stato anticipato a fine ottobre:
   il blocco si accorcia, non si comprime. Le settimane 1 e 2 restano quelle
   che sono — sono passate, e riscrivere il passato per farlo somigliare al
   piano nuovo vuol dire perdere cosa hai fatto davvero. */
export const SETTIMANE = 4;

/* La firma del blocco. Cambiala e il reset riparte UNA volta sola, su ogni
   dispositivo, dopo che ha letto. Vedi `resetBlocco()`. */
export const BLOCCO = "2026-10-05-fase5k";

/* 22:00, non 20:00. Il sub-20 era l'obiettivo del blocco di tredici
   settimane: su quattro settimane sarebbe un numero che fa sembrare un
   fallimento una corsa andata bene. 21:30 resta il tetto che si prova a
   toccare, e sta nel testo del test. */
export const OBIETTIVO = {
  nome: "5 km in 22:00",
  passo: "4:24/km",
  secondi: 22 * 60,
  metri: 5000,
};

export const ZONE = {
  z2: { nome: "Z2 facile", fc: "140–152" },
  z3: { nome: "Z3 soglia", fc: "158–172" },
};

export const REGOLE = [
  "80% della corsa lenta",
  "una sola qualità a settimana",
  "tetto +10% km a settimana",
  "riscaldamento 15' prima di ogni qualità",
  "test sempre da freschi e per primi",
  "sere difficili: lift principale + secondo compound e a casa — si taglia l'ipertrofia, mai la forza",
];

export const VINCOLO =
  "Mai palestra gambe il giorno prima della qualità. La lunga invece tollera le gambe stanche: è in Z2.";

/* Gli accessori delle prime due settimane: lì cambiava solo il carico del
   lift principale, e tenerli una volta sola invece di ricopiarli era la
   forma che rendeva visibile la progressione. Dalla 3 in poi cambiano anche
   serie e accessori, e ogni settimana scrive la sua seduta per esteso in
   `palestra` — vedi `slotDi()`. Questi restano perché la 1 e la 2 sono
   storico e si leggono ancora. */
export const PALESTRA = {
  lower: {
    nome: "Lower",
    lift: "Stacco 5×3",
    accessori: ["Hack squat 4×8", "Leg curl 3×12", "Affondi 3×12", "Polpacci 4×15", "Tibialis 3×20"],
  },
  upper: {
    /* «Upper A» perche' adesso esiste una Upper B, che pero' e' un bonus e
       non un quarto slot del programma. La CHIAVE resta `upper`: da lei
       dipende l'id dello slot (`s03-upper`), e dall'id dipendono le spunte
       che hai gia' dato. Cambiarla avrebbe azzerato la settimana in corso. */
    nome: "Upper A",
    lift: "Panca 5×5",
    accessori: ["Trazioni 8×50%max", "Military manubri 3×10", "Rematore 3×10", "Alzate 4×15", "Curl+Pushdown"],
  },
  total: {
    nome: "Total",
    lift: "Squat 5×5",
    accessori: ["Panca incl. manubri 4×9", "RDL 3×10", "Lat machine 3×12", "Dip 3×9", "Leg raise 4×12"],
  },
};

/* FASE 5K: quattro corse, e l'ordine conta — e' quello in cui pesano. Gli
   intervalli e la soglia sono le due sedute che fanno il tempo, la facile e
   la lunga quelle che lo reggono. */
export const CORSA = { intervalli: "Intervalli", soglia: "Soglia", facile: "Facile", lunga: "Lunga" };
export const ORDINE_CORSA = ["intervalli", "soglia", "facile", "lunga"];

/** Il nome della fase, in testa alla schermata. */
export const FASE = "FASE 5K";

/** Il giorno del test. Si cambia in Impostazioni. */
export const DATA_TEST = "2026-10-31";
export const dataTest = () => stato().config?.dataTest || DATA_TEST;

/* I ritmi della fase, una volta sola: li legge la card «Ritmi» e li legge
   chi vuole sapere cosa vuol dire «facile» alle sei di mattina. */
export const RITMI = [
  { id: "facile", nome: "Facile", passo: "6:10-6:40/km", nota: "FC ≤ 155. Devi poter parlare a frasi intere." },
  { id: "soglia", nome: "Soglia", passo: "4:52-4:55/km", nota: "Frasi di tre o quattro parole, non di più." },
  { id: "intervalli", nome: "Intervalli", passo: "4:18-4:20/km", nota: "La seduta che fa il tempo." },
  { id: "gara", nome: "Ritmo gara", passo: "4:22-4:24/km", nota: "Quello del test: 22:00 sui 5 km." },
];

/* Le regole della fase. Stanno nei dati e non nella vista perche' sono il
   programma, non un testo di contorno: chi cambia il piano le cambia qui. */
export const REGOLE_FASE = [
  "Mai Lower il giorno prima di Intervalli o Soglia. Meglio il giorno dopo una corsa dura.",
  "Almeno un giorno fra Intervalli e Soglia.",
  "Facile vuol dire FC ≤ 155 e conversazione possibile. Il passo è quello che esce.",
  "Se chiudi l'ultima ripetuta con due ripetute di margine, la settimana dopo −3 s/km.",
  "Dolore localizzato che peggiora o cambia la corsa: stop, e la seduta diventa facile.",
  "Serata storta in palestra: il primo esercizio pesante e a casa. Mai zero.",
];
export const ORDINE_PALESTRA = ["lower", "upper"];

/** I km previsti di uno slot a tempo: minuti ÷ passo. Serve al conteggio. */
const kmDaTempo = (minuti, passoMinKm) => Math.round((minuti / passoMinKm) * 10) / 10;

export const PIANO = [
  /* FASE 5K — quattro settimane, dal 5 ottobre al test del 31.

     Quattro corse e due palestre. Ogni seduta e' scritta per esteso: in una
     fase cosi' corta non c'e' una progressione di carico da rendere
     visibile, c'e' una sequenza da seguire. */

  { n: 1, fase: "Costruzione",
    corsa: {
      intervalli: { testo: "15' risc + 4 allunghi · 5×800 m @ 4:20/km rec 2' trotto · 10' defat", km: 7.6 },
      soglia: { testo: "12' risc · 3×7' @ 4:55/km rec 2' trotto · 8' defat", km: 7 },
      facile: { testo: "30' FC ≤155 + 6 allunghi da 20\"", km: 4.8 },
      lunga: { testo: "8,2 km FC ≤155", km: 8.2 },
    },
    palestra: {
      lower: "Squat 4×4 @ RPE 8 rec 3' · RDL 3×6 @ RPE 7-8 · Bulgarian split squat 3×6/gamba · Pogo jump 3×20 · Polpacci seduto 3×12 pesante · Tibialis 3×20",
      upper: "Panca 5×5 @ 45 kg · Trazioni 8×50% max · Military manubri 3×10 · Rematore manubrio 3×10 · Alzate 4×15 · Curl + Pushdown",
    } },

  { n: 2, fase: "Picco",
    corsa: {
      intervalli: { testo: "15' risc + 4 allunghi · 5×1000 m @ 4:20/km rec 2' trotto · 10' defat", km: 8.6 },
      soglia: { testo: "12' risc · 2×12' @ 4:52/km rec 2' trotto · 8' defat", km: 7.7 },
      facile: { testo: "35' FC ≤155 + 6 allunghi da 20\"", km: 5.7 },
      lunga: { testo: "9 km FC ≤155 · ultimo km progressivo", km: 9 },
    },
    palestra: {
      lower: "Squat 4×4 @ RPE 8 (+2,5 kg se la settimana 1 è stata pulita) · RDL 3×6 · Bulgarian split squat 3×6/gamba · Pogo jump 3×20 · Polpacci seduto 3×12 · Tibialis 3×20",
      upper: "Panca 5×5 @ 47,5 kg · Trazioni 8×50% max · Military manubri 3×10 · Rematore manubrio 3×10 · Alzate 4×15 · Curl + Pushdown",
    } },

  { n: 3, fase: "Taper",
    corsa: {
      intervalli: { testo: "15' risc + 4 allunghi · 3×1600 m @ 4:22/km rec 2'30\" trotto · 10' defat", km: 8.4 },
      soglia: { testo: "12' risc · 15' continui @ 4:52/km · 8' defat", km: 6 },
      facile: { testo: "30' FC ≤155 + 4 allunghi da 20\"", km: 4.7 },
      lunga: { testo: "7 km FC ≤155", km: 7 },
    },
    palestra: {
      lower: "Squat 3×3 @ RPE 7 · RDL 2×6 · Polpacci seduto 2×12 · Tibialis 2×20 · niente pogo",
      upper: "Panca 4×5 @ 47,5 kg · Trazioni 6×50% max · Military manubri 2×10 · Rematore manubrio 2×10 · Alzate 3×15",
    } },

  { n: 4, fase: "Test", test: true,
    corsa: {
      intervalli: { testo: "3 giorni prima del test · 12' risc · 4×400 m @ 4:10/km rec 90\" · 5' defat", km: 4.5 },
      soglia: { testo: "Giorno prima del test · 15-20' facilissimi + 3 allunghi", km: 3 },
      facile: { testo: "2 giorni prima del test · 25' FC ≤155 + 4 allunghi", km: 4 },
      lunga: { testo: "TEST 5000 m · 15' risc + 4 allunghi · 5 km @ 4:24/km · 10' defat", km: 8.5, stella: true },
    },
    palestra: {
      lower: "NIENTE GAMBE nei 5 giorni prima del test",
      upper: "Inizio settimana · Panca 3×5 al 70% · Trazioni 3×5 · Alzate 3×15",
    },
    avvertenza: "Niente gambe nei 5 giorni prima del test. Nessuno stacco, nessuno squat, nessun affondo." },
];

/* ------------------------------------------------------------- archivio -- */

export const PREDEFINITO = {
  v: 1,
  // Le spunte e i giorni scelti, uno per slot. `id` = "s03-lunga".
  slot: [],
  // Le corse importate. `id` deriva da data+metri, quindi reimportare lo
  // stesso file non duplica niente.
  corse: [],
  /* LE SETTIMANE IMPORTATE. Una per record, `id` = "w03".
     Quando c'è, SOSTITUISCE il blocco per quella settimana: se importi tre
     allenamenti quella settimana ne ha tre, non tre più i sei del piano.
     Vedi `slotDi()`. */
  settimane: [],
  /* GLI ALLENAMENTI IN PIU'. Fuori dal programma per costruzione: il piano
     e' codice e non si tocca da dentro l'app, questi invece nascono da un
     tocco e vanno da qualche parte. `id` = "b03-<chiave>". */
  bonus: [],
  config: { inizio: INIZIO },
  configUp: 0,
};

export const casella = apriCasella("allenamenti", PREDEFINITO);
export const stato = () => casella.leggi();

export const inizioBlocco = () => stato().config?.inizio || INIZIO;

/* -------------------------------------------------------------- le date -- */

/* LA PRIMA SETTIMANA PUO' ESSERE CORTA.

   Finche' il blocco partiva di lunedi', «settimana n» era `INIZIO + (n-1)×7`
   e bastava. Un blocco che parte di mercoledi' no: o la settimana 1 finisce
   la domenica — e allora dura cinque giorni — oppure tutte le settimane
   successive cadono a meta' settimana vera, e il lunedi' in cui pianifichi
   non coincide piu' con l'inizio di niente.

   Quindi: la settimana 1 va da `INIZIO` alla prima domenica compresa; dalla
   2 in poi sono lunedi'→domenica pulite. Se `INIZIO` e' gia' un lunedi' la
   regola non cambia niente — la prima domenica e' sei giorni dopo — ed e'
   per questo che si puo' mettere prima di spostare la data. */

/** La prima domenica a partire da `iso` compresa. */
const domenicaDa = (iso) => {
  const d = daISO(iso);
  const dow = (d.getDay() + 6) % 7;        // 0 = lunedì … 6 = domenica
  return piuGiorni(iso, 6 - dow);
};

export const fineSettimana = (n) =>
  n <= 1 ? domenicaDa(inizioBlocco())
         : piuGiorni(domenicaDa(inizioBlocco()), (n - 1) * 7);

export const inizioSettimana = (n) =>
  n <= 1 ? inizioBlocco() : piuGiorni(fineSettimana(n - 1), 1);

/** In quale settimana del blocco cade `iso`? `null` se fuori. */
export function settimanaDi(iso = oggiISO()) {
  if (iso < inizioBlocco()) return null;
  const prima = domenicaDa(inizioBlocco());
  if (iso <= prima) return 1;
  const giorni = Math.floor((daISO(iso) - daISO(prima)) / 86400000);
  const n = Math.ceil(giorni / 7) + 1;
  return n <= SETTIMANE ? n : null;
}

/** La settimana da mostrare: quella di oggi, o la prima/l'ultima se sei fuori. */
export function settimanaCorrente(iso = oggiISO()) {
  return settimanaDi(iso) || (iso < inizioBlocco() ? 1 : SETTIMANE);
}

export const pianoDi = (n) => PIANO.find((s) => s.n === n) || null;

/* -------------------------------------------------------------- gli slot -- */

/** L'id di uno slot. Deterministico: due dispositivi scrivono lo stesso. */
export const idSlot = (n, chiave) => `s${String(n).padStart(2, "0")}-${chiave}`;

const carico = (kg) => String(kg).replace(".", ",");

/** La settimana importata per `n`, se c'è. */
export const settimanaImportata = (n) =>
  (stato().settimane || []).find((w) => w.id === idSettimana(n) && !w.del) || null;

export const idSettimana = (n) => `w${String(n).padStart(2, "0")}`;

/** Nome → chiave stabile, per gli id degli slot. */
export function chiaveNome(nome) {
  return String(nome || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
    .slice(0, 28) || "voce";
}

/**
 * Gli slot di una settimana.
 *
 * DUE SORGENTI, e l'ordine conta. Se quella settimana è stata importata,
 * sono gli allenamenti importati e basta: tre righe fanno tre allenamenti.
 * Prima non era così — il piano aveva sei slot fissi (facile, qualità,
 * lunga, lower, upper, total) e l'import poteva solo COPRIRLI, quindi
 * importarne tre lasciava gli altri tre del blocco sotto, e la settimana
 * diceva sei allenamenti a chi ne aveva programmati tre. Le sei parole
 * erano anche una gabbia: un fartlek, un giro in bici, un full body non
 * avevano una casella dove entrare.
 *
 * Senza import resta il blocco delle tredici settimane, che è il piano
 * scritto a mano e va benissimo finché lo segui.
 */
export function slotDi(n) {
  const w = settimanaImportata(n);
  if (w) {
    return (w.voci || []).map((v, i) => conScostamento({
      id: idSlot(n, v.chiave || chiaveNome(v.nome) || `v${i}`),
      sett: n,
      genere: v.genere || "altro",
      chiave: v.chiave || chiaveNome(v.nome),
      nome: v.nome,
      testo: v.testo || "",
      km: v.km || 0,
      stella: Boolean(v.stella),
      importato: true,
    }));
  }
  const p = pianoDi(n);
  if (!p) return [];
  const fuori = [];
  /* Solo le corse che la settimana prevede davvero: nella settimana del
     test non ce ne sono quattro, e una casella vuota con dentro «—» e'
     peggio di nessuna casella. */
  for (const k of ORDINE_CORSA) {
    const c = p.corsa?.[k];
    if (!c) continue;
    fuori.push(conScostamento({
      id: idSlot(n, k), sett: n, genere: "corsa", chiave: k,
      nome: CORSA[k], testo: c.testo, km: c.km, stella: Boolean(c.stella),
    }));
  }
  for (const k of (p.soloPalestra || ORDINE_PALESTRA)) {
    const g = PALESTRA[k];
    /* Se la settimana scrive la seduta per esteso vince lei, e il lift con
       gli accessori fissi non si disegna: sono due modi di dire la stessa
       cosa, e messi insieme la dicono due volte. */
    const suo = p.palestra?.[k];
    fuori.push(conScostamento({
      id: idSlot(n, k), sett: n, genere: "palestra", chiave: k,
      nome: p.nomi?.[k] || g.nome,
      ...(suo
        ? { lift: null, accessori: [], testo: suo }
        : {
            lift: p.carichi ? `${g.lift} @ ${carico(p.carichi[k])} kg` : `${g.lift} @ mantieni`,
            accessori: p.palestraTest ? [] : g.accessori,
            testo: p.palestraTest || null,
          }),
      km: 0,
    }));
  }
  /* I BONUS IN FONDO, e marcati. Sono allenamenti veri — si spuntano, hanno
     le loro serie e i loro muscoli — ma non fanno parte del programma:
     `progressoSettimana` li tiene fuori dal conto, altrimenti aggiungerne
     uno farebbe scendere la percentuale della settimana, che e' il
     contrario di quello che e' successo. */
  for (const b of bonusDi(n)) {
    fuori.push({
      id: b.id, sett: n, genere: "palestra", chiave: b.id,
      nome: b.nome, testo: b.testo || "", km: 0, bonus: true,
    });
  }
  return fuori;
}

/**
 * Il piano COPERTO da quello che hai importato, non sostituito.
 *
 * Un allenamento arrivato dalla chat di fitness si appoggia sopra lo slot e
 * lascia sotto quello del blocco. È il motivo per cui il piano può restare
 * codice: una riga sbagliata in un CSV si annulla togliendo lo scostamento,
 * non ricostruendo tredici settimane.
 */
function conScostamento(slot) {
  const r = recordSlot(slot.id);
  if (!r || (!r.testo && r.km == null && !r.nome && !r.genere)) return slot;
  return {
    ...slot,
    /* IL NOME CAMBIA, L'ID NO. Il nome e' quello che leggi sulla riga —
       «Calcetto», «Lunga col gruppo» — l'id resta `s02-facile` perche' da
       lui dipendono la spunta che hai gia' dato e il giorno che hai
       scelto. Cambiarlo vorrebbe dire perdere tutte e due. */
    ...(r.nome ? { nome: r.nome } : {}),
    /* E CAMBIA IL GENERE. Una corsa fatta in palestra non e' una corsa: se
       restasse `corsa` conterebbe nei «0/4 corse» della settimana e nei km
       previsti, cioe' direbbe che quei chilometri sono ancora da fare. */
    ...(r.genere ? { genere: r.genere } : {}),
    ...(r.testo ? { testo: r.testo, lift: null, accessori: [] } : {}),
    ...(r.km != null ? { km: r.km } : {}),
    cambiato: true,
    aMano: Boolean(r.cambiato),
  };
}

/* ------------------------------------------------------------ scritture -- */

/**
 * Mette (o rimpiazza) la settimana importata.
 *
 * SOSTITUISCE, non affianca: è tutto il punto. Reimportare la stessa
 * settimana con due righe invece di cinque lascia due allenamenti, perché
 * è quello che hai detto. Le spunte sopravvivono se il nome sopravvive —
 * l'id dello slot viene dal nome — e questo è voluto: un allenamento
 * rinominato è un altro allenamento.
 *
 * Con `voci` vuoto si mette la lapide e la settimana torna al blocco.
 */
export function salvaSettimana(n, voci) {
  const id = idSettimana(n);
  const pulite = (voci || [])
    .filter((v) => v && String(v.nome || "").trim())
    .map((v) => ({
      nome: String(v.nome).trim(),
      chiave: chiaveNome(v.chiave || v.nome),
      genere: ["corsa", "palestra", "altro"].includes(v.genere) ? v.genere : "altro",
      testo: String(v.testo || "").trim(),
      ...(v.km ? { km: Number(v.km) } : {}),
      ...(v.stella ? { stella: true } : {}),
    }));

  casella.aggiorna((s) => {
    if (!Array.isArray(s.settimane)) s.settimane = [];
    const i = s.settimane.findIndex((w) => w.id === id);
    const rec = pulite.length
      ? { id, sett: n, voci: pulite, del: false, up: Date.now() }
      : { id, del: true, up: Date.now() };
    if (i >= 0) s.settimane[i] = rec; else s.settimane.push(rec);
  });
  return pulite.length;
}

/** Toglie la settimana importata: si torna al blocco. */
export const togliSettimana = (n) => salvaSettimana(n, []);

/* ------------------------------------------------------- il reset ------- */
/*
   RIPARTIRE DA UN BLOCCO NUOVO, cancellando quello vecchio.

   Il piano e' codice e cambia con un commit; quello che succede — spunte,
   giorni scelti, settimane importate, bonus — sta nell'archivio ed e'
   sincronizzato. Cambiare il piano da solo non basta: gli id degli slot si
   RIUSANO (`s01-facile` c'e' in tutti e due i blocchi), quindi le spunte del
   programma vecchio riapparirebbero sul nuovo, sulle sedute sbagliate.

   DUE REGOLE, e sono le due che ci sono gia' costate care:

   1. LAPIDI, non rimozioni. Un record tolto e basta lo rimette l'altro
      dispositivo alla prima sincronizzazione.
   2. SOLO DOPO AVER LETTO. Chiamato all'avvio su un archivio ancora vuoto,
      questo non troverebbe niente da cancellare, si segnerebbe come fatto, e
      poi il sync farebbe entrare i cinquanta record del blocco vecchio — che
      a quel punto non li cancella piu' nessuno. Il gancio e'
      `canale.letturaFatta`, in contratto.js.

   Le corse NON si toccano: sono quello che hai fatto davvero, e non
   appartengono al programma. Lo dice anche il nome del file.
*/
export function resetBlocco() {
  if (stato().config?.blocco === BLOCCO) return false;

  const ora = Date.now();
  casella.aggiorna((s) => {
    const lapida = (elenco) =>
      (elenco || []).filter((r) => r && !r.del).map((r) => ({ id: r.id, del: true, up: ora }));

    s.slot = lapida(s.slot);
    s.bonus = lapida(s.bonus);
    s.settimane = lapida(s.settimane);
    // `corse` non compare qui apposta.

    /* La data di partenza sta nel CONFIG, non solo nella costante: la
       prima installazione ci ha scritto dentro il 14 settembre e da li' si
       e' sincronizzata. Cambiare `INIZIO` senza riscrivere questo lascia il
       blocco fermo dov'era. */
    s.config = { ...(s.config || {}), inizio: INIZIO, blocco: BLOCCO, dataTest: DATA_TEST };
    s.configUp = ora;

    /* La fase 5K comincia il 5 ottobre: alla sua nascita non c'e' ancora
       niente di fatto. */
  });
  return true;
}

/* ---------------------------------------------------------- i bonus ----- */

/** Il modello dell'allenamento in piu' che si aggiunge con un tocco. */
export const UPPER_B = {
  nome: "Upper B",
  testo: "Military press bilanciere in piedi 5×5 @ 30 kg · Chin-up presa supina 4×max-2 · Panca presa stretta 3×8 · Rematore al cavo presa larga 3×12 · Alzate laterali ai cavi 3×15 · Face pull 3×15 · Curl a martello 3×12 + French press EZ 3×12",
};

export const bonusDi = (n) =>
  (stato().bonus || []).filter((b) => b.sett === n && !b.del);

export function aggiungiBonus(n, { nome, testo }) {
  const pulito = String(nome || "").trim() || "Bonus";
  /* L'id porta dentro il nome, come per gli slot del piano: due «Upper B»
     nella stessa settimana sarebbero lo stesso allenamento due volte, e lo
     stesso id li fa collassare in uno — che e' il comportamento giusto. */
  const id = `b${String(n).padStart(2, "0")}-${chiaveNome(pulito)}`;
  casella.aggiorna((s) => {
    if (!Array.isArray(s.bonus)) s.bonus = [];
    const i = s.bonus.findIndex((b) => b.id === id);
    const rec = { id, sett: n, nome: pulito, testo: String(testo || "").trim(), del: false, up: Date.now() };
    if (i >= 0) s.bonus[i] = rec; else s.bonus.push(rec);
  });
  return id;
}

/** Lapide, non rimozione: senza, l'altro dispositivo lo resuscita. */
export function togliBonus(id) {
  casella.aggiorna((s) => {
    const i = (s.bonus || []).findIndex((b) => b.id === id);
    if (i >= 0) s.bonus[i] = { id, del: true, up: Date.now() };
  });
}


const trova = (elenco, id) => elenco.findIndex((r) => r.id === id);

export const recordSlot = (id) => (stato().slot || []).find((r) => r.id === id && !r.del) || null;
export const fatto = (id) => Boolean(recordSlot(id)?.fatta);
export const giornoSlot = (id) => recordSlot(id)?.giorno || "";

/** Spunta o de-spunta uno slot. Restituisce il nuovo stato. */
export function alternaSlot(id, giorno = null) {
  const era = fatto(id);
  casella.aggiorna((s) => {
    const i = trova(s.slot, id);
    const prima = i >= 0 ? s.slot[i] : {};
    const rec = { ...prima, id, fatta: !era, up: Date.now() };
    // Spuntando senza aver scelto un giorno, il giorno è oggi: è quasi
    // sempre vero, e chiederlo ogni volta trasformerebbe una spunta in un
    // modulo da compilare.
    if (!era && !rec.giorno) rec.giorno = giorno || oggiISO();
    delete rec.del;
    if (i >= 0) s.slot[i] = rec; else s.slot.push(rec);
  });
  return !era;
}

/** Assegna (o toglie) il giorno di uno slot, senza toccarne la spunta. */
export function scegliGiorno(id, giorno) {
  casella.aggiorna((s) => {
    const i = trova(s.slot, id);
    const prima = i >= 0 ? s.slot[i] : { id, fatta: false };
    const rec = { ...prima, id, giorno: giorno || "", up: Date.now() };
    delete rec.del;
    if (i >= 0) s.slot[i] = rec; else s.slot.push(rec);
  });
}

export const oraSlot = (id) => recordSlot(id)?.ora || "";

/* GLI ORARI PREDEFINITI, e non sono un dettaglio di comodità: la palestra
   la mattina è chiusa. Un piano che mette una seduta di pesi alle sette è
   un piano che non si può eseguire, e accorgersene davanti alla saracinesca
   è tardi. La corsa invece la mattina presto si fa, ed è quasi sempre
   quello il momento.

   Restano PREDEFINITI: ogni allenamento può avere il suo orario, perché un
   piano rigido si abbandona alla prima giornata storta. */
export const ORARI_PREDEFINITI = { corsa: "07:00", palestra: "18:00", altro: "18:00" };

export const oraPredefinita = (genere) =>
  (stato().config?.orari || {})[genere] || ORARI_PREDEFINITI[genere] || "18:00";

/** L'ora di uno slot: la sua, o quella predefinita del suo genere. */
export const oraDi = (slot) => oraSlot(slot.id) || oraPredefinita(slot.genere);

export const DURATE_PREDEFINITE = { corsa: 60, palestra: 75, altro: 60 };

export const durataDi = (slot) =>
  Number(recordSlot(slot.id)?.durata)
  || Number((stato().config?.durate || {})[slot.genere])
  || DURATE_PREDEFINITE[slot.genere] || 60;

/**
 * L'AGENDA: gli allenamenti che hanno un giorno, pronti da mettere in
 * calendario.
 *
 * La scrive l'app e non il workflow, e non è un dettaglio di comodità: i
 * nomi degli allenamenti stanno nel piano, che è codice di questo repo. Un
 * job che volesse ricavarseli dovrebbe ricopiarsi le tredici settimane, e
 * da quel momento ci sarebbero due piani da tenere allineati — cioè uno
 * sbagliato. Qui esce già risolta: nome, giorno, ora, durata.
 *
 * Solo la settimana corrente e la successiva: più in là il piano cambia
 * ancora, e riempire il calendario di tre mesi di eventi che poi si
 * spostano è il modo migliore per farlo ignorare.
 */
export function agenda(da = settimanaCorrente()) {
  if (!da) return [];
  const fuori = [];
  for (const n of [da, da + 1]) {
    for (const s of slotDi(n)) {
      const giorno = giornoSlot(s.id);
      if (!giorno) continue;                       // senza giorno non è un appuntamento
      fuori.push({
        id: s.id, sett: n, nome: s.nome, genere: s.genere,
        giorno, ora: oraDi(s), durata: durataDi(s),
        testo: (s.lift ? [s.lift, ...(s.accessori || [])].join(" · ") : s.testo) || "",
        km: s.km || 0,
        fatta: fatto(s.id),
      });
    }
  }
  return fuori;
}

/** Assegna (o toglie) l'ora di uno slot. */
export function scegliOra(id, ora) {
  casella.aggiorna((s) => {
    const i = trova(s.slot, id);
    const prima = i >= 0 ? s.slot[i] : { id, fatta: false };
    const rec = { ...prima, id, ora: ora || "", up: Date.now() };
    delete rec.del;
    if (i >= 0) s.slot[i] = rec; else s.slot.push(rec);
  });
}

/** Cambia gli orari predefiniti. */
export function scriviOrari(patch) {
  casella.aggiorna((s) => {
    s.config = { ...(s.config || {}), orari: { ...ORARI_PREDEFINITI, ...(s.config?.orari || {}), ...patch } };
    s.configUp = Date.now();
  });
}

/**
 * Applica gli allenamenti importati: uno scostamento per slot.
 *
 * Sta nello STESSO record della spunta, non in un elenco a parte. Un record
 * separato vorrebbe dire due chiavi da tenere allineate nel sync per la
 * stessa casella — e la prima volta che si disallineano avresti uno slot
 * spuntato che mostra il lavoro di un altro.
 */
export function salvaAllenamenti(voci) {
  let scritti = 0;
  casella.aggiorna((s) => {
    for (const v of voci) {
      const id = idSlot(v.sett, v.chiave);
      const i = trova(s.slot, id);
      const prima = i >= 0 ? s.slot[i] : { id, fatta: false };
      const rec = { ...prima, id, testo: v.testo, up: Date.now() };
      if (v.km != null) rec.km = v.km;
      delete rec.del;
      if (i >= 0) s.slot[i] = rec; else s.slot.push(rec);
      scritti++;
    }
  });
  return scritti;
}

/* =========================================================================
   HO FATTO UN'ALTRA COSA.

   Il piano e' scritto per un mondo in cui decidi tu. Nella settimana vera
   decidono anche gli altri: si va a correre col gruppo e la facile diventa
   una lunga, la palestra e' piena e la Lower diventa una Upper, il martedi'
   c'e' il calcetto. Finche' l'app sapeva solo dire «fatto / non fatto»,
   quelle sedute finivano in uno dei due modi sbagliati: spuntate come se
   avessi fatto quello che c'era scritto — e allora i km e i conti mentono —
   oppure lasciate aperte, e allora la settimana sembra persa quando invece
   ti sei allenato.

   Lo scostamento c'era gia', ma solo in entrata dall'import. Questo e' lo
   stesso meccanismo aperto a mano, e non e' un caso: usa lo STESSO campo
   nello STESSO record della spunta. Un secondo posto dove scrivere «cosa ho
   fatto davvero» vorrebbe dire due chiavi da tenere allineate nel sync per
   la stessa casella, e la prima volta che si disallineano hai uno slot
   spuntato che mostra il lavoro di un altro.

   SE E' UNA CORSA, DIVENTA ANCHE UNA CORSA. Non basta scriverlo sullo slot:
   l'andamento, il tetto della lunga e la proiezione sui 5 km leggono
   `corse[]`, cioe' quello che e' arrivato dall'orologio. Una corsa fatta e
   scritta a mano che non finisse li' sarebbe invisibile proprio alle tre
   domande per cui questo modulo esiste. Quindi ne nasce un record di corsa,
   marcato `manuale`, legato allo slot.
   ========================================================================= */

/**
 * Sostituisce il contenuto di uno slot con quello che hai fatto davvero.
 *
 * `data` e' il giorno a cui attribuire la corsa: il giorno scelto per lo
 * slot, o oggi. Serve perche' l'andamento somma per settimana, e una corsa
 * di sabato messa a lunedi' sposta i km nella settimana sbagliata.
 */
export function cambiaSlot(id, { nome, testo, genere, km, secondi, durata, data } = {}) {
  const ora = Date.now();
  casella.aggiorna((s) => {
    const i = trova(s.slot, id);
    const prima = i >= 0 ? s.slot[i] : { id, fatta: false };
    const rec = { ...prima, id, up: ora, cambiato: ora };
    const n = String(nome || "").trim();
    if (n) rec.nome = n; else delete rec.nome;
    rec.testo = String(testo || "").trim();
    if (genere) rec.genere = genere; else delete rec.genere;
    rec.km = Number(km) > 0 ? Math.round(Number(km) * 100) / 100 : 0;
    /* LA DURATA SI DEDUCE DAL TEMPO, e si deduce QUI.
       Stava nella vista, e il risultato era che chiamare `cambiaSlot` da
       qualunque altra parte — l'import, una prova — lasciava la durata al
       valore predefinito: in calendario una corsa da 52 minuti occupava
       l'ora di sempre. Il dato lo sa: se hai scritto un tempo, quella e' la
       durata. */
    const dedotta = Number(durata) > 0
      ? Number(durata)
      : (Number(secondi) > 0 ? Math.round(Number(secondi) / 60) : 0);
    if (dedotta > 0) rec.durata = dedotta; else delete rec.durata;
    delete rec.del;
    if (i >= 0) s.slot[i] = rec; else s.slot.push(rec);
  });

  corsaDiSlot(id, {
    km: Number(km) || 0,
    secondi: Number(secondi) || 0,
    data: data || giornoSlot(id) || oggiISO(),
    nome: String(nome || "").trim(),
  });
}

/**
 * La corsa a mano legata a uno slot: una sola, e si rifa' da zero a ogni
 * cambio. Senza i km sparisce — hai cambiato idea e hai messo una palestra.
 */
function corsaDiSlot(id, { km, secondi, data, nome }) {
  const vecchia = (stato().corse || []).find((c) => c && !c.del && c.manuale && c.slot === id);
  if (vecchia) eliminaCorsa(vecchia.id);
  if (!(km > 0) || !data) return;
  salvaCorse([{
    data, km: Math.round(km * 100) / 100, secondi: Math.max(0, Math.round(secondi) || 0),
    nome: nome || "Allenamento cambiato",
    // I due marchi che contano: `manuale` dice che e' una STIMA e che
    // l'orologio ha la precedenza, `slot` dice da dove viene cosi' che
    // cambiarla o ripristinarla la trovi senza cercarla per data.
    manuale: true, slot: id,
  }]);
}

/** Toglie lo scostamento e rimette il piano, senza toccare la spunta. */
export function ripristinaSlot(id) {
  // Prima la corsa: dopo la scrittura sullo slot il legame c'e' ancora, ma
  // togliere il record e lasciare la corsa vorrebbe dire km senza padre.
  corsaDiSlot(id, { km: 0 });
  casella.aggiorna((s) => {
    const i = trova(s.slot, id);
    if (i < 0) return;
    const rec = { ...s.slot[i], up: Date.now() };
    delete rec.testo;
    delete rec.km;
    delete rec.nome;
    delete rec.genere;
    delete rec.durata;
    delete rec.cambiato;
    s.slot[i] = rec;
  });
}

/* --------------------------------------------------------------- corse -- */

/**
 * L'id di una corsa importata.
 *
 * Deriva da data e metri, quindi lo STESSO allenamento reimportato produce
 * lo STESSO record e la fusione lo unisce invece di affiancarlo. È la
 * lezione dei log di Abitudini (`habitId|data`) applicata qui: senza, ogni
 * export che si sovrappone al precedente raddoppierebbe i km della settimana
 * in silenzio — e i km sono l'unica cosa che questo modulo deve contare bene.
 */
export const idCorsa = (data, metri) => `c-${data}-${Math.round(metri)}`;

/**
 * Scrive le corse. L'id viene da data + metri, quindi la stessa corsa
 * reimportata si fonde invece di affiancarsi.
 *
 * E LA MISURA SCACCIA LA STIMA. Una corsa scritta a mano («10 km col
 * gruppo») e la stessa corsa che arriva dall'orologio tre giorni dopo
 * (10,14 km) hanno metri diversi, quindi id diversi, quindi sarebbero DUE
 * record e venti chilometri dove ce n'erano dieci. E' esattamente il guasto
 * che l'id deterministico esisteva per impedire, da una porta che prima non
 * c'era.
 *
 * Regola: quando arriva una corsa NON manuale, le stime a mano dello stesso
 * giorno se ne vanno — con la lapide, o l'altro dispositivo le resuscita — e
 * il legame con lo slot passa alla corsa vera. Il cronometro ha misurato, la
 * mano aveva stimato.
 */
export function salvaCorse(elenco) {
  let nuove = 0, aggiornate = 0, sostituite = 0;
  casella.aggiorna((s) => {
    for (const c of elenco) {
      const id = idCorsa(c.data, (c.km || 0) * 1000);
      let legame = c.slot || null;

      if (!c.manuale) {
        for (let k = 0; k < s.corse.length; k++) {
          const x = s.corse[k];
          if (!x || x.del || !x.manuale || x.data !== c.data || x.id === id) continue;
          legame = legame || x.slot || null;
          s.corse[k] = { id: x.id, del: true, up: Date.now() };
          sostituite++;
        }
      }

      const rec = { ...c, ...(legame ? { slot: legame } : {}), id, up: Date.now() };
      const i = trova(s.corse, id);
      if (i >= 0) { s.corse[i] = { ...s.corse[i], ...rec, del: undefined }; aggiornate++; }
      else { s.corse.push(rec); nuove++; }
    }
  });
  return { nuove, aggiornate, sostituite };
}

export function eliminaCorsa(id) {
  casella.aggiorna((s) => {
    const i = trova(s.corse, id);
    if (i >= 0) s.corse[i] = { id, del: true, up: Date.now() };
  });
}

export const corseVive = () =>
  (stato().corse || []).filter((c) => c && !c.del && c.data)
    .sort((a, b) => a.data.localeCompare(b.data));

export function scriviConfig(patch) {
  casella.aggiorna((s) => {
    s.config = { ...s.config, ...patch };
    // Il timestamp SEMPRE, anche qui: è la metà che mancava in tre dei
    // quattro guasti di sync che ATLAS ha già avuto.
    s.configUp = Date.now();
  });
}
