// moduli/abitudini/dati.js — lo schema e l'accesso all'archivio.
//
// Lo schema è quello di habit-tracker-webapp, conservato com'era: i record
// hanno già `id`, `up` e le lapidi `del`, che è esattamente il modello di
// core/sync.js. Non c'è niente da migrare, solo da innestare.
//
// ATTENZIONE ALLA CONVENZIONE DEI GIORNI. `sched.days` contiene numeri
// JavaScript: 0 = domenica, 1 = lunedì … 6 = sabato. core/contesto.js usa
// invece 0 = lunedì, perché è così che si conta in italiano. I dati NON
// vengono convertiti — sarebbe una migrazione rischiosa per un guadagno
// nullo — la conversione avviene ai bordi, in calcolo.js. È lo scambio che
// produce il bug più insidioso di tutti, perché funziona sei giorni su sette.

import { apriCasella } from "../../core/storage.js";

export const TINTE = ["blue", "green", "red", "orange", "purple", "pink", "yellow", "mint", "indigo"];

/** Dalla tinta al token. Una tinta sconosciuta cade sul blu, non esplode. */
export const coloreTinta = (t) => `var(--${
  { blue: "blu", green: "verde", red: "rosso", orange: "arancio", purple: "viola",
    pink: "rosa", yellow: "giallo", mint: "menta", indigo: "indaco" }[t] || "blu"
})`;

export const PREDEFINITO = {
  v: 1,
  habits: [],   // { id, name, emoji, tint, sched, remind, archived, created, order, up, del? }
  logs: [],     // { id: "<habitId>|<data>", h, d, up, del? }
  // Nello schema di partenza qui c'era anche `subs`, le iscrizioni push.
  // In ATLAS non ci sono più: le notifiche sono di core, una coppia VAPID
  // per tutti i moduli, e le iscrizioni stanno in notifiche.json. Un modulo
  // che tenesse le sue riporterebbe la duplicazione che ATLAS elimina.
  // Le routine che ATLAS sa comporre da sé e che ha già composto su questo
  // archivio. Si fonde per UNIONE: vedi `semina()` in fondo al file.
  semi: [],
  meta: { theme: "auto", weekStart: 1 },
  metaUp: 0,
};

export const casella = apriCasella("abitudini", PREDEFINITO);

export const stato = () => casella.leggi();

/** Le abitudini vive, in ordine. Le viste leggono sempre questo. */
export function abitudiniVive({ conArchiviate = false } = {}) {
  return stato().habits
    .filter((h) => h && !h.del && (conArchiviate || !h.archived))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || String(a.name).localeCompare(String(b.name)));
}

export const abitudinePerId = (id) => stato().habits.find((h) => h.id === id && !h.del) || null;

/**
 * L'indice delle spunte, ricostruito a ogni lettura dello stato.
 *
 * È una Set di `<habitId>|<data>`: senza, ogni controllo "è fatta?" sarebbe
 * una scansione dell'intero array dei log, e una griglia di 7 giorni × 10
 * abitudini ne fa settanta. Con trecento log a testa si sente.
 */
let indice = null;
let indiceDi = null;

export function indiceSpunte() {
  const s = stato();
  if (indice && indiceDi === s.logs) return indice;
  indice = { fatte: new Set(), saltate: new Set() };
  for (const l of s.logs) {
    if (!l || l.del) continue;
    (l.x ? indice.saltate : indice.fatte).add(l.id);
  }
  indiceDi = s.logs;
  return indice;
}

export const idLog = (habitId, data) => `${habitId}|${data}`;
export const eFatta = (habitId, data) => indiceSpunte().fatte.has(idLog(habitId, data));

/* ------------------------------------------------------------- saltate ---
   Il terzo stato: né fatta né in sospeso — CHIUSA COME NON FATTA.

   Serve per le abitudini in negativo, quelle che si tengono non facendo
   qualcosa: se oggi è andata storta, spuntarle sarebbe una bugia e
   lasciarle lì aperte fino a mezzanotte è un promemoria di una cosa su cui
   non si può più fare niente. Nessuna delle due è utile. Un giorno saltato
   si dichiara, sparisce dalla lista di oggi e resta nello storico come
   quello che è.

   Sta nello STESSO record della spunta, con un flag `x`. Un record separato
   vorrebbe dire poter essere fatta e saltata insieme, che non vuol dire
   niente, e due chiavi diverse da tenere allineate nel sync.
   ========================================================================= */

export const eSaltata = (habitId, data) => indiceSpunte().saltate.has(idLog(habitId, data));

/** Dichiarata saltata, o annullata se lo era già. Torna il nuovo stato. */
export function alternaSaltata(habitId, data) {
  const id = idLog(habitId, data);
  const eraSaltata = eSaltata(habitId, data);
  casella.aggiorna((s) => {
    const i = s.logs.findIndex((l) => l.id === id);
    // Come per la spunta: annullare mette la lapide, non toglie il record.
    // Senza, l'altro dispositivo la rimanderebbe indietro.
    const rec = eraSaltata
      ? { id, h: habitId, d: data, up: Date.now(), del: true }
      : { id, h: habitId, d: data, up: Date.now(), x: true };
    if (i >= 0) s.logs[i] = rec; else s.logs.push(rec);
  });
  indice = null;
  return !eraSaltata;
}

/** Lo stato di oggi in una parola: "fatta" | "saltata" | "aperta". */
export const statoDi = (habitId, data) =>
  eFatta(habitId, data) ? "fatta" : eSaltata(habitId, data) ? "saltata" : "aperta";

// ------------------------------------------------------------- scritture --

/**
 * Spunta o de-spunta. Restituisce il nuovo stato (true = fatta).
 *
 * L'id del log è deterministico (`habitId|data`), quindi due dispositivi
 * che spuntano la stessa abitudine lo stesso giorno producono lo STESSO
 * record e la fusione li unisce invece di duplicarli. È fatto bene
 * nell'app di partenza: conservato tale e quale.
 */
export function alterna(habitId, data) {
  const id = idLog(habitId, data);
  const eraFatta = eFatta(habitId, data);
  casella.aggiorna((s) => {
    const i = s.logs.findIndex((l) => l.id === id);
    const rec = { id, h: habitId, d: data, up: Date.now() };
    // De-spuntare non toglie il record: mette la lapide. Senza, l'altro
    // dispositivo rimanderebbe indietro la spunta e la toglierebbe di nuovo.
    // `x` non si porta dietro: spuntare una saltata la rende fatta, ed è
    // giusto — è il modo di correggere un «oggi no» dato troppo presto.
    if (eraFatta) rec.del = true;
    if (i >= 0) s.logs[i] = rec; else s.logs.push(rec);
  });
  indice = null;
  return !eraFatta;
}

export function salvaAbitudine(dati) {
  const ora = Date.now();
  casella.aggiorna((s) => {
    const i = s.habits.findIndex((h) => h.id === dati.id);
    if (i >= 0) {
      s.habits[i] = { ...s.habits[i], ...dati, up: ora };
    } else {
      const massimo = s.habits.reduce((m, h) => Math.max(m, h.order ?? 0), 0);
      // Gli `order` vanno a passi di 10: così infilare un'abitudine fra due
      // esistenti non obbliga a rinumerare tutte le altre.
      s.habits.push({ archived: false, created: ora, order: massimo + 10, ...dati, up: ora });
    }
  });
}

export function eliminaAbitudine(id) {
  casella.aggiorna((s) => {
    const i = s.habits.findIndex((h) => h.id === id);
    if (i >= 0) s.habits[i] = { id, del: true, up: Date.now() };
  });
}

export function riordina(idOrdinati) {
  casella.aggiorna((s) => {
    idOrdinati.forEach((id, n) => {
      const h = s.habits.find((x) => x.id === id);
      if (h) { h.order = (n + 1) * 10; h.up = Date.now(); }
    });
  });
}

export function scriviMeta(patch) {
  casella.aggiorna((s) => { Object.assign(s.meta, patch); s.metaUp = Date.now(); });
}

/* =========================================================================
   LE PARTI DI UN'ABITUDINE.

   Nasce da un caso concreto: «integratori» è una spunta sola, ma dentro ci
   sono quattro cose in tre momenti diversi della giornata — omega 3 e D3 al
   mattino, creatina prima dell'allenamento, magnesio la sera. Con una
   casella unica la spunti la sera per tutte e quattro, e il dato smette di
   dire qualcosa.

   Una parte è un figlio con la sua fascia oraria e la sua spunta. Il log
   riusa `idLog` con la chiave `<habitId>#<parteId>`, quindi indice, lapidi
   e fusione del sync funzionano già senza una riga in più.

   Un'abitudine con parti risulta fatta quando TUTTE le sue parti lo sono.

   DUE CAMPI FACOLTATIVI sul genitore, e parlano tutti e due delle parti.

     `orari`     un promemoria PER FASCIA — { mattina: "08:00", sera: "22:30" }.
                 Con le parti il vecchio `remind`, che era uno solo per
                 abitudine, non basta più: la skincare ne vuole due e gli
                 integratori tre. Chi ha le parti usa questo e ignora quello.
     `sequenza`  l'ordine dell'array non è una preferenza ma una regola.
                 Vero per la skincare — il detergente prima di tutto, la
                 protezione solare per ultima — falso per gli integratori,
                 dove magnesio e creatina non hanno un ordine fra loro.
   ========================================================================= */

export const FASCE = {
  mattina:     { nome: "Mattina",         da: 5,  a: 12, ordine: 1 },
  pomeriggio:  { nome: "Pomeriggio",      da: 12, a: 18, ordine: 2 },
  preWorkout:  { nome: "Pre-allenamento", da: 15, a: 21, ordine: 3 },
  sera:        { nome: "Sera",            da: 18, a: 24, ordine: 4 },
  qualsiasi:   { nome: "Quando capita",   da: 0,  a: 24, ordine: 5 },
};

/** La chiave di log di una parte. Deliberatamente la stessa di un'abitudine. */
export const chiaveParte = (habitId, parteId) => `${habitId}#${parteId}`;

export const partiDi = (h) => (Array.isArray(h?.parti) ? h.parti : []);

export const parteFatta = (habitId, parteId, data) =>
  eFatta(chiaveParte(habitId, parteId), data);

export const alternaParte = (habitId, parteId, data) =>
  alterna(chiaveParte(habitId, parteId), data);

/**
 * La fascia è «adesso»? Il pre-allenamento si sovrappone di proposito al
 * pomeriggio e alla sera: non si sa a che ora ci si allena, e un promemoria
 * che compare solo alle 15 in punto non serve a nessuno.
 */
export function fasciaAdesso(ora = new Date().getHours()) {
  const dentro = Object.entries(FASCE)
    .filter(([id, f]) => id !== "qualsiasi" && ora >= f.da && ora < f.a)
    .map(([id]) => id);
  return dentro.length ? dentro : ["qualsiasi"];
}

/**
 * A che punto è una fascia rispetto a ORA.
 *
 * `"presto"` non è ancora il momento · `"adesso"` è il momento ·
 * `"tardi"` il momento è passato e la cosa non è stata fatta.
 *
 * La distinzione serve perché la prima versione faceva sparire i promemoria
 * quando la fascia finiva: alle due del pomeriggio la vitamina D dimenticata
 * la mattina non compariva più da nessuna parte, e il promemoria che serviva
 * di più era proprio quello.
 */
export function statoFascia(fascia, ora = new Date().getHours()) {
  const f = FASCE[fascia] || FASCE.qualsiasi;
  if (fascia === "qualsiasi") return "adesso";
  if (ora < f.da) return "presto";
  if (ora < f.a) return "adesso";
  return "tardi";
}

/* =========================================================================
   I GRUPPI: le parti raccolte per fascia.

   Nasce dalla skincare, e migliora anche gli integratori. Con la lista
   piatta ogni riga si portava dietro la sua etichetta — «Mattina»,
   «Mattina», «Mattina» — che è rumore ripetuto tre volte, e la routine
   della sera si mescolava a quella del mattino in un elenco solo. Raccolte,
   diventano due blocchi con un'intestazione sola, che è come sono fatte
   nella testa di chi le fa: due momenti, non sei caselle.

   L'ordine DENTRO il gruppo è quello dell'array, non alfabetico né per id.
   Per la skincare non è una preferenza ma chimica: il detergente prima di
   tutto, la protezione solare per ultima.
   ========================================================================= */

export function gruppiParti(h) {
  const gruppi = new Map();
  for (const p of partiDi(h)) {
    const f = p.fascia || "qualsiasi";
    if (!gruppi.has(f)) gruppi.set(f, []);
    gruppi.get(f).push(p);
  }
  return [...gruppi.entries()]
    .map(([fascia, parti]) => ({
      fascia,
      nome: FASCE[fascia]?.nome || "",
      ora: (h.orari || {})[fascia] || "",
      parti,
    }))
    .sort((a, b) => (FASCE[a.fascia]?.ordine || 9) - (FASCE[b.fascia]?.ordine || 9));
}

/** Le fasce davvero usate dalle parti, in ordine di giornata. */
export const fasceUsate = (h) => gruppiParti(h).map((g) => g.fascia);

/* =========================================================================
   I SEMI: le routine che ATLAS sa comporre da sé.

   La skincare è sei passaggi in due momenti, sempre gli stessi. Farli
   scrivere a mano uno per uno è mezz'ora di dita sul telefono per una cosa
   che si sa già. Quindi l'app la compone — UNA VOLTA.

   Due lucchetti, e servono tutti e due.

   `semi` è l'elenco di quello che è già stato composto, e si fonde per
   UNIONE: nessuno lo accorcia mai. È la forma che regge il guasto tipico
   di questo archivio — il dispositivo appena installato, che semina prima
   di aver letto. Un insieme che cresce e basta non può perdere un
   confronto. Dentro `meta` invece l'avrebbe perso di sicuro: `meta` si
   fonde a blocchi su un timestamp solo, e un `metaUp` di fabbrica butta via
   l'intero blocco. È il guasto del 2 settembre, e non si ripete.

   Il secondo lucchetto è l'ID FISSO. Se l'abitudine c'è — viva, archiviata
   o con la lapide sopra — non si ricrea. Cancellarla deve restare una
   decisione, non qualcosa che l'app annulla al riavvio dopo.
   ========================================================================= */

const ROUTINE_SKINCARE = {
  id: "h_skincare",
  name: "Skincare",
  emoji: "💧",
  tint: "mint",
  sched: { type: "daily", days: [1, 2, 3, 4, 5, 6, 0], times: 3 },
  // L'ordine conta: gli attivi prima della crema, la protezione per ultima.
  sequenza: true,
  orari: { mattina: "08:00", sera: "22:30" },
  parti: [
    { id: "pt_sk_m1", nome: "Cleanser",  fascia: "mattina" },
    { id: "pt_sk_m2", nome: "Idratante", fascia: "mattina" },
    { id: "pt_sk_m3", nome: "SPF",       fascia: "mattina" },
    { id: "pt_sk_s1", nome: "Cleanser",  fascia: "sera" },
    { id: "pt_sk_s2", nome: "Benzac 5%", fascia: "sera" },
    { id: "pt_sk_s3", nome: "Idratante", fascia: "sera" },
  ],
};

const ROUTINE = { skincare: ROUTINE_SKINCARE };

/**
 * Compone le routine che mancano. Si può chiamare quante volte si vuole.
 *
 * VA CHIAMATA DOPO LA PRIMA LETTURA del sync, non all'avvio: seminare prima
 * di aver letto è lo stesso identico errore dello scrivere prima di aver
 * letto, e produce lo stesso risultato — un'abitudine cancellata su un
 * dispositivo che torna in vita dall'altro, con un `up` più fresco della
 * lapide. La regola di `core/sync.js` vale anche qui.
 *
 * @returns {string[]} i nomi delle routine composte ora (vuoto se niente)
 */
export function semina() {
  // IL CONTROLLO STA FUORI DALLA SCRITTURA, e non è pignoleria.
  //
  // `casella.aggiorna` avvisa comunque chi osserva, anche quando non
  // cambia niente, e chi osserva qui chiede un giro di sync. Con la
  // chiamata dentro `ridisegna` — cioè alla fine di ogni giro — bastava a
  // far ripartire il giro successivo: due secondi e mezzo e daccapo, per
  // sempre, senza che niente cambiasse mai.
  const gia = Array.isArray(stato().semi) ? stato().semi : [];
  const daFare = Object.keys(ROUTINE).filter((n) => !gia.includes(n));
  if (!daFare.length) return [];

  const nuove = [];
  casella.aggiorna((s) => {
    s.semi = Array.isArray(s.semi) ? s.semi : [];
    for (const nome of daFare) {
      const modello = ROUTINE[nome];
      // Anche le lapidi contano: `s.habits` le contiene finché non scadono,
      // e una lapide vuol dire che l'hai cancellata apposta.
      const esiste = s.habits.some((h) => h && h.id === modello.id);
      // Il seme si marca comunque: il lucchetto è «gliel'abbiamo già
      // proposta», non «ce l'ha».
      s.semi.push(nome);
      if (esiste) continue;
      const ora = Date.now();
      const massimo = s.habits.reduce((m, h) => Math.max(m, h.order ?? 0), 0);
      s.habits.push({
        ...modello,
        parti: modello.parti.map((p) => ({ ...p })),
        archived: false,
        created: ora,
        order: massimo + 10,
        up: ora,
      });
      nuove.push(nome);
    }
  });
  if (nuove.length) indice = null;
  return nuove;
}
