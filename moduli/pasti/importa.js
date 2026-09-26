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

import { ID_FASCE, COMUNI, salvaPasti, slug, pastiVivi, scegliVoci, lunediDi } from "./dati.js";

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

/* =========================================================================
   IL PIANO CON LE DATE

   È la forma che serve davvero. Prima l'import portava PASTI — voci del
   database, senza un giorno — e la settimana bisognava comunque comporla a
   mano o farla generare. Ma quando chiedi alla chat «preparami da venerdì a
   venerdì prossimo», la risposta HA già le date: buttarle via per poi
   ricostruirle a mano è l'unico passaggio davvero inutile di tutto il giro.

   E OGNI CIBO È UN BLOCCHETTO. «Uova strapazzate» una voce, «bacon»
   un'altra, «pane» un'altra: non «Uova, bacon e pane». È la stessa regola
   del database — un piatto è l'insieme di quello che ci metti — e vale
   soprattutto qui, perché è da qui che entrano le cose nuove. Un import che
   riporta combinazioni le rimette dentro una per una e in un mese il
   catalogo torna quello di prima.
   ========================================================================= */

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Legge il piano con le date. NON scrive: l'anteprima è l'unica difesa che
 * c'è su un testo incollato a mano.
 *
 * Forma attesa:
 *   { "giorni": [
 *       { "data": "2026-09-27", "pasti": [
 *           { "fascia": "colazione", "componenti": [
 *               { "nome": "Uova strapazzate", "porzione": "3 uova",
 *                 "kcal": 250, "p": 20, "c": 2, "g": 18 } ] } ] } ] }
 *
 * `porzione` e i macro servono solo per i componenti NUOVI: quelli che
 * esistono già si riconoscono dal nome e tengono i valori che hanno. Così
 * reimportare non riscrive il catalogo e lo stesso pollo pesa sempre uguale.
 */
export function pianoDaJSON(testo, { noti = [] } = {}) {
  const pulito = ripulisci(testo);
  if (!pulito) return { giorni: [], problemi: ["Non hai incollato niente."], nuovi: [] };

  let dati;
  try {
    dati = JSON.parse(pulito);
  } catch (e) {
    return { giorni: [], problemi: [`Non è JSON valido: ${e.message}`], nuovi: [] };
  }

  const elenco = Array.isArray(dati) ? dati : dati?.giorni;
  if (!Array.isArray(elenco) || !elenco.length) {
    return { giorni: [], problemi: ['Manca la lista dei giorni: ci vuole { "giorni": [ … ] }.'], nuovi: [] };
  }

  const perNome = new Map((noti || []).map((p) => [slug(p.nome), p]));
  const problemi = [];
  const nuovi = new Map();
  const giorni = [];

  for (const g of elenco) {
    const data = String(g?.data || g?.giorno || "").trim();
    if (!ISO.test(data)) { problemi.push(`Un giorno non ha una data valida: «${data || "vuota"}».`); continue; }

    const pasti = [];
    for (const p of Array.isArray(g?.pasti) ? g.pasti : []) {
      const fascia = String(p?.fascia || "").trim();
      if (!ID_FASCE.includes(fascia)) { problemi.push(`${data}: fascia sconosciuta «${fascia}».`); continue; }

      const componenti = [];
      for (const c of Array.isArray(p?.componenti) ? p.componenti : []) {
        const nome = String(c?.nome || "").trim();
        if (!nome) continue;
        const chiave = slug(nome);
        const gia = perNome.get(chiave);
        if (gia) { componenti.push({ nome: gia.nome, id: gia.id, nuovo: false }); continue; }

        /* Un componente nuovo SENZA calorie non entra: un record che finge
           di non pesare niente sporca il bilancio di quel giorno e di tutta
           la settimana, e non si vede finché non si cerca. */
        if (!numero(c?.kcal)) { problemi.push(`${data}: «${nome}» è nuovo ma non ha le calorie.`); continue; }
        const voce = {
          nome,
          porzione: String(c?.porzione || "").trim(),
          gruppo: String(c?.gruppo || "").trim(),
          kcal: Math.round(numero(c.kcal)),
          p: Math.round(numero(c.p)), c: Math.round(numero(c.c)), g: Math.round(numero(c.g)),
          fasce: [fascia],
          tipo: "componente",
          fonte: "chat",
        };
        if (!nuovi.has(chiave)) nuovi.set(chiave, voce);
        // Lo stesso componente può servire a fasce diverse nella settimana.
        else if (!nuovi.get(chiave).fasce.includes(fascia)) nuovi.get(chiave).fasce.push(fascia);
        componenti.push({ nome, id: null, nuovo: true });
      }

      if (componenti.length) pasti.push({ fascia, componenti });
      else problemi.push(`${data}: la fascia «${fascia}» è rimasta senza componenti.`);
    }

    if (pasti.length) giorni.push({ data, pasti });
  }

  giorni.sort((a, b) => a.data.localeCompare(b.data));
  if (!giorni.length && !problemi.length) problemi.push("Nessun giorno utilizzabile.");
  return { giorni, problemi, nuovi: [...nuovi.values()] };
}

/**
 * Scrive il piano letto: prima i componenti nuovi, poi i giorni.
 *
 * L'ORDINE NON È CASUALE. Le voci del piano sono id, e l'id di un
 * componente nuovo esiste solo dopo che l'ha salvato `salvaPasti`. Scrivere
 * i giorni per primi vorrebbe dire metterci dentro id che non puntano a
 * niente, e il piano risulterebbe pieno di fasce vuote senza che nessuno
 * capisca perché.
 *
 * Ogni data va nella settimana sua: `scegliVoci` prende il lunedì da lei,
 * quindi un piano da venerdì a venerdì entra in due record di settimana
 * senza che il chiamante debba saperlo.
 */
export function applicaPiano({ giorni, nuovi }) {
  if (nuovi?.length) salvaPasti(nuovi);

  const perNome = new Map(pastiVivi().map((p) => [slug(p.nome), p]));
  let fasce = 0;
  const date = [];

  for (const g of giorni || []) {
    for (const p of g.pasti || []) {
      const ids = p.componenti
        .map((c) => c.id || perNome.get(slug(c.nome))?.id)
        .filter(Boolean);
      if (!ids.length) continue;
      scegliVoci(lunediDi(g.data), g.data, p.fascia, ids);
      fasce += 1;
    }
    date.push(g.data);
  }
  return { date, fasce, nuovi: nuovi?.length || 0 };
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
/* Il prompt da dare alla chat. Sta nel codice e non in un file di testo
   perché cambia insieme al formato che legge `pianoDaJSON`: tenerli
   separati vorrebbe dire scoprire che non combaciano incollando. */
export const PROMPT_CHAT = `Preparami il piano dei pasti per ATLAS.

Rispondi SOLO con questo JSON, senza altro testo intorno:

{ "giorni": [
  { "data": "2026-10-02",
    "pasti": [
      { "fascia": "colazione", "componenti": [
        { "nome": "Uova strapazzate", "porzione": "3 uova", "gruppo": "proteina",
          "kcal": 250, "p": 20, "c": 2, "g": 18 },
        { "nome": "Bacon", "porzione": "40 g", "gruppo": "proteina",
          "kcal": 220, "p": 14, "c": 0, "g": 18 },
        { "nome": "Pane", "porzione": "100 g", "gruppo": "carboidrato",
          "kcal": 270, "p": 9, "c": 50, "g": 3 }
      ]},
      { "fascia": "cena", "componenti": [ … ] }
    ]}
]}

LA REGOLA PIÙ IMPORTANTE: OGNI CIBO È UNA VOCE A SÉ.
Uova strapazzate una voce, bacon un'altra, pane un'altra. MAI
"Uova, bacon e pane" in una voce sola, mai "Pollo e riso con insalata":
sono tre voci. Un piatto è l'insieme di quello che ci metto, e lo
compone l'app.

Le altre regole:
- "data" in formato 2026-10-02, un oggetto per ogni giorno che ti chiedo
- "fascia" solo fra: colazione, spuntino1, pranzo, spuntino2, cena
- "gruppo" fra: proteina, carboidrato, verdura, condimento, frutta,
  dolce, bevanda
- "porzione" come la mangio io ("180 g", "3 uova", "1")
- kcal e p/c/g sono di QUELLA porzione, non per 100 g
- i cibi che uso spesso tornano con lo stesso nome ogni volta: l'app li
  riconosce e non li duplica

Sono in massa: 2975 kcal al giorno, 138 g di proteine, 419 g di
carboidrati, 83 g di grassi. Mi mancano i CARBOIDRATI più che le
proteine. Mangio solo: uova, bacon, pollo, manzo, maiale, merluzzo,
mozzarella, parmigiano, stracchino, yogurt greco, riso basmati, pasta,
pane, piadina, patate, spinaci, insalata, verdure grigliate, sugo di
pomodoro, banana, mela, mandorle, cioccolato fondente.

A pranzo dal lunedì al giovedì mangio in mensa: non pianificarlo.`;
