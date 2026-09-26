// moduli/abitudini/p50.js — Project 50: la sfida tutto-o-niente.
//
// PERCHÉ È UN FILE A SÉ. Il resto del modulo tratta un'abitudine come una
// cosa che puoi fare o non fare, senza conseguenze: spunti, non spunti, la
// serie si allunga o si accorcia. Qui la regola è un'altra — otto voci non
// negoziabili, e se ne manca una il contatore riparte da uno — e mescolarla
// con quella di prima vorrebbe dire riempire ogni funzione di un «se sei in
// Project 50». Sono due logiche, e stanno in due file.
//
// LA COSA CHE REGGE TUTTO: IL GIORNO CHIUSO È IMMUTABILE.
//
// Non è una scelta estetica. Un contatore che si può sistemare il giorno
// dopo non conta niente: basta ricordarsi di tornare indietro e spuntare, e
// la sfida diventa un modulo da compilare. Quindi una chiusura è un RECORD,
// con la sua data e il suo esito, e da quel momento quel giorno non si
// tocca più. Le spunte restano modificabili finché il giorno è aperto, e
// smettono di contare quando lo chiudi.
//
// Il numero del giorno NON si tiene in una variabile che si incrementa.
// Sarebbe un numero che si può solo perdere: un dispositivo che sincronizza
// con uno stato vecchio lo riporterebbe indietro, e nessuno se ne
// accorgerebbe fino al giorno del reset. Si ricava dalle chiusure, che sono
// record con id e `up` come tutto il resto — e quindi si fondono bene.

import { oggiISO, piuGiorni, daISO, isoDi } from "../../core/ui.js";
import { casella, stato, abitudiniVive, statoDi, partiDi, parteFatta } from "./dati.js";

export const TOTALE = 50;

/* I dati della sfida vivono nella casella di Abitudini — `chiusure`,
   `serate`, `p50` — e non in una loro. Regola 3: un file di dati per
   modulo. Una casella in più vorrebbe dire un canale di sync in più, un
   file in più sul repo e due sha da tenere allineati per due cose che si
   leggono sempre insieme.

   La forma dei record è quella di sempre: `id` stabile, `up` a ogni
   scrittura, lapide per le cancellazioni. Per le chiusure l'id è la DATA,
   quindi due dispositivi che chiudono lo stesso giorno scrivono lo stesso
   record e la fusione ne tiene uno: senza id deterministico ne resterebbero
   due, e il contatore salterebbe di un giorno senza motivo apparente. */

export const PREDEFINITO_P50 = { attivo: false, inizio: "", quotaSerate: 2 };

export const config = () => stato().p50 || PREDEFINITO_P50;
export const attivo = () => Boolean(config().attivo);

export function scriviConfig(patch) {
  casella.aggiorna((s) => {
    s.p50 = { ...PREDEFINITO_P50, ...(s.p50 || {}), ...patch };
    s.p50Up = Date.now();
  });
}

/** Accende la sfida da oggi. */
export const comincia = (data = oggiISO()) =>
  scriviConfig({ attivo: true, inizio: data });

/* ========================================================== le chiusure == */

const vive = (elenco) => (elenco || []).filter((r) => r && !r.del);

export const chiusure = () =>
  vive(stato().chiusure).sort((a, b) => String(a.data).localeCompare(String(b.data)));

export const chiusuraDi = (data) => chiusure().find((c) => c.data === data) || null;
export const giornoChiuso = (data) => Boolean(chiusuraDi(data));

/**
 * A che giorno della sfida siamo.
 *
 * Si legge dall'ULTIMA chiusura e non da un contatore: `prossimo` dice a
 * che numero riparte il giorno dopo, e ce l'ha scritto dentro chi ha chiuso.
 * Un giorno mai chiuso non fa avanzare niente — è la conseguenza diretta
 * dell'immutabilità, e vale la pena saperla: saltare la chiusura non è un
 * modo per salvarsi, è un giorno che non è mai esistito.
 */
export function giornoCorrente(data = oggiISO()) {
  const mia = chiusuraDi(data);
  if (mia) return mia.giorno;
  const precedenti = chiusure().filter((c) => c.data < data);
  const ultima = precedenti[precedenti.length - 1];
  return ultima ? ultima.prossimo : 1;
}

/* ========================================================== le otto voci == */

/** Le abitudini del blocco, in ordine. */
export const delBlocco = (blocco) =>
  abitudiniVive().filter((h) => (h.blocco || "supporto") === blocco);

export const ottoVoci = () => delBlocco("p50");

/**
 * Una voce è fatta in quel giorno?
 *
 * Con le PARTI vale la regola della spec: la riga è completa solo quando
 * tutti i sotto-elementi lo sono. Non è una sottigliezza — «morning routine»
 * spuntata con due terzi fatti sarebbe esattamente il mezzo successo che
 * questa sfida esiste per non concedere.
 */
export function voceFatta(h, data) {
  const parti = partiDi(h);
  if (parti.length) return parti.every((p) => parteFatta(h.id, p.id, data));
  return statoDi(h.id, data) === "fatta";
}

/** Una voce è prevista in quel giorno? (il workout la domenica non lo è) */
export function vocePrevista(h, data) {
  const giorni = h?.sched?.days;
  if (!Array.isArray(giorni) || !giorni.length) return true;
  return giorni.includes(daISO(data).getDay());
}

/** Come sta il giorno: quante voci previste, quante fatte, quali mancano. */
export function bilancio(data = oggiISO()) {
  const voci = ottoVoci().filter((h) => vocePrevista(h, data));
  const mancate = voci.filter((h) => !voceFatta(h, data));
  return {
    previste: voci.length,
    fatte: voci.length - mancate.length,
    mancate: mancate.map((h) => h.id),
    nomiMancate: mancate.map((h) => h.name),
    completo: voci.length > 0 && mancate.length === 0,
  };
}

/* ========================================================= le serate fuori */

export const lunediDi = (data = oggiISO()) => {
  const d = daISO(data);
  const dow = (d.getDay() + 6) % 7;
  return piuGiorni(isoDi(d), -dow);
};

export const serateDi = (data = oggiISO()) => {
  const lun = lunediDi(data);
  return vive(stato().serate).find((r) => r.lunedi === lun)?.usate || 0;
};

/** La domenica della settimana di `data`: il giorno in cui la quota si giudica. */
export const domenicaDi = (data = oggiISO()) => piuGiorni(lunediDi(data), 6);

/**
 * Le serate di quella settimana sono ancora modificabili?
 *
 * Smettono di esserlo quando la domenica è chiusa: da quel momento la
 * quota è già stata giudicata e il suo verdetto è dentro un record. Poterle
 * ritoccare dopo cambierebbe la premessa di una penalità già applicata.
 */
export const serateBloccate = (data = oggiISO()) => giornoChiuso(domenicaDi(data));

/** Segna (o toglie) una serata fuori di questa settimana. */
export function scriviSerate(usate, data = oggiISO()) {
  if (serateBloccate(data)) return serateDi(data);
  const lun = lunediDi(data);
  const n = Math.max(0, Math.min(config().quotaSerate ?? 2, Math.round(usate)));
  casella.aggiorna((s) => {
    if (!Array.isArray(s.serate)) s.serate = [];
    const i = s.serate.findIndex((r) => r.id === lun);
    const rec = { id: lun, lunedi: lun, usate: n, del: false, up: Date.now() };
    if (i >= 0) s.serate[i] = rec; else s.serate.push(rec);
  });
  return n;
}

/* ========================================================== la chiusura == */

export const DALLE_ORE = 21;

/** Si può chiudere? Prima delle 21 no: un giorno non è finito alle sei. */
export const siPuoChiudere = (ora = new Date().getHours()) => ora >= DALLE_ORE;

/**
 * Perché NON si può chiudere quel giorno: `"si"` quando si può.
 *
 *   "chiuso"    c'è già una chiusura, e una chiusura non si rifà
 *   "non-oggi"  è un altro giorno
 *   "presto"    è oggi ma non sono ancora le 21
 *
 * SI CHIUDE SOLO IL GIORNO IN CUI SEI, e questa è la regola che tiene in
 * piedi tutte le altre. Le spunte di un giorno passato restano
 * modificabili — è il resto del modulo, e va bene così per un'abitudine —
 * quindi poter chiudere ieri vorrebbe dire completarlo stamattina e
 * chiuderlo con otto su otto. Il contatore diventerebbe la misura di
 * quanto ti ricordi di tornare indietro, che è l'esatto contrario di
 * quello che deve misurare.
 *
 * Il prezzo è che un giorno non chiuso è perso: non fa ripartire il
 * contatore, ma nemmeno lo fa salire. Non è una svista, è l'altra faccia
 * della stessa regola — saltare la chiusura non salva, è un giorno che non
 * è mai esistito.
 */
export function chiudibile(data = oggiISO(), adesso = new Date()) {
  if (giornoChiuso(data)) return "chiuso";
  if (data !== isoDi(adesso)) return "non-oggi";
  if (adesso.getHours() < DALLE_ORE) return "presto";
  return "si";
}

/**
 * Che cosa produrrebbe la chiusura di quel giorno. PURA: non scrive niente.
 *
 * Esiste perché il foglio deve dire la conseguenza PRIMA di chiedere
 * conferma — «il contatore riparte da 1» è la sola cosa che conta in quel
 * momento — e la regola che la calcola deve restare una sola. Scritta due
 * volte, quella del foglio e quella del record divergono al primo ritocco,
 * e il foglio prometterebbe un numero diverso da quello che poi ti trovi.
 */
export function esito(data = oggiISO()) {
  const b = bilancio(data);
  const giorno = giornoCorrente(data);
  const domenica = daISO(data).getDay() === 0;
  const quota = config().quotaSerate ?? 2;
  const usate = serateDi(data);
  /* LA PENALITÀ DELLE SERATE si applica solo la domenica, ed è una cosa
     diversa dal fallire il giorno: il giorno può essere pieno e la
     settimana no. Toglie sette giorni e non azzera — sette è la settimana
     che non hai rispettato. */
  const penalita = domenica && usate < quota;

  let prossimo;
  if (!b.completo) prossimo = 1;
  else if (penalita) prossimo = Math.max(1, giorno + 1 - 7);
  else prossimo = Math.min(TOTALE, giorno + 1);

  return {
    data, giorno, prossimo,
    esito: b.completo ? "ok" : "no",
    completo: b.completo,
    mancate: b.mancate,
    nomiMancate: b.nomiMancate,
    previste: b.previste,
    fatte: b.fatte,
    domenica,
    serate: { usate, quota, penalita },
  };
}

/**
 * Chiude il giorno. Da qui in poi quel giorno non si tocca più.
 *
 * Il calcolo del giorno successivo viene SCRITTO NEL RECORD invece di
 * essere ricavato ogni volta da chi legge. Il motivo è che la regola può
 * cambiare — la penalità delle serate è arrivata dopo — e una regola che
 * cambia non deve riscrivere il passato: i giorni già chiusi tengono il
 * numero che avevano quando sono stati chiusi.
 *
 * Torna `null` se non si poteva chiudere: il controllo sta qui e non solo
 * nella schermata, perché è la regola della sfida e non un dettaglio di
 * interfaccia.
 */
export function chiudi(data = oggiISO(), adesso = new Date()) {
  if (giornoChiuso(data)) return chiusuraDi(data);
  if (chiudibile(data, adesso) !== "si") return null;

  const e = esito(data);
  const rec = {
    id: data, data,
    giorno: e.giorno,
    esito: e.esito,
    mancate: e.mancate,
    serate: e.serate,
    prossimo: e.prossimo,
    del: false, up: Date.now(),
  };
  casella.aggiorna((s) => {
    if (!Array.isArray(s.chiusure)) s.chiusure = [];
    const i = s.chiusure.findIndex((c) => c.id === data);
    if (i >= 0) s.chiusure[i] = rec; else s.chiusure.push(rec);
  });
  return rec;
}

/* ========================================================== la revisione == */

/** I 50 giorni come griglia: stesso ordine della lavagna fisica. */
export function griglia() {
  const c = chiusure();
  const perNumero = new Map();
  // Un numero può essere stato vissuto più volte (dopo un reset): vince
  // l'ULTIMA volta, che è quella che stai vivendo adesso.
  for (const x of c) perNumero.set(x.giorno, x);
  const oggi = giornoCorrente();
  return Array.from({ length: TOTALE }, (_, i) => {
    const n = i + 1;
    const x = perNumero.get(n);
    return {
      n,
      esito: x ? x.esito : null,
      data: x?.data || null,
      oggi: n === oggi && !chiusuraDi(oggiISO()),
    };
  });
}

/** Quale voce ti ha fatto ripartire più spesso. */
export function colpevoli() {
  const conto = new Map();
  for (const c of chiusure()) {
    if (c.esito !== "no") continue;
    for (const id of c.mancate || []) conto.set(id, (conto.get(id) || 0) + 1);
  }
  const nomi = new Map(abitudiniVive({ conArchiviate: true }).map((h) => [h.id, h.name]));
  return [...conto.entries()]
    .map(([id, volte]) => ({ id, nome: nomi.get(id) || "—", volte }))
    .sort((a, b) => b.volte - a.volte);
}

/** Quante volte sei ripartito, in tutto. */
export const ripartenze = () => chiusure().filter((c) => c.esito === "no").length;
