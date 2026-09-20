// moduli/pasti/importa.js — quello che arriva da fuori.
//
// Due porte, e fanno cose diverse:
//
//   JSON dalla chat  →  popola il DATABASE dei pasti (ogni tanto)
//   uno sgarro       →  aggiunge uno SCOSTAMENTO alla giornata (al volo)
//
// La prima è la porta per cui esiste la chat di Claude: serve a scrivere i
// macro di un piatto nuovo, che è l'unica cosa che l'app da sola non sa
// fare. Il piano della settimana NON si importa: lo genera `piano.js`,
// offline, in un giro di `for`.

import { ID_FASCE, COMUNI, salvaPasti, slug } from "./dati.js";

/* =========================================================================
   IL JSON DALLA CHAT
   ========================================================================= */

/**
 * Toglie le staccionate di codice attorno al JSON.
 *
 * Non è pedanteria: una chat il JSON lo restituisce quasi sempre dentro
 * ```json … ```, e l'utente incolla quello che vede. Fallire su una cosa
 * che ha copiato correttamente è il modo più veloce per fargli pensare che
 * l'import non funzioni.
 */
export function ripulisci(testo) {
  let t = String(testo || "").trim();
  t = t.replace(/^```[a-zA-Z]*\s*/, "").replace(/```\s*$/, "").trim();
  // Se attorno c'è del discorso, si tiene solo il primo blocco graffo→graffa.
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  if (a > 0 || (b >= 0 && b < t.length - 1)) {
    if (a >= 0 && b > a) t = t.slice(a, b + 1);
  }
  return t;
}

const numero = (v) => {
  const n = Number(String(v ?? "").toString().replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

/**
 * Legge un JSON di pasti e restituisce { voci, scartate, motivo }.
 *
 * NON scrive: chi chiama decide. Separare la lettura dalla scrittura è ciò
 * che permette di mostrare l'anteprima prima di toccare l'archivio — e su
 * un import incollato a mano l'anteprima è l'unica difesa che c'è.
 */
export function pastiDaJSON(testo) {
  const pulito = ripulisci(testo);
  if (!pulito) return { voci: [], scartate: 0, motivo: "Non hai incollato niente." };

  let dati;
  try {
    dati = JSON.parse(pulito);
  } catch (e) {
    return { voci: [], scartate: 0, motivo: `Non è JSON valido: ${e.message}` };
  }

  const elenco = Array.isArray(dati) ? dati : dati?.pasti;
  if (!Array.isArray(elenco)) {
    return { voci: [], scartate: 0, motivo: 'Manca la lista: ci vuole { "pasti": [ … ] }.' };
  }

  const voci = [];
  let scartate = 0;
  for (const v of elenco) {
    const nome = String(v?.nome || "").trim();
    const fasce = (Array.isArray(v?.fasce) ? v.fasce : []).filter((f) => ID_FASCE.includes(f));
    // Senza nome non c'è id, senza fascia non entra in nessun piano, e senza
    // calorie è un record che sporca i conti fingendo di non pesare niente.
    if (!nome || !fasce.length || !numero(v?.kcal)) { scartate += 1; continue; }
    voci.push({
      nome, fasce,
      kcal: Math.round(numero(v.kcal)),
      p: Math.round(numero(v.p)),
      c: Math.round(numero(v.c)),
      g: Math.round(numero(v.g)),
      prepMin: Math.round(numero(v.prepMin)),
      tag: (Array.isArray(v?.tag) ? v.tag : []).map((t) => String(t).trim()).filter(Boolean),
      fonte: "chat",
    });
  }

  const motivo = voci.length ? "" : "Nessun pasto utilizzabile: servono nome, almeno una fascia e le calorie.";
  return { voci, scartate, motivo };
}

/** Legge e salva in un colpo solo. L'id viene dal nome, quindi non duplica. */
export function importaPasti(testo) {
  const esito = pastiDaJSON(testo);
  if (!esito.voci.length) return { ...esito, salvati: 0 };
  const salvati = salvaPasti(esito.voci);
  return { ...esito, salvati: salvati.length };
}

/* =========================================================================
   LO SGARRO AL VOLO

   «Se mangio una pizzetta al pomeriggio o un panino col prosciutto te lo
   posso importare.» Questo è quel percorso, e deve costare un tocco: se
   costa una ricerca nutrizionale non lo farà mai, e allora tanto vale non
   averlo.
   ========================================================================= */

/**
 * Cosa proporre per una fascia, in ordine di utilità.
 *
 * Prima le TENDENZE — le cose che ha già registrato più volte a quell'ora,
 * che sono di gran lunga il caso più probabile — poi i suoi pasti, poi la
 * tabellina dei comuni. Mettere i comuni in cima vorrebbe dire far scorrere
 * sedici voci generiche per arrivare al panino che mangia ogni martedì.
 */
export function propostePerFascia(fascia, { tendenze = [], pasti = [] } = {}) {
  const viste = new Set();
  const fuori = [];

  const aggiungi = (v, origine) => {
    const chiave = slug(v.nome);
    if (!v.nome || viste.has(chiave)) return;
    viste.add(chiave);
    fuori.push({ ...v, origine });
  };

  for (const t of tendenze) {
    if (t.fascia && t.fascia !== fascia) continue;
    aggiungi({ nome: t.nome, kcal: t.macro.kcal, p: t.macro.p, c: t.macro.c, g: t.macro.g, ora: t.ora, volte: t.volte }, "tendenza");
  }
  for (const p of pasti) {
    if (!(p.fasce || []).includes(fascia)) continue;
    aggiungi({ nome: p.nome, kcal: p.kcal, p: p.p, c: p.c, g: p.g, pastoId: p.id }, "database");
  }
  for (const c of COMUNI) {
    if (!(c.fasce || []).includes(fascia)) continue;
    aggiungi({ nome: c.nome, kcal: c.kcal, p: c.p, c: c.c, g: c.g }, "comune");
  }
  return fuori;
}

/**
 * Legge una riga scritta a mano: «panino prosciutto 300 kcal 18p 42c 7g».
 *
 * Esiste per le cose che non sono in nessuna lista. Quando non trova i
 * numeri NON li inventa: restituisce il nome e zero, e la vista chiede il
 * resto. Un'app che tira a indovinare le calorie di quello che hai mangiato
 * produce un bilancio che sembra preciso e non lo è — che è peggio di uno
 * che dichiara di non sapere.
 */
export function scostamentoDaTesto(testo) {
  const t = String(testo || "").trim();
  if (!t) return null;

  const prendi = (re) => {
    const m = t.match(re);
    return m ? numero(m[1]) : 0;
  };
  const kcal = prendi(/(\d+(?:[.,]\d+)?)\s*(?:kcal|cal)\b/i);
  const p = prendi(/(\d+(?:[.,]\d+)?)\s*(?:g\s*)?(?:p\b|prot)/i);
  const c = prendi(/(\d+(?:[.,]\d+)?)\s*(?:g\s*)?(?:c\b|carb)/i);
  const g = prendi(/(\d+(?:[.,]\d+)?)\s*(?:g\b|gr\b|grassi)/i);

  const nome = t
    .replace(/\d+(?:[.,]\d+)?\s*(?:kcal|cal)\b/ig, "")
    .replace(/\d+(?:[.,]\d+)?\s*(?:g\s*)?(?:p\b|prot\w*|c\b|carb\w*|g\b|gr\b|grassi)/ig, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .replace(/[,;·-]+$/, "")
    .trim();

  return { nome: nome || t, kcal, p, c, g, completo: kcal > 0 };
}

/** Il testo da incollare nella chat di Claude per farsi dare altri pasti. */
export const PROMPT_CHAT = `Aggiungi pasti al mio database di ATLAS.

Rispondi SOLO con questo JSON, senza altro testo:

{ "pasti": [
  { "nome": "Pollo e riso basmati con insalata",
    "fasce": ["pranzo", "cena"],
    "kcal": 720, "p": 54, "c": 80, "g": 18,
    "prepMin": 20,
    "tag": ["pollo", "riso"] }
]}

Regole:
- "fasce" solo fra: colazione, spuntino1, pranzo, spuntino2, cena
- p/c/g sono grammi di proteine, carboidrati, grassi
- i valori sono per la porzione come la mangio io, non per 100 g
- "tag": la proteina e il carboidrato principali, servono alla varietà

Sono in massa: 2975 kcal al giorno, 138 g di proteine, 419 g di
carboidrati, 83 g di grassi. Mi mancano i CARBOIDRATI più che le
proteine. Mangio solo: uova, pollo, manzo, maiale, merluzzo,
mozzarella, parmigiano, riso basmati, pasta, pane, piadina, patate,
spinaci, insalata, banana, mela.`;
