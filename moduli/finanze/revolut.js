// moduli/finanze/revolut.js — l'estratto conto come fonte di verità.
//
// PERCHÉ ESISTE: i saldi andavano in deriva. L'app diceva Principale
// 103,15 / Cassa 180,09 / ING 815,66 e i saldi veri erano 57,10 / 120,20 /
// 709,76 — quasi trecento euro di differenza, accumulati un movimento
// dimenticato alla volta. E rimetterli a posto a mano voleva dire un'ora
// con due schermi aperti, cioè una cosa che si fa due volte e poi mai più.
//
// La deriva non è un bug: è inevitabile in qualunque registro tenuto a
// mano. L'unica cura è non tenerlo a mano. Dall'estratto conto l'app sa
// tutto: cosa è uscito, quando, e quanto c'era alla fine. Quello che prima
// si inseriva adesso si CONFERMA, e i saldi non si scrivono più — si
// riancorano.
//
// L'import generico in `importa.js` resta: serve per le banche che non
// sono Revolut e per le righe incollate a mano. Questo è diverso perché
// non importa, riconcilia: dice anche cosa c'è nell'app e NON c'è
// nell'estratto, che è il caso in cui un movimento è stato registrato due
// volte o inventato.

import { movimentiVivi, normalizza, categoriaPerId, stato } from "./dati.js";
import { autoCategoria } from "./calcolo.js";
import { leggiCSV, aISO, aCentesimi } from "./importa.js";

/* ------------------------------------------------------------- le mappe -- */

/** Prodotto Revolut → pocket di ATLAS. Modificabile in Impostazioni. */
export const MAPPA_PRODOTTI = { attuale: "principale", deposito: "cassa", risparmi: "fisse" };

/** Carta usata per la ricarica → pocket da cui arrivano i soldi. */
export const MAPPA_CARTE = { "8595": "ing" };

const mappaProdotti = () => ({ ...MAPPA_PRODOTTI, ...(stato().config?.mappaProdotti || {}) });
const mappaCarte = () => ({ ...MAPPA_CARTE, ...(stato().config?.mappaCarte || {}) });

const pocketDiProdotto = (p) => mappaProdotti()[normalizza(p)] || null;

/* --------------------------------------------------------- riconoscere -- */

/** L'intestazione dell'estratto Revolut in italiano. */
export function eEstrattoRevolut(testo) {
  const testa = normalizza((String(testo || "").split(/\r?\n/)[0] || ""));
  return testa.includes("prodotto") && testa.includes("importo")
    && (testa.includes("data di inizio") || testa.includes("saldo"));
}

const ANNULLATA = /annullat|declin|revert/i;
const SOSPESO = /sospes|pending/i;

/* ========================================================================
   I DUE LATI DI UN GIROCONTO.

   Un travaso dalla Cassa al Principale nell'estratto è DUE righe: +60 su
   Attuale e −60 su Deposito, stesso orario. Importarle entrambe
   significherebbe registrare un'entrata e un'uscita invece di un
   giroconto: il totale delle entrate del mese salirebbe di sessanta euro
   che non sono mai entrati da nessuna parte, e il budget li conterebbe.

   Si appaiano per orario e importo — non per descrizione, che è diversa
   sui due lati — e diventano un movimento solo.
   ======================================================================== */

const GIRI = [
  { re: /da\s+eur\s+cassa\s+settimanale/i, da: "cassa", a: "principale" },
  { re: /a\s+eur\s+cassa\s+settimanale/i, da: "principale", a: "cassa" },
  { re: /prelievo\s+da\s+pocket/i, da: "fisse", a: "principale" },
  { re: /versamento\s+(in|su)\s+pocket/i, da: "principale", a: "fisse" },
];

const RICARICA = /ricarica\s+(di|da)\s+.*?con\s+\*?(\d{4})/i;
const INTERESSI = /interess/i;
const USCITA = /pagamento\s+con\s+carta|pagamento\s+a\s+favore|addebito|prelievo\s+di\s+contanti/i;

/**
 * Dall'estratto alle righe pronte, più i saldi letti in fondo.
 *
 * `saldi` è l'ultimo `Saldo` COMPLETATO di ogni prodotto: è quello il
 * numero che la banca garantisce. `disponibili` è quello meno i movimenti
 * in sospeso, cioè quanto puoi spendere davvero — e la differenza fra i
 * due è esattamente la ragione per cui il saldo dell'app non tornava mai
 * con quello che si legge sul telefono.
 */
export function leggiEstratto(testo) {
  const righe = leggiCSV(String(testo || ""));
  if (!righe.length) return { righe: [], saldi: {}, disponibili: {}, scartate: 0, periodo: null };

  const testa = righe[0].map((h) => normalizza(h));
  const col = (...nomi) => {
    for (const n of nomi) {
      const i = testa.findIndex((h) => h === n);
      if (i >= 0) return i;
    }
    for (const n of nomi) {
      const i = testa.findIndex((h) => h.includes(n));
      if (i >= 0) return i;
    }
    return -1;
  };

  const iTipo = col("tipo", "type");
  const iProd = col("prodotto", "product");
  const iInizio = col("data di inizio", "started date");
  const iFine = col("data di completamento", "completed date");
  const iDesc = col("descrizione", "description");
  const iImp = col("importo", "amount");
  const iCosto = col("costo", "fee");
  const iVal = col("valuta", "currency");
  const iStato = col("state", "stato");
  const iSaldo = col("saldo", "balance");

  const grezze = [];
  const saldi = {};
  const sospesi = {};
  let scartate = 0;

  for (const r of righe.slice(1)) {
    const prodotto = String(r[iProd] ?? "");
    const pocket = pocketDiProdotto(prodotto);
    const statoRiga = String(r[iStato] ?? "");
    const desc = String(r[iDesc] ?? "").trim();
    const tipoRev = String(r[iTipo] ?? "").trim();

    if (ANNULLATA.test(statoRiga)) { scartate++; continue; }
    if (iVal >= 0 && String(r[iVal] || "EUR").toUpperCase().trim() !== "EUR") { scartate++; continue; }

    const imp = aCentesimi(r[iImp]);
    if (imp === null || imp === 0) { scartate++; continue; }
    // Il costo è un'uscita a sé: sommarlo all'importo fa sparire la
    // commissione dentro la spesa, e le commissioni si guardano.
    const costo = Math.abs(aCentesimi(r[iCosto]) || 0);

    const data = aISO(String(r[iInizio] ?? "").slice(0, 10))
      || aISO(String(r[iFine] ?? "").slice(0, 10));
    if (!data) { scartate++; continue; }

    const pending = SOSPESO.test(statoRiga);
    const saldo = iSaldo >= 0 ? aCentesimi(r[iSaldo]) : null;

    if (!pending && pocket && saldo !== null) saldi[pocket] = saldo;
    if (pending && pocket) sospesi[pocket] = (sospesi[pocket] || 0) + imp;

    grezze.push({
      riga: r, prodotto, pocket, data, imp, costo, pending,
      // L'orario grezzo: è la chiave con cui si appaiano i due lati di un giro.
      orario: String(r[iInizio] ?? "").trim(),
      nota: desc || tipoRev,
      tipoRev,
    });
  }

  /* --- i giri, appaiati ------------------------------------------------- */
  const usate = new Set();
  const fuori = [];

  for (let i = 0; i < grezze.length; i++) {
    if (usate.has(i)) continue;
    const g = grezze[i];
    const regola = GIRI.find((x) => x.re.test(g.nota));
    if (!regola) continue;

    // Il gemello: stesso orario, stesso importo assoluto, segno opposto.
    const j = grezze.findIndex((x, k) => k !== i && !usate.has(k)
      && x.orario === g.orario && Math.abs(x.imp) === Math.abs(g.imp)
      && Math.sign(x.imp) !== Math.sign(g.imp));

    usate.add(i);
    let da = regola.da;
    let a = regola.a;
    if (j >= 0) {
      usate.add(j);
      // Coi due lati veri non serve indovinare: esce da chi è in negativo.
      const neg = g.imp < 0 ? g : grezze[j];
      const pos = g.imp < 0 ? grezze[j] : g;
      if (neg.pocket) da = neg.pocket;
      if (pos.pocket) a = pos.pocket;
    }
    if (da === a) continue;

    fuori.push({
      chiave: `giro:${g.orario}:${Math.abs(g.imp)}`,
      data: g.data, tipo: "giro", imp: Math.abs(g.imp),
      nota: g.nota, pocket: da, pocketTo: a, pending: g.pending,
      cat: null, sub: null,
    });
  }

  /* --- tutto il resto --------------------------------------------------- */
  for (let i = 0; i < grezze.length; i++) {
    if (usate.has(i)) continue;
    const g = grezze[i];

    const ric = g.nota.match(RICARICA);
    if (ric && g.imp > 0) {
      /* Una ricarica è un `extra`: porta soldi da fuori dentro le tasche di
         spesa. `pianificata: false` di partenza — se l'hai fatta tu a mano
         fuori dal giorno di paga, è uno strappo, e dirlo è il punto. */
      const sorgente = mappaCarte()[ric[2]] || "ing";
      fuori.push({
        chiave: `ext:${g.orario}:${g.imp}`,
        data: g.data, tipo: "extra", imp: g.imp, nota: g.nota,
        pocket: sorgente, pocketTo: g.pocket || "principale",
        pianificata: false, pending: g.pending, cat: null, sub: null,
      });
      continue;
    }

    if (INTERESSI.test(g.nota) && g.imp > 0) {
      // Gli interessi entrano ma non sono un'entrata: non sono soldi
      // guadagnati, e contarli nel budget alza le entrate attese di niente.
      fuori.push({
        chiave: `int:${g.orario}:${g.imp}`,
        data: g.data, tipo: "in", imp: g.imp, nota: g.nota,
        pocket: g.pocket || "cassa", pocketTo: null,
        interessi: true, pending: g.pending, cat: null, sub: null,
      });
      continue;
    }

    const uscita = g.imp < 0 || USCITA.test(g.nota);
    const base = {
      chiave: `${uscita ? "out" : "in"}:${g.orario}:${g.imp}:${normalizza(g.nota).slice(0, 24)}`,
      data: g.data, imp: Math.abs(g.imp), nota: g.nota,
      pocket: g.pocket || "principale", pocketTo: null,
      pending: g.pending, cat: null, sub: null,
    };
    fuori.push(uscita ? { ...base, tipo: "out" } : { ...base, tipo: "in" });

    if (g.costo > 0) {
      fuori.push({
        ...base, chiave: `fee:${g.orario}:${g.costo}`, tipo: "out",
        imp: g.costo, nota: `Commissione · ${g.nota}`, cat: "fisse", sub: null,
      });
    }
  }

  fuori.sort((a, b) => a.data.localeCompare(b.data));

  const disponibili = {};
  for (const [id, s] of Object.entries(saldi)) disponibili[id] = s + (sospesi[id] || 0);

  return {
    righe: fuori, saldi, disponibili, sospesi, scartate,
    periodo: fuori.length ? { da: fuori[0].data, a: fuori.at(-1).data } : null,
  };
}

/* ========================================================================
   LA RICONCILIAZIONE.

   Tre liste, e la terza è quella che prima non esisteva:

     nuovi      nell'estratto e non nell'app → da accettare
     abbinati   in entrambi → se l'importo differisce, vince l'estratto
     mancanti   nell'app e non nell'estratto → da guardare

   «Mancanti» è il caso di un movimento registrato due volte, o registrato e
   mai avvenuto, o con la data sbagliata di una settimana. Senza questa
   lista quei movimenti restano lì per sempre e la deriva riparte.

   L'abbinamento tollera due centesimi e due giorni. I due centesimi
   servono per gli arrotondamenti, i due giorni perché la data in cui
   registri una spesa e quella in cui la banca la addebita non sono la
   stessa — e trattarle come diverse produrrebbe un doppione per ogni
   spesa.
   ======================================================================== */

const TOLLERANZA_IMP = 2;
const TOLLERANZA_GIORNI = 2;

const giorniTra = (a, b) =>
  Math.abs(Math.round((new Date(`${a}T12:00:00`) - new Date(`${b}T12:00:00`)) / 86400000));

export function riconcilia(estratto, { da = null, a = null } = {}) {
  const periodo = estratto.periodo || { da, a };
  const dentro = (iso) => (!periodo?.da || iso >= periodo.da) && (!periodo?.a || iso <= periodo.a);

  // I candidati: i movimenti dell'app nel periodo dell'estratto, allargato
  // della tolleranza — un movimento del 30 settembre può essere la riga del
  // 1 ottobre.
  const candidati = movimentiVivi().filter((m) => {
    if (!m.data) return false;
    if (dentro(m.data)) return true;
    return periodo?.da ? giorniTra(m.data, periodo.da) <= TOLLERANZA_GIORNI : false;
  });

  const presi = new Set();
  const nuovi = [];
  const abbinati = [];

  for (const r of estratto.righe) {
    const m = candidati.find((x) => !presi.has(x.id)
      && x.tipo === r.tipo
      && (x.pocket || "principale") === r.pocket
      && Math.abs(x.imp - r.imp) <= TOLLERANZA_IMP
      && giorniTra(x.data, r.data) <= TOLLERANZA_GIORNI);

    if (m) {
      presi.add(m.id);
      abbinati.push({ riga: r, mov: m, delta: r.imp - m.imp, dataDiversa: m.data !== r.data });
      continue;
    }

    let cat = r.cat;
    let sub = r.sub;
    let auto = false;
    if (r.tipo === "out" && !cat) {
      const g = autoCategoria(r.nota, { normalizza, categoriaPerId });
      if (g) { cat = g.cat; sub = g.sub; auto = true; }
    }
    nuovi.push({ ...r, cat, sub, auto, inc: true });
  }

  const mancanti = candidati.filter((m) => !presi.has(m.id) && dentro(m.data)
    // I giri li produce l'app da sola (la ricarica del lunedì, i travasi
    // della paga) e nell'estratto compaiono solo quando li fai davvero in
    // banca: segnalarli come mancanti vorrebbe dire segnalarne uno a
    // settimana per niente.
    && m.tipo !== "giro");

  const correzioni = abbinati.filter((x) => x.delta !== 0);

  return {
    nuovi, abbinati, mancanti, correzioni,
    saldi: estratto.saldi, disponibili: estratto.disponibili,
    periodo,
    zero: nuovi.length === 0 && mancanti.length === 0 && correzioni.length === 0,
  };
}
