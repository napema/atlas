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
function leggiSegmento(pezzo) {
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

  // 2×8' Z3 (5:40/km) rec 3'   ·   6×30" allunghi
  m = /(\d+)\s*[x×]\s*(\d+\s*['"])\s*(?:Z\d)?\s*(?:\(([\d:]+)\s*\/?\s*km\))?(?:.*?rec\s*([\d'"]+))?/i.exec(t);
  if (m) {
    const volte = Number(m[1]);
    const sec = durataSec(m[2]);
    const ritmo = m[3] ? passoSec(m[3]) : null;
    // «allunghi · cammino 90"»: il recupero non si chiama sempre «rec».
    const recTesto = m[4] || (/cammin|recup/i.test(t) ? (/(\d+\s*['"])/g.exec(t.split(/cammin|recup/i)[1] || "") || [])[1] : null);
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
  m = /^(\d+)\s+allungh/i.exec(t);
  if (m) {
    return [{ tipo: "ripeti", volte: Number(m[1]), assunto: true, passi: [
      tempo(30, { intensita: "interval", nome: "Allungo" }),
      tempo(60, { intensita: "recovery", nome: "Piano" }),
    ] }];
  }

  // 6 km @ 7:00/km Z2   ·   TEST 5 KM
  m = /(\d+(?:[.,]\d+)?)\s*km(?:\s*(?:SCARICO)?\s*@\s*([\d:]+))?/i.exec(t);
  if (m) {
    const metri = Math.round(Number(m[1].replace(",", ".")) * 1000);
    const ritmo = m[2] ? passoSec(m[2]) : (/sub-?20/i.test(t) ? 240 : null);
    return [distanza(metri, { passoSec: ritmo, nome: /test/i.test(t) ? "Test 5 km" : null })];
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

/**
 * Il testo intero di uno slot di corsa → i passi.
 *
 * @returns {{ passi: Array, completo: boolean, assunzioni: boolean }}
 */
export function leggiAllenamento(testo) {
  const pulito = String(testo || "").trim();
  if (!pulito) return { passi: [], completo: false, assunzioni: false };

  // I segmenti si separano con «+». Il punto mediano invece appartiene al
  // segmento — «6×30" allunghi · cammino 90"» è una cosa sola, e spezzarla lì
  // perderebbe il recupero.
  const pezzi = pulito.split(/\s+\+\s+/);
  const passi = [];
  let completo = true, assunzioni = false;

  for (const p of pezzi) {
    const letti = leggiSegmento(p);
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
