// moduli/finanze/prova.js — la verifica dei numeri di v3, fuori dal browser.
//
// Non c'è Node su questa macchina e la build gira solo in CI, quindi la
// catena «scrivo, pubblico, guardo» costa dieci minuti per ogni numero da
// controllare. Questo file la accorcia: Deno sa importare i moduli condivisi
// così come sono — `core/storage.js` compreso, con `--location` che gli dà
// un `localStorage` vero — e i conti si possono leggere subito.
//
//     deno run --location http://localhost/ --allow-read moduli/finanze/prova.js
//
// I valori attesi non sono inventati: sono quelli del documento di v3, §11,
// cioè quello che si deve leggere in home la mattina dell'8 ottobre. Se
// cambia una formula e questi numeri non tornano più, è qui che si vede.

/* GLI IMPORT SONO DINAMICI, e non per gusto: `core/ui.js` — la versione
   della app di prima, quella che il plugin «nucleo unico» sostituisce in
   fase di build — registra un ascoltatore sul `document` appena viene
   valutata. Fuori dal browser quel `document` non c'e', e gli import
   statici si risolvono tutti prima della prima riga di codice: l'unico
   modo di mettere il tappo prima e' importare dopo. */
globalThis.window ??= globalThis;
globalThis.document ??= {
  addEventListener() {}, removeEventListener() {},
  createElement: () => ({ style: {}, classList: { add() {}, remove() {} },
    appendChild() {}, setAttribute() {}, addEventListener() {} }),
  body: { appendChild() {} },
};

const { casella, allineaV3, BLOCCO_V3, pocketIniziali, stato } = await import("./dati.js");
const { cicloDi, dataStipendio, saldoPocket, prossimoStipendio } = await import("./calcolo.js");
const {
  quotaDi, copreFino, statoObiettivo, fuoriPianoDelCiclo, ingPrevisto,
  quotaDiPiano, budgetVita, effettoVoce,
} = await import("./piano.js");
const { travasiPaga, fabbisognoFisse } = await import("./paga.js");
const { pagella, report, settimanaDi } = await import("./chiusura.js");
const { leggiEstratto, riconcilia } = await import("./revolut.js");
const { euro } = await import("../../core/ui.js");

const OGGI = "2026-10-08";

let rotti = 0;
function eq(nome, visto, atteso) {
  const ok = String(visto) === String(atteso);
  if (!ok) rotti++;
  console.log(`${ok ? "ok  " : "NO  "} ${nome.padEnd(46)} ${String(visto).padStart(14)}   atteso ${atteso}`);
}

/* Lo stato di partenza: l'archivio PRIMA dell'allineamento, com'era sul
   telefono il 7 ottobre. I saldi sbagliati sono quelli veri del documento
   (103,15 / 180,09 / 815,66): se la migrazione non li riancora, i numeri
   sotto non tornano, ed è esattamente il guasto da cui nasce v3. */
casella.scrivi({
  v: 7,
  movs: [
    { id: "m1", data: "2026-09-29", tipo: "out", imp: 3128, nota: "Patente Droni", cat: "svago", sub: "Shopping", pocket: "principale", up: 1, ts: 1 },
    { id: "m2", data: "2026-10-01", tipo: "out", imp: 1861, nota: "1/3 Rata ALIEXPRESS", cat: "fisse", sub: null, pocket: "principale", up: 1, ts: 1 },
    { id: "m3", data: "2026-10-02", tipo: "out", imp: 351, nota: "Circolo bar", cat: "cibo", sub: "Bar e colazioni", pocket: "principale", up: 1, ts: 1 },
    { id: "m4", data: "2026-10-06", tipo: "out", imp: 10590, nota: "Monitor PC", cat: "svago", sub: "Tech", pocket: "ing", up: 1, ts: 1 },
  ],
  pockets: pocketIniziali().map((p) => ({
    ...p, up: 1,
    saldo: { principale: 10315, cassa: 18009, ing: 81566 }[p.id] ?? 0,
    ancoraDa: "2026-09-23",
  })),
  config: {},
  soglie: {},
  rules: {},
  lista: [],
  previsti: [],
  ricorrenti: [],
  metaUp: 0,
  profiliUp: 0,
});

console.log("\n--- la migrazione ---");
eq("allineaV3 gira", allineaV3(), true);
eq("allineaV3 non rigira", allineaV3(), false);
eq("marchio", stato().config.bloccoV3, BLOCCO_V3);

console.log("\n--- il ciclo ---");
eq("23 ottobre 2026", dataStipendio(2026, 9), "2026-10-23");
eq("23 gennaio 2027 e' sabato → venerdi", dataStipendio(2027, 0), "2027-01-22");
const ciclo = cicloDi(OGGI);
eq("ciclo da", ciclo.da, "2026-09-23");
eq("ciclo a", ciclo.a, "2026-10-22");
eq("giorni del ciclo", ciclo.giorni, 30);
eq("prossimo stipendio", prossimoStipendio(OGGI), "2026-10-23");

console.log("\n--- i saldi riancorati ---");
eq("Principale", euro(saldoPocket("principale")), "57,10 €");
eq("Cassa", euro(saldoPocket("cassa")), "120,20 €");
eq("Spese fisse", euro(saldoPocket("fisse")), "3,02 €");
eq("Fondo", euro(saldoPocket("fondo")), "0,00 €");
eq("ING", euro(saldoPocket("ing")), "709,76 €");

console.log("\n--- OGGI ---");
const q = quotaDi(OGGI);
eq("budget Vita", euro(budgetVita()), "535,00 €");
eq("spendibile", euro(q.spendibile), "177,30 €");
eq("giorni", q.giorni, 15);
eq("fine", q.fine, "2026-10-22");
eq("quota di oggi", euro(q.quota), "11,82 €");
eq("quota di piano", euro(quotaDiPiano(OGGI)), "17,83 €");
eq("copre fino a", copreFino(OGGI, q.quota), "2026-10-11");

console.log("\n--- FUORI PIANO ---");
const fp = fuoriPianoDelCiclo(ciclo, OGGI);
eq("quante", fp.n, 4);
eq("totale", euro(fp.totale), "240,54 €");
eq("% del versamento", Math.round(fp.pct * 100), 154);
eq("ricariche ING non pianificate", fp.ricariche.n, 1);
eq("totale ricariche", euro(fp.ricariche.totale), "105,90 €");
eq("il monitor e' segnato «da ING»", fp.voci.find((m) => /monitor/i.test(m.nota))?.daRiserva, true);

console.log("\n--- L'OBIETTIVO ---");
const o = statoObiettivo(OGGI);
eq("saldo", euro(o.saldo), "0,00 €");
eq("target", euro(o.target), "3500,00 €");
eq("previsto a oggi", euro(o.previsto), "0,00 €");
eq("in linea", o.inLinea, true);
eq("versamenti rimasti", o.versamenti, 10);
eq("proiezione", euro(o.proiezione), "2860,00 €");
eq("gap", euro(o.gap), "640,00 €");
eq("giorni alla data", o.giorni, 297);
eq("prossimo versamento", o.prossimo, "2026-10-23");

console.log("\n--- ING ---");
const ing = ingPrevisto(OGGI);
eq("minimo previsto", euro(ing.minimo), "215,76 €");
eq("quando", ing.quando, "2027-02-15");
eq("sotto la soglia", ing.sotto, true);

console.log("\n--- IL GIORNO DI PAGA (23 ottobre, eccezione) ---");
const t = travasiPaga("2026-10-23");
const imp = Object.fromEntries(t.righe.map((r) => [r.id, r.imp]));
eq("al fondo", euro(imp.fondo), "156,00 €");
eq("alle fisse", euro(imp.fisse), "1329,00 €");
eq("su ING", euro(imp.ing), "21,00 €");
/* 483,23 e non i 481,50 del documento: il ciclo del 23 ottobre e' di 31
   giorni (23 ott → 22 nov), non di 30, quindi la quota di piano e' 17,26 e
   la prima settimana ne vale 51,77. La formula e' quella del documento,
   il calendario e' quello vero. */
eq("vita → cassa (meno la prima settimana)", euro(imp.vita), "483,23 €");
// A regime, il 23 novembre: il calcolo deve riprodurre la tabella.
const f = fabbisognoFisse("2026-11-23");
eq("fabbisogno fisse a regime (23 nov)", euro(f.scadenze + f.quote), "1234,97 €");

console.log("\n--- LA LISTA D'ATTESA ---");
const e = effettoVoce(12475, OGGI);
eq("quota da", euro(e.settimana.da), "11,82 €");
eq("quota a", euro(e.settimana.a), "3,50 €");
eq("ING minimo da", euro(e.ing.da), "215,76 €");
eq("ING minimo a", euro(e.ing.a), "91,01 €");
eq("gap da", euro(e.fondo.da), "640,00 €");
eq("gap a", euro(e.fondo.a), "764,75 €");

console.log("\n--- LA CHIUSURA ---");
const sett = settimanaDi(OGGI);
eq("settimana da", sett.da, "2026-10-05");
eq("settimana a", sett.a, "2026-10-11");
const p = pagella(OGGI);
eq("budget Vita settimanale", euro(p.vita.budget), "124,83 €");
eq("fuori piano della settimana", p.fuoriPiano.n, 3);
eq("il report ha righe", report(OGGI).split("\n").length > 12, true);

console.log("\n--- L'ESTRATTO REVOLUT ---");
const CSV = [
  "Tipo,Prodotto,Data di inizio,Data di completamento,Descrizione,Importo,Costo,Valuta,State,Saldo",
  "CARD_PAYMENT,Attuale,2026-10-01 09:12:00,2026-10-01 10:00:00,Pagamento con carta Ars Vivendi,-1.40,0.00,EUR,COMPLETED,200.00",
  "TRANSFER,Attuale,2026-10-07 08:00:00,2026-10-07 08:00:00,Da EUR Cassa Settimanale,60.00,0.00,EUR,COMPLETED,260.00",
  "TRANSFER,Deposito,2026-10-07 08:00:00,2026-10-07 08:00:00,A EUR Attuale,-60.00,0.00,EUR,COMPLETED,120.20",
  "TOPUP,Attuale,2026-10-06 19:00:00,2026-10-06 19:00:00,Ricarica di Apple Pay con *8595,105.90,0.00,EUR,COMPLETED,166.50",
  "CARD_PAYMENT,Attuale,2026-10-06 19:05:00,,Pagamento con carta Monitor PC,-105.90,0.00,EUR,In sospeso,",
  "CARD_PAYMENT,Attuale,2026-10-02 11:00:00,,Pagamento con carta Circolo bar,-3.50,0.00,EUR,In sospeso,",
  "INTEREST,Deposito,2026-10-07 23:59:00,2026-10-07 23:59:00,Interessi,0.11,0.00,EUR,COMPLETED,120.20",
  "CARD_PAYMENT,Attuale,2026-10-04 12:00:00,2026-10-04 12:00:00,Pagamento con carta Roba,-9.99,0.00,EUR,OPERAZIONE ANNULLATA,166.50",
].join("\n");
const est = leggiEstratto(CSV);
eq("righe lette", est.righe.length, 6);
eq("il giro e' uno solo", est.righe.filter((r) => r.tipo === "giro").length, 1);
eq("il giro va Cassa → Principale", est.righe.find((r) => r.tipo === "giro")?.pocket, "cassa");
eq("la ricarica e' un extra da ING", est.righe.find((r) => r.tipo === "extra")?.pocket, "ing");
eq("gli interessi sono marcati", est.righe.find((r) => r.interessi)?.imp, 11);
eq("l'annullata e' scartata", est.scartate, 1);
eq("saldo completato Attuale", euro(est.saldi.principale), "166,50 €");
eq("disponibile Attuale (meno il sospeso)", euro(est.disponibili.principale), "57,10 €");
const ric = riconcilia(est);
eq("nessuna differenza sui movimenti noti", ric.nuovi.length, 0);
eq("nessuna correzione", ric.correzioni.length, 0);

console.log(rotti ? `\n${rotti} numeri non tornano.\n` : "\nTutto torna.\n");
if (rotti) Deno.exit(1);
