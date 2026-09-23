/*
  muscoli.js — che cosa allena un esercizio, e quanto.

  Il piano scrive gli esercizi come li scrive una persona su un foglio:
  «Hack squat 4×8», «Trazioni 8×50%max», «Curl+Pushdown». Sono stringhe, e
  vanno bene così: cambiarle in oggetti vorrebbe dire riscrivere il piano e
  perdere la forma che lo rende leggibile a occhio nudo.

  Qui si legge quella stringa e se ne tirano fuori tre cose: il NOME, le
  SERIE e i MUSCOLI. Nessun DOM: è logica condivisa, la disegna la vista.

  La mappa è per parole chiave e non per nomi esatti di proposito. Gli
  esercizi cambiano nome ogni volta che cambia palestra — «lat machine»,
  «lat pulldown», «trazioni alla macchina» sono la stessa cosa — e una
  tabella di nomi esatti sarebbe sbagliata il giorno dopo. Una parola
  chiave sbagliata dà un muscolo in meno, non un errore.
*/

/** I gruppi, con il nome che si legge e su quale faccia del corpo stanno. */
export const GRUPPI = {
  petto:         { nome: "Petto",          faccia: "fronte" },
  spalle:        { nome: "Spalle",         faccia: "fronte" },
  bicipiti:      { nome: "Bicipiti",       faccia: "fronte" },
  avambracci:    { nome: "Avambracci",     faccia: "fronte" },
  addome:        { nome: "Addome",         faccia: "fronte" },
  obliqui:       { nome: "Obliqui",        faccia: "fronte" },
  quadricipiti:  { nome: "Quadricipiti",   faccia: "fronte" },
  adduttori:     { nome: "Adduttori",      faccia: "fronte" },
  tibiali:       { nome: "Tibiali",        faccia: "fronte" },
  trapezio:      { nome: "Trapezio",       faccia: "retro" },
  dorsali:       { nome: "Dorsali",        faccia: "retro" },
  deltoidiPost:  { nome: "Deltoidi post.", faccia: "retro" },
  tricipiti:     { nome: "Tricipiti",      faccia: "retro" },
  lombari:       { nome: "Lombari",        faccia: "retro" },
  glutei:        { nome: "Glutei",         faccia: "retro" },
  femorali:      { nome: "Femorali",       faccia: "retro" },
  polpacci:      { nome: "Polpacci",       faccia: "retro" },
};

/* Parola chiave → [primari, secondari]. L'ordine conta: vince la prima
   regola che trova, quindi le più specifiche stanno sopra. «panca
   inclinata» prima di «panca», o una panca inclinata diventerebbe piana. */
const MAPPA = [
  [/stacc|deadlift/i,            ["femorali", "glutei", "lombari"], ["dorsali", "trapezio", "avambracci"]],
  [/rdl|rumen|romanian/i,        ["femorali", "glutei"], ["lombari"]],
  [/hack ?squat|pressa|leg ?press/i, ["quadricipiti", "glutei"], ["adduttori"]],
  [/squat/i,                     ["quadricipiti", "glutei"], ["adduttori", "lombari", "addome"]],
  [/affond|lunge|bulgar/i,       ["quadricipiti", "glutei"], ["adduttori"]],
  [/leg ?curl|femoral/i,         ["femorali"], []],
  [/leg ?exten|quadricip/i,      ["quadricipiti"], []],
  [/polpacc|calf/i,              ["polpacci"], []],
  [/tibial/i,                    ["tibiali"], []],
  [/panca ?incl|incline/i,       ["petto", "spalle"], ["tricipiti"]],
  [/panca|bench|croci|chest/i,   ["petto"], ["tricipiti", "spalle"]],
  [/dip/i,                       ["petto", "tricipiti"], ["spalle"]],
  [/push ?down|french|estensioni tricip|tricip/i, ["tricipiti"], []],
  [/trazion|pull ?up|chin ?up/i, ["dorsali", "bicipiti"], ["avambracci", "trapezio"]],
  [/lat ?machine|lat ?pull|pulldown/i, ["dorsali"], ["bicipiti"]],
  [/rematore|row|pulley/i,       ["dorsali", "trapezio"], ["bicipiti", "deltoidiPost"]],
  [/military|shoulder ?press|lento|arnold/i, ["spalle"], ["tricipiti"]],
  [/alzate lateral|lateral raise|alzate/i, ["spalle"], []],
  [/face ?pull|posterior|rear delt/i, ["deltoidiPost"], ["trapezio"]],
  [/shrug|scrollate/i,           ["trapezio"], []],
  [/curl/i,                      ["bicipiti"], ["avambracci"]],
  [/presa|grip|avambracc/i,      ["avambracci"], []],
  [/leg ?raise|crunch|plank|addom|hollow/i, ["addome"], ["obliqui"]],
  [/russian|obliqu|side bend/i,  ["obliqui"], ["addome"]],
  [/iperestension|good ?morning|lombar|back ?ext/i, ["lombari"], ["glutei", "femorali"]],
  [/hip ?thrust|ponte|glute/i,   ["glutei"], ["femorali"]],
];

/**
 * Legge una riga del piano.
 *
 * «Hack squat 4×8» → nome «Hack squat», 4 serie da 8.
 * «Stacco 5×3 @ 100 kg» → il carico resta a parte, non nel nome.
 * «Curl+Pushdown» → nessuna serie dichiarata, e due esercizi: i muscoli si
 * sommano, perché è una superserie e li allena entrambi.
 */
export function leggiRiga(riga) {
  const testo = String(riga || "").trim();
  if (!testo) return null;

  // Il carico: tutto quello che sta dopo la chiocciola.
  const chiocciola = testo.split("@");
  const corpo = chiocciola[0].trim();
  const carico = chiocciola.length > 1 ? chiocciola.slice(1).join("@").trim() : "";

  // Le serie: «4×8», «4x8», «8×50%max». Le ripetizioni restano testo —
  // «50%max» non è un numero, e forzarlo a uno sarebbe una bugia.
  const m = corpo.match(/(\d+)\s*[×x]\s*([^\s]+)/i);
  const nome = (m ? corpo.slice(0, m.index) : corpo).trim().replace(/[·,;]+$/, "");

  return {
    testo,
    nome: nome || corpo,
    serie: m ? Number(m[1]) : 0,
    ripetizioni: m ? m[2] : "",
    carico,
    ...muscoliDi(nome || corpo),
  };
}

/** I muscoli di un nome di esercizio: `{ primari, secondari }`. */
export function muscoliDi(nome) {
  const primari = [], secondari = [];
  // Una superserie («Curl+Pushdown») è più esercizi in una riga sola.
  for (const pezzo of String(nome).split(/[+/]/)) {
    for (const [chiave, p, s] of MAPPA) {
      if (!chiave.test(pezzo)) continue;
      for (const g of p) if (!primari.includes(g)) primari.push(g);
      for (const g of s) if (!secondari.includes(g)) secondari.push(g);
      break;
    }
  }
  return { primari, secondari: secondari.filter((g) => !primari.includes(g)) };
}

/**
 * Il volume di una seduta, gruppo per gruppo: quante serie arrivano su
 * ciascun muscolo. Le secondarie contano mezza — un rematore allena i
 * bicipiti, ma non come un curl, e dare loro lo stesso peso farebbe
 * sembrare la schiena un giorno di braccia.
 */
export function volumeSeduta(righe) {
  const conto = {};
  for (const riga of righe) {
    const r = leggiRiga(riga);
    if (!r) continue;
    const serie = r.serie || 1;
    for (const g of r.primari) conto[g] = (conto[g] || 0) + serie;
    for (const g of r.secondari) conto[g] = (conto[g] || 0) + serie / 2;
  }
  return conto;
}

/** I gruppi di una seduta ordinati per volume, dal più colpito. */
export function gruppiSeduta(righe) {
  const v = volumeSeduta(righe);
  return Object.entries(v)
    .sort((a, b) => b[1] - a[1])
    .map(([id, serie]) => ({ id, nome: GRUPPI[id]?.nome || id, serie }));
}

/** Le serie totali di una seduta: la cifra che dice «quanto lavoro è». */
export const serieTotali = (righe) =>
  righe.reduce((s, riga) => s + (leggiRiga(riga)?.serie || 0), 0);
