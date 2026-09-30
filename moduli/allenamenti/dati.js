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

export const INIZIO = "2026-09-14";
/* SETTE, non tredici. Il test dei 5 km e' stato anticipato a fine ottobre:
   il blocco si accorcia, non si comprime. Le settimane 1 e 2 restano quelle
   che sono — sono passate, e riscrivere il passato per farlo somigliare al
   piano nuovo vuol dire perdere cosa hai fatto davvero. */
export const SETTIMANE = 7;

export const OBIETTIVO = {
  nome: "5 km sub-20",
  passo: "4:00/km",
  secondi: 20 * 60,
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

export const CORSA = { facile: "Facile", qualita: "Qualità", lunga: "Lunga" };
export const ORDINE_PALESTRA = ["lower", "upper", "total"];

/** I km previsti di uno slot a tempo: minuti ÷ passo. Serve al conteggio. */
const kmDaTempo = (minuti, passoMinKm) => Math.round((minuti / passoMinKm) * 10) / 10;

export const PIANO = [
  { n: 1, fase: "Ricostruzione",
    facile: { testo: "30' Z2 @ 7:00/km", km: kmDaTempo(30, 7) },
    qualita: { testo: "35' con 6×30\" allunghi · cammino 90\" tra uno e l'altro", km: kmDaTempo(35, 6.8) },
    lunga: { testo: "6 km @ 7:00/km Z2", km: 6 },
    carichi: { lower: 60, upper: 40, total: 30 } },

  { n: 2, fase: "Ricostruzione",
    facile: { testo: "35' Z2 @ 6:55/km", km: kmDaTempo(35, 6.92) },
    qualita: { testo: "35' con 8×30\" allunghi", km: kmDaTempo(35, 6.7) },
    lunga: { testo: "7 km @ 6:55/km Z2", km: 7 },
    carichi: { lower: 62.5, upper: 42.5, total: 32.5 } },

  /* DA QUI IN POI IL PIANO E' SCRITTO PER ESTESO, seduta per seduta.

     Fino alla settimana 2 la palestra era `carichi` piu' gli accessori fissi
     di `PALESTRA`: una forma che rende visibile la progressione quando
     l'unica cosa che si muove e' il carico del lift principale. Da qui in
     avanti cambiano anche serie, ripetizioni e accessori — nel taper
     spariscono le gambe — e quella forma non li sa dire. Percio' `palestra`
     prende il posto di `carichi`: il testo della seduta, uno per slot. */

  { n: 3, fase: "Sviluppo",
    facile: { testo: "40' Z2 @ 6:50/km + 6 allunghi da 20\"", km: 6 },
    qualita: { testo: "FATTO · Pista variazioni 300 spinti + 100 lenti per 3,5 km", km: 3.5 },
    lunga: { testo: "8 km Z2 @ 6:50/km + 4 allunghi a fine corsa", km: 8 },
    palestra: {
      lower: "Stacco 3×3 @ 65 kg RPE 7 · Affondi 2×8/gamba · Leg curl 2×8 · Polpacci 3×15 · Tibialis 3×20",
      upper: "Panca 5×5 @ 45 kg · Trazioni 8×50% max · Military manubri 3×10 · Rematore manubrio 3×10 · Alzate 4×15 · Curl + Pushdown",
      total: "Squat 3×5 @ 35 kg · Panca inclinata manubri 3×9 · Lat machine 3×12 · Dip 3×9 · Plank 3×45\"",
    } },

  { n: 4, fase: "Sviluppo",
    facile: { testo: "40' Z2 @ 6:45/km + 6 allunghi da 20\"", km: 6 },
    qualita: { testo: "INTERVALLI · 15' risc + 4 allunghi · 4×1000 m @ 4:30/km rec 2' trotto · 10' defat", km: 8.5 },
    lunga: { testo: "8 km · primi 6 Z2 @ 6:45/km · ultimi 2 km @ 4:55/km", km: 8 },
    palestra: {
      lower: "Stacco 3×3 @ 67,5 kg RPE 7 · Affondi 2×8/gamba · Leg curl 2×8 · Polpacci 3×15 · Tibialis 3×20",
      upper: "Panca 5×5 @ 47,5 kg · Trazioni 8×50% max · Military manubri 3×10 · Rematore manubrio 3×10 · Alzate 4×15 · Curl + Pushdown",
      total: "Squat 3×5 @ 37,5 kg · Panca inclinata manubri 3×9 · Lat machine 3×12 · Dip 3×9 · Plank 3×45\"",
    } },

  { n: 5, fase: "Sviluppo",
    facile: { testo: "35' Z2 @ 6:40/km + 6 allunghi da 20\"", km: 5.2 },
    qualita: { testo: "INTERVALLI · 15' risc + 4 allunghi · 5×1000 m @ 4:28/km rec 2' trotto · 10' defat", km: 9.5 },
    lunga: { testo: "9 km · primi 6 Z2 @ 6:40/km · ultimi 3 km @ 4:55/km", km: 9 },
    palestra: {
      lower: "Stacco 3×3 @ 70 kg RPE 7-8 · Affondi 2×8/gamba · Leg curl 2×8 · Polpacci 3×15 · Tibialis 3×20",
      upper: "Panca 5×5 @ 50 kg · Trazioni 8×50% max · Military manubri 3×10 · Rematore manubrio 3×10 · Alzate 4×15 · Curl + Pushdown",
      total: "Squat 3×5 @ 40 kg · Panca inclinata manubri 3×9 · Lat machine 3×12 · Dip 3×9 · Plank 3×45\"",
    } },

  { n: 6, fase: "Taper",
    facile: { testo: "30' Z2 + 4 allunghi da 20\"", km: 4.5 },
    qualita: { testo: "RITMO GARA · 15' risc + 4 allunghi · 3×1200 m @ 4:24/km rec 2' trotto · 10' defat", km: 7.7 },
    lunga: { testo: "6 km Z2 @ 6:40/km", km: 6 },
    palestra: {
      lower: "Stacco 2×3 @ 65 kg RPE 6 · Polpacci 2×15 · Tibialis 2×20",
      upper: "Panca 4×5 @ 50 kg · Trazioni 6×50% max · Military manubri 2×10 · Rematore manubrio 2×10 · Alzate 3×15",
      total: "Squat 2×5 @ 35 kg · Panca inclinata manubri 3×9 · Lat machine 3×12",
    } },

  { n: 7, fase: "Test", test: true,
    facile: { testo: "3 giorni prima del test · 15' risc + 4×400 m @ 4:15/km rec 90\" + 5' defat", km: 5 },
    qualita: { testo: "TEST 5000 m · 15' risc + 4 allunghi + 5 km @ 4:24/km + 10' defat", km: 8.7, stella: true },
    lunga: { testo: "Giorno prima del test · 20' facilissimi + 3 allunghi", km: 3 },
    palestra: {
      lower: "NIENTE GAMBE nei 5 giorni prima del test",
      upper: "Inizio settimana · Panca 3×5 al 70% · Trazioni 3×5 · Alzate 3×15",
      total: "NIENTE GAMBE prima del test · dopo il test seduta libera",
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

export const inizioSettimana = (n) => piuGiorni(inizioBlocco(), (n - 1) * 7);
export const fineSettimana = (n) => piuGiorni(inizioBlocco(), (n - 1) * 7 + 6);

/** In quale settimana del blocco cade `iso`? `null` se fuori. */
export function settimanaDi(iso = oggiISO()) {
  const giorni = Math.floor((daISO(iso) - daISO(inizioBlocco())) / 86400000);
  if (giorni < 0) return null;
  const n = Math.floor(giorni / 7) + 1;
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
  for (const k of ["facile", "qualita", "lunga"]) {
    fuori.push(conScostamento({
      id: idSlot(n, k), sett: n, genere: "corsa", chiave: k,
      nome: CORSA[k], testo: p[k].testo, km: p[k].km, stella: Boolean(p[k].stella),
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
      nome: g.nome,
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
  if (!r || (!r.testo && r.km == null)) return slot;
  return {
    ...slot,
    ...(r.testo ? { testo: r.testo, lift: null, accessori: [] } : {}),
    ...(r.km != null ? { km: r.km } : {}),
    cambiato: true,
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

/** Toglie lo scostamento e rimette il piano, senza toccare la spunta. */
export function ripristinaSlot(id) {
  casella.aggiorna((s) => {
    const i = trova(s.slot, id);
    if (i < 0) return;
    const rec = { ...s.slot[i], up: Date.now() };
    delete rec.testo;
    delete rec.km;
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

export function salvaCorse(elenco) {
  let nuove = 0, aggiornate = 0;
  casella.aggiorna((s) => {
    for (const c of elenco) {
      const id = idCorsa(c.data, (c.km || 0) * 1000);
      const i = trova(s.corse, id);
      if (i >= 0) { s.corse[i] = { ...s.corse[i], ...c, id, up: Date.now(), del: undefined }; aggiornate++; }
      else { s.corse.push({ ...c, id, up: Date.now() }); nuove++; }
    }
  });
  return { nuove, aggiornate };
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
