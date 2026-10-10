// moduli/finanze/gruppi.js — dove vanno i soldi, e quali sono le leve.
//
// IL GUASTO DA CUI NASCE QUESTO FILE. L'Analisi metteva tutto in un
// calderone: affitto, rata del prestito, Telepass pagato da ING, il monitor
// e il caffè finivano negli stessi totali, nelle stesse medie, nelle stesse
// proiezioni. Il risultato erano numeri veri e inutili — «media al giorno
// 98 €», «scontrino medio 50 €», «giorno più caro 875 €» — tutti gonfiati
// dall'affitto, e nessuno dei quali dice niente su quello che si può
// cambiare.
//
// LA REGOLA, e non ha eccezioni: nessuna media, proiezione, percentuale o
// confronto si calcola su un totale che contiene Fisse o spese da riserva.
// Si calcola solo su quello che hai deciso tu.
//
// Per poterlo fare serve una cosa sola: che ogni uscita sappia dire a quale
// dei cinque gruppi appartiene. Quella risposta la dà `gruppoDi()`, ed è
// l'unica cosa in questo file che vale la pena leggere con attenzione.
//
// Come `calcolo.js` e `piano.js`: funzioni pure, niente DOM, niente
// scritture.

import { stato, movimentiVivi, previstiTutti } from "./dati.js";
import {
  importoEffettivo, movimentiDelCiclo, giornoDelCiclo, categorieDelCiclo,
  spostaCiclo, nomeCiclo,
} from "./calcolo.js";
import { eFuoriPiano, budgetVita } from "./piano.js";
import { oggiISO, piuGiorni, MESI_BREVI } from "../../core/ui.js";

/* ========================================================================
   I CINQUE GRUPPI
   ======================================================================== */

/**
 * `neutro` vuol dire: questo gruppo non è una leva.
 *
 * Non è un giudizio morale, è aritmetica. L'affitto lo paghi comunque, il
 * bollo lo paghi comunque, il parcheggio l'avevi già deciso. Metterli a
 * colori accanto al caffè vorrebbe dire invitare a guardarli, e guardarli
 * non serve a niente. Grigi: ci sono, si sommano, non si discutono.
 */
export const GRUPPI = [
  { id: "fisse", nome: "Fisse", neutro: true },
  { id: "riserva", nome: "Da riserva", neutro: true },
  { id: "pianificate", nome: "Pianificate", neutro: true },
  { id: "fuoriPiano", nome: "Fuori piano", neutro: false },
  { id: "quotidiano", nome: "Quotidiano", neutro: false },
];

/** Le uniche due leve. Tutto quello che si può cambiare è qui dentro. */
export const DECISE = ["fuoriPiano", "quotidiano"];

export const nomeGruppo = (id) => GRUPPI.find((g) => g.id === id)?.nome || id;

/**
 * Gli indici che servono a `gruppoDi()`, costruiti una volta sola.
 *
 * Senza, ogni movimento rifarebbe la scansione di ricorrenti e previsti: su
 * un ciclo da quaranta uscite si vede, e `gruppoDi()` la chiamano cinque
 * blocchi della schermata.
 */
export function contestoGruppi() {
  const s = stato();
  const ric = new Map();
  for (const r of s.ricorrenti || []) if (r && !r.del) ric.set(r.id, r);
  const pre = new Map();
  for (const p of previstiTutti()) pre.set(p.id, p);
  const daLista = new Set();
  for (const v of s.lista || []) if (v && !v.del && v.movId) daLista.add(v.movId);
  return { ric, pre, daLista };
}

/**
 * A quale gruppo appartiene un'uscita. Uno e uno solo, sempre.
 *
 * L'ORDINE È LA DEFINIZIONE, e ogni riga è lì per un caso vero:
 *
 * 1. `fuoriPiano: true` scritto a mano vince su tutto. È una MARCA, non una
 *    deduzione: se l'hai messa tu, sai qualcosa che il calcolo non sa. È
 *    anche il caso del monitor — comprato dal Principale dopo averlo
 *    ricaricato da ING — che resta una decisione tua, non un prelievo
 *    dalla riserva.
 * 2. Le Fisse. Prima della deduzione del fuori piano, se no un affitto da
 *    850 € inserito a mano (senza il «Paga» di una scadenza) supererebbe la
 *    soglia e si prenderebbe il posto di una decisione.
 * 3. La riserva. Anche questa prima della deduzione: il Telepass da 368 €
 *    passa la soglia del fuori piano ma non è una cosa che hai scelto
 *    stasera — è un addebito che ING copre.
 * 4. Il fuori piano DEDOTTO (`eFuoriPiano`): sopra soglia, non legato a una
 *    scadenza, non alimentare, non uscito dalla lista d'attesa.
 * 5. Il già deciso: una rata a pagamento differito, un parcheggio previsto,
 *    una cosa comprata dalla lista d'attesa.
 * 6. Il resto, che è la vita di tutti i giorni.
 *
 * Torna `null` per quello che non è un'uscita e per quello che è stato
 * rimborsato per intero: lo zero non appartiene a nessun gruppo, e metterlo
 * in uno gonfierebbe il conteggio dei movimenti senza spostare un euro.
 */
export function gruppoDi(m, ctx = contestoGruppi()) {
  if (!m || m.del || m.tipo !== "out") return null;
  if (importoEffettivo(m) <= 0) return null;

  if (m.fuoriPiano === true) return "fuoriPiano";

  const r = m.pian ? ctx.ric.get(m.pian) : null;
  const p = m.pian ? ctx.pre.get(m.pian) : null;
  const deciso = Boolean(m.pian || m.lista || ctx.daLista.has(m.id));

  if (r && r.cat === "fisse") return "fisse";
  // `!deciso` perché la rata AliExpress esce dalla stessa tasca delle
  // bollette ma non è una spesa fissa: è una cosa che hai comprato e che
  // paghi a rate. Il legame con un previsto lo dice, il pocket no.
  if (m.pocket === "fisse" && !deciso) return "fisse";

  if (m.pocket === "ing") return "riserva";
  if ((r && r.pocket === "ing") || (p && p.pocket === "ing")) return "riserva";

  if (eFuoriPiano(m)) return "fuoriPiano";
  if (deciso) return "pianificate";
  return "quotidiano";
}

/** Le uscite del ciclo già etichettate, una volta sola per tutti i blocchi. */
export function usciteDelCiclo(ciclo) {
  const ctx = contestoGruppi();
  const fuori = [];
  for (const m of movimentiDelCiclo(ciclo)) {
    const g = gruppoDi(m, ctx);
    if (g) fuori.push({ m, gruppo: g, imp: importoEffettivo(m) });
  }
  return fuori;
}

/* ========================================================================
   BLOCCO A — DOVE SONO ANDATI
   ======================================================================== */

/** Le tre voci più grosse di un gruppo, per nome: «affitto · rata · abbonamenti». */
function esempi(voci) {
  const per = new Map();
  for (const v of voci) {
    const nome = (v.m.nota || v.m.sub || "").trim() || "senza nota";
    per.set(nome, (per.get(nome) || 0) + v.imp);
  }
  return [...per.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([n]) => (n.length > 22 ? `${n.slice(0, 21)}…` : n).toLowerCase())
    .join(" · ");
}

/**
 * La barra impilata e le cinque righe sotto.
 *
 * `decise` è il numero che conta: fuori piano + quotidiano. È l'unico
 * totale su cui ha senso fare una media, e l'unico su cui si può agire.
 */
export function ripartizione(ciclo) {
  const voci = usciteDelCiclo(ciclo);
  const gruppi = GRUPPI.map((g) => {
    const mie = voci.filter((v) => v.gruppo === g.id);
    return {
      ...g,
      totale: mie.reduce((t, v) => t + v.imp, 0),
      n: mie.length,
      voci: mie.map((v) => v.m),
      esempi: esempi(mie),
    };
  });
  const totale = gruppi.reduce((t, g) => t + g.totale, 0);
  return {
    gruppi, totale,
    decise: gruppi.filter((g) => DECISE.includes(g.id)).reduce((t, g) => t + g.totale, 0),
    perId: Object.fromEntries(gruppi.map((g) => [g.id, g])),
  };
}

/* ========================================================================
   BLOCCO B — IL GRAFICO
   ======================================================================== */

/**
 * Le fette del grafico, per CATEGORIA, sul visibile.
 *
 * Due filtri che non si parlano, ed è la cosa che rende il grafico
 * utilizzabile: i gruppi decidono QUALI soldi entrano nel conto, le
 * categorie decidono come si vedono. Spegnere «Fuori piano» lascia il
 * quotidiano; spegnere «Cibo fuori» lascia tutto il resto. Il totale al
 * centro è sempre la somma di quello che si vede, se no la percentuale
 * accanto a una fetta non vuol dire niente.
 */
export function fetteDi(ciclo, { gruppi = DECISE, catSpente = [] } = {}) {
  const attivi = new Set(gruppi);
  const spente = new Set(catSpente);
  const budget = new Map(categorieDelCiclo(ciclo).map((c) => [c.id, c.budget]));
  const nomi = new Map(stato().cats.map((c) => [c.id, c.nome]));

  const per = new Map();
  for (const v of usciteDelCiclo(ciclo)) {
    if (!attivi.has(v.gruppo)) continue;
    const id = v.m.cat || "altro";
    const c = per.get(id) || { id, nome: nomi.get(id) || "Altro", totale: 0, n: 0, fuoriPiano: 0, budget: budget.get(id) || 0 };
    c.totale += v.imp;
    c.n++;
    if (v.gruppo === "fuoriPiano") c.fuoriPiano++;
    per.set(id, c);
  }

  const tutte = [...per.values()].sort((a, b) => b.totale - a.totale);
  const visibili = tutte.filter((c) => !spente.has(c.id));
  const totale = visibili.reduce((t, c) => t + c.totale, 0);
  return {
    tutte: tutte.map((c) => ({ ...c, spenta: spente.has(c.id), quota: totale ? c.totale / totale : 0 })),
    visibili, totale,
  };
}

/** Le sottocategorie di una categoria, dentro i gruppi accesi. Per il dettaglio. */
export function sottoDi(ciclo, catId, { gruppi = DECISE } = {}) {
  const attivi = new Set(gruppi);
  const per = new Map();
  for (const v of usciteDelCiclo(ciclo)) {
    if (!attivi.has(v.gruppo) || (v.m.cat || "altro") !== catId) continue;
    const nome = v.m.sub || "Senza sottocategoria";
    const x = per.get(nome) || { sub: nome, totale: 0, n: 0 };
    x.totale += v.imp;
    x.n++;
    per.set(nome, x);
  }
  return [...per.values()]
    .map((x) => ({ ...x, medio: Math.round(x.totale / Math.max(1, x.n)) }))
    .sort((a, b) => b.totale - a.totale);
}

/* ========================================================================
   BLOCCO C — IL RITMO DEL QUOTIDIANO
   ======================================================================== */

/**
 * Il ritmo, e questa volta su un numero che vuol dire qualcosa.
 *
 * Il vecchio «Ritmo della spesa +426 €» confrontava tutto lo speso con il
 * budget Vita: a metà ciclo l'affitto l'ha già fatto diventare rosso, e
 * resta rosso qualunque cosa tu faccia. Qui il confronto è fra il
 * quotidiano e la quota che il piano gli assegna — due numeri della stessa
 * specie.
 *
 * LA PROIEZIONE SI FA CON I DUE NUMERI CHE SI LEGGONO SOPRA, arrotondati al
 * centesimo, non con quelli esatti. Sembra sciatto ed è il contrario: chi
 * guarda la schermata fa la sottrazione con gli occhi, e se il risultato
 * non torna non crede più a nessuno dei tre.
 */
export function ritmoQuotidiano(ciclo, iso = oggiISO()) {
  const corrente = iso >= ciclo.da && iso <= ciclo.a;
  const giorni = corrente ? giornoDelCiclo(ciclo, iso) : ciclo.giorni;
  const quotidiano = ripartizione(ciclo).perId.quotidiano.totale;
  const budget = budgetVita();

  const alGiorno = giorni > 0 ? Math.round(quotidiano / giorni) : 0;
  const piano = ciclo.giorni > 0 ? Math.round(budget / ciclo.giorni) : 0;
  return {
    quotidiano, budget, giorni, corrente,
    alGiorno, piano,
    // A fine ciclo non è una proiezione, è il risultato.
    proiezione: corrente ? (alGiorno - piano) * ciclo.giorni : quotidiano - budget,
    // Al giorno 1 una pizza proietta trenta pizze: prima del quarto giorno
    // il numero c'è ma non si mostra.
    attendibile: !corrente || giorni >= 4,
  };
}

/** Il quotidiano cumulato giorno per giorno, e i fuori piano come punti. */
export function andamentoQuotidiano(ciclo) {
  const giorni = Array(ciclo.giorni).fill(0);
  const punti = [];
  for (const v of usciteDelCiclo(ciclo)) {
    const i = giornoDelCiclo(ciclo, v.m.data) - 1;
    if (i < 0 || i >= giorni.length) continue;
    if (v.gruppo === "quotidiano") giorni[i] += v.imp;
    else if (v.gruppo === "fuoriPiano") punti.push({ giorno: i + 1, valore: v.imp, nota: v.m.nota || "" });
  }
  let t = 0;
  const cum = giorni.map((x) => (t += x));
  /* I punti si disegnano SOPRA la linea, all'altezza che avrebbero se li
     sommassi — non dentro la linea. Sommarli vorrebbe dire dire che una
     decisione presa una volta ha alzato il ritmo di tutti i giorni dopo,
     che è falso: il giorno dopo il ritmo è quello di prima. */
  return { cum, punti: punti.map((p) => ({ ...p, y: cum[p.giorno - 1] + p.valore })) };
}

/* ========================================================================
   BLOCCO D — DOVE SI PERDE
   ======================================================================== */

/**
 * Le sottocategorie del QUOTIDIANO, dalla più cara.
 *
 * Solo il quotidiano, e questo è il punto. «Le voci più care» di prima
 * elencava Affitto, Prestito e Abbonamenti: tre righe che si leggevano ogni
 * volta e su cui non c'è niente da fare. Il numero che interessa non è il
 * totale ma l'IMPORTO MEDIO insieme al conteggio: 55,90 € di bar in 13
 * volte è una cosa, 55,90 € in una volta è un'altra.
 */
export function doveSiPerde(ciclo, max = 6) {
  const per = new Map();
  for (const v of usciteDelCiclo(ciclo)) {
    if (v.gruppo !== "quotidiano") continue;
    const nome = v.m.sub || "Senza sottocategoria";
    const x = per.get(nome) || { sub: nome, catId: v.m.cat, totale: 0, n: 0 };
    x.totale += v.imp;
    x.n++;
    per.set(nome, x);
  }
  return [...per.values()]
    .map((x) => ({ ...x, medio: Math.round(x.totale / Math.max(1, x.n)) }))
    .sort((a, b) => b.totale - a.totale)
    .slice(0, max);
}

/* ========================================================================
   BLOCCO E — GLI ULTIMI CICLI
   ======================================================================== */

/** Un ciclo per riga, con i gruppi separati. Niente totale unico: non direbbe niente. */
export function storicoGruppi(ciclo, quanti = 6, primo = null) {
  const fuori = [];
  let c = ciclo;
  for (let k = 0; k < quanti; k++) {
    if (primo && c.da < primo.da) break;
    const r = ripartizione(c);
    const q = r.perId.quotidiano;
    fuori.unshift({
      ciclo: c,
      nome: nomeCiclo(c),
      etichetta: MESI_BREVI[Number(c.indice.split("-")[1]) - 1],
      alGiorno: c.giorni ? Math.round(q.totale / c.giorni) : 0,
      quotidiano: q.totale,
      fuoriPiano: r.perId.fuoriPiano.totale,
      nFuoriPiano: r.perId.fuoriPiano.n,
      riserva: r.perId.riserva.totale,
      fisse: r.perId.fisse.totale,
    });
    c = spostaCiclo(c.indice, -1);
  }
  return fuori;
}

/* ------------------------------------------------------------------------
   L'intestazione del blocco A: «CICLO 23 set – 22 ott · giorno 18 di 30».
   ------------------------------------------------------------------------ */
export function intestazione(ciclo, iso = oggiISO()) {
  const corrente = iso >= ciclo.da && iso <= ciclo.a;
  return {
    nome: nomeCiclo(ciclo),
    corrente,
    giorno: corrente ? giornoDelCiclo(ciclo, iso) : ciclo.giorni,
    giorni: ciclo.giorni,
    ultimo: piuGiorni(ciclo.da, ciclo.giorni - 1),
  };
}

/** Quante uscite del ciclo sono state rimborsate per intero: non entrano in nessun gruppo. */
export function rimborsateDelCiclo(ciclo) {
  return movimentiDelCiclo(ciclo).filter((m) => m.tipo === "out" && importoEffettivo(m) <= 0);
}

/** Le uscite non ancora viste da nessun gruppo. Rete di sicurezza per `prova.js`. */
export function controllaCopertura(ciclo) {
  const ctx = contestoGruppi();
  const tutte = movimentiVivi().filter((m) => m.tipo === "out" && m.data >= ciclo.da && m.data <= ciclo.a);
  const senza = tutte.filter((m) => !gruppoDi(m, ctx) && importoEffettivo(m) > 0);
  return { tutte: tutte.length, senza };
}
