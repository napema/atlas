// moduli/finanze/paga.js — il giorno di paga, in tre travasi.
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
// Dal 16 ottobre (v3.1) i travasi sono tre: le Fisse, la Vita, e ING. Il
// Fondo non c'è più — l'obiettivo è il cuscinetto su ING, che riceve
// quello che resta dopo le Fisse e la Vita: a regime i 271 del budget.

import { stato, VERSAMENTI, ricorrentiVivi, previsti } from "./dati.js";
import {
  cicloDi, prossimoStipendio, stipendiTra, prossimaScadenza, importoRicorrente,
  saldoPocket, giorniFra,
} from "./calcolo.js";
import { budgetVita, obiettivo, eCuscinetto } from "./piano.js";
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

  /* IL FONDO, solo se l'obiettivo e' ancora un salvadanaio a parte. Col
     cuscinetto ING non c'e' un quarto travaso: il cuscinetto e' l'ultimo,
     quello che resta. */
  const conFondo = !eCuscinetto() && obiettivo()?.pocket === "fondo";
  const fondo = conFondo ? (ecc?.fondo ?? (Number(obiettivo()?.versamento) || vers.fondo || 0)) : 0;
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
  /* LA PRIMA SETTIMANA sono sette giorni dallo stipendio, non fino alla
     domenica: con lo stipendio di venerdì, «fino a domenica» erano tre
     giorni, e il lunedì si doveva già ricaricare. Arrotondata in su ai 5 €,
     come ogni cifra che si scrive a mano su Revolut. */
  const giorniPrimi = Math.min(7, ciclo.giorni);
  const primaSettimana = Math.min(vita, Math.ceil(((vita / Math.max(1, ciclo.giorni)) * giorniPrimi) / 500) * 500);

  return {
    dataStip, entrate, eccezione: Boolean(ecc), ciclo,
    fisse,
    primaSettimana, finoA: fino,
    righe: [
      ...(conFondo ? [{
        id: "fondo", nome: "Fondo", imp: fondo,
        da: "principale", a: "fondo", tipo: "giro",
        nota: "Versamento al fondo",
        perche: "Per primo: se prende quello che resta, non resta niente.",
      }] : []),
      {
        id: "fisse", nome: "Spese fisse", imp: importoFisse,
        da: "principale", a: "fisse", tipo: "giro",
        nota: "Copertura spese fisse",
        perche: ecc
          ? "Importo scritto a mano per questo stipendio."
          : `${fisse.dettaglio.length} scadenze fino al prossimo stipendio, saldo attuale già tolto.`,
      },
      /* LA PRIMA SETTIMANA NON SI MUOVE, ma si spunta: è la riga che dice
         quanto della Vita resta dov'è, e con lei la lista si legge come il
         budget — Fisse, Vita in due parti, ING — e la somma fa lo stipendio. */
      {
        id: "principale", nome: "Vita · resta sul Principale", imp: primaSettimana,
        da: "principale", a: "principale", tipo: "resta",
        nota: "Vita, prima settimana",
        perche: `La prima settimana (${giorniPrimi} giorni). Non si sposta niente.`,
      },
      {
        id: "vita", nome: "Vita → Cassa", imp: Math.max(0, vita - primaSettimana),
        da: "principale", a: "cassa", tipo: "giro",
        nota: "Vita, settimane successive",
        perche: "Le settimane dopo la prima, in parcheggio.",
      },
      /* IL QUARTO VA IN DUE DIREZIONI. Se avanza, va su ING. Se non
         avanza, ING deve coprire — e quel travaso è `extra`, perché è un
         prelievo dalla riserva. `pianificata: true`: è previsto dal piano,
         non è uno strappo, e non deve finire in «Fuori piano». */
      ing >= 0
        ? {
            id: "ing", nome: eCuscinetto() ? "Cuscinetto ING" : "ING", imp: ing,
            da: "principale", a: "ing", tipo: "giro",
            nota: eCuscinetto() ? "Cuscinetto ING" : "Accantonamenti auto",
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
  return travasiPaga(dataStip).righe.every((r) => fatti.has(r.id));
};

/**
 * LA TREDICESIMA, a dicembre: un'entrata a parte, e va TUTTA su ING.
 *
 * Non sta dentro `travasiPaga` perché non è lo stipendio: arriva come
 * un'entrata sua, con l'importo vero che si sa solo quel giorno. Il foglio
 * del giorno di paga la mostra come travaso in più quando nel ciclo c'è
 * un'entrata con «tredicesima» nella nota.
 */
export function travasoTredicesima(dataStip) {
  if (!dataStip || dataStip.slice(5, 7) !== "12") return null;
  const ciclo = cicloDi(dataStip);
  const m = (stato().movs || []).find((x) => x && !x.del && x.tipo === "in"
    && (x.tredicesima || /tredicesim/i.test(String(x.nota || ""))) && x.data >= ciclo.da && x.data <= ciclo.a);
  if (!m) return null;
  return {
    id: "tredicesima", nome: "Tredicesima → ING", imp: m.imp,
    da: m.pocket || "principale", a: "ing", tipo: "giro",
    nota: "Tredicesima al cuscinetto",
    perche: "Tutta su ING: è il cuscinetto, non la Vita di dicembre.",
  };
}

/**
 * Le scadenze del pocket Fisse che cadono prima del prossimo stipendio e
 * che si possono dare per saldate quando il travaso è fatto.
 *
 * Non si saldano da sole, ed è voluto: l'addebito lo fa la banca nel suo
 * giorno, e marcarlo pagato in anticipo vuol dire non vedere il giorno in
 * cui non è passato. Questa lista serve solo a mostrarla.
 */
export const scadenzeCoperte = (dataStip) => fabbisognoFisse(dataStip).dettaglio.filter((x) => !x.quota);
