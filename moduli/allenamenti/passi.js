// moduli/allenamenti/passi.js — dal testo del piano ai passi strutturati.
//
// «15' risc + 5×1000 @ 4:30/km rec 90" + 10' defat» è una frase che un umano
// legge in un secondo e un orologio non legge affatto. Qui diventa:
//
//   riscaldamento 15'
//   ripeti 5 volte: 1000 m a 4:30/km · recupero 90"
//   defaticamento 10'
//
// che è la forma che sanno leggere sia il file .FIT di Garmin sia chiunque
// altro.
//
// QUANDO NON CAPISCE NON INVENTA. Un passo che il lettore non riconosce
// diventa UN passo solo, aperto, con dentro il testo originale — e
// `completo: false` dice alla vista di avvisare. Un orologio che ti impone
// dieci ripetute che non erano nel piano è molto peggio di un orologio che
// ti dice «corri, il dettaglio ce l'hai sul telefono».

/* ------------------------------------------------------------- i numeri -- */

/** "4:30/km" · "4:30" → secondi al km. */
export function passoSec(testo) {
  const m = /(\d{1,2}):(\d{2})\s*(?:\/\s*km)?/.exec(String(testo || ""));
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/** "90\"" · "3'" · "2'30\"" · "75" → secondi. */
export function durataSec(testo) {
  const s = String(testo || "").trim();
  let m = /^(\d+)\s*'\s*(\d+)\s*"?$/.exec(s);           // 2'30"
  if (m) return Number(m[1]) * 60 + Number(m[2]);
  m = /^(\d+)\s*'$/.exec(s);                            // 3'
  if (m) return Number(m[1]) * 60;
  m = /^(\d+)\s*"$/.exec(s);                            // 90"
  if (m) return Number(m[1]);
  m = /^(\d+)$/.exec(s);                                // 75 (secondi)
  if (m) return Number(m[1]);
  return null;
}

const INTENSITA = (t) =>
  /risc/i.test(t) ? "warmup"
  : /defat|defaticam/i.test(t) ? "cooldown"
  : "active";

/* --------------------------------------------------------------- i passi -- */

const tempo = (secondi, extra = {}) => ({ tipo: "tempo", secondi, intensita: "active", ...extra });
const distanza = (metri, extra = {}) => ({ tipo: "distanza", metri, intensita: "active", ...extra });

/**
 * Un segmento di allenamento → uno o più passi.
 * Restituisce `null` se non riconosce niente, e chi chiama decide.
 */
function leggiSegmento(pezzo, { test = false } = {}) {
  const t = pezzo.trim();
  if (!t) return null;

  // 5×1000 @ 4:30/km rec 90"   ·   8×400 @ 3:45/km rec 90"
  let m = /(\d+)\s*[x×]\s*(\d{3,5})\s*(?:m\b)?\s*(?:@\s*([\d:]+)\s*\/?\s*km)?(?:.*?rec\s*([\d'"]+))?/i.exec(t);
  if (m && !/km\s*@/.test(t)) {
    const volte = Number(m[1]);
    const metri = Number(m[2]);
    const ritmo = m[3] ? passoSec(m[3]) : null;
    const rec = m[4] ? durataSec(m[4]) : null;
    const dentro = [distanza(metri, { passoSec: ritmo, intensita: "interval", nome: `${metri} m` })];
    if (rec) dentro.push(tempo(rec, { intensita: "recovery", nome: "Recupero" }));
    return [{ tipo: "ripeti", volte, passi: dentro }];
  }

  // 2×8' Z3 (5:40/km) rec 3'   ·   2×12' @ 4:52/km rec 2'   ·   6×30" allunghi
  m = /(\d+)\s*[x×]\s*(\d+\s*['"])\s*(?:Z\d)?\s*(?:\(([\d:]+)\s*\/?\s*km\)|@\s*([\d:]+)\s*\/?\s*km)?(?:.*?rec\s*([\d'"]+))?/i.exec(t);
  if (m) {
    const volte = Number(m[1]);
    const sec = durataSec(m[2]);
    const ritmo = m[3] || m[4] ? passoSec(m[3] || m[4]) : null;
    // «allunghi · cammino 90"»: il recupero non si chiama sempre «rec».
    const recTesto = m[5] || (/cammin|recup/i.test(t) ? (/(\d+\s*['"])/g.exec(t.split(/cammin|recup/i)[1] || "") || [])[1] : null);
    const rec = recTesto ? durataSec(recTesto) : null;
    if (!sec) return null;
    const veloce = /allungh/i.test(t);
    const dentro = [tempo(sec, {
      passoSec: ritmo, intensita: "interval",
      nome: veloce ? "Allungo" : `${Math.round(sec / 60) || sec} ${sec >= 60 ? "min" : "s"}`,
    })];
    if (rec) dentro.push(tempo(rec, { intensita: "recovery", nome: veloce ? "Cammina" : "Recupero" }));
    return [{ tipo: "ripeti", volte, passi: dentro }];
  }

  // 4 allunghi  (senza durata: si assume 30" veloce + 60" piano, ed è detto)
  // 6 allunghi da 20"  (la durata detta vince; il piano dopo resta assunto)
  m = /^(\d+)\s+allungh/i.exec(t);
  if (m) {
    const detta = /da\s*(\d+)\s*"/i.exec(t);
    return [{ tipo: "ripeti", volte: Number(m[1]), assunto: true, passi: [
      tempo(detta ? Number(detta[1]) : 30, { intensita: "interval", nome: "Allungo" }),
      tempo(60, { intensita: "recovery", nome: "Piano" }),
    ] }];
  }

  // 6 km @ 7:00/km Z2   ·   TEST 5 KM
  m = /(\d+(?:[.,]\d+)?)\s*km(?:\s*(?:SCARICO)?\s*@\s*([\d:]+))?/i.exec(t);
  if (m) {
    const metri = Math.round(Number(m[1].replace(",", ".")) * 1000);
    const ritmo = m[2] ? passoSec(m[2]) : (/sub-?20/i.test(t) ? 240 : null);
    return [distanza(metri, { passoSec: ritmo, nome: /test/i.test(t) || test ? "Test 5 km" : null })];
  }

  // 30' Z2 @ 7:00/km   ·   15' risc   ·   20' continui Z3 (5:30/km)   ·   10' defat
  m = /(\d+)\s*'/.exec(t);
  if (m) {
    const sec = Number(m[1]) * 60;
    const ritmo = passoSec((/[@(]\s*([\d:]+)\s*\/?\s*km/.exec(t) || [])[1]);
    const inten = INTENSITA(t);
    return [tempo(sec, {
      passoSec: ritmo,
      intensita: inten,
      nome: inten === "warmup" ? "Riscaldamento" : inten === "cooldown" ? "Defaticamento" : null,
    })];
  }
  return null;
}

/* ------------------------------------------------------- la notazione -- */
/*
   DUE MODI DI SCRIVERE LA STESSA SEDUTA. Il piano scritto a mano usa gli
   apici — «15' risc», «rec 2'30"» — e quello che arriva dalla chat di
   allenamento usa le parole: «15 min risc», «rec 2 min 30s», «5x1000 m».
   Il lettore conosceva solo il primo, e il secondo non lo rifiutava: lo
   SBAGLIAVA. «rec 2 min» diventava un recupero di 2 SECONDI — un numero
   nudo e' in secondi — cioe' un orologio che fa ripartire la ripetuta
   prima che tu abbia ripreso fiato. Si riscrive tutto nella prima forma,
   prima di leggere.
*/
export function normalizza(testo) {
  return String(testo || "")
    .replace(/(\d+)\s*min\s*(\d+)\s*s\b/gi, `$1'$2"`)     // 2 min 30s
    .replace(/(\d+)\s*min\b/gi, "$1'")                      // 15 min · 15-20 min
    .replace(/(\d+)\s*s\b/g, '$1"');                         // 90s · da 20s
}

/* LE ETICHETTE NON SONO PASSI. «Lun 02/11», «RITMO GARA», «TEST 5000 m»
   (il 5 km vero e' scritto dopo, col suo ritmo), «solo se la lunga della
   sett 2 è stata 7.5 km»: servono a chi legge. Da leggere come passi
   sarebbero un cronometro aperto, o — peggio — una corsa da 7,5 km in fondo
   a una lunga da 8,2. */
const ETICHETTA = /^((Lun|Mar|Mer|Gio|Ven|Sab|Dom)\w*\.?\s+\d{1,2}\/\d{1,2}|RITMO GARA|TEST\b(?!.*@)|solo se\b|SALTATA\b|FATTO\b)/i;

/**
 * Il testo intero di uno slot di corsa → i passi.
 *
 * @returns {{ passi: Array, completo: boolean, assunzioni: boolean }}
 */
export function leggiAllenamento(testo) {
  const pulito = String(testo || "").trim();
  if (!pulito) return { passi: [], completo: false, assunzioni: false };

  /* I segmenti si separano con «+» E con il punto mediano. Prima solo col
     «+», e «12' risc · 3×7' @ 4:55/km rec 2' · 8' defat» era UN segmento: il
     lettore prendeva la prima cosa che riconosceva e perdeva il resto —
     riscaldamento e defaticamento spariti dall'orologio. L'eccezione e' il
     recupero detto a parole: «6×30" allunghi · cammino 90"» e' una cosa
     sola, e il pezzo che comincia con «cammino» torna attaccato a quello
     prima. */
  const test = /\bTEST\b/.test(pulito);
  const pezzi = [];
  for (const p of normalizza(pulito).split(/\s+\+\s+|\s*·\s*/)) {
    if (/^(cammin|recup|rec\b)/i.test(p) && pezzi.length) pezzi[pezzi.length - 1] += ` · ${p}`;
    else if (p.trim()) pezzi.push(p.trim());
  }
  const passi = [];
  let completo = true, assunzioni = false;

  for (const p of pezzi) {
    if (ETICHETTA.test(p)) continue;
    const letti = leggiSegmento(p, { test });
    if (!letti) { completo = false; continue; }
    for (const x of letti) { if (x.assunto) assunzioni = true; passi.push(x); }
  }

  if (!passi.length) {
    // Niente di riconosciuto: UN passo aperto col testo originale. L'orologio
    // fa partire il cronometro e il dettaglio resta sul telefono, che è molto
    // meglio di un allenamento inventato.
    return {
      passi: [{ tipo: "aperto", intensita: "active", nome: accorcia(pulito) }],
      completo: false, assunzioni: false,
    };
  }
  return { passi, completo, assunzioni };
}

/** I nomi dei passi in FIT stanno in poco spazio: meglio corti che tagliati. */
export const accorcia = (s, max = 30) =>
  String(s).length <= max ? String(s) : `${String(s).slice(0, max - 1).trimEnd()}…`;

/** Quanti passi «veri» produce, contando le ripetizioni. Serve solo a dirlo. */
export function contaPassi(passi) {
  let n = 0;
  for (const p of passi) n += p.tipo === "ripeti" ? p.passi.length * p.volte : 1;
  return n;
}

/** Una riga leggibile per ogni passo, per mostrare cosa finirà nell'orologio. */
export function descrivi(passi) {
  const uno = (p) => {
    const q = p.passoSec ? ` @ ${Math.floor(p.passoSec / 60)}:${String(p.passoSec % 60).padStart(2, "0")}/km` : "";
    if (p.tipo === "tempo") return `${etichetta(p)}${minuti(p.secondi)}${q}`;
    if (p.tipo === "distanza") return `${etichetta(p)}${p.metri >= 1000 ? `${p.metri / 1000} km` : `${p.metri} m`}${q}`;
    return `${etichetta(p)}libero`;
  };
  return passi.map((p) => p.tipo === "ripeti"
    ? `${p.volte}× — ${p.passi.map(uno).join(" · ")}`
    : uno(p));
}

const etichetta = (p) =>
  p.intensita === "warmup" ? "Riscaldamento · "
  : p.intensita === "cooldown" ? "Defaticamento · "
  : p.intensita === "recovery" ? "Recupero · " : "";

const minuti = (s) => (s % 60 === 0 ? `${s / 60}'` : `${s}"`);
