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
  sedutaDelGiorno,
} = await import("./dati.js");
const {
  kmPrevisti, kmFatti, andamento, tettoLunga, proiezione, equivalente5k,
  progressoSettimana, gambeIl, mmss, descriviPezzi, distanza,
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

/* =========================================================================
   LE RIPETUTE IN PISTA.

   3 km, 2 km, 1 km a ritmo gara, coi recuperi in mezzo. L'orologio le
   registra come TRE attivita' separate, quindi nell'elenco diventano tre
   corse: sono tre PEZZI di un allenamento solo, e trattarle come tre sedute
   sbaglia due numeri — il tetto della lunga vede 3 km invece di 6, e la
   proiezione, guardando la media coi recuperi dentro, direbbe che sei molto
   piu' lento di quello che sei.
   ========================================================================= */

console.log("\n--- ripetute in pista, scritte a mano ---");
casella.scrivi({ v: 1, slot: [], corse: [], settimane: [], bonus: [], config: { inizio: INIZIO }, configUp: 0 });
const INTERVALLI = idSlot(1, "intervalli");
const GIOVEDI = "2026-10-08";
scegliGiorno(INTERVALLI, GIOVEDI);
cambiaSlot(INTERVALLI, {
  nome: "Ripetute in pista", genere: "corsa", data: GIOVEDI,
  giri: [
    { km: 3, secondi: 12 * 60 + 6 },
    { km: 2, secondi: 7 * 60 + 58 },
    { km: 1, secondi: 3 * 60 + 52 },
  ],
});
const rip = slotDi(1).find((x) => x.id === INTERVALLI);
eq("i pezzi restano tre", rip.giri.length, 3);
eq("i km si sommano", rip.km, 6);
eq("una corsa sola per quel giorno", corseVive().length, 1);
eq("e porta i pezzi dentro", corseVive()[0].giri.length, 3);
eq("km della settimana", kmFatti(1), 6);
eq("tetto della lunga sul totale", tettoLunga(GIOVEDI), 6.6);

/* LA PROIEZIONE GUARDA IL PEZZO, non la media coi recuperi dentro. */
const pr2 = proiezione("2026-10-09");
eq("il miglior candidato e' un pezzo", pr2.da.pezzo, true);
eq("ed e' il 3 km", pr2.da.km, 3);

console.log("\n--- il testo dei pezzi ---");
eq("come si legge", descriviPezzi(rip.giri),
  "3 km in 12:06 (4:02/km) · 2 km in 7:58 (3:59/km) · 1 km in 3:52 (3:52/km)");
eq("metri sotto il chilometro", distanza(0.8), "800 m");

/* =========================================================================
   LE TRE CORSE CHE CI SONO GIA'.

   Il caso vero: hai importato da Garmin e ti ritrovi tre corse di oggi.
   «Prendi le corse di oggi» le fonde in una e le attacca allo slot, e i
   chilometri NON si contano due volte.
   ========================================================================= */

console.log("\n--- tre corse importate, poi unite allo slot ---");
casella.scrivi({ v: 1, slot: [], corse: [], settimane: [], bonus: [], config: { inizio: INIZIO }, configUp: 0 });
salvaCorse([
  { data: GIOVEDI, km: 3, secondi: 12 * 60 + 6, titolo: "Corsa" },
  { data: GIOVEDI, km: 2, secondi: 7 * 60 + 58, titolo: "Corsa" },
  { data: GIOVEDI, km: 1, secondi: 3 * 60 + 52, titolo: "Corsa" },
]);
eq("tre corse in archivio", corseVive().length, 3);
eq("km della settimana", kmFatti(1), 6);
eq("ma il tetto vede solo la piu' lunga", tettoLunga(GIOVEDI), 3.3);

const vista = sedutaDelGiorno(GIOVEDI);
eq("la seduta del giorno le raccoglie", vista.quante, 3);
eq("e fa sei chilometri", vista.km, 6);

scegliGiorno(INTERVALLI, GIOVEDI);
cambiaSlot(INTERVALLI, {
  nome: "Ripetute in pista", genere: "corsa", data: GIOVEDI,
  giri: vista.pezzi, unisci: true,
});
eq("adesso e' una corsa sola", corseVive().length, 1);
eq("coi tre pezzi dentro", corseVive()[0].giri.length, 3);
eq("legata allo slot", corseVive()[0].slot, INTERVALLI);
eq("i km NON sono raddoppiati", kmFatti(1), 6);
eq("e il tetto vede la seduta intera", tettoLunga(GIOVEDI), 6.6);
eq("lo slot dice sei", slotDi(1).find((x) => x.id === INTERVALLI).km, 6);

console.log(rotti ? `\n${rotti} numeri non tornano.\n` : "\nTutto torna.\n");
if (rotti) Deno.exit(1);
