// moduli/finanze/chiusura.js — la domenica sera, in quattro passi.
//
// È il rito che tiene in piedi tutto il resto. Senza una riconciliazione
// periodica i saldi vanno in deriva — è successo, trecento euro in due mesi
// — e un saldo sbagliato rende sbagliato ogni numero che ne discende: la
// quota del giorno, la copertura delle fisse, il minimo previsto di ING.
//
// Quattro passi e due minuti:
//   1. estratto     carichi il CSV, l'app mostra solo le differenze
//   2. pagella      quattro righe, solo numeri
//   3. report       da copiare e incollare al coach
//   4. ricarica     il giro di lunedì, con un tocco
//
// Il contatore «settimane chiuse di fila» non è gamification: è l'unica
// cosa che ha fatto sopravvivere un rito settimanale. Un numero che cresce
// lo si difende, un promemoria lo si ignora.

import {
  stato, movimentiVivi, salvaMovimento, riancoraPocket, casella, profiloDi,
  CATEGORIE_CASSA, segnaChiusura, serieChiusure, sblocchiDelCiclo, pocketPerId,
} from "./dati.js";
import {
  cicloDi, nomeCiclo, importoEffettivo, saldoPocket, pocketConSaldi, giorniFra,
  inArrivo, tettoSettimanale,
} from "./calcolo.js";
import {
  quotaDi, fuoriPianoDelCiclo, tiroObiettivo, ingPrevisto, budgetVita,
} from "./piano.js";
import { ricaricaLunedi, pianoTravasi, eseguiTravasi } from "./travasi.js";
import { oggiISO, daISO, piuGiorni, euro, nuovoId } from "../../core/ui.js";

/* ------------------------------------------------------- la settimana -- */

/** La settimana lunedì-domenica che contiene `iso`. */
export function settimanaDi(iso = oggiISO()) {
  const dow = (daISO(iso).getDay() + 6) % 7;
  const da = piuGiorni(iso, -dow);
  return { da, a: piuGiorni(da, 6), domenica: piuGiorni(da, 6) };
}

/** La domenica da chiudere: quella di questa settimana, oggi compreso. */
export const domenicaDaChiudere = (iso = oggiISO()) => settimanaDi(iso).domenica;

/** Lo speso «Vita» in una finestra: le categorie della cassa, solo scelte. */
export function spesoVita(da, a) {
  const p = profiloDi();
  const quali = new Set(Array.isArray(p.cassaCats) ? p.cassaCats : CATEGORIE_CASSA);
  return movimentiVivi()
    .filter((m) => m.tipo === "out" && m.data >= da && m.data <= a && quali.has(m.cat) && !m.pian)
    .reduce((t, m) => t + importoEffettivo(m), 0);
}

/* ========================================================================
   PASSO 1 — l'estratto.

   La scrittura vera: i nuovi movimenti, le correzioni di importo, le
   ancore.

   LE ANCORE SI SCRIVONO SUL DISPONIBILE, non sul saldo completato. Sono
   due numeri diversi e la differenza sono i movimenti in sospeso: il
   monitor da 105,90 era già partito dal conto ma non era ancora
   «completato», quindi il Saldo dell'estratto diceva 166,50 mentre
   spendibili ce n'erano 57,10. Ancorando al primo, l'app prometterebbe
   ogni settimana cento euro che non ci sono.

   La data dell'ancora è DOMANI: l'ancora vale «quanto c'era all'inizio di
   quel giorno», e il saldo che si legge sull'estratto è quello di stasera.
   Scrivendola a oggi, i movimenti di oggi — che sono già dentro quel saldo
   — verrebbero sottratti una seconda volta.
   ======================================================================== */

export function applicaEstratto(ric, { saldoIng = null, iso = oggiISO() } = {}) {
  const ora = Date.now();
  const ancora = piuGiorni(iso, 1);
  let aggiunti = 0;
  let corretti = 0;

  const scelti = (ric.nuovi || []).filter((r) => r.inc !== false);

  casella.aggiorna((s) => {
    scelti.forEach((r, i) => {
      s.movs.push({
        id: nuovoId("m"), tipo: r.tipo, imp: r.imp, nota: r.nota,
        cat: r.tipo === "out" ? r.cat : null,
        sub: r.tipo === "out" ? r.sub : null,
        pocket: r.pocket, pocketTo: r.pocketTo ?? null,
        rif: null, ecc: false, data: r.data,
        ...(r.pending ? { pending: true } : {}),
        ...(r.interessi ? { interessi: true } : {}),
        ...(r.tipo === "extra" ? { pianificata: Boolean(r.pianificata) } : {}),
        // Sfalsati di un millisecondo: a parità di data l'ordine resta
        // quello dell'estratto conto.
        ts: ora + i, up: ora + i,
      });
      aggiunti++;
    });

    /* Le correzioni: vince l'estratto. Non è una scelta di comodo — è
       l'unico modo di uscire dalla deriva: se vincesse quello che hai
       scritto a mano, riconciliare non servirebbe a niente. */
    for (const c of ric.correzioni || []) {
      const m = s.movs.find((x) => x.id === c.mov.id);
      if (!m) continue;
      m.imp = c.riga.imp;
      m.up = ora;
      corretti++;
    }
  });

  // Le ancore, fuori dal blocco: `riancoraPocket` è la via normale e alza
  // `up` da sé, che è ciò che fa viaggiare il saldo all'altro dispositivo.
  const saldi = { ...(ric.saldi || {}), ...(ric.disponibili || {}) };
  for (const [id, valore] of Object.entries(saldi)) {
    if (!pocketPerId(id)) continue;
    riancoraPocket(id, valore, ancora);
  }
  if (saldoIng != null) riancoraPocket("ing", saldoIng, ancora);

  return { aggiunti, corretti, ancora };
}

/* ========================================================================
   PASSO 2 — la pagella.

   Quattro righe e nessun aggettivo. La versione precedente scriveva «stai
   andando bene» e «attenzione alle uscite»: frasi che non si leggono più
   dalla seconda settimana, perché non dicono niente che il numero accanto
   non dica meglio.
   ======================================================================== */

export function pagella(iso = oggiISO()) {
  const sett = settimanaDi(iso);
  const ciclo = cicloDi(iso);
  const fp = fuoriPianoDelCiclo(ciclo, iso);

  // Il fuori piano DELLA SETTIMANA, non del ciclo: la pagella guarda sette
  // giorni, e il ciclo ce l'hai già in home.
  const fpSett = fp.voci.filter((m) => m.data >= sett.da && m.data <= sett.a);
  const ricSett = fp.ricariche.voci.filter((m) => m.data >= sett.da && m.data <= sett.a);

  const o = tiroObiettivo(iso);

  return {
    settimana: sett, ciclo,
    vita: { speso: spesoVita(sett.da, sett.a), budget: tettoSettimanale(iso).centesimi },
    fuoriPiano: { n: fpSett.length, totale: fpSett.reduce((t, m) => t + importoEffettivo(m), 0), voci: fpSett },
    ricariche: { n: ricSett.length, totale: ricSett.reduce((t, m) => t + m.imp, 0) },
    fondo: o ? { inLinea: o.inLinea, scarto: o.scarto, saldo: o.saldo, previsto: o.previsto,
      cela: o.cela, gap: o.gap, inPiu: o.inPiu } : null,
    serie: serieChiusure(sett.domenica),
  };
}

/* ========================================================================
   PASSO 3 — il report.

   Una dozzina di righe di testo da incollare. Sostituisce l'export JSON
   completo, che conteneva tutto e per questo non si leggeva: trecento
   movimenti in euro sono un file, non un resoconto.

   Qui c'è solo quello che serve a capire la settimana, e c'è anche quello
   che non torna — le modifiche alla configurazione. Un report che non
   contiene la riga «ho alzato il budget di 80 €» è un report che si può
   fabbricare.
   ======================================================================== */

const eu = (c) => euro(c || 0);

export function report(iso = oggiISO()) {
  const p = pagella(iso);
  const ciclo = p.ciclo;
  const fp = fuoriPianoDelCiclo(ciclo, iso);
  const q = quotaDi(iso);
  const o = tiroObiettivo(iso);
  const ing = ingPrevisto(iso);
  const pk = pocketConSaldi();

  const r = [];
  r.push(`ATLAS · settimana ${p.settimana.da} → ${p.settimana.a}`);
  r.push(`Ciclo ${nomeCiclo(ciclo)}`);
  r.push("");
  r.push(`Vita            ${eu(p.vita.speso)} / ${eu(p.vita.budget)}`);
  r.push(`Fuori piano     ${p.fuoriPiano.n} · ${eu(p.fuoriPiano.totale)}`);
  r.push(`Ricariche ING   ${p.ricariche.n}${p.ricariche.n ? ` · ${eu(p.ricariche.totale)}` : ""}`);
  if (p.fondo) {
    /* DUE RIGHE PERCHE' SONO DUE DOMANDE. «Versamenti» guarda indietro —
       hai spostato quello che dovevi — e «alla data» guarda avanti. Su una
       riga sola, attaccate da un punto, si leggevano come un verdetto che
       si contraddice: «in linea · mancano 640 €». */
    r.push(`Fondo           ${p.fondo.previsto > 0
      ? (p.fondo.inLinea ? "versamenti in regola" : `indietro di ${eu(-p.fondo.scarto)}`)
      : "non ancora cominciato"}`);
    r.push(`  alla data     ${p.fondo.cela ? "ci arrivi" : `mancano ${eu(p.fondo.gap)}${p.fondo.inPiu ? ` · +${eu(p.fondo.inPiu)} a stipendio` : ""}`}`);
  }
  r.push("");
  r.push(`Quota di oggi   ${eu(q.quota)}/g · ${q.giorni} giorni al ${q.fine} · piano ${eu(q.piano)}/g`);

  if (fp.n) {
    r.push("");
    r.push(`Fuori piano del ciclo · ${fp.n} · ${eu(fp.totale)}`);
    for (const m of fp.voci) {
      r.push(`  ${m.data}  ${m.nota || "—"}  ${eu(importoEffettivo(m))}${m.daRiserva ? "  da ING" : ""}`);
    }
    if (fp.pct != null) {
      r.push(fp.pct >= 0.95
        ? `  vale ${(Math.round(fp.pct * 10) / 10).toLocaleString("it-IT")} versamenti al fondo`
        : `  vale ${Math.round(fp.pct * 100)}% di un versamento al fondo`);
    }
  } else {
    r.push("");
    r.push(`Fuori piano del ciclo · nessuno · ${fp.giorniSenza} giorni`);
  }

  r.push("");
  r.push("Pocket");
  for (const x of pk) r.push(`  ${x.nome.padEnd(14)} ${eu(x.saldoVero)}`);

  if (o) {
    r.push("");
    r.push(`${o.nome} · ${eu(o.saldo)} / ${eu(o.target)} entro il ${o.data}`);
    r.push(`  versamenti dovuti finora ${eu(o.previsto)} · ${o.previsto > 0
      ? (o.inLinea ? "in regola" : `indietro di ${eu(-o.scarto)}`)
      : "nessuno"}`);
    r.push(`  alla data ${eu(o.proiezione)}${o.gap > 0
      ? ` · mancano ${eu(o.gap)}${o.inPiu ? `, cioe' +${eu(o.inPiu)} a stipendio` : ""}`
      : " · ci arrivi"}`);
  }

  r.push("");
  r.push(`ING minimo previsto ${eu(ing.minimo)} · ${ing.quando}`);

  const n = sblocchiDelCiclo(ciclo.indice);
  r.push(`Modifiche alla configurazione: ${n}`);

  return r.join("\n");
}

/* ========================================================================
   PASSO 4 — la ricarica, e la chiusura.
   ======================================================================== */

export { ricaricaLunedi };

/**
 * I travasi della settimana: quelli del piano, tutti.
 *
 * Era il solo giro Cassa → Principale, con un conto suo; adesso esegue il
 * piano di `travasi.js`, che copre anche le Fisse scoperte. Il piano si
 * legge PRIMA di scrivere: dopo, i saldi sono già cambiati e lo stesso
 * conto direbbe che non c'è più niente da spostare.
 */
export function eseguiRicarica(iso = oggiISO()) {
  const p = pianoTravasi(iso);
  if (!p.mosse.length) return null;
  eseguiTravasi(p);
  return { importo: p.mosse.reduce((t, m) => t + m.imp, 0), mosse: p.mosse };
}

/** Chiude la settimana. Il saldo ING resta scritto: serve al confronto. */
export function chiudi(iso = oggiISO(), saldoIng = null) {
  segnaChiusura(settimanaDi(iso).domenica, saldoIng);
}

/**
 * Da quanti giorni i pocket non sono allineati all'estratto.
 *
 * Sopra gli otto giorni l'etichetta in home va in ambra: una settimana
 * saltata è un incidente, due sono il ritorno della deriva.
 */
export function allineamento(iso = oggiISO()) {
  const chiusure = Object.keys(stato().config?.chiusure || {}).sort();
  const ultima = chiusure.at(-1) || null;
  // Il ripiego è l'ancora più recente dei pocket: chi non ha mai chiuso
  // una settimana ha comunque riancorato a mano almeno una volta.
  const ancore = (stato().pockets || []).map((p) => p.ancoraDa).filter(Boolean).sort();
  const quando = ultima && ancore.at(-1) ? (ultima > ancore.at(-1) ? ultima : ancore.at(-1))
    : (ultima || ancore.at(-1) || null);
  if (!quando) return { quando: null, giorni: null, vecchio: true };
  const giorni = Math.max(0, giorniFra(quando, iso) - 1);
  return { quando, giorni, vecchio: giorni > 8 };
}

/** Quello che «In arrivo» deve controllare: solo prima dello stipendio. */
export const scoperture = (iso = oggiISO()) => inArrivo(3650, iso);

/** Il budget Vita, per chi non vuole importare `piano.js` solo per questo. */
export { budgetVita };

/** Quanto resta da versare al fondo prima della data obiettivo. */
export function restaAlFondo(iso = oggiISO()) {
  const o = tiroObiettivo(iso);
  if (!o) return 0;
  return Math.max(0, o.target - o.saldo);
}

/** Il saldo di un pocket, per il report. */
export { saldoPocket };
