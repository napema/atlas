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

import { stato, movimentiVivi } from "./dati.js";
import {
  importoEffettivo, movimentiDelCiclo, giornoDelCiclo, categorieDelCiclo,
  spostaCiclo, nomeCiclo,
} from "./calcolo.js";
import { budgetVita, GRUPPI, DECISE, gruppoDi, contestoGruppi } from "./piano.js";
import { oggiISO, piuGiorni, MESI_BREVI } from "../../core/ui.js";

/* LA REGOLA STA IN `piano.js`, QUI CI SONO GLI AGGREGATI.

   `gruppoDi()` e la sua gerarchia sono salite in `piano.js` il 10 ottobre:
   le usa anche `fuoriPianoDelCiclo()`, che il Riepilogo e la home leggono,
   e finché la regola stava qui le due schermate contavano il fuori piano in
   due modi diversi — il Telepass era «fuori piano» di là e «da riserva» di
   qua. Si ri-esportano perché le viste dell'Analisi importano tutto da
   questo file, e cambiare quello non aggiungeva niente. */
export { GRUPPI, DECISE, gruppoDi, contestoGruppi, nomeGruppo } from "./piano.js";

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
