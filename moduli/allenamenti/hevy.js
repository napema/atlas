// moduli/allenamenti/hevy.js — crea le routine su Hevy, davvero.
//
// A differenza di Garmin, Hevy ha un'API aperta: con la chiave di un account
// Pro si crea una routine con una chiamata sola, e compare nell'app senza
// che nessuno debba incollare niente. E — verificato prima di scrivere una
// riga — risponde `Access-Control-Allow-Origin: *` con `api-key` fra gli
// header ammessi, quindi può chiamarla direttamente il browser. Senza quello
// questo file non esisterebbe: senza backend non c'è modo di aggirare CORS.
//
// LA CHIAVE NON SI SINCRONIZZA, ed è la decisione più importante del file.
// Tutto il resto di questo modulo finisce in `allenamenti.json` dentro
// atlas-dati. Ma atlas-dati si legge con il token che sta in `config.js`, e
// `config.js` è servito da GitHub Pages — cioè pubblico. Mettere lì la
// chiave di Hevy significherebbe pubblicarla. Quindi vive in una casella sua
// che il sync non tocca: si scrive una volta per dispositivo, e resta lì.

import { apriCasella } from "../../core/storage.js";

const BASE = "https://api.hevyapp.com/v1";

/* La casella è LOCALE di proposito: non compare in nessun `impacchetta`. */
const cassetto = apriCasella("hevy", { chiave: "", esercizi: [], esercizivisti: 0 });

export const chiave = () => (cassetto.leggi().chiave || "").trim();
export const configurato = () => chiave().length > 0;
export const scriviChiave = (v) => cassetto.aggiorna((s) => { s.chiave = String(v || "").trim(); });

async function chiama(percorso, opzioni = {}) {
  if (!configurato()) throw new Error("Manca la chiave API di Hevy.");
  const res = await fetch(`${BASE}${percorso}`, {
    ...opzioni,
    headers: { "api-key": chiave(), "Content-Type": "application/json", ...(opzioni.headers || {}) },
  });
  if (res.status === 401) throw new Error("Chiave rifiutata da Hevy.");
  if (!res.ok) {
    let extra = "";
    try { extra = (await res.json())?.error || ""; } catch { /* il corpo non era JSON */ }
    throw new Error(`Hevy ha risposto ${res.status}${extra ? `: ${extra}` : ""}`);
  }
  return res.status === 204 ? null : res.json();
}

/* ------------------------------------------------- il vocabolario Hevy -- */

/**
 * Gli esercizi si riferiscono per `exercise_template_id`, non per nome:
 * l'elenco va scaricato una volta e tenuto. Sono qualche centinaio di voci
 * che non cambiano mai, quindi si scaricano al primo uso e basta.
 */
export async function scaricaEsercizi({ forza = false } = {}) {
  const gia = cassetto.leggi().esercizi;
  if (!forza && gia?.length) return gia;

  const tutti = [];
  for (let pagina = 1; pagina <= 20; pagina++) {
    const r = await chiama(`/exercise_templates?page=${pagina}&pageSize=100`);
    const lotto = r?.exercise_templates || [];
    tutti.push(...lotto.map((e) => ({ id: e.id, titolo: e.title })));
    if (lotto.length < 100) break;
  }
  cassetto.aggiorna((s) => { s.esercizi = tutti; s.esercizivisti = Date.now(); });
  return tutti;
}

export const esercizinoti = () => cassetto.leggi().esercizi || [];

/* --------------------------------------------------- italiano → inglese -- */
/*
   Il piano è in italiano e Hevy in inglese, quindi in mezzo serve un
   vocabolario. Ogni voce elenca i candidati IN ORDINE di preferenza: il
   primo che esiste davvero nel catalogo vince. Elencarne più d'uno non è
   indecisione — è che Hevy chiama la stessa cosa in modi diversi a seconda
   dell'attrezzo, e quale ci sia nel catalogo non lo sappiamo qui.
*/
const VOCABOLARIO = [
  [/\bstacco\b|\bdeadlift\b/i, ["Deadlift (Barbell)", "Deadlift"]],
  [/\brdl\b|romanian/i, ["Romanian Deadlift (Barbell)", "Romanian Deadlift (Dumbbell)"]],
  [/hack\s*squat/i, ["Hack Squat", "Hack Squat (Machine)"]],
  [/\bsquat\b/i, ["Squat (Barbell)", "Back Squat", "Squat"]],
  [/leg\s*curl/i, ["Seated Leg Curl (Machine)", "Lying Leg Curl (Machine)", "Leg Curl"]],
  [/affond|lunge/i, ["Lunge (Dumbbell)", "Walking Lunge (Dumbbell)", "Lunge"]],
  [/polpacc|calf/i, ["Standing Calf Raise (Machine)", "Calf Press (Machine)", "Standing Calf Raise"]],
  [/tibial/i, ["Tibialis Raise", "Tibialis Anterior Raise"]],
  [/panca\s*incl|incline/i, ["Incline Bench Press (Dumbbell)", "Incline Bench Press (Barbell)"]],
  [/\bpanca\b|bench/i, ["Bench Press (Barbell)", "Bench Press (Dumbbell)"]],
  [/trazion|pull\s*up/i, ["Pull Up", "Pull Up (Assisted)", "Chin Up"]],
  [/military|shoulder\s*press|overhead/i, ["Shoulder Press (Dumbbell)", "Overhead Press (Dumbbell)", "Overhead Press (Barbell)"]],
  [/rematore|\brow\b/i, ["Bent Over Row (Barbell)", "Bent Over Row (Dumbbell)", "Seated Row (Cable)"]],
  [/alzate|lateral\s*raise/i, ["Lateral Raise (Dumbbell)", "Lateral Raise (Cable)"]],
  [/pushdown|tricip/i, ["Triceps Pushdown", "Triceps Pushdown (Cable)", "Triceps Extension (Cable)"]],
  [/\bcurl\b|bicip/i, ["Bicep Curl (Dumbbell)", "Bicep Curl (Barbell)", "Bicep Curl (Cable)"]],
  [/lat\s*machine|lat\s*pulldown|pulldown/i, ["Lat Pulldown (Cable)", "Lat Pulldown (Machine)"]],
  [/\bdip\b|dips/i, ["Triceps Dip", "Dip", "Chest Dip"]],
  [/leg\s*raise|leg\s*lift/i, ["Hanging Leg Raise", "Lying Leg Raise", "Captain's Chair Leg Raise"]],
];

const semplice = (s) => String(s || "").toLowerCase()
  .normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

/**
 * Il nome italiano → l'esercizio di Hevy, o `null`.
 *
 * `null` NON si nasconde: la vista elenca quello che non ha trovato, e la
 * routine si crea comunque con il resto. Piantarsi tutto per un tibialis che
 * Hevy chiama in un altro modo sarebbe il peggiore dei due comportamenti.
 */
export function trovaEsercizio(nomeItaliano, catalogo = esercizinoti()) {
  if (!catalogo.length) return null;
  const perTitolo = new Map(catalogo.map((e) => [semplice(e.titolo), e]));

  for (const [regola, candidati] of VOCABOLARIO) {
    if (!regola.test(nomeItaliano)) continue;
    for (const c of candidati) {
      const trovato = perTitolo.get(semplice(c));
      if (trovato) return trovato;
    }
    // Nessun candidato esatto: si accetta il primo titolo che LI CONTIENE,
    // perché Hevy aggiunge spesso l'attrezzo fra parentesi.
    for (const c of candidati) {
      const radice = semplice(c).split(" ")[0];
      const vicino = catalogo.find((e) => semplice(e.titolo).startsWith(radice));
      if (vicino) return vicino;
    }
  }
  return null;
}

/* ------------------------------------------------ il testo → le serie -- */

/**
 * «Stacco 5×3 @ 60 kg» → { nome: "Stacco", serie: 5, ripetizioni: 3, kg: 60 }
 *
 * «Curl+Pushdown» sono due esercizi in una riga sola, e vanno separati prima
 * di arrivare qui.
 */
export function leggiEsercizio(testo) {
  const t = String(testo || "").trim();
  const m = /^(.*?)\s*(\d+)\s*[x×]\s*(\d+)?\s*(%?\w*)\s*(?:@\s*([\d.,]+)\s*kg)?/i.exec(t);
  if (!m) return { nome: t, serie: 3, ripetizioni: null, kg: null, incerto: true };
  return {
    nome: m[1].trim() || t,
    serie: Number(m[2]) || 3,
    ripetizioni: m[3] ? Number(m[3]) : null,
    kg: m[5] ? Number(m[5].replace(",", ".")) : null,
  };
}

/** Una riga del piano può contenere due esercizi uniti da «+». */
export const separaEsercizi = (riga) =>
  String(riga || "").split(/\s*\+\s*/).map((x) => x.trim()).filter(Boolean);

/* ------------------------------------------------------- creare la routine */

/**
 * Crea la routine su Hevy.
 *
 * @returns {{ creata: object, mancanti: string[] }}
 */
export async function creaRoutine({ titolo, note, righe }) {
  const catalogo = await scaricaEsercizi();
  const esercizi = [];
  const mancanti = [];

  for (const riga of righe) {
    for (const pezzo of separaEsercizi(riga)) {
      const letto = leggiEsercizio(pezzo);
      const trovato = trovaEsercizio(letto.nome, catalogo);
      if (!trovato) { mancanti.push(letto.nome); continue; }
      esercizi.push({
        exercise_template_id: trovato.id,
        superset_id: null,
        rest_seconds: 90,
        notes: pezzo,
        sets: Array.from({ length: letto.serie }, () => ({
          type: "normal",
          weight_kg: letto.kg ?? null,
          reps: letto.ripetizioni ?? null,
        })),
      });
    }
  }

  /* DUE ZERO DIVERSI, e confonderli manda a cercare il guasto dalla parte
     sbagliata. Zero righe in ingresso vuol dire che chi ha chiamato non ha
     passato niente; zero riconosciute vuol dire che il vocabolario non
     copre quei nomi. Il messaggio di prima diceva la seconda cosa anche
     quando era vera la prima, e ha fatto cercare per mezz'ora un problema
     di traduzione che non c'era. */
  if (!righe?.length) throw new Error("Questo allenamento non ha esercizi da mandare.");
  if (!esercizi.length) {
    throw new Error(
      catalogo.length
        ? `Nessuno di questi nomi esiste su Hevy: ${mancanti.slice(0, 4).join(", ")}.`
        : "Il catalogo di Hevy è vuoto: controlla la chiave API in Impostazioni.",
    );
  }

  const creata = await chiama("/routines", {
    method: "POST",
    body: JSON.stringify({ routine: { title: titolo, folder_id: null, notes: note || "", exercises: esercizi } }),
  });
  return { creata, mancanti };
}

/** Una prova rapida della chiave, per non scoprirlo al primo invio vero. */
export async function provaChiave() {
  const r = await chiama("/routines?page=1&pageSize=1");
  return Boolean(r);
}
