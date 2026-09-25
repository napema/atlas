// moduli/allenamenti/importa.js — far entrare i dati da fuori.
//
// Due direzioni, e sono cose diverse:
//
//   1. GLI ALLENAMENTI, dalla chat di fitness verso ATLAS. Chiedi il lavoro
//      della settimana, te lo fai dare in CSV, lo incolli qui. Sovrascrive
//      gli slot del piano invece di affiancarli.
//   2. LE CORSE FATTE, da Garmin verso ATLAS. È quello che serve per sapere
//      i km veri della settimana, e senza non c'è né andamento né previsione.
//
// Nessuna libreria: il CSV lo legge una funzione di venti righe, perché
// l'unica cosa che ci vuole davvero è rispettare le virgolette.

/* --------------------------------------------------------------- il CSV -- */

/**
 * CSV → righe di celle.
 *
 * Gestisce le virgolette e le virgolette doppie dentro un campo, che è
 * l'unica parte non banale: un titolo come «Corsa, mattina» senza questo
 * diventa due colonne e disallinea tutta la riga. Accetta `,` e `;` come
 * separatore — Excel italiano esporta col punto e virgola, Garmin con la
 * virgola, e chiedere all'utente quale dei due ha in mano sarebbe assurdo.
 */
export function leggiCSV(testo) {
  const pulito = String(testo || "").replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  if (!pulito.trim()) return [];

  // Il separatore si indovina dalla prima riga: vince quello che compare di
  // più fuori dalle virgolette.
  const prima = pulito.split("\n")[0];
  const fuoriVirgolette = (riga, ch) => {
    let dentro = false, n = 0;
    for (const c of riga) {
      if (c === '"') dentro = !dentro;
      else if (c === ch && !dentro) n++;
    }
    return n;
  };
  const sep = fuoriVirgolette(prima, ";") > fuoriVirgolette(prima, ",") ? ";" : ",";

  const righe = [];
  let cella = "", riga = [], dentro = false;
  for (let i = 0; i < pulito.length; i++) {
    const c = pulito[i];
    if (dentro) {
      if (c === '"') {
        if (pulito[i + 1] === '"') { cella += '"'; i++; }
        else dentro = false;
      } else cella += c;
      continue;
    }
    if (c === '"') dentro = true;
    else if (c === sep) { riga.push(cella); cella = ""; }
    else if (c === "\n") { riga.push(cella); righe.push(riga); riga = []; cella = ""; }
    else cella += c;
  }
  riga.push(cella);
  if (riga.some((x) => x.trim() !== "")) righe.push(riga);
  return righe.filter((r) => r.some((x) => x.trim() !== ""));
}

/** Per confrontare intestazioni scritte da umani: niente accenti, niente caso. */
const normale = (s) => String(s || "").toLowerCase().trim()
  .normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9]+/g, "");

/** L'indice della prima colonna il cui titolo combacia con uno dei nomi. */
function colonna(intestazioni, ...nomi) {
  const n = intestazioni.map(normale);
  for (const cercato of nomi.map(normale)) {
    const i = n.indexOf(cercato);
    if (i >= 0) return i;
  }
  // Ripiego: il titolo CONTIENE il nome. Garmin cambia le intestazioni fra
  // una versione e l'altra e questo evita di riscrivere il parser ogni volta.
  for (const cercato of nomi.map(normale)) {
    const i = n.findIndex((x) => x.includes(cercato));
    if (i >= 0) return i;
  }
  return -1;
}

/* ------------------------------------------------------------- i numeri -- */

/**
 * Un numero scritto da un umano o da un'app.
 *
 * «6,21» e «6.21» sono lo stesso numero; «1.234,5» è milleduecento e rotti e
 * «1,234.5» pure. Sbagliare questo significa importare una corsa da 1,2 km
 * invece che da 1234 metri, e non accorgersene mai perché il totale resta
 * plausibile.
 */
export function numero(testo) {
  let s = String(testo ?? "").trim().replace(/[^\d.,-]/g, "");
  if (!s) return null;
  const ultimaV = s.lastIndexOf(","), ultimoP = s.lastIndexOf(".");
  if (ultimaV >= 0 && ultimoP >= 0) {
    // Il separatore decimale è quello che viene DOPO: l'altro è le migliaia.
    if (ultimaV > ultimoP) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (ultimaV >= 0) {
    // Una virgola sola: decimale, a meno che separi gruppi di tre cifre.
    s = /,\d{3}$/.test(s) ? s.replace(/,/g, "") : s.replace(",", ".");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** "00:42:15" · "42:15" · "42:15,3" · "2530" → secondi. */
export function secondi(testo) {
  const s = String(testo ?? "").trim();
  if (!s) return null;
  const pezzi = s.split(":").map((p) => p.replace(",", "."));
  if (pezzi.length === 1) { const n = Number(pezzi[0]); return Number.isFinite(n) ? n : null; }
  const numeri = pezzi.map(Number);
  if (numeri.some((n) => !Number.isFinite(n))) return null;
  return numeri.length === 3
    ? numeri[0] * 3600 + numeri[1] * 60 + numeri[2]
    : numeri[0] * 60 + numeri[1];
}

/**
 * Una data scritta in uno dei modi in cui la scrivono le app.
 *
 * ISO, italiano e americano. L'ambiguità vera è `03/04`: Garmin in italiano
 * dà giorno/mese, in inglese mese/giorno, e non c'è modo di indovinarlo dal
 * solo numero. Si assume il formato italiano — è la lingua dell'app e del
 * telefono — e quando il primo campo supera 12 non c'è comunque dubbio.
 */
export function data(testo) {
  const s = String(testo ?? "").trim();
  if (!s) return null;
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/.exec(s);
  if (m) {
    let [, a, b, anno] = m;
    if (anno.length === 2) anno = `20${anno}`;
    let giorno = a, mese = b;
    if (Number(a) > 12) { giorno = a; mese = b; }
    else if (Number(b) > 12) { giorno = b; mese = a; }   // era mese/giorno
    return `${anno}-${String(mese).padStart(2, "0")}-${String(giorno).padStart(2, "0")}`;
  }
  return null;
}

/* --------------------------------------------------------- LE CORSE -- */

const ECORSA = /cors|run|jog|treadmill|tapis/i;

/**
 * Un export di attività (Garmin Connect e simili) → le corse.
 *
 * Tiene solo le corse: un export contiene anche nuoto, bici e camminate, e
 * farli entrare nel chilometraggio della settimana falserebbe l'unico numero
 * per cui questo modulo esiste. Se la colonna del tipo non c'è, entra tutto
 * — meglio importare troppo e togliere che non importare niente.
 */
export function corseDaCSV(testo) {
  const righe = leggiCSV(testo);
  if (righe.length < 2) return { corse: [], scartate: 0, motivo: "Il file non ha righe di dati." };

  const testa = righe[0];
  const cTipo = colonna(testa, "tipo di attivita", "tipo attivita", "activity type", "tipo");
  const cData = colonna(testa, "data", "date", "start time", "ora di inizio", "giorno");
  const cDist = colonna(testa, "distanza", "distance", "km");
  const cTempo = colonna(testa, "tempo", "time", "durata", "duration", "tempo trascorso", "elapsed time");
  const cTit = colonna(testa, "titolo", "title", "nome", "name");
  const cFC = colonna(testa, "fc media", "avg hr", "frequenza cardiaca media", "average heart rate");

  if (cData < 0 || cDist < 0) {
    return { corse: [], scartate: 0,
      motivo: "Non trovo le colonne della data e della distanza. Servono almeno quelle due." };
  }

  const corse = [];
  let scartate = 0;
  for (const r of righe.slice(1)) {
    if (cTipo >= 0 && r[cTipo] && !ECORSA.test(r[cTipo])) { scartate++; continue; }
    const d = data(r[cData]);
    const dist = numero(r[cDist]);
    if (!d || !dist || dist <= 0) { scartate++; continue; }
    const sec = cTempo >= 0 ? secondi(r[cTempo]) : null;
    const fc = cFC >= 0 ? numero(r[cFC]) : null;
    corse.push({
      data: d,
      km: Math.round(dist * 100) / 100,
      secondi: sec || 0,
      titolo: (cTit >= 0 ? String(r[cTit] || "").trim() : "") || "Corsa",
      ...(fc ? { fc: Math.round(fc) } : {}),
    });
  }
  return { corse, scartate, motivo: corse.length ? "" : "Nessuna riga sembrava una corsa." };
}

/* ------------------------------------------------- GLI ALLENAMENTI -- */

const CHIAVI = {
  facile: "facile", easy: "facile",
  qualita: "qualita", quality: "qualita",
  lunga: "lunga", long: "lunga", lungo: "lunga",
  lower: "lower", gambe: "lower",
  upper: "upper",
  total: "total", full: "total", fullbody: "total",
};

/**
 * Il CSV degli allenamenti dalla chat di fitness.
 *
 * Una riga per slot: `settimana, slot, testo, km`. `slot` è una delle sei
 * parole — facile, qualita, lunga, lower, upper, total — e `km` serve solo
 * alla corsa, per il conteggio settimanale.
 *
 * Quello che torna NON sostituisce il piano: lo copre, slot per slot. Il
 * piano resta codice e resta intatto, così una riga sbagliata in un CSV si
 * annulla togliendo la riga, non ripristinando tredici settimane.
 */
/* I sei nomi del blocco. Non sono più una gabbia — sono solo scorciatoie:
   scrivere «lower» risparmia di scrivere «Lower» e «palestra». Qualunque
   altra parola va bene lo stesso ed entra con il nome che le hai dato. */
const SCORCIATOIE = {
  facile:  { nome: "Facile",   genere: "corsa" },
  qualita: { nome: "Qualità",  genere: "corsa" },
  lunga:   { nome: "Lunga",    genere: "corsa" },
  lower:   { nome: "Lower",    genere: "palestra" },
  upper:   { nome: "Upper",    genere: "palestra" },
  total:   { nome: "Total",    genere: "palestra" },
};

/* Come si capisce se è corsa o palestra quando non lo dici. Non è
   indovinare per il gusto di farlo: il genere decide che cosa mostra il
   foglio — i passi per l'orologio o la mappa dei muscoli — e chiederlo in
   una colonna obbligatoria vorrebbe dire rifiutare il CSV di chi non l'ha
   messa. Sbagliare costa una riga da correggere, non un import perso. */
const PAROLE_CORSA = /\b(corsa|corri|run|running|fartlek|ripetut|allung|lento|lunga|tempo run|z2|z3|z4|km|jog|bici|bike|nuoto|swim|cardio|camminat)\b/i;
const PAROLE_PALESTRA = /\b(palestra|gym|serie|reps?|ripetizioni|squat|panca|stacc|deadlift|bench|curl|press|trazion|rematore|lat|dip|affond|leg|calf|polpacc|×|x\d)\b/i;

function indovinaGenere(nome, testo, km) {
  const tutto = `${nome} ${testo}`;
  if (km) return "corsa";
  if (PAROLE_PALESTRA.test(tutto)) return "palestra";
  if (PAROLE_CORSA.test(tutto)) return "corsa";
  return "altro";
}

/**
 * Gli allenamenti di una o più settimane, dal CSV.
 *
 * LE COLONNE. `settimana` e `testo` servono; il resto è facoltativo.
 *
 *   settimana  1–13
 *   nome       come lo chiami tu: «Fartlek», «Full body», «Giro in bici».
 *              In mancanza si usa `slot`, e in mancanza di quello il testo
 *              accorciato — meglio un nome brutto che una riga persa.
 *   slot       le sei parole di prima, ancora accettate come scorciatoia
 *   genere     corsa | palestra | altro. Se manca lo si indovina.
 *   testo      l'allenamento in una riga
 *   km         solo per la corsa
 *
 * Torna le voci GIÀ RAGGRUPPATE per settimana, perché è così che vanno
 * salvate: una settimana importata sostituisce quella che c'era, e per
 * sostituirla bisogna averla tutta insieme.
 */
export function allenamentiDaCSV(testo) {
  const righe = leggiCSV(testo);
  if (!righe.length) return { settimane: [], voci: [], scartate: 0, motivo: "Il file è vuoto." };

  const testa = righe[0];
  const cSett = colonna(testa, "settimana", "sett", "week");
  const pareIntestazione = cSett >= 0;
  const cNome = pareIntestazione ? colonna(testa, "nome", "name", "titolo", "title") : -1;
  const cSlot = pareIntestazione ? colonna(testa, "slot", "tipo", "type") : 1;
  const cGen = pareIntestazione ? colonna(testa, "genere", "categoria", "kind") : -1;
  const cTesto = pareIntestazione ? colonna(testa, "testo", "allenamento", "workout", "descrizione") : 2;
  const cKm = pareIntestazione ? colonna(testa, "km", "distanza", "distance") : 3;

  const per = new Map();
  let scartate = 0;
  for (const r of righe.slice(pareIntestazione ? 1 : 0)) {
    const n = numero(pareIntestazione ? r[cSett] : r[0]);
    const t = String(r[cTesto] ?? "").trim();
    if (!n || n < 1 || n > 13 || !t) { scartate++; continue; }

    const parolaSlot = normale(cSlot >= 0 ? r[cSlot] : "");
    const corta = SCORCIATOIE[parolaSlot];
    const nome = String((cNome >= 0 ? r[cNome] : "") || "").trim()
      || corta?.nome
      || (cSlot >= 0 ? String(r[cSlot] ?? "").trim() : "")
      || t.slice(0, 24);

    const km = cKm >= 0 ? numero(r[cKm]) : null;
    const dichiarato = normale(cGen >= 0 ? r[cGen] : "");
    const genere = ["corsa", "palestra", "altro"].includes(dichiarato)
      ? dichiarato
      : corta?.genere || indovinaGenere(nome, t, km);

    const sett = Math.round(n);
    if (!per.has(sett)) per.set(sett, []);
    per.get(sett).push({ nome, genere, testo: t, ...(km ? { km } : {}) });
  }

  const settimane = [...per.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([sett, voci]) => ({ sett, voci }));

  return {
    settimane,
    voci: settimane.flatMap((w) => w.voci),
    scartate,
    motivo: settimane.length ? "" : "Nessuna riga aveva settimana e testo.",
  };
}

/** Il formato, in una riga, da mostrare a chi deve produrlo. */
export const ESEMPIO_ALLENAMENTI =
  "settimana,nome,genere,testo,km\n" +
  "3,Fartlek,corsa,10' Z2 + 8×(1' forte / 1' piano) + 10' Z2,7.5\n" +
  "3,Full body,palestra,Stacco 5×3 @ 65 kg · Panca 4×6 · Trazioni 4×8 · Plank 3×45\",\n" +
  "3,Giro in bici,altro,45' facile,";
