// moduli/finanze/travasi.js — quanto spostare, da dove, a dove.
//
// LA DOMANDA DA CUI NASCE. Quasi ogni domenica sera, prima di fare i
// trasferimenti della settimana, la domanda andava a una chat: «ho questi
// saldi sui pocket, quanto butto dove?». E a metà settimana, con 5 € sul
// Principale e quattro giorni davanti, la stessa domanda in versione
// urgente. È un conto, non un consiglio: lo deve fare il modulo, che i
// saldi li ha già tutti.
//
// LE REGOLE, in ordine, e ognuna ha un perché:
//
// 1. ING NON SI TOCCA. È la riserva: se il piano la usa per far quadrare la
//    settimana, la riserva diventa uno stipendio, e il giorno che serve
//    davvero non c'è. Il piano fa quadrare tutto con Cassa e Principale, e
//    se non ci riesce lo DICE — con la cifra che manca — invece di
//    attingere in silenzio.
// 2. PRIMA LE FISSE. Un addebito che rimbalza costa una commissione e una
//    telefonata; una settimana stretta costa un caffè in meno. Se le Fisse
//    non coprono quello che esce prima dello stipendio, la differenza si
//    copre prima di tutto il resto.
// 3. LA RAZIONE È UNA SOLA, ed è quella di domani: `quotaDomani()`. La
//    stessa che la carta di oggi mostra nel riquadro «Domani». Se il piano
//    ne calcolasse una sua, la schermata direbbe due cifre per la stessa
//    domanda — ed è il guasto da cui è nata `prova-coerenza.js`.
// 4. IL PRINCIPALE DEVE ARRIVARE A DOMENICA, non allo stipendio. La Cassa
//    è il posto in cui i soldi delle settimane dopo aspettano: svuotarla
//    sul Principale oggi vorrebbe dire spenderli prima.
// 5. L'AVANZO NON SI TOGLIE. Se il Principale ha più del necessario, il
//    piano non propone di riportarlo in Cassa: premierebbe chi arriva a
//    domenica a zero (è la regola di `FoglioRicariche`, e vale anche qui).
//
// Come `piano.js`: funzioni pure, niente DOM. Le scritture stanno in
// `eseguiTravasi()`, l'unica funzione che ne fa.

import { salvaMovimento, segnaRicarica } from "./dati.js";
import {
  cicloDi, saldoPocket, pocketSpendibili, pocketParcheggio, inArrivo, giorniFra,
} from "./calcolo.js";
import { quotaDi, quotaDomani, quotaDiPiano, soglie } from "./piano.js";
import { oggiISO, daISO, piuGiorni, nuovoId } from "../../core/ui.js";

const somma = (ids) => ids.reduce((t, id) => t + saldoPocket(id), 0);

/* I bonifici fra salvadanai si fanno a mano, in cifre tonde: «52,37 €» è un
   numero che si sbaglia a scrivere. In SU, perché un travaso che arriva un
   centesimo corto non porta a domenica.

   Due misure diverse, e per due motivi diversi. Le Fisse all'euro: lì un
   addebito che rimbalza costa una commissione, e 4,99 € di WindTRE vanno
   coperti tutti. Il Principale ai 5 €, e sotto i 3 € di differenza non si
   propone niente: il primo piano proponeva di spostare UN euro, e nessuno
   apre Revolut per un euro — un caffè in meno chiude lo stesso buco. */
const tondo = (c) => Math.ceil(c / 100) * 100;
const tondo5 = (c) => Math.ceil(c / 500) * 500;
const SOTTO_NON_SI_SPOSTA = 300;

/**
 * La finestra del piano: da domani alla prossima domenica.
 *
 * LA DOMENICA SI PREPARA LA SETTIMANA DOPO. È il momento in cui si fanno i
 * trasferimenti, e chiedere «arrivo a domenica?» la domenica sera vuol dire
 * chiedere «arrivo a stanotte?»: il vecchio `ricaricaLunedi()` faceva
 * esattamente questo, e la domenica proponeva di ricaricare un giorno solo.
 *
 * In ogni caso la finestra si ferma allo stipendio: oltre, c'è un altro
 * mondo con dentro lo stipendio.
 */
export function finestra(iso = oggiISO()) {
  const fine = cicloDi(iso).a;
  const dow = (daISO(iso).getDay() + 6) % 7;            // 0 = lunedì
  const domenica = dow === 6;
  const da = piuGiorni(iso, 1);
  const finoSett = domenica ? piuGiorni(iso, 7) : piuGiorni(iso, 6 - dow);
  const a = finoSett < fine ? finoSett : fine;
  return {
    da, a, fine,
    giorni: da <= a ? giorniFra(da, a) : 0,
    allaPaga: da <= fine ? giorniFra(da, fine) : 0,
    prepara: domenica,
    tronca: finoSett > fine,
  };
}

/**
 * Il piano dei travasi di adesso.
 *
 * Torna le MOSSE da fare (da, a, quanto, perché), i saldi prima e dopo, la
 * razione giornaliera che ne viene fuori, e un esito:
 *
 *   ok          tutto quadra senza ING
 *   stretto     quadra, ma la razione è sotto la soglia minima
 *   non-basta   neanche con tutta la Cassa: `manca` è la cifra
 *   stipendio   domani arriva lo stipendio, non c'è niente da pianificare
 */
export function pianoTravasi(iso = oggiISO()) {
  const f = finestra(iso);
  const tasche = pocketSpendibili();
  const parcheggi = pocketParcheggio();

  const prima = {
    principale: somma(tasche),
    cassa: somma(parcheggi),
    fisse: saldoPocket("fisse"),
    ing: saldoPocket("ing"),
  };

  const dom = quotaDomani(iso);
  if (!dom || f.allaPaga === 0) {
    return { iso, f, prima, dopo: { ...prima }, mosse: [], razione: 0, piano: quotaDiPiano(iso), esito: "stipendio", manca: 0, serve: 0 };
  }

  /* GLI IMPEGNI, pocket per pocket e dentro o fuori la finestra. Da oggi
     compreso: una bolletta di oggi non ancora uscita è ancora un impegno. */
  const voci = inArrivo(3650, iso).voci.filter((v) => v.quando >= iso && v.quando <= f.fine);
  const su = (ids, fino) => voci
    .filter((v) => ids.includes(v.pocket || "principale") && v.quando <= fino)
    .reduce((t, v) => t + v.importo, 0);
  const impP = su(tasche, f.a);
  const impC = su(parcheggi, f.fine);
  const impF = su(["fisse"], f.fine);

  const mosse = [];

  /* --- 1. PRIMA LE FISSE --------------------------------------------- */
  const fisseManca = Math.max(0, impF - prima.fisse);
  const cassaLibera = Math.max(0, prima.cassa - impC);
  let versoFisse = 0;
  if (fisseManca > 0 && cassaLibera > 0) {
    versoFisse = Math.min(tondo(fisseManca), cassaLibera);
    mosse.push({ da: "cassa", a: "fisse", imp: versoFisse, perche: "addebiti prima dello stipendio" });
  }

  /* --- 2. IL PRINCIPALE FINO A DOMENICA ------------------------------
     La razione è quella di domani — la stessa del riquadro «Domani». */
  const razione = dom.quota;
  const serve = razione * f.giorni + impP;
  const restaInCassa = Math.max(0, cassaLibera - versoFisse);
  let versoP = 0;
  if (serve - prima.principale >= SOTTO_NON_SI_SPOSTA && restaInCassa > 0) {
    versoP = Math.min(tondo5(serve - prima.principale), restaInCassa);
    mosse.push({ da: "cassa", a: "principale", imp: versoP, perche: "la settimana" });
  }

  /* --- 3. L'ESITO ------------------------------------------------------
     `manca`: quello che non si copre neanche con tutta la Cassa. Due casi
     diversi, e si sommano: le Fisse che restano scoperte e il Principale
     che non arriva a domenica. */
  const fisseScoperte = Math.max(0, fisseManca - versoFisse);
  // Il buco sotto i 3 € non è un buco: è la soglia sotto cui non si sposta.
  const buco = serve - prima.principale - versoP;
  const principaleCorto = buco >= SOTTO_NON_SI_SPOSTA ? buco : 0;
  const manca = fisseScoperte + principaleCorto;

  const dopo = {
    principale: prima.principale + versoP,
    cassa: prima.cassa - versoFisse - versoP,
    fisse: prima.fisse + versoFisse,
    ing: prima.ing,
  };

  return {
    iso, f, prima, dopo, mosse, razione, serve, manca,
    piano: quotaDiPiano(iso),
    esito: manca > 0 ? "non-basta"
      : razione < (soglie().quotaMinima || 0) ? "stretto"
      : "ok",
    /* Se proprio non basta: la razione con cui ci si arriverebbe usando
       TUTTO quello che c'è fuori da ING. È l'altra faccia di «mancano X»:
       si può prendere da ING, oppure stringere fino a qui. */
    razioneMinima: f.giorni > 0
      ? Math.max(0, Math.floor((prima.principale + restaInCassa - impP) / f.giorni))
      : 0,
  };
}

/**
 * La ricarica del lunedì, nella forma che i fogli si aspettano.
 *
 * Era una funzione a sé in `piano.js`, con un conto suo: guardava la quota
 * di OGGI per i giorni da oggi (la giornata già spesa contata due volte),
 * non vedeva le Fisse scoperte, e la domenica — il giorno in cui si fanno
 * i trasferimenti — pianificava un giorno solo. Adesso è una vista del
 * piano: tre posti che chiedevano «quanto sposto» davano tre risposte.
 */
export function ricaricaLunedi(iso = oggiISO()) {
  const p = pianoTravasi(iso);
  const verso = p.mosse.find((m) => m.a === "principale");
  return {
    fino: p.f.a, giorni: p.f.giorni,
    bersaglio: p.serve, saldo: p.prima.principale, cassa: p.prima.cassa,
    importo: verso?.imp || 0, quota: p.razione,
  };
}

/**
 * Registra le mosse come giroconti. Una scrittura per mossa.
 *
 * Il bottone che la chiama dice «Fatto su Revolut», e non per pignoleria:
 * l'app non muove soldi, registra quello che hai mosso tu. Se il giro qui
 * non corrispondesse a un giro vero, i saldi dei pocket comincerebbero a
 * raccontare una banca che non esiste.
 */
export function eseguiTravasi(piano) {
  if (!piano?.mosse?.length) return 0;
  for (const m of piano.mosse) {
    salvaMovimento({
      id: nuovoId("m"), tipo: "giro", imp: m.imp,
      nota: m.a === "fisse" ? "Travaso alle Fisse" : "Ricarica settimanale",
      cat: null, sub: null, pocket: m.da, pocketTo: m.a,
      data: piano.iso, rif: null, ecc: false,
    });
  }
  segnaRicarica(piano.iso);
  return piano.mosse.length;
}
