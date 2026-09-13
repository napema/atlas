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
export function allenamentiDaCSV(testo) {
  const righe = leggiCSV(testo);
  if (!righe.length) return { voci: [], scartate: 0, motivo: "Il file è vuoto." };

  const testa = righe[0];
  const pareIntestazione = colonna(testa, "settimana", "sett", "week") >= 0;
  const cSett = pareIntestazione ? colonna(testa, "settimana", "sett", "week") : 0;
  const cSlot = pareIntestazione ? colonna(testa, "slot", "tipo", "type") : 1;
  const cTesto = pareIntestazione ? colonna(testa, "testo", "allenamento", "workout", "descrizione") : 2;
  const cKm = pareIntestazione ? colonna(testa, "km", "distanza", "distance") : 3;

  const voci = [];
  let scartate = 0;
  for (const r of righe.slice(pareIntestazione ? 1 : 0)) {
    const n = numero(r[cSett]);
    const chiave = CHIAVI[normale(r[cSlot])];
    const t = String(r[cTesto] ?? "").trim();
    if (!n || n < 1 || n > 13 || !chiave || !t) { scartate++; continue; }
    const k = cKm >= 0 ? numero(r[cKm]) : null;
    voci.push({ sett: Math.round(n), chiave, testo: t, ...(k ? { km: k } : {}) });
  }
  return { voci, scartate, motivo: voci.length ? "" : "Nessuna riga aveva settimana, slot e testo." };
}

/** Il formato, in una riga, da mostrare a chi deve produrlo. */
export const ESEMPIO_ALLENAMENTI =
  "settimana,slot,testo,km\n" +
  "3,qualita,10' Z2 + 2×8' Z3 (5:40/km) rec 3' + 10' Z2,6.7\n" +
  "3,lower,Stacco 5×3 @ 65 kg · Hack squat 4×8 · Leg curl 3×12,";
