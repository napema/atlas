// moduli/finanze/calcolo.js — funzioni pure: stato → numeri.
//
// Nessun DOM, nessuna scrittura, nessuna lettura di localStorage che non
// passi da dati.js. È la condizione perché `oggi()` possa dare alla home
// il numero del mese senza montare l'interfaccia di Finanze.
//
// LA DISTINZIONE CHE REGGE TUTTO IL MODULO:
//
//   ordinaria      spesa che si ripete. È l'UNICA su cui si misurano
//                  budget, cassa settimanale e proiezione.
//   eccezionale    una tantum dichiarata tale (`ecc: true`). Conta nel
//                  totale speso ma sta fuori da ogni previsione.
//   sforamento     ricarica presa da fuori (`tipo: "extra"`). Non è una
//                  spesa: è la prova che il budget non ha retto.
//
// Senza questa separazione ogni mese con un imprevisto sembra un disastro,
// la proiezione impazzisce, e dopo due mesi non guardi più i numeri.

import {
  movimentiVivi, stato, profiloDi, CATEGORIE_CASSA,
  classeDi, SOGLIE_PREDEFINITE, pendenti, checkFatto, serieCheck, previsti, ricorrentiVivi,
} from "./dati.js";
import { isoDi, daISO, oggiISO, MESI_BREVI } from "../../core/ui.js";

export const meseDi = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
export const meseDiISO = (iso) => iso.slice(0, 7);

export function giorniDelMese(mese) {
  const [y, m] = mese.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

export function spostaMese(mese, delta) {
  const [y, m] = mese.split("-").map(Number);
  return meseDi(new Date(y, m - 1 + delta, 1));
}

export const nomeMese = (mese) => {
  const [y, m] = mese.split("-").map(Number);
  return `${["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio",
    "agosto", "settembre", "ottobre", "novembre", "dicembre"][m - 1]} ${y}`;
};

/** I movimenti di un mese, dal più recente. */
export const movimentiDelMese = (mese) =>
  movimentiVivi()
    .filter((m) => m.data?.slice(0, 7) === mese)
    .sort((a, b) => b.data.localeCompare(a.data) || (b.ts || 0) - (a.ts || 0));

/**
 * L'importo EFFETTIVO di un'uscita: quanto è costata davvero, cioè al netto
 * dei rimborsi e dei resi che la puntano.
 *
 * Serve perché una cena da 80 € divisa in quattro non è una spesa da 80 €,
 * ma il movimento originale resta da 80 e i rimborsi arrivano dopo.
 */
export function importoEffettivo(m) {
  if (m.tipo !== "out") return m.imp;
  const restituito = movimentiVivi()
    .filter((x) => (x.tipo === "rimb" || x.tipo === "reso") && x.rif === m.id)
    .reduce((s, x) => s + x.imp, 0);
  return Math.max(0, m.imp - restituito);
}

/** Il quadro completo di un mese. Tutti gli importi in centesimi. */
export function statistiche(mese) {
  const movimenti = movimentiDelMese(mese);
  const perCat = {};
  for (const c of stato().cats) perCat[c.id] = { tot: 0, ord: 0, ecc: 0, sub: {}, movs: [] };

  let entrate = 0, ordinaria = 0, eccezionale = 0;
  let sforamentiN = 0, sforamentiTot = 0, orfani = 0;
  const movEccezionali = [];

  for (const m of movimenti) {
    if (m.tipo === "in") { entrate += m.imp; continue; }
    if (m.tipo === "extra") { sforamentiN++; sforamentiTot += m.imp; continue; }

    if (m.tipo === "out") {
      const e = importoEffettivo(m);
      const cid = m.cat && perCat[m.cat] ? m.cat : "personale";
      if (m.ecc) { eccezionale += e; perCat[cid].ecc += e; movEccezionali.push(m); }
      else { ordinaria += e; perCat[cid].ord += e; }
      perCat[cid].tot += e;
      perCat[cid].movs.push(m);
      const sk = m.sub || "Altro";
      (perCat[cid].sub[sk] ||= { tot: 0, n: 0 });
      perCat[cid].sub[sk].tot += e;
      perCat[cid].sub[sk].n++;
      continue;
    }

    // Un rimborso senza `rif` non può essere scalato da nessuna spesa:
    // si toglie dal totale ordinario e si segnala, perché quasi sempre è
    // un movimento a cui è stato dimenticato il collegamento.
    if ((m.tipo === "rimb" || m.tipo === "reso") && !m.rif) {
      orfani += m.imp;
      ordinaria -= m.imp;
    }
  }

  movEccezionali.sort((a, b) => b.imp - a.imp);
  return {
    entrate, ordinaria, eccezionale, movEccezionali,
    usciteNette: ordinaria + eccezionale,
    sforamentiN, sforamentiTot, orfani, perCat,
    nMovimenti: movimenti.length,
  };
}

/** Il budget totale del mese, in centesimi. */
export function budgetTotale(mese) {
  const p = profiloDi(mese);
  return Object.values(p.b).reduce((s, v) => s + (Number(v) || 0), 0) * 100;
}

/**
 * La cassa della settimana che contiene `riferimento`.
 *
 * La settimana parte da lunedì e viene ritagliata sul mese: i giorni che
 * cadono fuori dal mese, o fuori dalla finestra `dal`–`al` del profilo, non
 * contano. Senza il ritaglio la prima settimana di ogni mese comincerebbe
 * con la spesa dell'ultima settimana del mese prima.
 */
export function cassaSettimana(mese, riferimento = oggiISO()) {
  const p = profiloDi(mese);
  const [y, m] = mese.split("-").map(Number);
  const rif = daISO(riferimento);
  const dow = (rif.getDay() + 6) % 7;             // 0 = lunedì
  const lunedi = new Date(rif);
  lunedi.setDate(rif.getDate() - dow);

  let speso = 0;
  const perGiorno = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(lunedi);
    d.setDate(lunedi.getDate() + i);
    const iso = isoDi(d);
    const nelMese = d.getMonth() + 1 === m && d.getFullYear() === y;
    const dentro = nelMese && d.getDate() >= p.dal && d.getDate() <= p.al;
    const sp = dentro
      ? movimentiVivi()
          .filter((x) => x.tipo === "out" && !x.ecc && x.data === iso && p.cassaCats.includes(x.cat))
          .reduce((s, x) => s + importoEffettivo(x), 0)
      : 0;
    speso += sp;
    perGiorno.push({ iso, dentro, speso: sp });
  }

  const tetto = Math.round(p.cassa * 100);
  return {
    attiva: perGiorno.some((d) => d.dentro),
    speso, tetto, perGiorno,
    resta: tetto - speso,
    giorniRimasti: 7 - dow,
    categorie: p.cassaCats,
  };
}

/**
 * Gli avvisi, in ordine di gravità, al massimo tre.
 *
 * Tre e non tutti: una lista di dieci avvisi non si legge, e il decimo
 * rende invisibile il primo. Se qualcosa non entra nei tre, vuol dire che
 * c'è di peggio da guardare prima.
 */
export function avvisi(mese) {
  const fuori = [];
  const st = statistiche(mese);
  const p = profiloDi(mese);
  const oggi = oggiISO();
  const eCorrente = oggi.slice(0, 7) === mese;

  if (eCorrente) {
    const c = cassaSettimana(mese, oggi);
    const dow = (daISO(oggi).getDay() + 6) % 7;
    if (c.attiva && c.speso >= c.tetto && dow < 6) {
      fuori.push({
        livello: "rosso",
        titolo: "Cassa settimanale esaurita",
        testo: `Mancano ${6 - dow} giorni a domenica: da qui in poi è tutto sforamento.`,
      });
    }
  }

  const sforati = [];
  for (const c of stato().cats) {
    const b = Math.round((p.b[c.id] || 0) * 100);
    if (b <= 0) continue;
    const sp = st.perCat[c.id].ord;
    const r = sp / b;
    if (r >= 1) sforati.push({ livello: "rosso", titolo: `${c.nome}: budget sforato`, r,
      testo: `${(r * 100).toFixed(0)}% del previsto.` });
    else if (r >= 0.9) sforati.push({ livello: "ambra", titolo: `${c.nome} oltre il 90%`, r,
      testo: "Poco margine fino a fine mese." });
  }
  sforati.sort((a, b) => b.r - a.r);
  fuori.push(...sforati.slice(0, 2));

  if (eCorrente) {
    const giorno = Number(oggi.slice(8, 10));
    const bt = budgetTotale(mese);
    // Prima del quinto giorno la proiezione è rumore: due spese fanno
    // sembrare che il mese chiuda al triplo.
    if (giorno >= 5 && st.ordinaria > 0 && bt > 0) {
      const proiezione = Math.round((st.ordinaria / giorno) * giorniDelMese(mese));
      if (proiezione > bt) {
        fuori.push({
          livello: "ambra",
          titolo: "Ritmo di spesa troppo alto",
          testo: "Di questo passo il mese chiude oltre il budget. Gli straordinari non sono contati.",
        });
      }
    }
  }

  return fuori.slice(0, 3);
}

/** Come sta andando il mese, in una parola. */
export function verdetto(mese) {
  const st = statistiche(mese);
  const av = avvisi(mese);
  if (st.sforamentiN > 0 || av.some((a) => a.livello === "rosso")) {
    return { livello: "rosso", testo: "Qualcosa non va" };
  }
  if (av.some((a) => a.livello === "ambra")) return { livello: "ambra", testo: "Da tenere d'occhio" };
  return { livello: "verde", testo: "Tutto in regola" };
}

/** La proiezione di fine mese sulla sola spesa ordinaria. */
export function proiezione(mese) {
  const oggi = oggiISO();
  if (oggi.slice(0, 7) !== mese) return null;
  const giorno = Number(oggi.slice(8, 10));
  if (giorno < 3) return null;
  const st = statistiche(mese);
  if (!st.ordinaria) return null;
  return Math.round((st.ordinaria / giorno) * giorniDelMese(mese));
}

/** La spesa cumulata giorno per giorno. Per il grafico del mese. */
export function cumulata(mese) {
  const giorni = giorniDelMese(mese);
  const perGiorno = Array(giorni).fill(0);
  for (const m of movimentiDelMese(mese)) {
    if (m.tipo !== "out" || m.ecc) continue;
    perGiorno[Number(m.data.slice(8, 10)) - 1] += importoEffettivo(m);
  }
  let acc = 0;
  return perGiorno.map((v) => (acc += v));
}


/* ------------------------------------------------- autocategorizzazione -- */

// Il rumore tipico degli estratti conto. Non aiuta a capire cosa hai
// comprato, e messo in mezzo alle parole fa sbagliare il riconoscimento.
const RUMORE = new Set(["pos", "sumup", "satispay", "srl", "srls", "spa", "snc", "sas", "sapa",
  "italia", "italy", "card", "payment", "pagamento", "presso", "carta", "www", "com", "net",
  "tid", "ec", "operazione", "transazione"]);

export function parolePulite(n) {
  return n.split(" ")
    .filter((w) => w && !RUMORE.has(w) && !/^\d+$/.test(w) && !/\d{3,}/.test(w))
    .join(" ");
}

// Il dizionario di partenza. Le regole APPRESE (stato().rules) hanno la
// precedenza: quello che l'utente ha corretto una volta vale più di questo.
export const DIZIONARIO = {
  benzina: ["auto", "Carburante"], diesel: ["auto", "Carburante"], gasolio: ["auto", "Carburante"],
  rifornimento: ["auto", "Carburante"], eni: ["auto", "Carburante"], q8: ["auto", "Carburante"],
  esso: ["auto", "Carburante"], tamoil: ["auto", "Carburante"], agip: ["auto", "Carburante"],
  carburante: ["auto", "Carburante"], shell: ["auto", "Carburante"], enilive: ["auto", "Carburante"],
  autolavaggio: ["auto", "Lavaggio"], lavaggio: ["auto", "Lavaggio"],
  parcheggio: ["auto", "Parcheggio"], easypark: ["auto", "Parcheggio"], "strisce blu": ["auto", "Parcheggio"],
  telepass: ["auto", "Pedaggio"], pedaggio: ["auto", "Pedaggio"], autostrada: ["auto", "Pedaggio"],
  meccanico: ["auto", "Manutenzione"], gommista: ["auto", "Manutenzione"], officina: ["auto", "Manutenzione"],
  ricambi: ["auto", "Manutenzione"], multa: ["auto", "Multe"],

  supermercato: ["spesa", "Supermercato"], conad: ["spesa", "Supermercato"], coop: ["spesa", "Supermercato"],
  esselunga: ["spesa", "Supermercato"], lidl: ["spesa", "Supermercato"], eurospin: ["spesa", "Supermercato"],
  carrefour: ["spesa", "Supermercato"], pam: ["spesa", "Supermercato"], sole365: ["spesa", "Supermercato"],
  deco: ["spesa", "Supermercato"], penny: ["spesa", "Supermercato"], aldi: ["spesa", "Supermercato"],
  despar: ["spesa", "Supermercato"], crai: ["spesa", "Supermercato"], famila: ["spesa", "Supermercato"],
  tigros: ["spesa", "Supermercato"], bennet: ["spesa", "Supermercato"], todis: ["spesa", "Supermercato"],
  macelleria: ["spesa", "Alimentari freschi"], fruttivendolo: ["spesa", "Alimentari freschi"],
  panificio: ["spesa", "Alimentari freschi"], salumeria: ["spesa", "Alimentari freschi"],
  pescheria: ["spesa", "Alimentari freschi"],

  treno: ["trasporti", "Treno"], trenitalia: ["trasporti", "Treno"], italo: ["trasporti", "Treno"],
  frecciarossa: ["trasporti", "Treno"], regionale: ["trasporti", "Treno"], trenord: ["trasporti", "Treno"],
  metro: ["trasporti", "Mezzi urbani"], gtt: ["trasporti", "Mezzi urbani"], autobus: ["trasporti", "Mezzi urbani"],
  flixbus: ["trasporti", "Mezzi urbani"], itabus: ["trasporti", "Mezzi urbani"], anm: ["trasporti", "Mezzi urbani"],
  taxi: ["trasporti", "Taxi"], uber: ["trasporti", "Taxi"], bolt: ["trasporti", "Taxi"], freenow: ["trasporti", "Taxi"],
  volo: ["trasporti", "Aereo"], ryanair: ["trasporti", "Aereo"], easyjet: ["trasporti", "Aereo"],

  ristorante: ["cibo", "Ristorante"], trattoria: ["cibo", "Ristorante"], osteria: ["cibo", "Ristorante"],
  sushi: ["cibo", "Ristorante"], cena: ["cibo", "Ristorante"], pranzo: ["cibo", "Ristorante"],
  poke: ["cibo", "Ristorante"], "old wild west": ["cibo", "Ristorante"],
  pizzeria: ["cibo", "Pizzeria"], pizza: ["cibo", "Pizzeria"],
  bar: ["cibo", "Bar e colazioni"], caffe: ["cibo", "Bar e colazioni"], colazione: ["cibo", "Bar e colazioni"],
  cornetto: ["cibo", "Bar e colazioni"], pasticceria: ["cibo", "Bar e colazioni"],
  glovo: ["cibo", "Delivery"], deliveroo: ["cibo", "Delivery"], "just eat": ["cibo", "Delivery"],
  justeat: ["cibo", "Delivery"], delivery: ["cibo", "Delivery"],
  gelato: ["cibo", "Gelateria"], gelateria: ["cibo", "Gelateria"],
  aperitivo: ["cibo", "Aperitivo"], spritz: ["cibo", "Aperitivo"],
  mcdonald: ["cibo", "Fast food"], "burger king": ["cibo", "Fast food"], kfc: ["cibo", "Fast food"],
  kebab: ["cibo", "Fast food"], autogrill: ["cibo", "Fast food"], roadhouse: ["cibo", "Fast food"],

  cinema: ["personale", "Uscite e svago"], concerto: ["personale", "Uscite e svago"],
  discoteca: ["personale", "Uscite e svago"], stadio: ["personale", "Uscite e svago"],
  serata: ["personale", "Uscite e svago"], "booking com": ["personale", "Uscite e svago"],
  airbnb: ["personale", "Uscite e svago"], ticketone: ["personale", "Uscite e svago"],
  zara: ["personale", "Abbigliamento"], bershka: ["personale", "Abbigliamento"],
  zalando: ["personale", "Abbigliamento"], vinted: ["personale", "Abbigliamento"],
  scarpe: ["personale", "Abbigliamento"], abbigliamento: ["personale", "Abbigliamento"],
  shein: ["personale", "Abbigliamento"], nike: ["personale", "Abbigliamento"],
  "foot locker": ["personale", "Abbigliamento"], ovs: ["personale", "Abbigliamento"],
  barbiere: ["personale", "Barbiere"], parrucchiere: ["personale", "Barbiere"],
  farmacia: ["personale", "Cura personale"], profumeria: ["personale", "Cura personale"],
  tigota: ["personale", "Cura personale"], sephora: ["personale", "Cura personale"],
  kiko: ["personale", "Cura personale"], douglas: ["personale", "Cura personale"],
  "acqua e sapone": ["personale", "Cura personale"], parafarmacia: ["personale", "Cura personale"],
  integratori: ["personale", "Integratori"], proteine: ["personale", "Integratori"],
  creatina: ["personale", "Integratori"], myprotein: ["personale", "Integratori"],
  palestra: ["personale", "Sport"], piscina: ["personale", "Sport"], padel: ["personale", "Sport"],
  calcetto: ["personale", "Sport"], decathlon: ["personale", "Sport"], cisalfa: ["personale", "Sport"],
  amazon: ["personale", "Shopping"], tabacchi: ["personale", "Shopping"], tabaccheria: ["personale", "Shopping"],
  regalo: ["personale", "Regali"],
  mediaworld: ["personale", "Tech"], unieuro: ["personale", "Tech"], gamestop: ["personale", "Tech"],
  apple: ["personale", "Tech"],

  netflix: ["fisse", "Abbonamenti"], spotify: ["fisse", "Abbonamenti"], prime: ["fisse", "Abbonamenti"],
  icloud: ["fisse", "Abbonamenti"], dazn: ["fisse", "Abbonamenti"], disney: ["fisse", "Abbonamenti"],
  abbonamento: ["fisse", "Abbonamenti"], "apple com bill": ["fisse", "Abbonamenti"],
  affitto: ["fisse", "Affitto"], canone: ["fisse", "Affitto"],
  prestito: ["fisse", "Prestito"], rata: ["fisse", "Prestito"],
  iliad: ["fisse", "Telefono"], vodafone: ["fisse", "Telefono"], windtre: ["fisse", "Telefono"],

  enel: ["casa", "Luce e gas"], a2a: ["casa", "Luce e gas"], iren: ["casa", "Luce e gas"],
  hera: ["casa", "Luce e gas"], bolletta: ["casa", "Luce e gas"], luce: ["casa", "Luce e gas"],
  gas: ["casa", "Luce e gas"], ikea: ["casa", "Arredo"], "maisons du monde": ["casa", "Arredo"],
  "leroy merlin": ["casa", "Casalinghi"], detersivi: ["casa", "Casalinghi"],
  brico: ["casa", "Casalinghi"], obi: ["casa", "Casalinghi"],

  assicurazione: ["acc", "Assicurazione"], rca: ["acc", "Assicurazione"],
  bollo: ["acc", "Bollo"], tagliando: ["acc", "Tagliando"],
  deposito: ["risp", "Deposito"], etf: ["risp", "Investimenti"], investimento: ["risp", "Investimenti"],
};

/**
 * Indovina categoria e sottocategoria da una nota.
 *
 * L'ordine dei punteggi non è arbitrario: prima le regole apprese (l'utente
 * ha già corretto quel testo), poi le frasi intere del dizionario, poi le
 * parole singole, e per ultimo le sottostringhe — che sono le più fragili
 * e vengono ammesse solo da cinque caratteri in su, altrimenti "bar" dentro
 * "barbiere" manda il taglio di capelli nel cibo.
 */
export function autoCategoria(nota, { normalizza, categoriaPerId }) {
  const n = normalizza(nota);
  if (!n) return null;
  const regole = stato().rules;

  if (regole[n]) return { cat: regole[n][0], sub: regole[n][1], fonte: "appreso" };
  const pulita = parolePulite(n) || n;
  if (regole[pulita]) return { cat: regole[pulita][0], sub: regole[pulita][1], fonte: "appreso" };

  const parole = pulita.split(" ");
  let migliore = null;
  const proponi = (c) => { if (c.punti > (migliore?.punti || 0)) migliore = c; };

  for (const [chiave, [cat, sub]] of Object.entries(DIZIONARIO)) {
    if (!categoriaPerId(cat)) continue;
    let punti = 0;
    if (chiave.includes(" ")) { if (pulita.includes(chiave)) punti = 80 + chiave.length; }
    else if (parole.includes(chiave)) punti = 60 + chiave.length;
    else if (chiave.length >= 5 && pulita.includes(chiave)) punti = 30 + chiave.length;
    if (punti) proponi({ cat, sub, punti, fonte: "dizionario" });
  }

  for (const [frase, [cat, sub]] of Object.entries(regole)) {
    if (frase.length < 4 || !categoriaPerId(cat)) continue;
    if (n.includes(frase) || pulita.includes(frase)) proponi({ cat, sub, punti: 90 + frase.length, fonte: "appreso" });
  }

  return migliore;
}

/* ===================================================================
   STATISTICHE DELL'ANALISI
   Portate dall'app di partenza. Sono le domande che uno si fa davvero
   guardando un mese, e ognuna ha una ragione per esistere.
   =================================================================== */

/**
 * Il confronto con lo stesso GIORNO del mese scorso, non col mese intero.
 *
 * È l'unico paragone onesto a metà mese: al giorno 12 confrontarsi con un
 * mese chiuso dice solo che manca ancora da spendere, e non serve a niente.
 */
export function stessoGiornoMesePrima(mese) {
  const oggi = oggiISO();
  const eCorrente = oggi.slice(0, 7) === mese;
  const giorno = eCorrente ? Number(oggi.slice(8, 10)) : giorniDelMese(mese);
  const mesePrima = spostaMese(mese, -1);
  const taglio = Math.min(giorno, giorniDelMese(mesePrima));

  const alloraSpeso = movimentiVivi()
    .filter((m) => m.tipo === "out" && !m.ecc && m.data.slice(0, 7) === mesePrima
      && Number(m.data.slice(8, 10)) <= taglio)
    .reduce((s, m) => s + importoEffettivo(m), 0);

  const adesso = statistiche(mese).ordinaria;
  return { mesePrima, taglio, giorno, alloraSpeso, adesso, scarto: adesso - alloraSpeso };
}

/** La spesa giorno per giorno del mese, non cumulata. */
export function perGiorno(mese) {
  const giorni = giorniDelMese(mese);
  const out = Array(giorni).fill(0);
  for (const m of movimentiDelMese(mese)) {
    if (m.tipo !== "out" || m.ecc) continue;
    out[Number(m.data.slice(8, 10)) - 1] += importoEffettivo(m);
  }
  return out;
}

/** I sei numeri del riquadro "Statistiche del mese". */
export function statisticheDelMese(mese) {
  const st = statistiche(mese);
  const oggi = oggiISO();
  const eCorrente = oggi.slice(0, 7) === mese;
  const giorni = giorniDelMese(mese);
  const giorno = eCorrente ? Number(oggi.slice(8, 10)) : giorni;
  const uscite = movimentiDelMese(mese).filter((m) => m.tipo === "out");
  const giornaliero = perGiorno(mese);

  let piuCaro = null;
  giornaliero.forEach((v, i) => { if (v > 0 && (!piuCaro || v > piuCaro.valore)) piuCaro = { giorno: i + 1, valore: v }; });

  const prima = statistiche(spostaMese(mese, -1));
  const delta = prima.ordinaria > 0
    ? Math.round(((st.ordinaria - prima.ordinaria) / prima.ordinaria) * 100)
    : null;

  return {
    mediaGiorno: giorno ? Math.round(st.ordinaria / giorno) : 0,
    scontrinoMedio: uscite.length
      ? Math.round(uscite.reduce((s, m) => s + importoEffettivo(m), 0) / uscite.length) : 0,
    piuCaro,
    delta,
    nUscite: uscite.length,
    // Quanto è tornato indietro: rimborsi agganciati più quelli orfani.
    recuperato: uscite.reduce((s, m) => s + (m.imp - importoEffettivo(m)), 0) + st.orfani,
  };
}

/** La media per giorno della settimana. Dice dove si concentra il ritmo. */
export function mediaPerGiornoSettimana(mese) {
  const oggi = oggiISO();
  const eCorrente = oggi.slice(0, 7) === mese;
  const fino = eCorrente ? Number(oggi.slice(8, 10)) : giorniDelMese(mese);
  const giornaliero = perGiorno(mese);
  const totali = Array(7).fill(0), quanti = Array(7).fill(0);

  for (let i = 0; i < fino; i++) {
    const d = daISO(`${mese}-${String(i + 1).padStart(2, "0")}`);
    const w = (d.getDay() + 6) % 7;          // 0 = lunedì
    totali[w] += giornaliero[i];
    quanti[w]++;
  }
  return totali.map((v, i) => (quanti[i] ? Math.round(v / quanti[i]) : 0));
}

/** Gli ultimi sei mesi, per le barre di confronto. */
export function ultimiSeiMesi(mese) {
  const mesi = [];
  for (let i = 5; i >= 0; i--) mesi.push(spostaMese(mese, -i));
  const st = mesi.map((m) => statistiche(m));
  return {
    mesi,
    etichette: mesi.map((m) => MESI_BREVI[Number(m.split("-")[1]) - 1]),
    usciteNette: st.map((s) => s.usciteNette),
    sforamenti: st.map((s) => s.sforamentiTot),
  };
}

/** Le sottocategorie di tutto il mese, ordinate per spesa. */
export function sottocategorieDelMese(mese) {
  const st = statistiche(mese);
  const out = [];
  for (const c of stato().cats) {
    for (const [nome, v] of Object.entries(st.perCat[c.id]?.sub || {})) {
      out.push({ categoria: c.nome, catId: c.id, sub: nome, totale: v.tot, volte: v.n });
    }
  }
  return out.sort((a, b) => b.totale - a.totale);
}

/** La spesa di una categoria negli ultimi sei mesi. Per il grafico nel foglio. */
export function categoriaSuSeiMesi(mese, catId) {
  const mesi = [];
  for (let i = 5; i >= 0; i--) mesi.push(spostaMese(mese, -i));
  return {
    etichette: mesi.map((m) => MESI_BREVI[Number(m.split("-")[1]) - 1]),
    valori: mesi.map((m) => statistiche(m).perCat[catId]?.tot || 0),
  };
}

/** Tutti i movimenti di una sottocategoria, di sempre. Per il drill-down. */
export function movimentiSottocategoria(catId, sub) {
  return movimentiVivi()
    .filter((m) => m.tipo === "out" && m.cat === catId && (m.sub || "Altro") === sub)
    .sort((a, b) => b.data.localeCompare(a.data));
}

/**
 * Il contesto di un singolo movimento: quanto costa di solito una cosa così.
 * È ciò che trasforma "8,50 €" in "8,50 €, il 40% più del solito".
 */
export function contestoMovimento(m) {
  const simili = movimentiVivi().filter((x) => x.tipo === "out" && x.cat === m.cat && x.sub === m.sub && !x.ecc);
  const effettivo = importoEffettivo(m);
  const media = simili.length
    ? Math.round(simili.reduce((s, x) => s + importoEffettivo(x), 0) / simili.length) : 0;
  const mese = statistiche(m.data.slice(0, 7));
  return {
    simili: simili.length,
    media,
    scostamento: media ? Math.round(((effettivo - media) / media) * 100) : null,
    quotaSulMese: mese.ordinaria > 0 && m.tipo === "out" && !m.ecc
      ? Math.round((effettivo / mese.ordinaria) * 100) : null,
    rimborsi: movimentiVivi().filter((x) => (x.tipo === "rimb" || x.tipo === "reso") && x.rif === m.id),
  };
}

/** Il "quadra": budget allocato contro entrate attese. */
export function quadratura(mese) {
  const p = profiloDi(mese);
  const allocato = Object.values(p.b).reduce((s, v) => s + (Number(v) || 0), 0);
  const entrate = Number(stato().config.entrate) || 0;
  return { allocato, entrate, differenza: entrate - allocato };
}

/* =========================================================================
   REGISTRO v2 — il ciclo dello stipendio, i pocket, i ricorrenti.

   Il criterio è uno solo: aprendo l'app in tre secondi devo sapere se posso
   spendere oggi e quanto. Tutto quello che segue esiste per rispondere a
   quella domanda, e niente altro.
   ========================================================================= */

/* ------------------------------------------------------------- il ciclo -- */
/*
   IL MESE FINANZIARIO NON PARTE IL PRIMO. Lo stipendio arriva il 21, quindi
   il ciclo va dal 21 al 20. È la correzione che vale più di tutte le altre
   messe insieme: col mese solare, «quanto manca alla fine del mese» era
   sbagliato di venti giorni tutti i mesi, ed è per quello che i numeri non
   tornavano mai.
*/

export const giornoStipendio = () => Number(stato().config?.giornoStipendio) || 21;

/** Il ciclo che contiene `iso`: `{ da, a, giorni, indice }`, estremi inclusi. */
export function cicloDi(iso = oggiISO()) {
  const g = giornoStipendio();
  const d = daISO(iso);
  // Prima del giorno di stipendio si è ancora dentro il ciclo aperto il mese
  // scorso: il 5 ottobre appartiene al ciclo di settembre.
  const inizio = new Date(d.getFullYear(), d.getMonth(), g);
  if (d.getDate() < g) inizio.setMonth(inizio.getMonth() - 1);
  const fine = new Date(inizio.getFullYear(), inizio.getMonth() + 1, g - 1);
  return {
    da: isoDi(inizio),
    a: isoDi(fine),
    giorni: Math.round((fine - inizio) / 86400000) + 1,
    // L'etichetta è il mese in cui il ciclo è INIZIATO.
    indice: `${inizio.getFullYear()}-${String(inizio.getMonth() + 1).padStart(2, "0")}`,
  };
}

export function spostaCiclo(indice, delta) {
  const [y, m] = indice.split("-").map(Number);
  return cicloDi(isoDi(new Date(y, m - 1 + delta, giornoStipendio())));
}

/** A che giorno del ciclo siamo, 1-based. */
export function giornoDelCiclo(ciclo, iso = oggiISO()) {
  if (iso < ciclo.da) return 0;
  if (iso > ciclo.a) return ciclo.giorni;
  return Math.round((daISO(iso) - daISO(ciclo.da)) / 86400000) + 1;
}

export const nomeCiclo = (ciclo) => {
  const a = daISO(ciclo.da);
  const b = daISO(ciclo.a);
  return `${a.getDate()} ${MESI_BREVI[a.getMonth()]} – ${b.getDate()} ${MESI_BREVI[b.getMonth()]}`;
};

export const movimentiDelCiclo = (ciclo) =>
  movimentiVivi()
    .filter((m) => m.data >= ciclo.da && m.data <= ciclo.a)
    .sort((a, b) => b.data.localeCompare(a.data) || ((b.ts || 0) - (a.ts || 0)));

/* ------------------------------------------------------------- i pocket -- */
/*
   Il saldo di un pocket è il saldo iniziale scritto in Impostazioni più i
   movimenti che lo hanno toccato. Non è «quanto potresti spendere»: è
   quanto c'è.

   ING è `external`: il saldo lo scrivi a mano e i movimenti non lo muovono,
   perché è un conto che vive fuori dall'app e l'unica fonte di verità è
   l'estratto conto vero.
*/

/**
 * Il saldo di un pocket, CALCOLATO.
 *
 *     saldo = ancora + Σ movimenti su quel pocket dalla data dell'ancora
 *
 * Non esiste da nessuna parte un campo «saldo corrente», ed è voluto: un
 * saldo scritto è un saldo che va in deriva. Basta registrare in ritardo la
 * spesa di ieri e il numero salvato è già sbagliato, senza che niente lo
 * segnali. Così invece non può divergere: se i movimenti sono giusti il
 * saldo è giusto, e se è sbagliato si sposta l'ancora e riparte da lì.
 *
 * LA DATA DELL'ANCORA è per pocket. I 165 movimenti già in archivio non
 * hanno mai attraversato i pocket, e sommarli darebbe al Principale il netto
 * di tutta la storia — meno quattromila euro, che non è un saldo, è un
 * totale. Prima era una sola per tutti (`config.pocketDa`): correggere ING
 * spostava anche quella del Principale e i movimenti della settimana in
 * corso smettevano di contare su un pocket che nessuno aveva toccato.
 *
 * ING È DIVERSO. Vive fuori dall'app: le spese non lo attraversano e il suo
 * numero lo si copia dall'estratto conto. Lo muovono SOLO i travasi
 * espliciti verso gli altri pocket, perché quelli li fai tu dall'app e
 * l'estratto conto li vedrà dopo.
 */
export function saldoPocket(id) {
  const p = (stato().pockets || []).find((x) => x.id === id);
  if (!p) return 0;
  const da = p.ancoraDa || stato().config?.pocketDa || "9999-12-31";
  return (p.saldo || 0) + deltaPocket(id, da);
}

/**
 * Quanto i movimenti hanno spostato un pocket da `da` (compreso) in poi.
 *
 * È la seconda metà di `saldoPocket`, tirata fuori perché serve anche a
 * riancorare: per far sì che il saldo mostrato diventi il numero che hai
 * letto sul conto, l'ancora da scrivere è `quel numero meno questo delta`.
 *
 * Il confronto è `>= da`, cioè i movimenti del giorno stesso dell'ancora
 * contano. Deve essere così: l'ancora vale «quanto c'era all'inizio di quel
 * giorno», altrimenti una spesa segnata nel pomeriggio dello stesso giorno
 * in cui hai riancorato non verrebbe mai sottratta.
 */
export function deltaPocket(id, da) {
  const p = (stato().pockets || []).find((x) => x.id === id);
  if (!p) return 0;
  let s = 0;

  for (const m of movimentiVivi()) {
    if (m.data < da) continue;

    // Travasi e sforamenti hanno due estremi: escono da `pocket` ed entrano
    // in `pocketTo`. Sono anche gli unici che toccano un pocket esterno.
    if (m.tipo === "giro" || m.tipo === "extra") {
      if (m.pocket === id) s -= m.imp;
      if (m.pocketTo === id) s += m.imp;
      continue;
    }

    if (p.external) continue;               // il resto non passa da ING
    if ((m.pocket || "principale") !== id) continue;
    if (m.tipo === "out") s -= importoEffettivo(m);
    else s += m.imp;                        // in, rimb, reso
  }
  return s;
}

export const pocketConSaldi = () =>
  (stato().pockets || []).map((p) => ({ ...p, saldoVero: saldoPocket(p.id) }));

/* --------------------------------------------------------- la settimana -- */
/*
   IL NUMERO. È il saldo del pocket Principale, non un calcolo di budget:
   quello che c'è, non quello che dovrebbe esserci.
*/

export function settimana(iso = oggiISO()) {
  const d = daISO(iso);
  const dow = (d.getDay() + 6) % 7;                 // 0 = lunedì
  const lunedi = new Date(d);
  lunedi.setDate(d.getDate() - dow);
  const domenica = new Date(lunedi);
  domenica.setDate(lunedi.getDate() + 6);

  const resta = saldoPocket("principale");
  const budget = Number(stato().config?.cassaSettimanale) || 0;
  const giorniRimasti = 7 - dow;                    // oggi compreso

  /* QUANTO HAI SPESO SI CONTA, non si deduce dal budget.

     Prima era `budget - resta`, e con l'avanzo della settimana prima che si
     somma sul Principale dava numeri assurdi: 130 - 171,84 è negativo,
     quindi «0% consumato» stampato sopra una giornata da 108 €. Il
     denominatore era sbagliato — i soldi che hai non sono i 130 di questa
     settimana, sono i 130 più quello che ti era avanzato.

     Adesso si sommano le uscite vere e il totale disponibile si ricava da
     quelle: `disponibile = resta + speso`. Ne viene che le due parti tornano
     sempre — quello che resta più quello che hai speso fa quello che avevi —
     ed è la proprietà che mancava. */

  // Da quando l'app può contare: il lunedì, oppure l'ancora se è più
  // recente. Riancorando a metà settimana i movimenti precedenti non
  // toccano più il saldo, e sommarli qui gonfierebbe il disponibile con
  // soldi già spesi prima che l'app cominciasse a guardare.
  const p = (stato().pockets || []).find((x) => x.id === "principale");
  const ancora = p?.ancoraDa || stato().config?.pocketDa || null;
  const daQuando = ancora && ancora > isoDi(lunedi) ? ancora : isoDi(lunedi);

  const speso = movimentiVivi()
    .filter((m) => m.data >= daQuando && m.data <= iso && m.tipo === "out" && !m.ecc
      && (m.pocket || "principale") === "principale")
    .reduce((acc, m) => acc + importoEffettivo(m), 0);

  const disponibile = resta + speso;

  // La finestra su cui si misura il ritmo: da `daQuando` a domenica. Con
  // l'ancora vecchia — il caso normale — sono i sette giorni della settimana.
  const giorniFinestra = Math.max(1,
    Math.round((daISO(isoDi(domenica)) - daISO(daQuando)) / 86400000) + 1);
  const trascorsi = Math.max(1, giorniFinestra - giorniRimasti + 1);

  return {
    da: isoDi(lunedi), a: isoDi(domenica),
    resta, budget, speso, disponibile,
    frazione: disponibile > 0 ? Math.min(1, Math.max(0, speso / disponibile)) : 0,
    giorniRimasti,
    alGiorno: giorniRimasti > 0 ? Math.floor(Math.max(0, resta) / giorniRimasti) : 0,
    finita: resta <= 0,
    // Il ritmo lineare atteso a questo punto della finestra: serve
    // all'avviso «a questo ritmo la settimana finisce prima di domenica».
    atteso: Math.round(disponibile * (trascorsi / giorniFinestra)),
  };
}

/**
 * La giornata: quanto è uscito oggi dal Principale, e quanto poteva uscirne.
 *
 * Serve perché la settimana da sola si legge troppo tardi. «Restano 171,84 €
 * e 4 giorni» è vero anche il giovedì sera dopo aver bruciato metà budget:
 * il numero settimanale non ha modo di dirtelo finché non è domenica.
 *
 * LA QUOTA NON SI CALCOLA SU QUELLO CHE RESTA ORA, e qui sta tutto il senso
 * della cosa. Dividendo il saldo attuale per i giorni che restano, la quota
 * scende insieme al saldo mentre spendi: spesi 100 €, la quota si riabbassa
 * da sé e resti sempre «in pari». Un metro che si accorcia mentre lo usi non
 * misura niente. Si rimettono quindi indietro le uscite di oggi, così il
 * dividendo resta fermo dalla mattina alla sera.
 *
 * Indietro vanno SOLO le uscite, non l'effetto netto della giornata, e la
 * differenza si vede il lunedì: la ricarica arriva oggi, quindi togliendo
 * anche le entrate il dividendo tornerebbe a zero e l'app direbbe «non
 * spendere altro» proprio nel giorno in cui hai appena ricaricato. I soldi
 * arrivati oggi sono disponibili oggi; quelli usciti oggi erano disponibili
 * stamattina. Un travaso in uscita abbassa la quota, ed è giusto: quei soldi
 * non sono più spendibili.
 */
export function giornata(iso = oggiISO()) {
  const s = settimana(iso);
  const speso = movimentiVivi()
    .filter((m) => m.data === iso && m.tipo === "out" && !m.ecc
      && (m.pocket || "principale") === "principale")
    .reduce((acc, m) => acc + importoEffettivo(m), 0);

  const disponibile = s.resta + speso;
  const quota = s.giorniRimasti > 0 ? Math.floor(Math.max(0, disponibile) / s.giorniRimasti) : 0;
  const sforo = Math.max(0, speso - quota);

  /* LA SCALA, e serve perché la prima versione era un interruttore: ambra al
     primo centesimo oltre. 1,17 € di sforo su 57,66 dipingeva lo schermo
     come 40 €, e accanto a un'altra carta ambra faceva mezza schermata in
     allarme per niente. Un colore che si accende sempre non dice più niente.

     La tolleranza ha un fondo in euro oltre che una percentuale: l'8 % di
     una quota da 20 € è 1,60 €, e sotto quella cifra non è successo niente
     che valga un colore. Cinque euro è la soglia sotto cui non cambi idea
     su come finire la giornata.

     Poi si misura in GIORNI, che è l'unità in cui il danno è vero: lo sforo
     vale una quota intera = hai speso due giorni, due quote = tre giorni.
     Ambra fino a due giorni, rosso oltre i due, battito oltre i tre — un
     giorno che ne mangia più di tre è raro, ed è giusto che quando capita si
     veda da lontano senza doverlo leggere. */
  const tolleranza = Math.max(Math.round(quota * 0.08), 500);
  const livello =
    sforo === 0            ? "sereno"
    : sforo <= tolleranza  ? "limite"
    : sforo <= quota       ? "avviso"
    : sforo <= quota * 2   ? "male"
    :                        "grave";

  return {
    speso, quota, sforo, livello,
    resta: quota - speso,
    oltre: sforo > 0,
    // Quanti giorni è costata la giornata: 1 = in quota, 2,5 = due giorni e
    // mezzo. È il numero che si capisce senza fare conti.
    giorni: quota > 0 ? speso / quota : 0,
    frazione: quota > 0 ? Math.min(1, speso / quota) : (speso > 0 ? 1 : 0),
  };
}

/** Quanto è uscito oggi. Il confronto col ritmo lo fa chi la mostra. */
export function spesoOggi(iso = oggiISO()) {
  return movimentiVivi()
    .filter((m) => m.tipo === "out" && !m.ecc && m.data === iso)
    .reduce((s, m) => s + importoEffettivo(m), 0);
}

/* ---------------------------------------------------------- i ricorrenti -- */

const MESI_CADENZA = { mensile: 1, bimestrale: 2, trimestrale: 3, annuale: 12 };

/**
 * La prossima scadenza di un ricorrente, da `iso` in avanti.
 *
 * Tre cose la spostano in avanti, e sono tre cose diverse:
 *
 * `r.da`      il ricorrente non esiste prima di quella data. Le utenze
 *             partono a settembre ma la prima bolletta arriva a fine
 *             ottobre: senza una data d'inizio l'unico modo di dirlo era
 *             tenerlo spento e ricordarsi di riaccenderlo.
 * `r.pagato`  l'ultima scadenza già saldata. Una rata pagata tre giorni in
 *             anticipo deve sparire da «In arrivo», non restarci fino al
 *             giorno giusto raccontando una cosa falsa.
 * `r.mese`    l'ancora della cadenza, per quelle non mensili.
 *
 * Quando c'è `da`, l'ancora la detta lui: è la data della PRIMA scadenza,
 * quindi bimestrale da ottobre vuol dire ottobre-dicembre-febbraio e non
 * gennaio-marzo-maggio. `mese` resta per i ricorrenti vecchi che non ce
 * l'hanno.
 */
export function prossimaScadenza(r, iso = oggiISO()) {
  const passo = MESI_CADENZA[r.cadenza] || 1;

  // Il punto di partenza è il più avanti fra oggi, l'inizio del ricorrente
  // e il giorno dopo l'ultima scadenza saldata.
  let partenza = iso;
  if (r.da && r.da > partenza) partenza = r.da;
  if (r.pagato && r.pagato >= partenza) {
    partenza = isoDi(new Date(daISO(r.pagato).getTime() + 86400000));
  }

  const d = daISO(partenza);
  const ancora = passo === 1 ? null
    : r.da ? (daISO(r.da).getMonth())
    : ((r.mese || 1) - 1);
  for (let k = 0; k <= 36; k++) {
    const mese = d.getMonth() + k;
    // Con l'ancora si accettano solo i mesi che distano un multiplo del
    // passo dall'ancora stessa: bimestrale ancorato a gennaio = gen, mar,
    // mag…, annuale ancorato a dicembre = solo dicembre.
    if (ancora !== null && (((mese - ancora) % passo) + passo) % passo !== 0) continue;
    // Il giorno si taglia sulla lunghezza del mese: un ricorrente al 31 cade
    // il 30 a novembre, non il 1° dicembre.
    const ultimo = new Date(d.getFullYear(), mese + 1, 0).getDate();
    const cand = isoDi(new Date(d.getFullYear(), mese, Math.min(r.giorno, ultimo)));
    // Il confronto è con PARTENZA, non con `iso`. Con `iso` una scadenza
    // appena saldata continuava a essere la prossima: la partenza si
    // spostava al giorno dopo, il candidato tornava quello di ieri, e
    // passava lo stesso perché era comunque successivo a oggi.
    if (cand >= partenza) return cand;
  }
  return null;
}

export const importoRicorrente = (r) =>
  r.tipo === "variabile" ? (r.stimaMax || r.stimaMin || 0) : (r.imp || 0);

/**
 * Cosa esce nei prossimi `giorni`.
 *
 * Risponde a «posso permettermi questa cena, o fra tre giorni mi arriva una
 * bolletta?», che è la domanda per cui si apre l'app la sera.
 */
export function inArrivo(giorni = 14, iso = oggiISO()) {
  const limite = isoDi(new Date(daISO(iso).getTime() + giorni * 86400000));
  const voci = [];
  for (const r of ricorrentiVivi()) {
    if (!r.attivo) continue;
    const quando = prossimaScadenza(r, iso);
    if (!quando || quando > limite) continue;
    voci.push({
      ...r, quando,
      importo: importoRicorrente(r),
      // Le variabili vanno marcate: l'importo è una stima, e trattarla come
      // certa è il modo di scoprire troppo tardi che non bastava.
      stimato: r.tipo === "variabile",
      fra: Math.round((daISO(quando) - daISO(iso)) / 86400000),
      origine: "ricorrente",
    });
  }

  // I previsti: una tantum futuri, stessa lista. Se ne stessero in un
  // riquadro loro bisognerebbe sommare due totali a mente per sapere quanto
  // esce nei prossimi quattordici giorni, ed è esattamente la domanda a cui
  // «In arrivo» esiste per rispondere.
  for (const p of previsti()) {
    if (!p.quando || p.quando > limite) continue;
    voci.push({
      ...p, importo: p.imp || 0, stimato: false,
      fra: Math.round((daISO(p.quando) - daISO(iso)) / 86400000),
      origine: "previsto",
    });
  }

  voci.sort((a, b) => a.quando.localeCompare(b.quando));

  const totale = voci.reduce((s, v) => s + v.importo, 0);
  const daFisse = voci.filter((v) => v.pocket === "fisse").reduce((s, v) => s + v.importo, 0);
  const saldoFisse = saldoPocket("fisse");

  // Il conto pocket per pocket. Con le sole Fisse bastava, finché tutto
  // usciva da lì; una maxi rata da 2.576 sulla riserva non la vedeva
  // nessuno, e «coperto» diceva di sì guardando il pocket sbagliato.
  const perPocket = {};
  for (const v of voci) {
    const id = v.pocket || "principale";
    (perPocket[id] ||= { totale: 0, saldo: saldoPocket(id), voci: 0 });
    perPocket[id].totale += v.importo;
    perPocket[id].voci++;
  }
  for (const p of Object.values(perPocket)) {
    p.scoperto = Math.max(0, p.totale - p.saldo);
    p.coperto = p.scoperto === 0;
  }

  return {
    voci, totale, daFisse, saldoFisse, perPocket,
    // È l'errore che ha spaccato luglio: abbonamenti da 55 in un pocket da
    // 20, che ogni mese sbordavano sul settimanale.
    scoperto: Math.max(0, daFisse - saldoFisse),
    coperte: daFisse <= saldoFisse,
    // Lo scoperto vero, su tutti i pocket coinvolti.
    scopertoTotale: Object.values(perPocket).reduce((s, p) => s + p.scoperto, 0),
  };
}

/* ------------------------------------------- le uscite come eventi ------ */
/*
   Una voce di «In arrivo» tradotta nei campi che disegna `voceEvento()`.

   Sta qui e non in una vista perché la usano in due — la carta Finanze
   della home e la scheda «In arrivo» dentro Finanze — e devono dire le
   stesse parole. Il giorno che una delle due comincia a scrivere «fra 2
   giorni» dove l'altra scrive «Mer 25 ago», sono due schermate di due app
   diverse.
*/

const GIORNI_BREVI = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];

/**
 * `tono` non è decorazione: dice perché quella riga ti riguarda oggi.
 * Rosso = il pocket da cui deve uscire non la copre. Ambra = esce entro due
 * giorni. Altrimenti spento, che è la maggioranza dei casi ed è giusto:
 * se ogni riga è colorata, il colore non dice più «questa».
 */
export function comeEvento(v) {
  const d = daISO(v.quando);
  const cop = coperturaDi(v);
  return {
    chiave: `${v.origine}:${v.id}:${v.quando}`,
    giornoNome: v.fra === 0 ? "Oggi" : v.fra === 1 ? "Domani" : GIORNI_BREVI[d.getDay()],
    giornoData: `${d.getDate()} ${MESI_BREVI[d.getMonth()]}`,
    oggi: v.fra === 0,
    nome: v.nome,
    valore: v.stimato
      ? `${eu(v.stimaMin)}–${eu(v.stimaMax)}`
      : euEvento(v.importo),
    dettaglio: cop.coperto
      ? NOMI_POCKET[v.pocket] || v.pocket
      : `${NOMI_POCKET[v.pocket] || v.pocket} · mancano ${eu(cop.manca)}`,
    tono: !cop.coperto ? "male" : v.fra <= 2 ? "avviso" : "",
  };
}

const NOMI_POCKET = { principale: "Principale", cassa: "Cassa", fisse: "Fisse", ing: "ING" };

/**
 * I centesimi solo quando ci sono.
 *
 * `eu()` arrotonda all'euro, e va bene per un affitto: su WindTRE da 4,99
 * scriverebbe «5 €», che su una voce da cinque euro è un errore del 2% e
 * soprattutto è una cifra che non compare in nessun estratto conto.
 */
const euEvento = (c) => (c || 0) % 100 === 0
  ? eu(c)
  : `${((c || 0) / 100).toLocaleString("it-IT",
      { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

/** Le prossime `quante` uscite, già pronte da disegnare. Per la home. */
export const calendarioUscite = (iso = oggiISO(), quante = 3) =>
  inArrivo(30, iso).voci.slice(0, quante).map(comeEvento);

/** Basta il pocket per sapere se una singola voce è coperta. */
export function coperturaDi(voce) {
  const id = voce.pocket || "principale";
  const saldo = saldoPocket(id);
  return { pocket: id, saldo, manca: Math.max(0, (voce.importo ?? voce.imp ?? 0) - saldo),
    coperto: saldo >= (voce.importo ?? voce.imp ?? 0) };
}

/** I ricorrenti che scadono proprio oggi: la home li dice per nome. */
export const ricorrentiDiOggi = (iso = oggiISO()) =>
  inArrivo(0, iso).voci.filter((v) => v.quando === iso);

/* -------------------------------------------- discrezionale vs necessario */

export function comeSpendi(ciclo) {
  const per = { automatico: 0, necessario: 0, discrezionale: 0 };
  for (const m of movimentiDelCiclo(ciclo)) {
    if (m.tipo !== "out" || m.ecc) continue;
    per[classeDi(m.cat, m.sub)] += importoEffettivo(m);
  }
  const totale = per.automatico + per.necessario + per.discrezionale;
  return {
    ...per, totale,
    // Nella card «necessario» somma automatico e necessario: dal punto di
    // vista di una decisione sono la stessa cosa, soldi che escono comunque.
    necessarioTotale: per.automatico + per.necessario,
    pctDiscrezionale: totale > 0 ? per.discrezionale / totale : 0,
  };
}

/* -------------------------------------------------------- gli sforamenti -- */

export function sforamenti(ciclo) {
  const tutti = movimentiVivi().filter((m) => m.tipo === "extra");
  const delCiclo = tutti.filter((m) => m.data >= ciclo.da && m.data <= ciclo.a);
  const ultimo = tutti.slice().sort((a, b) => b.data.localeCompare(a.data))[0] || null;
  return {
    n: delCiclo.length,
    totale: delCiclo.reduce((s, m) => s + m.imp, 0),
    ultimo,
    perche: delCiclo.map((m) => ({ data: m.data, imp: m.imp, perche: m.nota })),
  };
}

/* ------------------------------------------------------------- gli alert -- */
/*
   Un alert compare SOLO se azionabile, e al massimo due alla volta: se ce ne
   sono di più si mostrano i due più gravi. Una lista di dieci avvisi non si
   legge, e il decimo rende invisibile il primo.

   Il tono è quello di un cruscotto: dice cosa succede, non giudica.
*/

const PESO = { critico: 3, warn: 2, info: 1 };

/** Un euro piano: gli alert sono testo, non markup. */
const eu = (c) => `${Math.round((c || 0) / 100).toLocaleString("it-IT")} €`;

export function alert(iso = oggiISO()) {
  const ciclo = cicloDi(iso);
  const s = settimana(iso);
  const arrivo = inArrivo(14, iso);
  const soglie = { ...SOGLIE_PREDEFINITE, ...(stato().soglie || {}) };
  const out = [];

  if (arrivo.scoperto > 0) {
    const daFisse = arrivo.voci.filter((v) => v.pocket === "fisse");
    // Con una voce sola si dice quella, che è più utile di un totale; con
    // più voci si dice il totale, perché nominarne una e poi dare il buco di
    // tutte insieme fa sembrare che i conti non tornino.
    out.push({
      id: "fisse_scoperte", livello: "critico",
      testo: daFisse.length === 1
        ? `Il ${daISO(daFisse[0].quando).getDate()} esce ${daFisse[0].nome.toLowerCase()} da ${eu(daFisse[0].importo)} e nel pocket Fisse ce ne sono ${eu(arrivo.saldoFisse)}. Mancano ${eu(arrivo.scoperto)}.`
        : `Nei prossimi 14 giorni dalle Spese fisse escono ${eu(arrivo.daFisse)} e nel pocket ce ne sono ${eu(arrivo.saldoFisse)}. Mancano ${eu(arrivo.scoperto)}.`,
    });
  }

  if (s.finita && s.giorniRimasti >= 1) {
    out.push({
      id: "settimana_finita", livello: "warn",
      testo: `Settimana finita. ${s.giorniRimasti === 1 ? "1 giorno" : `${s.giorniRimasti} giorni`} a lunedì.`,
    });
  } else if (s.budget > 0 && s.speso > s.atteso * 1.25) {
    out.push({
      id: "settimana_ritmo", livello: "info",
      testo: `A questo ritmo la settimana finisce prima di domenica. Restano ${eu(s.resta)} per ${s.giorniRimasti === 1 ? "1 giorno" : `${s.giorniRimasti} giorni`}.`,
    });
  }

  const ing = (stato().pockets || []).find((p) => p.id === "ing");
  if (ing && (ing.saldo || 0) > 0 && (ing.saldo || 0) < soglie.ingMinimo) {
    out.push({ id: "ing_sotto_minimo", livello: "warn", testo: "Riserva sotto il minimo di sicurezza." });
  }

  for (const c of categorieDelCiclo(ciclo)) {
    if (!c.budget) continue;
    if (c.speso > c.budget) {
      out.push({ id: `cat_sforata:${c.id}`, livello: "warn",
        testo: `${c.nome} ha superato il budget di ${eu(c.speso - c.budget)}.` });
    } else if (c.speso >= c.budget * soglie.catAvviso) {
      out.push({ id: `cat_soglia:${c.id}`, livello: "info",
        testo: `${c.nome}: ${eu(c.speso)} su ${eu(c.budget)}. Restano ${eu(c.budget - c.speso)}.` });
    }
  }

  for (const v of arrivo.voci) {
    if (!v.stimato || v.fra > 10) continue;
    out.push({ id: `bimestrale_vicina:${v.id}`, livello: "info",
      testo: `${v.nome} fra ${v.fra === 0 ? "oggi" : v.fra === 1 ? "1 giorno" : `${v.fra} giorni`}: ${eu(v.stimaMin)}–${eu(v.stimaMax)}.` });
  }

  out.sort((a, b) => PESO[b.livello] - PESO[a.livello]);
  return out.slice(0, 2);
}

/** Le categorie del ciclo con speso e budget, dal profilo del mese d'inizio. */
/**
 * Le categorie di una finestra qualunque, col budget del profilo che le
 * compete.
 *
 * `chiaveProfilo` decide fra Agosto e Regime guardando il mese: per il mese
 * solare è se stesso, per il ciclo è il mese in cui è COMINCIATO. Sembra
 * discutibile — il ciclo 21 ago–20 set è per due terzi settembre — e invece
 * regge, perché le spese non si distribuiscono uniformemente: in quel ciclo
 * 26 uscite su 27 cadono negli undici giorni di agosto. Il profilo Agosto
 * esiste per le ferie, e le ferie stanno lì.
 */
export function categorieTra(da, a, chiaveMese) {
  const p = profiloDi(chiaveMese);
  const speso = {};
  for (const m of movimentiVivi()) {
    if (m.data < da || m.data > a) continue;
    if (m.tipo !== "out" || m.ecc) continue;
    speso[m.cat] = (speso[m.cat] || 0) + importoEffettivo(m);
  }
  return stato().cats.map((c) => ({
    id: c.id, nome: c.nome,
    speso: speso[c.id] || 0,
    budget: Math.round((p.b[c.id] || 0) * 100),
  }));
}

export const categorieDelCiclo = (ciclo) => categorieTra(ciclo.da, ciclo.a, ciclo.indice);

/** Le stesse categorie sul mese solare, per chi vuole guardarle così. */
export function categorieDelMese(mese) {
  const [y, m] = mese.split("-").map(Number);
  const ultimo = new Date(y, m, 0).getDate();
  return categorieTra(`${mese}-01`, `${mese}-${String(ultimo).padStart(2, "0")}`, mese);
}

/* ================================================== il check giornaliero ==
   Le quattro domande che si fanno guardando i conti la sera, ridotte a
   quattro esiti. Sta qui e non nella vista perché è calcolo: la vista deve
   poterle disegnare senza sapere che cosa vuol dire «sopra ritmo».

   Ogni voce ha un `esito` — "ok", "attenzione", "male" — e una frase già
   fatta. La frase la scrive il calcolo e non la vista per una ragione sola:
   la soglia e le parole devono cambiare insieme. Con la soglia qui e la
   frase là, la prima volta che si sposta una delle due l'app comincia a
   dire «in linea» a un numero che ha appena classificato come alto.
   ========================================================================= */

/**
 * Il quadro del check di oggi.
 *
 * Il verdetto è la voce peggiore, non una media: tre cose a posto e una
 * fuori fanno una giornata con una cosa fuori, e mediarle vorrebbe dire
 * nascondere proprio quella che va guardata.
 */
export function esitoCheck(iso = oggiISO()) {
  const s = settimana(iso);
  const speso = spesoOggi(iso);
  const arrivo = inArrivo(14, iso);
  const oggiRic = ricorrentiDiOggi(iso);
  const sospese = pendenti();
  const voci = [];

  // 1. IL RITMO DI OGGI. Il confronto non è col budget della settimana ma
  //    con quello che resta diviso i giorni che restano: è l'unica misura
  //    che risponde a «oggi ho esagerato o no».
  if (!s.budget) {
    voci.push({ id: "ritmo", esito: "neutro", titolo: "Ritmo di oggi",
      testo: "Non c'è ancora una cassa settimanale: il ritmo non si può misurare." });
  } else if (s.finita) {
    voci.push({ id: "ritmo", esito: "male", titolo: "Ritmo di oggi",
      testo: `Il settimanale è a zero e mancano ${plur(s.giorniRimasti, "giorno", "giorni")} a lunedì.` });
  } else {
    // La misura la fa `giornata()`, non questa funzione. Era ricalcolata qui
    // con una soglia sua — «attenzione» appena sopra la quota — e la carta
    // del check si accendeva d'ambra per un euro proprio mentre la riga di
    // OGGI, con la sua scala, diceva che non era successo niente. Due
    // verdetti diversi sullo stesso fatto nella stessa schermata.
    const g = giornata(iso);
    const esito = { sereno: "ok", limite: "ok", avviso: "attenzione", male: "male", grave: "male" }[g.livello];
    voci.push({
      id: "ritmo", esito, titolo: "Ritmo di oggi",
      valore: eu(g.speso),
      testo: esito === "ok"
        ? `${eu(g.speso)} contro ${eu(g.quota)} al giorno. Sei dentro.`
        : esito === "attenzione"
          ? `${eu(g.speso)} contro ${eu(g.quota)} al giorno. Poco sopra, si recupera.`
          : `${eu(g.speso)} contro ${eu(g.quota)} al giorno. Oggi è andata larga.`,
    });
  }

  // 2. LA SETTIMANA. Non «quanto hai speso» ma «quanto hai speso rispetto a
  //    dove dovresti essere»: al mercoledì il 60% consumato è un problema,
  //    al sabato no, e senza il confronto col giorno non si distingue.
  if (s.budget) {
    const scarto = s.speso - s.atteso;
    const esito = scarto <= 0 ? "ok" : scarto <= s.disponibile * 0.12 ? "attenzione" : "male";
    voci.push({
      id: "settimana", esito, titolo: "La settimana",
      valore: eu(s.resta),
      testo: esito === "ok"
        ? `${eu(s.resta)} per ${plur(s.giorniRimasti, "giorno", "giorni")}. Sei avanti sul piano.`
        : `${eu(s.resta)} per ${plur(s.giorniRimasti, "giorno", "giorni")}. Sei ${eu(scarto)} sopra il ritmo.`,
    });
  }

  // 3. COSA ESCE. Prima quello che esce oggi — è l'unica cosa che può
  //    rendere sbagliato il numero grande nel giro di poche ore — poi il
  //    buco sulle fisse, che è l'errore che ha spaccato luglio.
  if (arrivo.scoperto > 0) {
    voci.push({ id: "arrivo", esito: "male", titolo: "In arrivo",
      valore: eu(arrivo.scoperto),
      testo: `Alle Spese fisse mancano ${eu(arrivo.scoperto)} per coprire i prossimi 14 giorni.` });
  } else if (oggiRic.length) {
    voci.push({ id: "arrivo", esito: "attenzione", titolo: "In arrivo",
      valore: eu(oggiRic.reduce((t, r) => t + r.importo, 0)),
      testo: oggiRic.length === 1
        ? `Oggi esce ${oggiRic[0].nome.toLowerCase()}. Controlla che sia passato.`
        : `Oggi escono ${oggiRic.length} addebiti. Controlla che siano passati.` });
  } else {
    const p = arrivo.voci[0];
    voci.push({ id: "arrivo", esito: "ok", titolo: "In arrivo",
      valore: p ? eu(arrivo.totale) : "—",
      testo: p
        ? `${eu(arrivo.totale)} nei prossimi 14 giorni, e i pocket li coprono.`
        : "Niente in scadenza nei prossimi 14 giorni." });
  }

  // 4. I MOVIMENTI IN SOSPESO. L'unica voce su cui il check chiede di fare
  //    qualcosa invece che di sapere qualcosa.
  voci.push(sospese.length
    ? { id: "sospese", esito: "attenzione", titolo: "Da sistemare",
        valore: String(sospese.length),
        testo: `${plur(sospese.length, "movimento", "movimenti")} in sospeso da chiudere.` }
    : { id: "sospese", esito: "ok", titolo: "Da sistemare",
        testo: "Niente in sospeso. Il registro è pulito." });

  const peggiore = voci.some((v) => v.esito === "male") ? "male"
    : voci.some((v) => v.esito === "attenzione") ? "attenzione" : "ok";

  return {
    iso, voci, esito: peggiore,
    fatto: checkFatto(iso),
    serie: serieCheck(iso),
    speso, settimana: s, sospese: sospese.length,
    titolo: peggiore === "ok" ? "Sei in pari"
      : peggiore === "attenzione" ? "Quasi in pari" : "Fuori dal piano",
    sottotitolo: peggiore === "ok"
      ? "Il piano regge. Non devi fare niente."
      : peggiore === "attenzione"
        ? "Niente di rotto, ma c'è una cosa da tenere d'occhio."
        : "C'è qualcosa che va sistemato adesso, non domani.",
  };
}

// Due formattatori minuscoli, per non tirare dentro `plurale` da ui.js:
// calcolo.js non deve dipendere dal modulo dell'interfaccia più di quanto
// già faccia per le date.
const plur = (n, s1, s2) => `${n} ${n === 1 ? s1 : s2}`;
