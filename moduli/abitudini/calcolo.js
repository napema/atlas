// moduli/abitudini/calcolo.js — funzioni pure: stato → numeri.
//
// Nessun DOM, nessun localStorage, nessuna scrittura. È questa purezza che
// rende possibile `oggi()`: la home ha bisogno dei numeri di Abitudini
// senza montarne l'interfaccia.
//
// Tre tipi di pianificazione, e vale la pena averli chiari perché uno dei
// tre si comporta diversamente da come ci si aspetta:
//
//   daily   ogni giorno. `days` e `times` sono ignorati.
//   days    solo nei giorni elencati in `days` (0 = domenica, alla JS).
//   weekly  `times` volte A SETTIMANA, giorno libero. Non "times al giorno":
//           quell'errore produce una schermata che chiede tre spunte
//           quando ne serve una.
//
// `weekly` è l'unico che non si risolve guardando il solo giorno: per
// sapere se è attesa oggi bisogna contare i log della settimana.

import { abitudiniVive, eFatta, eSaltata, stato, partiDi, parteFatta, FASCE, statoFascia } from "./dati.js";
import { isoDi, daISO, piuGiorni, oggiISO } from "../../core/ui.js";
import { leggiFatto } from "../../core/contesto.js";

const PREDEFINITA = { type: "daily", days: [1, 2, 3, 4, 5, 6, 0], times: 3 };

export const pianoDi = (h) => h.sched || PREDEFINITA;

/** Il giorno della settimana alla JavaScript: 0 = domenica. */
export const dowDi = (iso) => daISO(iso).getDay();

/** Il primo giorno della settimana che contiene `iso`, secondo le preferenze. */
export function inizioSettimana(iso) {
  const primo = stato().meta.weekStart === 0 ? 0 : 1;
  const d = daISO(iso);
  d.setDate(d.getDate() - ((d.getDay() - primo + 7) % 7));
  return isoDi(d);
}

export function giorniSettimana(iso) {
  const s = inizioSettimana(iso);
  return Array.from({ length: 7 }, (_, i) => piuGiorni(s, i));
}

/** Quante volte è stata fatta nella settimana di `iso`. */
export const conteggioSettimana = (h, iso) =>
  giorniSettimana(iso).filter((g) => fattaIl(h, g)).length;

/**
 * L'abitudine esiste in quel giorno? Un'abitudine creata ieri non è
 * "saltata" tutti i giorni precedenti — senza questo controllo ogni nuova
 * abitudine nascerebbe con una serie interrotta alle spalle.
 */
export function ePrevista(h, iso) {
  if (h.created && iso < isoDi(new Date(h.created))) return false;
  const p = pianoDi(h);
  if (p.type === "days") return (p.days || []).includes(dowDi(iso));
  return true;   // daily e weekly esistono tutti i giorni
}

/**
 * Una settimanale diventa OBBLIGATORIA il giorno in cui saltarla ti farebbe
 * mancare la quota: quando i giorni rimasti bastano appena.
 *
 * È la regola che rende utile il tipo `weekly`. Senza, l'app o la chiede
 * ogni giorno (e allora tanto vale che sia `daily`) o non la chiede mai.
 */
export function settimanaleObbligatoria(h, iso) {
  const p = pianoDi(h);
  const quota = Math.max(1, p.times || 1);
  const fatte = conteggioSettimana(h, iso);
  if (fatte >= quota) return false;
  const giorni = giorniSettimana(iso);
  const i = giorni.indexOf(iso);
  if (i < 0) return false;
  const rimasti = 7 - i;               // oggi compreso
  return quota - fatte >= rimasti;
}

/* L'ABITUDINE CHE SEGUE IL PIANO DI TRAINING, riconosciuta per NOME.
   È lo stesso riconoscimento grossolano della sessione di Mobilità in
   `contratto.js`, e per lo stesso motivo: legarla con un id vorrebbe dire
   che Abitudini conosce Training, che è esattamente l'accoppiamento che il
   bus e la lavagna esistono per evitare. */
export const SEGUE_TRAINING = /workout|allenamen|palestra/i;

/**
 * Il piano di Training dice qualcosa su quel giorno? `true`/`false` se sì,
 * `null` se non ne sa abbastanza e l'abitudine deve arrangiarsi da sé.
 *
 * Sta QUI e non in p50.js perché vale per tutto il modulo: la home, la
 * lista del giorno e la chiusura devono dare la stessa risposta, e prima
 * la davano diversa — la chiusura seguiva il piano, la checklist della
 * home il calendario dell'abitudine.
 *
 * `giorni-scelti` distingue «oggi è riposo» da «al piano non hai ancora
 * dato i giorni»: senza, un piano senza giorni regalerebbe una voce libera
 * ogni giorno.
 */
export function secondoTraining(h, iso) {
  if (!SEGUE_TRAINING.test(h?.name || "")) return null;
  /* Fuori dal blocco il piano HA una risposta, ed e' «niente oggi». E'
     diversa dal silenzio: col silenzio l'abitudine ripiega sul proprio
     calendario e si da' per prevista, ed e' quello che faceva nei giorni
     fra la fine di una fase e l'inizio di quella dopo. */
  if (leggiFatto("allenamenti", "fuori-blocco", iso)) return false;
  const scelti = leggiFatto("allenamenti", "giorni-scelti", iso);
  const previsti = leggiFatto("allenamenti", "oggi-previsti", iso);
  if (typeof previsti !== "number" || !scelti) return null;
  return previsti > 0;
}

/**
 * Una delle otto è prevista in quel giorno?
 *
 * Nella sfida `days` vale anche con `type: "daily"`: il workout è seminato
 * «ogni giorno, lunedì-sabato», ed è la sfida che ha deciso di leggerlo
 * così. FUORI dalla sfida `days` con `daily` resta ignorato come dice lo
 * schema — nell'archivio di partenza ci sono abitudini giornaliere con
 * giorni residui, e onorarli le spegnerebbe il fine settimana.
 *
 * Stava in p50.js, e la home rispondeva con la regola del modulo invece
 * che con questa: il workout era «non previsto oggi» nella schermata della
 * sfida e «da fare» nella checklist della home, nello stesso momento.
 */
export function previstaNellaSfida(h, iso) {
  const dalPiano = secondoTraining(h, iso);
  if (dalPiano !== null) return dalPiano;
  const giorni = h?.sched?.days;
  if (!Array.isArray(giorni) || !giorni.length) return true;
  return giorni.includes(dowDi(iso));
}

const nelleOtto = (h) => Boolean(stato().p50?.attivo) && h?.blocco === "p50";

/** È attesa oggi? Per le settimanali: solo se obbligatoria o già fatta. */
export function eAttesa(h, iso) {
  if (h.created && iso < isoDi(new Date(h.created))) return false;
  if (nelleOtto(h)) return previstaNellaSfida(h, iso);
  const dalPiano = secondoTraining(h, iso);
  if (dalPiano !== null) return dalPiano;
  if (!ePrevista(h, iso)) return false;
  if (pianoDi(h).type === "weekly") return settimanaleObbligatoria(h, iso) || fattaIl(h, iso);
  return true;
}

/** Quante attese e quante fatte in un giorno. È il numero che vede la home. */
export function progressoGiorno(iso = oggiISO()) {
  let attese = 0, fatte = 0;
  for (const h of abitudiniVive()) {
    if (!ePrevista(h, iso)) continue;
    const p = pianoDi(h);
    if (p.type === "weekly") {
      // Una settimanale entra nel conteggio del giorno solo se è già stata
      // fatta o se oggi è diventata obbligatoria. Altrimenti gonfierebbe il
      // denominatore ogni giorno per una cosa che è in pari.
      if (fattaIl(h, iso)) { attese++; fatte++; }
      else if (settimanaleObbligatoria(h, iso)) attese++;
      continue;
    }
    // Un'abitudine con parti conta per le sue parti: «integratori» sono
    // quattro spunte in tre momenti diversi, e contarla come una sola
    // faceva sembrare completa una giornata in cui ne avevi presi due.
    const parti = partiDi(h);
    if (parti.length) {
      // Vale UNA, non quante sono le parti: «integratori» è un'abitudine
      // sola anche se dentro ci sono quattro pastiglie. Contarle a una a una
      // gonfiava il denominatore e faceva sembrare la giornata piena di cose
      // da fare quando la cosa da fare era una.
      attese++;
      if (parti.every((p) => parteFatta(h.id, p.id, iso))) fatte++;
      continue;
    }
    attese++;
    if (eFatta(h.id, iso)) fatte++;
  }
  /* UN GIORNO SENZA NIENTE IN PROGRAMMA NON È UN GIORNO COMPLETATO.

     `frazione` valeva 1 quando `attese` era 0 — zero su zero letto come
     «tutto fatto» — e il risultato si vedeva in due punti: la striscia
     della settimana mostrava sei anelli verdi pieni, e la carta eroe
     scriveva «Giornata libera · nessuna abitudine prevista» accanto a un
     anello al 100%. Nello stesso momento la carta Costanza della home
     diceva «7 giorni senza spuntare niente», perché lei il caso lo
     trattava già a parte (stato `riposo`). Due schermate sullo stesso
     dato che dicevano il contrario.

     Ora il caso è DICHIARATO invece che nascosto dentro un numero:

       · `riposo` dice che non c'era niente da fare. Non è «bene» e non è
         «male»: non hai mancato nulla, e infatti non spezza la serie.
       · `frazione` vale 0, non 1. È un valore che finisce dentro un
         riempimento — un anello, una barra — e un riempimento pieno vuol
         dire «completato». Quando non c'è niente da completare il pieno è
         una bugia; il vuoto almeno non afferma niente. È anche la scelta
         che fa già `allenamenti/calcolo.js` sulla stessa forma.

     CHI LEGGE `frazione` DEVE GUARDARE PRIMA `riposo`: lo 0 da solo si
     legge come «non hai fatto niente», che è l'altra bugia. La convenzione
     per mostrarlo è quella della home — spento e più tenue, mai un rosso o
     uno zero in evidenza. Vedi `.og-sett-g[data-stato="riposo"]`. */
  const riposo = attese === 0;
  return { attese, fatte, riposo, frazione: riposo ? 0 : fatte / attese };
}

/**
 * È fatta quel giorno?
 *
 * UNICO punto in cui si risponde a questa domanda. Un'abitudine con parti
 * non ha un log proprio — ha quelli delle parti — quindi `eFatta(h.id, d)`
 * su di lei è sempre falso: serie, costanza e conteggi la davano per saltata
 * ogni singolo giorno. Tutto il modulo passa di qui.
 */
export function fattaIl(h, iso) {
  const parti = partiDi(h);
  if (parti.length) return parti.every((p) => parteFatta(h.id, p.id, iso));
  return eFatta(h.id, iso);
}

/**
 * Chiusa: fatta o dichiarata saltata. In un modo o nell'altro, oggi non ha
 * più niente da chiedere.
 *
 * Un'abitudine con parti non si può saltare in blocco — si saltano le
 * singole parti — quindi per lei conta solo l'essere fatta.
 */
export const chiusaIl = (h, iso) =>
  fattaIl(h, iso) || (!partiDi(h).length && eSaltata(h.id, iso));

/** Le abitudini ancora da spuntare oggi. Le saltate non mancano più. */
export const mancantiOggi = (iso = oggiISO()) =>
  abitudiniVive().filter((h) => eAttesa(h, iso) && !chiusaIl(h, iso));

/**
 * La serie in corso.
 *
 * Il dettaglio che conta: se oggi è prevista ma non ancora fatta, la serie
 * NON è spezzata — è solo "non ancora". Senza questa riga la striscia si
 * azzera ogni mattina e l'app diventa scoraggiante invece che motivante.
 */
export function serie(h, oggi = oggiISO()) {
  const p = pianoDi(h);

  if (p.type === "weekly") {
    const quota = Math.max(1, p.times || 1);
    let n = 0;
    let settimana = inizioSettimana(oggi);
    // La settimana corrente conta solo se la quota è già raggiunta.
    if (conteggioSettimana(h, settimana) >= quota) n++;
    settimana = piuGiorni(settimana, -7);
    for (let g = 0; g < 260; g++) {
      if (h.created && settimana < isoDi(new Date(h.created))) break;
      if (conteggioSettimana(h, settimana) < quota) break;
      n++;
      settimana = piuGiorni(settimana, -7);
    }
    return n;
  }

  let d = oggi, n = 0;
  if (ePrevista(h, d) && !fattaIl(h, d)) d = piuGiorni(d, -1);
  for (let i = 0; i < 730; i++) {
    if (h.created && d < isoDi(new Date(h.created))) break;
    if (!ePrevista(h, d)) { d = piuGiorni(d, -1); continue; }
    if (!fattaIl(h, d)) break;
    n++;
    d = piuGiorni(d, -1);
  }
  return n;
}

export function serieMigliore(h, oggi = oggiISO()) {
  const p = pianoDi(h);
  const partenza = h.created ? isoDi(new Date(h.created)) : piuGiorni(oggi, -365);
  let migliore = 0, corrente = 0;

  if (p.type === "weekly") {
    const quota = Math.max(1, p.times || 1);
    let w = inizioSettimana(partenza);
    const fine = inizioSettimana(oggi);
    while (w <= fine) {
      if (conteggioSettimana(h, w) >= quota) migliore = Math.max(migliore, ++corrente);
      else corrente = 0;
      w = piuGiorni(w, 7);
    }
    return migliore;
  }

  let d = partenza, guardia = 0;
  while (d <= oggi && guardia++ < 1500) {
    if (ePrevista(h, d)) {
      if (fattaIl(h, d)) migliore = Math.max(migliore, ++corrente);
      else corrente = 0;
    }
    d = piuGiorni(d, 1);
  }
  return migliore;
}

/** La percentuale sugli ultimi N giorni previsti. */
export function costanza(h, giorni = 30, oggi = oggiISO()) {
  let previsti = 0, fatti = 0, d = oggi;
  for (let i = 0; i < giorni; i++) {
    if (ePrevista(h, d)) { previsti++; if (fattaIl(h, d)) fatti++; }
    d = piuGiorni(d, -1);
  }
  return previsti ? Math.round((fatti * 100) / previsti) : 0;
}

/** L'etichetta leggibile del piano. */
export function etichettaPiano(h) {
  const p = pianoDi(h);
  if (p.type === "daily") return "Ogni giorno";
  if (p.type === "weekly") return `${p.times || 1}× a settimana`;
  const primo = stato().meta.weekStart === 0 ? 0 : 1;
  const giorni = [...(p.days || [])].sort((a, b) => ((a - primo + 7) % 7) - ((b - primo + 7) % 7));
  if (!giorni.length) return "Nessun giorno";
  if (giorni.length === 7) return "Ogni giorno";
  const nomi = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];
  return giorni.map((d) => nomi[d]).join(" · ");
}

/* ---------------------------------------------------------- i promemoria */
/*
   Le parti non ancora spuntate la cui fascia è ADESSO.

   È la ragione per cui le parti esistono: la home non deve dire «ti mancano
   4 integratori», deve dire «prendi il magnesio», perché alle dieci di sera
   il magnesio è l'unica delle quattro che ha ancora senso.
*/

export function promemoriaAdesso(iso = oggiISO(), ora = new Date().getHours()) {
  const out = [];
  for (const h of abitudiniVive()) {
    if (!ePrevista(h, iso)) continue;
    for (const p of partiDi(h)) {
      const f = p.fascia || "qualsiasi";
      const quando = statoFascia(f, ora);
      // «presto» no: ricordare alle otto del mattino il magnesio della sera
      // è rumore. «tardi» sì, ed è il caso che conta di più — la prima
      // versione faceva sparire il promemoria quando la fascia finiva, così
      // alle due la vitamina dimenticata la mattina non la vedeva più
      // nessuno. Proprio quella andava ricordata.
      if (quando === "presto") continue;
      if (parteFatta(h.id, p.id, iso)) continue;
      out.push({
        habitId: h.id, parteId: p.id,
        abitudine: h.name, nome: p.nome,
        emoji: h.emoji, tint: h.tint,
        fascia: f, nomeFascia: FASCE[f]?.nome || "", quando,
      });
    }
  }
  // Prima i ritardi, poi quello che tocca adesso; a parità, l'ordine naturale
  // della giornata.
  const peso = { tardi: 0, adesso: 1 };
  return out.sort((a, b) =>
    (peso[a.quando] - peso[b.quando]) ||
    ((FASCE[a.fascia]?.ordine || 9) - (FASCE[b.fascia]?.ordine || 9)));
}

/** Tutte le parti di oggi, spuntate o no. Serve al conteggio della home. */
export function partiDiOggi(iso = oggiISO()) {
  const out = [];
  for (const h of abitudiniVive()) {
    if (!ePrevista(h, iso)) continue;
    for (const p of partiDi(h)) {
      out.push({ habitId: h.id, parteId: p.id, nome: p.nome, fascia: p.fascia || "qualsiasi",
        fatta: parteFatta(h.id, p.id, iso) });
    }
  }
  return out;
}

/* ---------------------------------------------------- la giornata intera */
/*
   TUTTO quello che oggi c'e', spuntato o no, in ordine di giornata.

   `restaOggi` dice cosa MANCA, ed e' la domanda giusta per una checklist:
   le cose fatte spariscono e quello che resta sale in cima. Ma una lista
   della giornata e' un'altra cosa — serve a vedere la forma del giorno, non
   solo il debito — e una lista in cui le cose fatte non ci sono mai state
   non dice che sei a meta': dice che hai ancora tre cose da fare, cioe' la
   stessa frase di stamattina.

   Le due funzioni restano separate di proposito. Un flag `conFatte` su
   `restaOggi` avrebbe voluto dire che chi la chiama deve ricordarsi di
   passarlo giusto, e l'ordinamento e' diverso: li' prima i ritardi, qui
   l'ora del giorno.
*/

export function giornataOggi(iso = oggiISO(), ora = new Date().getHours()) {
  const out = [];
  for (const h of abitudiniVive()) {
    if (!ePrevista(h, iso)) continue;
    const parti = partiDi(h);

    if (!parti.length) {
      out.push({
        chiave: h.id, habitId: h.id, parteId: null,
        nome: h.name, emoji: h.emoji, tint: h.tint,
        fascia: null, nomeFascia: "", quando: "adesso", ordine: 5,
        // Saltata e' chiusa quanto fatta, ma non e' la stessa cosa e la
        // lista lo deve dire: una spunta grigia, non verde.
        fatta: eFatta(h.id, iso), saltata: eSaltata(h.id, iso),
      });
      continue;
    }

    for (const p of parti) {
      const f = p.fascia || "qualsiasi";
      out.push({
        chiave: `${h.id}#${p.id}`, habitId: h.id, parteId: p.id,
        nome: p.nome, dentro: h.name, emoji: h.emoji, tint: h.tint,
        fascia: f, nomeFascia: FASCE[f]?.nome || "",
        quando: statoFascia(f, ora),
        ordine: FASCE[f]?.ordine || 5,
        da: FASCE[f]?.da ?? 0,
        fatta: parteFatta(h.id, p.id, iso), saltata: false,
      });
    }
  }
  // L'ordine e' quello del GIORNO, non dell'urgenza: una lista della
  // giornata che mette in cima i ritardi non e' piu' una giornata.
  return out.sort((a, b) => (a.ordine - b.ordine) || a.nome.localeCompare(b.nome));
}

/* ------------------------------------------------------- cosa resta oggi */
/*
   La lista piatta di quello che manca: le abitudini semplici e le PARTI di
   quelle che ne hanno, mescolate e ordinate per momento della giornata.

   La home ne fa una checklist unica insieme alla sessione di mobilità. È il
   motivo per cui esiste: «cosa mi resta adesso» è una domanda sola, e finché
   la risposta stava in due schermate diverse bisognava aprirle tutte e due.
*/

export function restaOggi(iso = oggiISO(), ora = new Date().getHours()) {
  const out = [];
  for (const h of abitudiniVive()) {
    if (!eAttesa(h, iso)) continue;
    const parti = partiDi(h);

    if (!parti.length) {
      // Saltata vuol dire chiusa: sparisce da qui esattamente come una
      // fatta. È tutto il punto di poterla dichiarare.
      if (eFatta(h.id, iso) || eSaltata(h.id, iso)) continue;
      out.push({
        chiave: h.id, habitId: h.id, parteId: null,
        nome: h.name, emoji: h.emoji, tint: h.tint,
        fascia: null, nomeFascia: "", quando: "adesso", ordine: 5,
      });
      continue;
    }

    for (const p of parti) {
      if (parteFatta(h.id, p.id, iso)) continue;
      const f = p.fascia || "qualsiasi";
      out.push({
        chiave: `${h.id}#${p.id}`, habitId: h.id, parteId: p.id,
        // Il nome della parte basta: «Magnesio» dice più di «Supplements ·
        // Magnesio», e il genitore lo si mette solo se serve a distinguere.
        nome: p.nome, dentro: h.name, emoji: h.emoji, tint: h.tint,
        fascia: f, nomeFascia: FASCE[f]?.nome || "",
        quando: statoFascia(f, ora),
        ordine: FASCE[f]?.ordine || 5,
      });
    }
  }
  // Prima i ritardi, poi l'ordine della giornata. Quello che non è ancora il
  // momento resta in fondo ma NON sparisce: è comunque roba di oggi.
  const peso = { tardi: 0, adesso: 1, presto: 2 };
  return out.sort((a, b) => (peso[a.quando] - peso[b.quando]) || (a.ordine - b.ordine));
}

/* =========================================================================
   LA GIORNATA PER MOMENTI.

   La lista del giorno era divisa per IMPORTANZA — le otto della sfida in un
   blocco, il supporto in un altro — e la giornata non si vive così. La
   mattina fai la morning routine e la skincare insieme, una dopo l'altra:
   con due liste saltavi avanti e indietro fra due blocchi per fare tre cose
   nello stesso quarto d'ora.

   Ora è una lista sola divisa per MOMENTO, e l'importanza la dice la voce
   stessa (le otto hanno il segno della sfida e stanno in cima al loro
   momento). Un'abitudine con le parti finisce in più momenti, un pezzo per
   fascia: la skincare della sera non ha niente da fare nel blocco della
   mattina.

   Dove finisce una voce senza parti: nel momento del suo promemoria, se ne
   ha uno; altrimenti «In giornata». Le abitudini in negativo — «no phone»,
   «no PMO» — non hanno un'ora perché valgono tutto il giorno, ed è lì che
   devono stare.
   ========================================================================= */

export const MOMENTI = [
  { id: "mattina", nome: "Mattina" },
  { id: "giorno", nome: "In giornata" },
  { id: "sera", nome: "Sera" },
];

const MOMENTO_DI_FASCIA = {
  mattina: "mattina", pomeriggio: "giorno", preWorkout: "giorno", qualsiasi: "giorno", sera: "sera",
};

export const momentoDiFascia = (fascia) => MOMENTO_DI_FASCIA[fascia] || "giorno";

/** Il momento di un orario «HH:MM»: prima delle 12 mattina, dalle 18 sera. */
export function momentoDiOra(hhmm) {
  const ora = Number(String(hhmm || "").split(":")[0]);
  if (!Number.isFinite(ora) || !hhmm) return "giorno";
  return ora < 12 ? "mattina" : ora >= 18 ? "sera" : "giorno";
}

/**
 * Le abitudini date, distribuite nei tre momenti.
 *
 * Restituisce SOLO i momenti che hanno qualcosa: un blocco «Sera» vuoto
 * sarebbe una lastra che occupa spazio per dire che non c'è niente.
 *
 * @param {object[]} abitudini  quelle attese nel giorno
 * @param {(h: object) => boolean} [prima]  quali vanno in cima al loro momento
 * @returns {{ id, nome, voci: { h, fascia: string|null }[] }[]}
 */
export function giornataPerMomenti(abitudini, prima = () => false) {
  const per = new Map(MOMENTI.map((m) => [m.id, []]));
  for (const h of abitudini) {
    const parti = partiDi(h);
    if (!parti.length) {
      per.get(momentoDiOra(h.remind)).push({ h, fascia: null });
      continue;
    }
    // Un pezzo per fascia, e ogni pezzo nel suo momento. Due fasce che
    // cadono nello stesso momento (pomeriggio e pre-allenamento) restano
    // due pezzi: hanno orari diversi e si spuntano in momenti diversi.
    const fasce = [...new Set(parti.map((p) => p.fascia || "qualsiasi"))];
    for (const f of fasce) per.get(momentoDiFascia(f)).push({ h, fascia: f });
  }
  const ordine = (a, b) =>
    (Number(prima(b.h)) - Number(prima(a.h)))
    || ((a.h.order ?? 0) - (b.h.order ?? 0))
    || ((FASCE[a.fascia]?.ordine || 9) - (FASCE[b.fascia]?.ordine || 9));
  return MOMENTI
    .map((m) => ({ ...m, voci: per.get(m.id).sort(ordine) }))
    .filter((m) => m.voci.length);
}
