// moduli/pasti/dati.js — il database dei pasti, il piano, e gli scostamenti.
//
// LA DIVISIONE CHE REGGE TUTTO IL MODULO: il piano è il registro.
//
// L'utente non loggherà — l'ha detto, e un'app che per funzionare chiede tre
// conferme al giorno dopo nove giorni è un'icona morta. Quindi l'assunzione
// predefinita è che hai mangiato quello che c'era nel piano, e l'archivio
// tiene SOLO gli scostamenti: la pizzetta in più, il pasto cambiato, quello
// saltato. È la stessa forma di Finanze — un'àncora e i movimenti che la
// spostano — ed è ciò che permette a questo modulo di stare zitto una
// settimana intera e avere comunque numeri veri.
//
// DUE COSE QUI DENTRO SONO CODICE E NON DATI, e la differenza non è
// stilistica:
//
//   FASCE   — i cinque momenti del pasto. Non sono una preferenza.
//   COMUNI  — la tabellina della pizzetta e della banana. È cultura
//             generale, non un dato dell'utente: sta nel codice, non si
//             sincronizza, e quindi non può partecipare alla classe di
//             guasti che ha morso ATLAS cinque volte (un valore di fabbrica
//             con un `up` fresco che batte la scrittura vera).
//
// Il DATABASE PERSONALE invece è dati veri, perché cresce nel tempo: record
// con `id` stabile, `up` a ogni scrittura, lapidi per le cancellazioni.
// Tutto quello che `core/sync.js` si aspetta.

import { apriCasella } from "../../core/storage.js";
import { oggiISO, daISO, isoDi, piuGiorni } from "../../core/ui.js";

/* =========================================================================
   LE COSTANTI — codice, non dati
   ========================================================================= */

/** I cinque momenti. L'ordine è quello della giornata e serve alle viste. */
export const FASCE = [
  { id: "colazione", nome: "Colazione", ora: "08:00" },
  { id: "spuntino1", nome: "Spuntino",  ora: "10:30" },
  { id: "pranzo",    nome: "Pranzo",    ora: "13:00" },
  { id: "spuntino2", nome: "Merenda",   ora: "17:00" },
  { id: "cena",      nome: "Cena",      ora: "20:30" },
];

export const ID_FASCE = FASCE.map((f) => f.id);
export const nomeFascia = (id) => FASCE.find((f) => f.id === id)?.nome || id;

/**
 * Come si comporta una fascia in un certo giorno.
 *
 * `fuori` esiste per una ragione precisa: un pranzo fuori che nel conto vale
 * zero calorie rende il bilancio della giornata una bugia, e con una bugia
 * in mezzo un surplus non si governa. Meglio una stima dichiarata una volta
 * che un buco.
 */
export const REGIMI = {
  casa:  "A casa",
  fuori: "Fuori",
  salto: "Non lo faccio",
};

/** I tre modi in cui una giornata può scostarsi dal piano. Tre, non quattro. */
export const SCOSTAMENTI = {
  aggiunta: "In più",
  cambio:   "Al posto di",
  salto:    "Saltato",
};

/* -------------------------------------------------------------------------
   COMUNI — la tabellina che rende un imprevisto un tocco solo.

   I valori sono APPROSSIMAZIONI da porzione media, non pesate: servono a
   non far finire una pizzetta nel nulla, non a fare un bilancio analitico.
   Chi vuole il numero esatto si crea il pasto nel database col peso vero.

   Non entrano nel database personale finché l'utente non ne tocca uno: a
   quel punto diventa un record suo, con il suo `up`.
   ------------------------------------------------------------------------- */
export const COMUNI = [
  { nome: "Pizzetta rossa",              kcal: 270, p: 7,  c: 35, g: 11, fasce: ["spuntino1", "spuntino2"] },
  { nome: "Panino prosciutto cotto",     kcal: 300, p: 18, c: 42, g: 7,  fasce: ["spuntino1", "pranzo"] },
  { nome: "Panino prosciutto crudo",     kcal: 310, p: 20, c: 42, g: 8,  fasce: ["spuntino1", "pranzo"] },
  { nome: "Toast prosciutto e formaggio",kcal: 350, p: 20, c: 33, g: 15, fasce: ["spuntino1", "pranzo"] },
  { nome: "Piadina prosciutto e stracchino", kcal: 450, p: 20, c: 48, g: 19, fasce: ["pranzo", "cena"] },
  { nome: "Focaccia (100 g)",            kcal: 290, p: 7,  c: 40, g: 11, fasce: ["spuntino1", "spuntino2"] },
  { nome: "Cornetto vuoto",              kcal: 300, p: 6,  c: 38, g: 14, fasce: ["colazione", "spuntino1"] },
  { nome: "Cappuccino",                  kcal: 110, p: 6,  c: 9,  g: 5,  fasce: ["colazione", "spuntino1"] },
  { nome: "Banana",                      kcal: 105, p: 1,  c: 27, g: 0,  fasce: ["spuntino1", "spuntino2"] },
  { nome: "Mela",                        kcal: 78,  p: 0,  c: 21, g: 0,  fasce: ["spuntino1", "spuntino2"] },
  { nome: "Yogurt greco 0% (150 g)",     kcal: 90,  p: 15, c: 6,  g: 0,  fasce: ["colazione", "spuntino2"] },
  { nome: "Barretta proteica",           kcal: 200, p: 20, c: 20, g: 6,  fasce: ["spuntino1", "spuntino2"] },
  { nome: "Mandorle (30 g)",             kcal: 175, p: 6,  c: 4,  g: 15, fasce: ["spuntino2"] },
  { nome: "Cioccolato fondente (30 g)",  kcal: 170, p: 2,  c: 13, g: 12, fasce: ["spuntino2"] },
  { nome: "Gelato (cono medio)",         kcal: 250, p: 4,  c: 32, g: 12, fasce: ["spuntino2"] },
  { nome: "Birra media (0,4 l)",         kcal: 180, p: 2,  c: 15, g: 0,  fasce: ["cena"] },
];

/* =========================================================================
   LO SCHEMA
   ========================================================================= */

/**
 * La settimana tipo dichiarata all'assessment.
 *
 * Indici 0–6 = lunedì–domenica, come `GIORNI` in core/ui.js. Il regime di
 * partenza è quello detto dall'utente: in settimana a casa solo la sera,
 * venerdì sabato e domenica anche a pranzo. NON incastrarlo nel codice
 * altrove: è un dato del profilo e cambierà.
 */
function settimanaTipoIniziale() {
  const giorno = (pranzoACasa) => ({
    colazione: "casa",
    /* GLI SPUNTINI SONO ACCESI, e non è un'ipotesi: con colazione, mensa e
       cena il totale si ferma a 2341 kcal contro un bersaglio di 2975 —
       sotto il mantenimento, cioè un piano che NON fa crescere nessuno.
       Le due fasce mancanti valgono 600 kcal e sono la differenza fra un
       bulk e un pareggio. Si spengono in un tocco, se non le vuole. */
    spuntino1: "casa",
    pranzo: pranzoACasa ? "casa" : "fuori",
    spuntino2: "casa",
    cena: "casa",
  });
  // lun mar mer gio = pranzo fuori; ven sab dom = pranzo a casa
  return [false, false, false, false, true, true, true].map(giorno);
}

export const PREDEFINITO = {
  v: 1,

  /* Il profilo NON è una lista di record: è un blocco solo, e si confronta
     con un timestamp suo (`profiloUp`) come fa `config` in Allenamenti. Un
     remoto a zero non deve poter vincere su un locale che è stato toccato. */
  profilo: {
    fatto: false,           // l'assessment è stato confermato dall'utente?
    sesso: "m",
    nascita: "",            // ISO, se la sa. Altrimenti i due campi qui sotto
    etaDichiarata: 23,
    etaDichiarataIl: "2026-09-20",
    altezzaCm: 173,
    attivita: "moderato",   // vedi ATTIVITA
    obiettivo: "massa",
    surplusKcal: 400,       // sopra il mantenimento

    /* PROTEINE E GRASSI SI FISSANO SUL PESO, i carboidrati prendono l'avanzo.
       1,2 g/kg di grassi e non 0,9: a 0,9 il bersaglio sarebbe 62 g, ma il
       cibo che mangia davvero — bacon, mozzarella, piadine — ne porta oltre
       cento. Un bersaglio che sfori tutti i giorni non è un bersaglio, è
       rumore che insegna a ignorare i numeri. 1,2 g/kg fa 83 g, cioè il 25%
       delle calorie: dentro l'intervallo sano, vicino a come mangia, e
       lascia ai carboidrati un numero umano invece di 535 g. */
    proteineGkg: 2.0,
    grassiGkg: 1.2,
    bersagliManuali: null,  // { kcal, p, c, g } se li fissa a mano
    settimanaTipo: settimanaTipoIniziale(),
    /* La mensa: primo, secondo e pane. È una stima, non una misura, e sta
       qui perché uno zero al posto del pranzo renderebbe bugiardo il
       bilancio di quattro giorni su sette. */
    stimeFuori: { pranzo: { kcal: 1000, p: 50, c: 125, g: 30 } },
    veti: [],               // cose che non mangia, per il generatore
    note: "",
  },
  profiloUp: 0,

  /* I semi gia messi. E un INSIEME unito nella fusione (unione, non
     "vince il piu recente"): un marcatore che si puo solo aggiungere non
     puo essere perso da un dispositivo che sincronizza con uno stato
     vecchio, e quindi non puo far riseminare pasti gia cancellati. */
  semi: [],

  pesi: [],          // { id, data, kg, up, del } — serie, non un numero solo
  pasti: [],         // il database personale
  piani: [],         // un record per settimana
  registro: [],      // SOLO gli scostamenti
};

export const casella = apriCasella("pasti", PREDEFINITO);
export const stato = () => casella.leggi();

/** I fattori di attività per il calcolo del mantenimento. Vedi calcolo.js. */
export const ATTIVITA = {
  sedentario: { nome: "Sedentario",    fattore: 1.2 },
  leggero:    { nome: "Leggero",       fattore: 1.375 },
  moderato:   { nome: "Moderato",      fattore: 1.55 },
  intenso:    { nome: "Intenso",       fattore: 1.725 },
};

export const OBIETTIVI = {
  massa:        { nome: "Massa",        segno: +1 },
  mantenimento: { nome: "Mantenimento", segno: 0 },
  definizione:  { nome: "Definizione",  segno: -1 },
};

/* =========================================================================
   GLI ID — deterministici, sempre.

   Non è eleganza: due dispositivi che fanno la stessa cosa devono produrre
   lo STESSO record. Con id casuali la fusione li somma, e il conto delle
   calorie di quella giornata raddoppia senza che nessuno se ne accorga.
   ========================================================================= */

/** Nome → chiave stabile. Accenti via, spazi in trattini, niente doppioni. */
export function slug(testo) {
  return String(testo || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export const idPasto = (nome) => `p-${slug(nome)}`;
export const idPeso = (data) => `peso-${data}`;
export const idPiano = (lunedi) => `w-${lunedi}`;
export const idScostamento = (data, ora, nome) =>
  `s-${data}-${String(ora || "").replace(":", "") || "0000"}-${slug(nome)}`;

/** Il lunedì della settimana che contiene `iso`. Le settimane sono lun→dom. */
export function lunediDi(iso = oggiISO()) {
  const d = daISO(iso);
  const g = (d.getDay() + 6) % 7;     // 0 = lunedì
  return isoDi(new Date(d.getTime() - g * 86400000));
}

/** I sette giorni della settimana che comincia il `lunedi` dato. */
export const giorniSettimana = (lunedi) =>
  Array.from({ length: 7 }, (_, i) => piuGiorni(lunedi, i));

/** 0 = lunedì … 6 = domenica. L'indice di `settimanaTipo`. */
export const indiceGiorno = (iso) => (daISO(iso).getDay() + 6) % 7;

/* =========================================================================
   LETTURE
   ========================================================================= */

const vivi = (lista) => (lista || []).filter((r) => r && !r.del);

export const profilo = () => stato().profilo || PREDEFINITO.profilo;
export const assessmentFatto = () => Boolean(profilo().fatto);

export const pastiVivi = () => vivi(stato().pasti);
export const pasto = (id) => pastiVivi().find((p) => p.id === id) || null;

/** I pasti che hanno senso in una certa fascia, esclusi quelli spenti. */
export const pastiPerFascia = (fascia) =>
  pastiVivi().filter((p) => p.attivo !== false && (p.fasce || []).includes(fascia));

export const pianoSettimana = (lunedi) =>
  vivi(stato().piani).find((p) => p.id === idPiano(lunedi)) || null;

export const scostamentiDi = (data) =>
  vivi(stato().registro).filter((r) => r.data === data);

export const scostamentiTra = (da, a) =>
  vivi(stato().registro).filter((r) => r.data >= da && r.data <= a);

/** L'ultimo peso registrato, o 0. Il fabbisogno lo segue: lui sta crescendo. */
export function pesoAttuale() {
  const serie = vivi(stato().pesi).sort((a, b) => a.data.localeCompare(b.data));
  return serie.length ? serie[serie.length - 1].kg : 0;
}

export const serieePesi = () =>
  vivi(stato().pesi).sort((a, b) => a.data.localeCompare(b.data));

/**
 * Il regime di una fascia in un giorno: `casa`, `fuori` o `salto`.
 * Legge la settimana tipo del profilo, non una costante.
 */
export function regimeDi(iso, fascia) {
  const tipo = profilo().settimanaTipo || [];
  return tipo[indiceGiorno(iso)]?.[fascia] || "salto";
}

/* =========================================================================
   SCRITTURE

   Tutte passano da `casella.aggiorna`, che timbra `up` da sé. Nessuna di
   queste è automatica: le scritture che partono da sole (assessment,
   generazione del piano) stanno in `piano.js` e hanno il guardiano della
   prima lettura. Vedi il briefing, punto 3.
   ========================================================================= */

export function scriviProfilo(patch) {
  casella.aggiorna((s) => {
    s.profilo = { ...s.profilo, ...patch };
    s.profiloUp = Date.now();
  });
}

export function registraPeso(kg, data = oggiISO()) {
  const n = Number(kg) || 0;
  if (n <= 0) return null;
  const id = idPeso(data);
  let record = null;
  casella.aggiorna((s) => {
    const esistente = (s.pesi || []).find((r) => r.id === id);
    // Due pesate lo stesso giorno non fanno due record: vince l'ultima.
    if (esistente) { esistente.kg = n; esistente.del = false; esistente.up = Date.now(); record = esistente; }
    else { record = { id, data, kg: n, up: Date.now() }; s.pesi.push(record); }
  });
  return record;
}

/**
 * Salva (o aggiorna) pasti nel database personale.
 *
 * L'id viene dal nome, quindi reimportare lo stesso pasto dalla chat lo
 * AGGIORNA invece di duplicarlo. È la proprietà che rende l'import
 * ripetibile senza paura, ed è il motivo per cui gli id non sono casuali.
 */
export function salvaPasti(voci) {
  const elenco = (Array.isArray(voci) ? voci : [voci]).filter(Boolean);
  if (!elenco.length) return [];
  const salvati = [];
  casella.aggiorna((s) => {
    for (const v of elenco) {
      if (!v.nome) continue;
      const id = v.id || idPasto(v.nome);
      const base = {
        id,
        nome: String(v.nome).trim(),
        fasce: (v.fasce || []).filter((f) => ID_FASCE.includes(f)),
        kcal: Math.round(Number(v.kcal) || 0),
        p: Math.round(Number(v.p) || 0),
        c: Math.round(Number(v.c) || 0),
        g: Math.round(Number(v.g) || 0),
        prepMin: Number(v.prepMin) || 0,
        tag: v.tag || [],
        fonte: v.fonte || "chat",
        attivo: v.attivo !== false,
        del: false,
        up: Date.now(),
      };
      if (!base.fasce.length) base.fasce = ["cena"];
      const i = (s.pasti || []).findIndex((p) => p.id === id);
      if (i >= 0) s.pasti[i] = { ...s.pasti[i], ...base };
      else s.pasti.push(base);
      salvati.push(base);
    }
  });
  return salvati;
}

/** Cancellare è mettere una lapide: senza, l'altro dispositivo lo resuscita. */
export function eliminaPasto(id) {
  casella.aggiorna((s) => {
    const p = (s.pasti || []).find((r) => r.id === id);
    if (p) { p.del = true; p.up = Date.now(); }
  });
}

/** Spegnere un pasto lo toglie dal generatore ma non dallo storico. */
export function alternaAttivo(id) {
  casella.aggiorna((s) => {
    const p = (s.pasti || []).find((r) => r.id === id);
    if (p) { p.attivo = p.attivo === false; p.up = Date.now(); }
  });
}

/**
 * Registra uno scostamento dal piano.
 *
 * `tipo` è uno di SCOSTAMENTI. Per `salto` i macro sono zero e conta
 * `fascia`: è il piano che si annulla, non un pasto che si aggiunge.
 */
export function registraScostamento({ tipo, data = oggiISO(), ora = "", fascia, nome, kcal = 0, p = 0, c = 0, g = 0, pastoId = null }) {
  if (!SCOSTAMENTI[tipo]) return null;
  const etichetta = tipo === "salto" ? `salto-${fascia}` : nome;
  const id = idScostamento(data, ora || FASCE.find((f) => f.id === fascia)?.ora || "", etichetta);
  let record = null;
  casella.aggiorna((s) => {
    const esistente = (s.registro || []).find((r) => r.id === id);
    record = {
      id, tipo, data, ora, fascia: fascia || null,
      nome: tipo === "salto" ? nomeFascia(fascia) : String(nome || "").trim(),
      pastoId,
      kcal: Math.round(Number(kcal) || 0),
      p: Math.round(Number(p) || 0),
      c: Math.round(Number(c) || 0),
      g: Math.round(Number(g) || 0),
      del: false,
      up: Date.now(),
    };
    if (esistente) Object.assign(esistente, record);
    else s.registro.push(record);
  });
  return record;
}

export function eliminaScostamento(id) {
  casella.aggiorna((s) => {
    const r = (s.registro || []).find((x) => x.id === id);
    if (r) { r.del = true; r.up = Date.now(); }
  });
}

/**
 * Scrive il piano di una settimana.
 *
 * `manuale: true` alza `bloccato`, e da lì in poi il generatore non ci
 * torna sopra: una scelta dell'utente non si fa sovrascrivere da un giro
 * automatico, mai.
 */
export function salvaPiano(lunedi, giorni, { manuale = false } = {}) {
  const id = idPiano(lunedi);
  casella.aggiorna((s) => {
    const esistente = (s.piani || []).find((p) => p.id === id);
    if (esistente) {
      esistente.giorni = giorni;
      esistente.del = false;
      if (manuale) esistente.bloccato = true;
      esistente.up = Date.now();
    } else {
      s.piani.push({ id, lunedi, giorni, bloccato: manuale, generatoIl: Date.now(), del: false, up: Date.now() });
    }
  });
}

/** Cambia un singolo pasto del piano. È sempre una scelta dell'utente. */
export function scegliPasto(lunedi, data, fascia, pastoId) {
  const p = pianoSettimana(lunedi);
  const giorni = { ...(p?.giorni || {}) };
  giorni[data] = { ...(giorni[data] || {}), [fascia]: pastoId };
  salvaPiano(lunedi, giorni, { manuale: true });
}

/* =========================================================================
   IL PRIMO GIRO — i pasti dichiarati all'assessment, 21 in tutto.

   Stanno nel codice ma NON sono codice come `COMUNI`: sono un seme. Al
   primo avvio entrano nell'archivio e da quel momento sono record suoi,
   con il suo `up` — modificabili, spegnibili, cancellabili. Se li
   cancella restano cancellati: `semi` ricorda che questo seme è già stato
   messo, e nessun dispositivo lo riporta indietro.

   I valori sono quelli che ha dato lui. Non li ho ritoccati: un'app che
   corregge in silenzio i numeri dell'utente gli toglie l'unica cosa su
   cui può fare affidamento.
   ========================================================================= */

export const SEME = "assessment-2026-09";

/* Il peso di partenza. È una SERIE, non un numero: in massa si muove, e il
   fabbisogno deve muoversi con lui. */
export const PESO_INIZIALE = { kg: 69, data: "2026-09-20" };

export const SEMI = [
  { nome: "Uova, bacon, pane e succo ACE",
    fasce: ["colazione"], kcal: 640, p: 32, c: 56, g: 32, prepMin: 10, tag: ["uova", "pane"] },
  { nome: "Cornetto alla crema in friggitrice e caffè",
    fasce: ["colazione"], kcal: 330, p: 6, c: 38, g: 17, prepMin: 12, tag: ["cornetto", "cornetto"] },
  { nome: "Banana",
    fasce: ["spuntino1", "spuntino2"], kcal: 105, p: 1, c: 27, g: 0, prepMin: 0, tag: ["frutta", "banana"] },
  { nome: "Mela",
    fasce: ["spuntino1", "spuntino2"], kcal: 95, p: 1, c: 25, g: 0, prepMin: 0, tag: ["frutta", "mela"] },
  { nome: "Pollo e riso basmati con insalata",
    fasce: ["pranzo", "cena"], kcal: 720, p: 54, c: 80, g: 18, prepMin: 20, tag: ["pollo", "riso"] },
  { nome: "Riso basmati con macinato di manzo e spinaci",
    fasce: ["pranzo", "cena"], kcal: 830, p: 53, c: 82, g: 31, prepMin: 20, tag: ["manzo", "riso"] },
  { nome: "Pasta in bianco con parmigiano, pollo e insalata",
    fasce: ["pranzo", "cena"], kcal: 815, p: 58, c: 88, g: 25, prepMin: 20, tag: ["pollo", "pasta"] },
  { nome: "Pasta al sugo e bistecca di manzo",
    fasce: ["pranzo", "cena"], kcal: 830, p: 62, c: 92, g: 23, prepMin: 20, tag: ["manzo", "pasta"] },
  { nome: "Pasta al sugo con macinato di manzo",
    fasce: ["pranzo", "cena"], kcal: 850, p: 50, c: 92, g: 30, prepMin: 25, tag: ["manzo", "pasta"] },
  { nome: "Piadina con pollo e insalata (x2)",
    fasce: ["pranzo", "cena"], kcal: 870, p: 58, c: 102, g: 25, prepMin: 15, tag: ["pollo", "piadina"] },
  { nome: "Piadina con macinato e insalata (x2)",
    fasce: ["pranzo", "cena"], kcal: 895, p: 47, c: 102, g: 33, prepMin: 15, tag: ["manzo", "piadina"] },
  { nome: "Piadina con mozzarella fusa e maiale sfilacciato (x2)",
    fasce: ["pranzo", "cena"], kcal: 1110, p: 57, c: 101, g: 53, prepMin: 20, tag: ["maiale", "piadina"] },
  { nome: "Frittata al parmigiano, patate in friggitrice e pane",
    fasce: ["pranzo", "cena"], kcal: 940, p: 45, c: 96, g: 42, prepMin: 25, tag: ["uova", "patate"] },
  { nome: "Bistecca di manzo, patate in friggitrice, insalata e pane",
    fasce: ["pranzo", "cena"], kcal: 880, p: 65, c: 95, g: 26, prepMin: 25, tag: ["manzo", "patate"] },
  { nome: "Lonza di maiale, patate in friggitrice, insalata e pane",
    fasce: ["pranzo", "cena"], kcal: 940, p: 66, c: 95, g: 33, prepMin: 25, tag: ["maiale", "patate"] },
  { nome: "Pollo ai ferri, patate, spinaci e pane",
    fasce: ["pranzo", "cena"], kcal: 870, p: 76, c: 95, g: 20, prepMin: 25, tag: ["pollo", "patate"] },
  { nome: "Merluzzo al forno, patate, insalata e pane",
    fasce: ["pranzo", "cena"], kcal: 915, p: 69, c: 106, g: 23, prepMin: 30, tag: ["pesce", "patate"] },
  { nome: "Bastoncini di merluzzo e patate in friggitrice con insalata",
    fasce: ["pranzo", "cena"], kcal: 725, p: 38, c: 87, g: 24, prepMin: 20, tag: ["pesce", "patate"] },
  { nome: "Hamburger di manzo con pane e insalata",
    fasce: ["pranzo", "cena"], kcal: 730, p: 52, c: 68, g: 27, prepMin: 15, tag: ["manzo", "pane"] },
  { nome: "Uova strapazzate, pane e spinaci",
    fasce: ["pranzo"], kcal: 640, p: 40, c: 58, g: 27, prepMin: 10, tag: ["uova", "pane"] },
  { nome: "Mozzarella, pane e insalata",
    fasce: ["pranzo"], kcal: 740, p: 35, c: 70, g: 36, prepMin: 5, tag: ["mozzarella", "pane"] },
];

/**
 * Mette il primo giro di pasti nell'archivio. Una volta sola, per sempre.
 *
 * NON CHIAMARLA PRIMA CHE IL CANALE ABBIA LETTO. È una scrittura che parte
 * da sé, cioè la categoria che in ATLAS ha già resuscitato dati cancellati
 * due volte: un telefono appena installato che semina prima di aver letto
 * il repo rimette in tavola i pasti che l'altro dispositivo aveva tolto.
 * Il guardiano sta in `modulo.js`, sopra la chiamata:
 *
 *     if (canale.letturaFatta || canale.stato === "off") semina();
 *
 * E il controllo del già-fatto sta FUORI dalla scrittura di proposito: con
 * un `casella.aggiorna` che non cambia niente si notifica comunque un
 * cambiamento, il sync lo prende per una modifica locale e parte un giro
 * infinito. È successo con `semina()` in Abitudini.
 */
export function semina() {
  const gia = Array.isArray(stato().semi) ? stato().semi : [];
  if (gia.includes(SEME)) return [];

  const messi = salvaPasti(SEMI.map((p) => ({ ...p, fonte: "assessment" })));
  registraPeso(PESO_INIZIALE.kg, PESO_INIZIALE.data);
  casella.aggiorna((s) => {
    if (!Array.isArray(s.semi)) s.semi = [];
    if (!s.semi.includes(SEME)) s.semi.push(SEME);
  });
  return messi;
}
