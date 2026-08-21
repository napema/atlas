// moduli/finanze/importa.js — import dell'estratto conto.
//
// Portato dall'app di partenza, dove era la funzione che faceva risparmiare
// più tempo: un estratto conto Revolut da cento righe si registra in un
// minuto invece che in mezz'ora.
//
// Tre formati, riconosciuti dal contenuto e non da un menu:
//   Revolut     CSV con le colonne Type / Amount / State
//   CSV generico  italiani col punto e virgola, o qualunque cosa abbia
//                 data / descrizione / importo
//   testo        righe incollate a mano: "27/07 Barbiere 15,00"
//
// Il riconoscimento dei doppioni è per firma `data|importo|nota normalizzata`:
// non è infallibile, ma sbaglia dalla parte giusta — due caffè identici lo
// stesso giorno vengono contati una volta sola, ed è molto meglio che
// ritrovarsi l'estratto conto doppio.

import { movimentiVivi, normalizza, categoriaPerId, casella } from "./dati.js";
import { autoCategoria } from "./calcolo.js";
import { oggiISO, nuovoId } from "../../core/ui.js";

/* ---------------------------------------------------------- utilità --- */

export const firmaDi = (data, imp, nota) => `${data}|${imp}|${normalizza(nota)}`;

const firmeEsistenti = () => new Set(movimentiVivi().map((m) => firmaDi(m.data, m.imp, m.nota || "")));

/** Un parser CSV vero: le virgolette e i separatori dentro i campi esistono. */
export function leggiCSV(testo) {
  const primaRiga = testo.split(/\r?\n/)[0] || "";
  const sep = (primaRiga.match(/;/g) || []).length > (primaRiga.match(/,/g) || []).length ? ";" : ",";
  const righe = [];
  let riga = [], cella = "", virgolette = false;

  for (let i = 0; i < testo.length; i++) {
    const c = testo[i];
    if (virgolette) {
      if (c === '"') { if (testo[i + 1] === '"') { cella += '"'; i++; } else virgolette = false; }
      else cella += c;
    } else if (c === '"') virgolette = true;
    else if (c === sep) { riga.push(cella); cella = ""; }
    else if (c === "\n") { riga.push(cella); righe.push(riga); riga = []; cella = ""; }
    else if (c !== "\r") cella += c;
  }
  if (cella.length || riga.length) { riga.push(cella); righe.push(riga); }
  return righe.filter((r) => r.some((c) => String(c).trim() !== ""));
}

/** Da "27/07", "27/07/26", "2026-07-27" a ISO. Null se non è una data. */
export function aISO(s) {
  const t = String(s).trim();
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = t.match(/^(\d{1,2})[/.](\d{1,2})(?:[/.](\d{2,4}))?$/);
  if (!m) return null;
  const anno = m[3] ? (m[3].length === 2 ? `20${m[3]}` : m[3]) : String(new Date().getFullYear());
  return `${anno}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

/** Da testo a centesimi, col segno. Gestisce "1.234,56" e "1234.56". */
export function aCentesimi(s) {
  let t = String(s).trim().replace(/[\s€]/g, "");
  const negativo = t.startsWith("-");
  t = t.replace(/^[+-]/, "");
  t = t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t;
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  return (negativo ? -1 : 1) * Math.round(Math.abs(n) * 100);
}

/* ------------------------------------------------------- i tre formati -- */

function daRevolut(testo) {
  const righe = leggiCSV(testo);
  const intestazione = righe[0].map((h) => h.trim().toLowerCase());
  const col = (nome) => intestazione.findIndex((h) => h === nome || h.includes(nome));
  const iTipo = col("type"), iDesc = col("description"), iImp = col("amount");
  const iVal = col("currency"), iStato = col("state");
  const iData = Math.max(col("completed date"), col("started date"));

  const fuori = [];
  for (const r of righe.slice(1)) {
    const stato = String(r[iStato] || "").toUpperCase();
    if (stato && stato !== "COMPLETED") continue;                              // DECLINED, PENDING, REVERTED
    if (iVal >= 0 && String(r[iVal] || "").toUpperCase() !== "EUR") continue;  // niente valute estere
    const imp = aCentesimi(r[iImp]);
    if (imp === null || imp === 0) continue;

    const nota = String(r[iDesc] || "").trim() || String(r[iTipo] || "");
    const tipoRev = String(r[iTipo] || "").toUpperCase();
    let tipo;
    if (tipoRev === "TOPUP") tipo = "extra";                 // ricarica da fuori: è uno sforamento
    else if (tipoRev.includes("REFUND")) tipo = "reso";
    else if (tipoRev === "TRANSFER" && /^(to|from)\s/i.test(nota)) tipo = "giro";
    else if (tipoRev === "EXCHANGE") continue;
    else if (imp > 0) tipo = tipoRev === "TRANSFER" ? "in" : "reso";
    else tipo = "out";

    fuori.push({ tipo, imp: Math.abs(imp), nota, data: aISO(r[iData]) || oggiISO(), fonte: "revolut" });
  }
  return fuori;
}

function daCSV(testo) {
  const righe = leggiCSV(testo);
  const intestazione = righe[0].map((h) => normalizza(h));
  const trova = (nomi) => intestazione.findIndex((h) => nomi.some((n) => h.includes(n)));
  const d = trova(["data", "date"]);
  const n = trova(["descr", "causale", "nota", "merchant"]);
  const a = trova(["importo", "amount", "euro"]);

  let corpo = righe.slice(1), iD = 0, iN = 1, iA = 2;
  if (d >= 0 && a >= 0) { iD = d; iN = n >= 0 ? n : (a === 1 ? 2 : 1); iA = a; }
  else corpo = righe;                       // nessuna intestazione riconoscibile

  const fuori = [];
  for (const r of corpo) {
    if (r.length < 2) continue;
    const data = aISO(r[iD]);
    const imp = aCentesimi(r[iA] !== undefined ? r[iA] : r[r.length - 1]);
    if (!data || imp === null || imp === 0) continue;
    fuori.push({ tipo: imp < 0 ? "out" : "in", imp: Math.abs(imp),
      nota: String(r[iN] || "").trim(), data, fonte: "csv" });
  }
  return fuori;
}

function daTesto(testo) {
  const fuori = [];
  for (const r of testo.split(/\r?\n/)) {
    const l = r.trim();
    if (!l) continue;
    const m = l.match(/^(\+)?\s*(?:(\d{1,2}[/.]\d{1,2}(?:[/.]\d{2,4})?)\s+)?(.+?)\s+(\+?-?\d[\d.,]*)\s*€?$/);
    if (!m) continue;
    const imp = aCentesimi(m[4]);
    if (imp === null || imp === 0) continue;
    const entrata = m[1] === "+" || String(m[4]).startsWith("+");
    fuori.push({ tipo: entrata ? "in" : "out", imp: Math.abs(imp),
      nota: m[3].trim(), data: m[2] ? aISO(m[2]) : oggiISO(), fonte: "testo" });
  }
  return fuori;
}

/** Riconosce il formato dal contenuto: l'utente non deve scegliere da un menu. */
function riconosci(testo) {
  const t = String(testo || "").trim();
  if (!t) return [];
  const testa = (t.split(/\r?\n/)[0] || "").toLowerCase();
  if (testa.includes("type") && testa.includes("amount") && testa.includes("state")) return daRevolut(t);
  if (t.includes(";") || testa.includes("importo") || testa.includes("data")) return daCSV(t);
  return daTesto(t);
}

/* ---------------------------------------------------------- anteprima -- */

/**
 * Prepara le righe per l'anteprima: segna i doppioni e propone la categoria.
 *
 * `inc` è la spunta "includi": parte accesa su tutto tranne i doppioni. Non
 * si importa mai in automatico — un estratto conto letto male e importato
 * senza guardare è mezz'ora di pulizia a mano.
 */
export function preparaImport(testo) {
  const grezze = riconosci(testo);
  const viste = firmeEsistenti();
  const nelLotto = new Set();

  return grezze.map((r) => {
    const firma = firmaDi(r.data, r.imp, r.nota);
    const doppione = viste.has(firma) || nelLotto.has(firma);
    nelLotto.add(firma);

    let cat = null, sub = null, auto = false;
    if (r.tipo === "out") {
      const indovinata = autoCategoria(r.nota, { normalizza, categoriaPerId });
      if (indovinata) { cat = indovinata.cat; sub = indovinata.sub; auto = true; }
    }
    return { ...r, cat, sub, auto, doppione, inc: !doppione };
  });
}

/** Scrive le righe scelte. Restituisce quante e l'ultimo mese toccato. */
export function eseguiImport(righe) {
  const ora = Date.now();
  let n = 0, ultimoMese = null;

  casella.aggiorna((s) => {
    righe.forEach((r, i) => {
      if (!r.inc || r.doppione) return;
      s.movs.push({
        id: nuovoId("m"), tipo: r.tipo, imp: r.imp, nota: r.nota,
        cat: r.tipo === "out" ? r.cat : null,
        sub: r.tipo === "out" ? r.sub : null,
        rif: null, ecc: false, data: r.data,
        // ts e up distinti anche qui: la creazione è adesso, ma sfalsata di
        // un millisecondo per riga così l'ordinamento a parità di data resta
        // quello dell'estratto conto.
        ts: ora + i, up: ora + i,
      });
      ultimoMese = r.data.slice(0, 7);
      n++;
    });
  });

  return { quante: n, ultimoMese };
}
