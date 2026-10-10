// moduli/finanze/prova-gruppi.js — i cinque gruppi, fuori dal browser.
//
//     deno run --location http://localhost/ --allow-read moduli/finanze/prova-gruppi.js
//
// I valori attesi sono quelli del documento del 10 ottobre 2026, §5: il
// ciclo 23 set – 22 ott al giorno 18. L'archivio qui sotto non e' l'export
// vero — quello sta sul telefono — ma e' costruito per avere la STESSA
// forma: le stesse sei spese fisse, lo stesso Telepass pagato da ING, le
// stesse quattro decisioni fuori piano, lo stesso quotidiano diviso per
// categoria. Se la regola di assegnazione e' giusta qui, e' giusta li'.
//
// La riprova che la forma e' quella giusta: nella schermata vecchia le
// Fisse senza sottocategoria erano «7 volte · 1.528 €», e 1.159,97 (le sei
// fisse) + 368,05 (il Telepass, che in quella schermata era in categoria
// Fisse) fa esattamente 1.528,02 in sette movimenti.

globalThis.window ??= globalThis;
globalThis.document ??= {
  addEventListener() {}, removeEventListener() {},
  createElement: () => ({ style: {}, classList: { add() {}, remove() {} },
    appendChild() {}, setAttribute() {}, addEventListener() {} }),
  body: { appendChild() {} },
};

const { casella, pocketIniziali, categorieIniziali, profiliIniziali, sistemaGruppi } = await import("./dati.js");
const { cicloDi } = await import("./calcolo.js");
const { budgetVita } = await import("./piano.js");
const {
  ripartizione, fetteDi, ritmoQuotidiano, doveSiPerde, sottoDi,
  controllaCopertura, andamentoQuotidiano, DECISE,
} = await import("./gruppi.js");
const { euro } = await import("../../core/ui.js");

const OGGI = "2026-10-10";

let rotti = 0;
function eq(nome, visto, atteso) {
  const ok = String(visto) === String(atteso);
  if (!ok) rotti++;
  console.log(`${ok ? "ok  " : "NO  "} ${nome.padEnd(44)} ${String(visto).padStart(14)}   atteso ${atteso}`);
}

/* I NUMERI ATTESI SENZA IL PUNTO DELLE MIGLIAIA — «1159,97 €», non
   «1.159,97 €». Non e' una svista: `Intl` in italiano non raggruppa i
   numeri di quattro cifre («useGrouping: min2»), ed e' la forma che usa
   TUTTA la app. Scriverlo diverso qui vorrebbe dire far fallire la prova
   su una cosa che sullo schermo e' giusta. */

/* ---------------------------------------------------------- l'archivio -- */

let n = 0;
const id = () => `p${++n}`;
const movs = [];
const out = (data, imp, nota, cat, sub, extra = {}) =>
  movs.push({ id: id(), data, tipo: "out", imp, nota, cat, sub, pocket: "principale", ecc: false, up: 1, ts: 1, ...extra });

/* --- 1. LE FISSE: 1.159,97 in sei addebiti dalla tasca delle bollette --- */
out("2026-10-01", 85000, "Affitto ottobre", "fisse", "Affitto", { pocket: "fisse" });
out("2026-10-01", 25000, "Rata prestito auto", "fisse", "Prestito", { pocket: "fisse" });
out("2026-09-28", 3399, "Wellhub", "fisse", "Abbonamenti", { pocket: "fisse" });
out("2026-10-02", 1800, "Claude", "fisse", "Abbonamenti", { pocket: "fisse" });
out("2026-10-05", 499, "WindTRE", "fisse", "Telefono", { pocket: "fisse" });
out("2026-10-09", 299, "iCloud+", "fisse", "Abbonamenti", { pocket: "fisse" });

/* --- 2. DA RISERVA: il Telepass, che ING copre -------------------------- */
/* Entra in categoria Fisse e senza sottocategoria, com'era nell'archivio
   vero: e' `sistemaGruppi()` che deve portarlo in Auto › Pedaggio. */
out("2026-09-30", 36805, "Telepass Fee", "fisse", null, { pocket: "ing" });

/* --- 3. PIANIFICATE: 79,41 ---------------------------------------------- */
out("2026-10-03", 6080, "Parcheggio stazione", "auto", "Parcheggio", { pian: "prev-parcheggio" });
/* La rata AliExpress esce dalla tasca delle bollette ma non e' una spesa
   fissa: senza il legame col previsto finirebbe in Fisse, ed e' esattamente
   il buco che `sistemaGruppi()` chiude. */
out("2026-10-01", 1861, "2/3 Rata ALIEXPRESS", "fisse", null, { pocket: "fisse" });

/* --- 4. FUORI PIANO: 240,54 in quattro decisioni ------------------------ */
out("2026-10-06", 3336, "Amazon", "svago", "Shopping", { fuoriPiano: true });
out("2026-10-06", 7000, "Tobia Franceschetti — nuoto", "svago", "Sport e attrezzatura", { fuoriPiano: true });
out("2026-10-06", 10590, "Monitor PC", "svago", "Tech", { fuoriPiano: true });
/* Senza marca e senza sottocategoria: deve bastare la deduzione (sopra
   soglia, niente scadenza, niente lista) a metterlo fra le decisioni. */
out("2026-09-29", 3128, "Patente Droni", "svago", null);

/* --- 5. IL QUOTIDIANO: 426,87 in 31 movimenti --------------------------- */
// svago 60,10 in 3
out("2026-09-25", 2500, "Libreria", "svago", "Shopping");
out("2026-10-02", 1990, "Cinema", "svago", "Uscite e serate");
out("2026-10-08", 1520, "Calzini", "svago", "Abbigliamento");
// spesa 160,35 in 4 — tutta Supermercato, per il blocco «dove si perde»
out("2026-09-24", 4512, "Conad", "spesa", "Supermercato");
out("2026-09-30", 3878, "Lidl", "spesa", "Supermercato");
out("2026-10-05", 4120, "Conad", "spesa", "Supermercato");
out("2026-10-09", 3525, "Esselunga", "spesa", "Supermercato");
// cibo 121,84 in 18: 3 delivery (56,94) + 13 bar (55,90) + 2 pizzeria (9,00)
out("2026-09-26", 2198, "Glovo", "cibo", "Delivery");
out("2026-10-03", 1796, "Deliveroo", "cibo", "Delivery");
out("2026-10-07", 1700, "Just Eat", "cibo", "Delivery");
const BAR = [430, 430, 430, 430, 430, 430, 430, 430, 430, 430, 430, 430, 430];
BAR.forEach((c, i) => out(`2026-10-${String((i % 9) + 1).padStart(2, "0")}`, c, "Bar", "cibo", "Bar e colazioni"));
out("2026-09-27", 450, "Pizza al taglio", "cibo", "Pizzeria");
out("2026-10-04", 450, "Pizza al taglio", "cibo", "Pizzeria");
// cura 54,58 in 4: 3 igiene (39,58) + 1 barbiere (15,00)
out("2026-09-25", 1320, "Acqua Lavanda", "cura", "Igiene e cosmetica");
out("2026-10-01", 1319, "Dentifricio e rasoi", "cura", "Igiene e cosmetica");
out("2026-10-06", 1319, "Crema", "cura", "Igiene e cosmetica");
out("2026-10-08", 1500, "Barbiere", "cura", "Barbiere");
// auto 30,00 in 2
out("2026-09-29", 2000, "Benzina", "auto", "Carburante");
out("2026-10-07", 1000, "Autolavaggio", "auto", "Lavaggio");

/* --- 6. QUELLO CHE NON DEVE ENTRARE IN NESSUN GRUPPO -------------------- */
/* Un'uscita rimborsata per intero: il Check Caldaia. Zero non appartiene a
   nessun gruppo, e metterlo in uno gonfierebbe il conteggio dei movimenti
   senza spostare un euro. */
out("2026-10-02", 8000, "Check Caldaia", "casa", "Altro casa");
const caldaia = movs[movs.length - 1].id;
movs.push({ id: id(), data: "2026-10-04", tipo: "rimb", imp: 8000, nota: "Rimborso caldaia",
  cat: null, sub: null, pocket: "principale", rif: caldaia, up: 1, ts: 1 });
/* La ricarica da ING che ha pagato il monitor: e' un `extra`, non un'uscita.
   Contarla vorrebbe dire contare il monitor due volte. */
movs.push({ id: id(), data: "2026-10-06", tipo: "extra", imp: 10590, nota: "Ricarica Apple Pay *8595",
  cat: null, sub: null, pocket: "ing", pocketTo: "principale", pianificata: false, up: 1, ts: 1 });

casella.scrivi({
  v: 7,
  movs,
  cats: categorieIniziali(),
  profili: profiliIniziali(),
  pockets: pocketIniziali().map((p) => ({ ...p, up: 1, saldo: 0, ancoraDa: "2026-09-23" })),
  config: { giornoStipendio: 23, entrate: 2041 },
  soglie: { fuoriPiano: 3000 },
  rules: {},
  lista: [],
  previsti: [{ id: "prev-parcheggio", nome: "Parcheggio stazione", imp: 6080,
    quando: "2026-10-03", pocket: "principale", cat: "auto", pagatoIl: "2026-10-03", up: 1 }],
  ricorrenti: [],
  up: 1,
});

sistemaGruppi();

/* ------------------------------------------------------------ i conti -- */

const ciclo = cicloDi(OGGI);
console.log(`\nCiclo ${ciclo.da} → ${ciclo.a} (${ciclo.giorni} giorni), oggi ${OGGI}\n`);
eq("il ciclo comincia il", ciclo.da, "2026-09-23");
eq("il ciclo dura", ciclo.giorni, 30);

const r = ripartizione(ciclo);
const g = (x) => euro(r.perId[x].totale);
console.log("");
eq("Fisse", g("fisse"), "1159,97 €");
eq("Da riserva", g("riserva"), "368,05 €");
eq("Pianificate", g("pianificate"), "79,41 €");
eq("Fuori piano", g("fuoriPiano"), "240,54 €");
eq("Quotidiano", g("quotidiano"), "426,87 €");
eq("Totale", euro(r.totale), "2274,84 €");
eq("Decise da te", euro(r.decise), "667,41 €");

console.log("");
eq("fuori piano: quanti acquisti", r.perId.fuoriPiano.n, 4);
eq("quotidiano: quanti movimenti", r.perId.quotidiano.n, 31);
eq("fisse: quanti addebiti", r.perId.fisse.n, 6);
/* La rete di sicurezza: se una regola nuova lascia fuori un'uscita, il
   totale continua a tornare e il buco non si vede. Questo lo vede. */
eq("uscite senza gruppo", controllaCopertura(ciclo).senza.length, 0);
/* Il Check Caldaia e' l'unica uscita che non entra in nessun gruppo, ed e'
   giusto: rimborsata per intero. */
eq("uscite del ciclo in tutto", controllaCopertura(ciclo).tutte, 45);

/* --- il grafico --------------------------------------------------------- */
console.log("");
const f0 = fetteDi(ciclo, { gruppi: DECISE });
eq("donut di partenza", euro(f0.totale), "667,41 €");
const perCat = Object.fromEntries(f0.tutte.map((c) => [c.id, c]));
eq("  Svago e shopping", euro(perCat.svago.totale), "300,64 €");
eq("  Svago: quante volte", perCat.svago.n, 7);
eq("  Svago: di cui fuori piano", perCat.svago.fuoriPiano, 4);
eq("  Spesa alimentare", euro(perCat.spesa.totale), "160,35 €");
eq("  Spesa: quante volte", perCat.spesa.n, 4);
eq("  Cibo fuori", euro(perCat.cibo.totale), "121,84 €");
eq("  Cibo: quante volte", perCat.cibo.n, 18);
eq("  Cibo: budget di riferimento", euro(perCat.cibo.budget, { tondo: true }), "80 €");
eq("  Cura e necessità", euro(perCat.cura.totale), "54,58 €");
eq("  Cura: quante volte", perCat.cura.n, 4);
eq("  Auto", euro(perCat.auto.totale), "30,00 €");
eq("  Auto: quante volte", perCat.auto.n, 2);

const fSenzaFP = fetteDi(ciclo, { gruppi: ["quotidiano"] });
eq("spengo «Fuori piano»", euro(fSenzaFP.totale), "426,87 €");
const fSenzaCibo = fetteDi(ciclo, { gruppi: DECISE, catSpente: ["cibo"] });
eq("spengo «Cibo fuori»", euro(fSenzaCibo.totale), "545,57 €");
const fConFisse = fetteDi(ciclo, { gruppi: [...DECISE, "fisse"] });
eq("accendo «Fisse»", euro(fConFisse.totale), "1827,38 €");
/* Col Telepass acceso, Auto diventa pedaggio + benzina + lavaggio: e' la
   prova che il gruppo filtra i soldi e la categoria li dispone. */
const fConRiserva = fetteDi(ciclo, { gruppi: [...DECISE, "riserva"] });
eq("accendo «Da riserva»: Auto", euro(fConRiserva.tutte.find((c) => c.id === "auto").totale), "398,05 €");

/* --- il ritmo ----------------------------------------------------------- */
console.log("");
const q = ritmoQuotidiano(ciclo, OGGI);
eq("giorno del ciclo", q.giorni, 18);
eq("budget Vita", euro(budgetVita(), { tondo: true }), "535 €");
eq("quotidiano al giorno", euro(q.alGiorno), "23,72 €");
eq("il piano", euro(q.piano), "17,83 €");
eq("se continui", euro(q.proiezione, { tondo: true }), "177 €");

/* --- dove si perde ------------------------------------------------------ */
console.log("");
const p = doveSiPerde(ciclo, 6);
eq("1ª voce", `${p[0].sub} ${euro(p[0].totale)} ${p[0].n}× ${euro(p[0].medio)}`,
  "Supermercato 160,35 € 4× 40,09 €");
eq("2ª voce", `${p[1].sub} ${euro(p[1].totale)} ${p[1].n}× ${euro(p[1].medio)}`,
  "Delivery 56,94 € 3× 18,98 €");
eq("3ª voce", `${p[2].sub} ${euro(p[2].totale)} ${p[2].n}× ${euro(p[2].medio)}`,
  "Bar e colazioni 55,90 € 13× 4,30 €");
eq("4ª voce", `${p[3].sub} ${euro(p[3].totale)} ${p[3].n}× ${euro(p[3].medio)}`,
  "Igiene e cosmetica 39,58 € 3× 13,19 €");
/* Nessuna riga di «dove si perde» puo' venire da Fisse o dalla riserva:
   e' la regola generale, ed e' l'unica cosa che rende utile la lista. */
eq("niente Fisse fra le voci", p.filter((x) => x.catId === "fisse").length, 0);

/* --- le correzioni ai dati ---------------------------------------------- */
console.log("");
const trova = (nota) => casella.leggi().movs.find((m) => (m.nota || "").includes(nota));
eq("Telepass: categoria", trova("Telepass").cat, "auto");
eq("Telepass: sottocategoria", trova("Telepass").sub, "Pedaggio");
eq("Patente Droni: sottocategoria", trova("Patente Droni").sub, "Corsi");
eq("AliExpress: legata al previsto", trova("ALIEXPRESS").pian, "v3-aliexpress-2");
eq("«Corsi» esiste in Svago",
  casella.leggi().cats.find((c) => c.id === "svago").sub.includes("Corsi"), true);
eq("sistemaGruppi gira una volta sola", sistemaGruppi(), false);

const sub = sottoDi(ciclo, "svago", { gruppi: DECISE });
eq("Svago › Tech (il monitor)", euro(sub.find((x) => x.sub === "Tech").totale), "105,90 €");
eq("Svago › Corsi", euro(sub.find((x) => x.sub === "Corsi").totale), "31,28 €");

/* --- l'andamento -------------------------------------------------------- */
console.log("");
const a = andamentoQuotidiano(ciclo);
eq("la curva finisce sul quotidiano", euro(a.cum[a.cum.length - 1]), "426,87 €");
eq("i punti fuori piano sono quattro", a.punti.length, 4);
eq("un punto sta SOPRA la curva",
  a.punti.every((x) => x.y > a.cum[x.giorno - 1]), true);

console.log(rotti ? `\n${rotti} numeri non tornano.` : "\nTutto torna.");
