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

import { movimentiVivi, stato, profiloDi, CATEGORIE_CASSA } from "./dati.js";
import { isoDi, daISO, oggiISO } from "../../core/ui.js";

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

/**
 * Il risparmio reale: quanto resta del budget casa dopo affitto e utenze.
 * È il numero che l'utente controlla più spesso, ed è l'unico che dice
 * qualcosa sul mese *prossimo* invece che su questo.
 */
export function risparmioReale(mese) {
  const { config } = stato();
  const st = statistiche(mese);
  const p = profiloDi(mese);
  const affitto = Math.round((config.affitto || 0) * 100);
  // Le utenze vere se superano il previsto, altrimenti il previsto: a metà
  // mese le bollette non sono ancora arrivate e il risparmio sembrerebbe
  // più alto di quello che sarà.
  const utenze = Math.max(st.perCat.casa?.ord || 0, Math.round((p.b.casa || 0) * 100));
  const base = Math.round((config.casaBase || 0) * 100);
  return { valore: base - affitto - utenze, base, affitto, utenze };
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
