// moduli/finanze/paga.js — il giorno di paga, in quattro travasi.
//
// Lo stipendio arriva tutto sul Principale, e per mezza giornata il conto
// dice duemila euro. È il momento più pericoloso del mese: ogni spesa fatta
// in quelle ore sembra gratis, e i soldi delle bollette di novembre sono
// ancora lì in mezzo.
//
// I quattro travasi li fai già a mano, ogni mese, aprendo Revolut. Quello
// che mancava non era l'automatismo: era SAPERE QUANTO. In particolare per
// le Spese fisse, che non sono un numero fisso — le bollette arrivano ogni
// due mesi, le rate finiscono, gli abbonamenti cambiano — e tenere a mente
// quali scadenze cadono prima del prossimo stipendio è esattamente la cosa
// che non si fa e che poi lascia il pocket scoperto.
//
// L'ordine conta: il Fondo per primo. Mettendolo per ultimo prende quello
// che resta, e quello che resta è la definizione di risparmio che non
// funziona.

import { stato, VERSAMENTI, ricorrentiVivi, previsti } from "./dati.js";
import {
  cicloDi, prossimoStipendio, stipendiTra, prossimaScadenza, importoRicorrente,
  saldoPocket, giorniFra,
} from "./calcolo.js";
import { budgetVita } from "./piano.js";
import { daISO, piuGiorni } from "../../core/ui.js";

/**
 * Quanto serve al pocket Fisse per arrivare al prossimo stipendio.
 *
 *     scadenze   quello che scade da oggi al giorno prima della paga dopo
 *   + quote      la rata di accantonamento delle non-mensili che cadono
 *                oltre quella finestra
 *   − saldo      quello che c'è già
 *
 * LE QUOTE sono il pezzo che si dimentica, e la bolletta del 31 ottobre è
 * il motivo: 150 € ogni due mesi non si possono mettere da parte il mese in
 * cui arrivano, perché quel mese ci sono anche l'affitto e la rata. Si
 * accantonano a metà per due stipendi. Senza, un mese su due il pocket
 * Fisse è scoperto di centocinquanta euro e la cosa si scopre il giorno
 * dell'addebito.
 */
export function fabbisognoFisse(dataStip) {
  const prossima = prossimoStipendio(dataStip);
  let scadenze = 0;
  let quote = 0;
  const dettaglio = [];

  for (const r of ricorrentiVivi()) {
    if (!r.attivo || r.pocket !== "fisse") continue;
    const q = prossimaScadenza(r, dataStip);
    if (!q) continue;
    const imp = importoRicorrente(r);
    if (q < prossima) {
      scadenze += imp;
      dettaglio.push({ nome: r.nome, quando: q, imp, quota: false });
      continue;
    }
    if (r.cadenza && r.cadenza !== "mensile") {
      // Gli stipendi da questo compreso fino alla scadenza.
      const quanti = 1 + stipendiTra(dataStip, q).length;
      const parte = Math.round(imp / Math.max(1, quanti));
      quote += parte;
      dettaglio.push({ nome: r.nome, quando: q, imp: parte, quota: true, su: quanti });
    }
  }

  for (const x of previsti()) {
    if (x.pocket !== "fisse" || !x.quando) continue;
    if (x.quando < dataStip || x.quando >= prossima) continue;
    scadenze += x.imp || 0;
    dettaglio.push({ nome: x.nome, quando: x.quando, imp: x.imp || 0, quota: false });
  }

  dettaglio.sort((a, b) => a.quando.localeCompare(b.quando));
  const saldo = saldoPocket("fisse");
  return { scadenze, quote, saldo, importo: Math.max(0, scadenze + quote - saldo), dettaglio };
}

/**
 * I quattro travasi, con gli importi.
 *
 * `entrata` è lo stipendio vero in centesimi: a dicembre con la
 * tredicesima dentro non è il numero di budget, ed è l'unico mese in cui
 * l'ultimo travaso cambia di molto.
 */
export function travasiPaga(dataStip, entrata = null) {
  const cfg = stato().config || {};
  const ecc = cfg.eccezioni?.[dataStip] || null;
  const vers = { ...VERSAMENTI, ...(cfg.versamenti || {}) };

  const fondo = ecc?.fondo ?? vers.fondo;
  const fisse = fabbisognoFisse(dataStip);
  const importoFisse = ecc?.fisse ?? fisse.importo;
  const vita = ecc?.vita ?? (budgetVita() || vers.vita);

  const entrate = entrata ?? (Number(cfg.entrate) || 0) * 100;
  const ing = ecc?.ing ?? (entrate - fondo - importoFisse - vita);

  /* LA PRIMA SETTIMANA RESTA SUL PRINCIPALE. Travasare tutta la Vita in
     Cassa e poi ricaricare il Principale lo stesso giorno sono due giri che
     si annullano: due righe nell'estratto conto per niente. */
  const ciclo = cicloDi(dataStip);
  const dow = (daISO(dataStip).getDay() + 6) % 7;
  const domenica = piuGiorni(dataStip, 6 - dow);
  const fino = domenica < ciclo.a ? domenica : ciclo.a;
  const giorniPrimi = Math.max(1, giorniFra(dataStip, fino));
  const primaSettimana = Math.round((vita / Math.max(1, ciclo.giorni)) * giorniPrimi);

  return {
    dataStip, entrate, eccezione: Boolean(ecc), ciclo,
    fisse,
    primaSettimana, finoA: fino,
    righe: [
      {
        id: "fondo", nome: "Fondo naso", imp: fondo,
        da: "principale", a: "fondo", tipo: "giro",
        nota: "Versamento al fondo",
        perche: "Per primo: se prende quello che resta, non resta niente.",
      },
      {
        id: "fisse", nome: "Spese fisse", imp: importoFisse,
        da: "principale", a: "fisse", tipo: "giro",
        nota: "Copertura spese fisse",
        perche: ecc
          ? "Importo scritto a mano per questo stipendio."
          : `${fisse.dettaglio.length} scadenze fino al prossimo stipendio, saldo attuale già tolto.`,
      },
      {
        id: "vita", nome: "Vita → Cassa", imp: Math.max(0, vita - primaSettimana),
        da: "principale", a: "cassa", tipo: "giro",
        nota: "Vita, settimane successive",
        perche: `La prima settimana (${giorniPrimi} giorni) resta sul Principale.`,
      },
      /* IL QUARTO VA IN DUE DIREZIONI. Se avanza, va su ING. Se non
         avanza, ING deve coprire — e quel travaso è `extra`, perché è un
         prelievo dalla riserva. `pianificata: true`: è previsto dal piano,
         non è uno strappo, e non deve finire in «Fuori piano». */
      ing >= 0
        ? {
            id: "ing", nome: "ING", imp: ing,
            da: "principale", a: "ing", tipo: "giro",
            nota: "Accantonamenti auto",
            perche: "Quello che resta.",
          }
        : {
            id: "ing", nome: "Da ING", imp: -ing, allarme: true,
            da: "ing", a: "principale", tipo: "extra", pianificata: true,
            nota: "Copertura dalla riserva",
            perche: "Non basta: la riserva copre la differenza. Valuta di ridurre la Vita.",
          },
    ],
  };
}

/* ---------------------------------------------------- cosa è già fatto -- */

export const travasiFatti = (dataStip) => (stato().config?.pagaFatta || {})[dataStip] || [];

export const pagaCompleta = (dataStip) => {
  const fatti = new Set(travasiFatti(dataStip));
  return ["fondo", "fisse", "vita", "ing"].every((id) => fatti.has(id));
};

/**
 * Le scadenze del pocket Fisse che cadono prima del prossimo stipendio e
 * che si possono dare per saldate quando il travaso è fatto.
 *
 * Non si saldano da sole, ed è voluto: l'addebito lo fa la banca nel suo
 * giorno, e marcarlo pagato in anticipo vuol dire non vedere il giorno in
 * cui non è passato. Questa lista serve solo a mostrarla.
 */
export const scadenzeCoperte = (dataStip) => fabbisognoFisse(dataStip).dettaglio.filter((x) => !x.quota);
