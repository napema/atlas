// moduli/allenamenti/prova.js — il cambio di allenamento, fuori dal browser.
//
//     deno run --location http://localhost/ --allow-read moduli/allenamenti/prova.js
//
// Controlla la cosa che conta di piu' e che si vede di meno: che cambiare
// una seduta sposti davvero i NUMERI — i km previsti, i km fatti,
// l'andamento, il tetto della lunga, la proiezione sui 5 km — e non solo
// l'etichetta sulla riga. Un cambio che resta un'etichetta e' peggio di
// nessun cambio: la settimana sembra a posto e i conti mentono.
//
// Gli import sono DINAMICI: `core/ui.js` — la versione della app di prima,
// quella che il plugin «nucleo unico» sostituisce in fase di build —
// registra un ascoltatore sul `document` appena viene valutata, e fuori dal
// browser quel `document` non c'e'. Gli import statici si risolvono tutti
// prima della prima riga di codice: l'unico modo di mettere il tappo prima
// e' importare dopo.
globalThis.window ??= globalThis;
globalThis.document ??= {
  addEventListener() {}, removeEventListener() {},
  createElement: () => ({ style: {}, classList: { add() {}, remove() {} },
    appendChild() {}, setAttribute() {}, addEventListener() {} }),
  body: { appendChild() {} },
};

const {
  casella, slotDi, cambiaSlot, ripristinaSlot, alternaSlot, scegliGiorno,
  salvaCorse, corseVive, recordSlot, durataDi, idSlot, INIZIO,
} = await import("./dati.js");
const {
  kmPrevisti, kmFatti, andamento, tettoLunga, proiezione, equivalente5k,
  progressoSettimana, gambeIl, mmss,
} = await import("./calcolo.js");

let rotti = 0;
function eq(nome, visto, atteso) {
  const ok = String(visto) === String(atteso);
  if (!ok) rotti++;
  console.log(`${ok ? "ok  " : "NO  "} ${nome.padEnd(44)} ${String(visto).padStart(16)}   atteso ${atteso}`);
}

/* Un archivio vuoto: niente spunte, niente corse, il piano e basta. */
casella.scrivi({ v: 1, slot: [], corse: [], settimane: [], bonus: [], config: { inizio: INIZIO }, configUp: 0 });

const FACILE = idSlot(1, "facile");
const LOWER = idSlot(1, "lower");
const SABATO = "2026-10-10";

console.log("\n--- il piano, prima di toccare niente ---");
eq("km previsti settimana 1", kmPrevisti(1), 27.6);
eq("corse previste", progressoSettimana(1).corseTotali, 4);
eq("palestre previste", progressoSettimana(1).palestraTotali, 2);
eq("km fatti", kmFatti(1), 0);
eq("tetto della lunga", tettoLunga(), null);

console.log("\n--- ho fatto la lunga col gruppo invece della facile ---");
scegliGiorno(FACILE, SABATO);
cambiaSlot(FACILE, {
  nome: "Lunga col gruppo", testo: "10 km con il gruppo, ritmo loro",
  genere: "corsa", km: 10, secondi: 52 * 60 + 30, data: SABATO,
});
const facile = slotDi(1).find((s) => s.id === FACILE);
eq("il nome cambia", facile.nome, "Lunga col gruppo");
eq("l'id NON cambia", facile.id, FACILE);
eq("i km dello slot", facile.km, 10);
eq("e' marcato come cambiato a mano", facile.aMano, true);

eq("km previsti, aggiornati", kmPrevisti(1), 32.8);
eq("km fatti, dalla corsa a mano", kmFatti(1), 10);
eq("la corsa esiste ed e' marcata", corseVive().filter((c) => c.manuale).length, 1);
eq("ed e' legata allo slot", corseVive()[0].slot, FACILE);
eq("tetto della lunga, adesso", tettoLunga(), 11);

const p = proiezione("2026-10-11");
eq("la proiezione esiste", Boolean(p), true);
/* 25:11 e non 24:52: Riegel su 10 km in 52:30 da' 3150 x 2^-1,06 = 1510,7
   secondi. Il numero atteso l'avevo sbagliato io, il codice no. */
eq("equivalente 5 km", mmss(equivalente5k(corseVive()[0])), "25:11");

const a1 = andamento(1)[0];
eq("andamento · previsti", a1.previsti, 32.8);
eq("andamento · fatti", a1.fatti, 10);

console.log("\n--- la durata segue il tempo della corsa ---");
eq("durata dello slot, in minuti", durataDi(facile), 53);

console.log("\n--- poi l'orologio dice 10,14 km ---");
salvaCorse([{ data: SABATO, km: 10.14, secondi: 52 * 60 + 11, fc: 158 }]);
eq("una corsa sola, non due", corseVive().length, 1);
eq("e sono i km dell'orologio", kmFatti(1), 10.14);
eq("il legame con lo slot resta", corseVive()[0].slot, FACILE);
eq("e non e' piu' una stima", Boolean(corseVive()[0].manuale), false);

console.log("\n--- la palestra era piena, sono andato a nuoto ---");
scegliGiorno(LOWER, "2026-10-09");
cambiaSlot(LOWER, { nome: "Nuoto", testo: "45' vasca, stile libero", genere: "altro", durata: 45 });
alternaSlot(LOWER);
const pr = progressoSettimana(1);
eq("le palestre previste scendono", pr.palestraTotali, 1);
eq("lo slot resta nel totale", pr.totali, 6);
eq("durata", durataDi(slotDi(1).find((s) => s.id === LOWER)), 45);
/* LA REGOLA DELLE GAMBE deve guardare quello che hai fatto, non l'id:
   l'id e' ancora `s01-lower`, ma giovedi' sei stato in piscina. */
eq("«gambe ieri» sul nuoto", gambeIl("2026-10-09"), false);

console.log("\n--- e se invece fosse stata una Upper B? ---");
cambiaSlot(LOWER, { nome: "Upper B", testo: "Panca stretta 4×8 · Trazioni 4×6", genere: "palestra" });
eq("torna a contare come palestra", progressoSettimana(1).palestraTotali, 2);
eq("«gambe ieri» sulla upper", gambeIl("2026-10-09"), false);
cambiaSlot(LOWER, { nome: "Lower in trasferta", testo: "Squat 4×4 · RDL 3×6", genere: "palestra" });
eq("«gambe ieri» su uno squat", gambeIl("2026-10-09"), true);

console.log("\n--- rimetto il piano ---");
ripristinaSlot(FACILE);
const tornato = slotDi(1).find((s) => s.id === FACILE);
eq("il nome torna quello del piano", tornato.nome, "Facile");
eq("e i km anche", tornato.km, 4.8);
eq("km previsti, com'erano", kmPrevisti(1), 27.6);
eq("il giorno scelto resta", recordSlot(FACILE).giorno, SABATO);
/* La corsa dell'OROLOGIO resta: ripristinare lo slot vuol dire «il piano
   diceva un'altra cosa», non «quella corsa non l'ho fatta». */
eq("la corsa misurata resta", kmFatti(1), 10.14);

console.log(rotti ? `\n${rotti} numeri non tornano.\n` : "\nTutto torna.\n");
if (rotti) Deno.exit(1);
