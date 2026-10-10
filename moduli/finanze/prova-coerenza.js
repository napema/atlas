// moduli/finanze/prova-coerenza.js — i numeri di Finanze non si smentiscono.
//
//     deno run --location http://localhost/ --allow-read moduli/finanze/prova-coerenza.js
//
// Non controlla che un numero sia giusto — a quello servono `prova.js` e
// `prova-gruppi.js`. Controlla che due numeri MOSTRATI INSIEME dicano la
// stessa cosa, che è il guasto da cui nasce questo file:
//
//     OGGI  10,75 €
//     speso oggi 46,51 € · restano −35,76 €
//
// Tre numeri tutti esatti, messi uno sotto l'altro, e la schermata mente:
// quei 10,75 € non li puoi spendere, li hai già spesi. Nessun controllo
// sui valori l'avrebbe preso, perche' nessun valore era sbagliato.
//
// Qui l'archivio e' costruito apposta per rimetterci in quella giornata: il
// 10 ottobre 2026, 139,81 € da far durare 13 giorni, 46,51 € gia' usciti.

globalThis.window ??= globalThis;
globalThis.document ??= {
  addEventListener() {}, removeEventListener() {},
  createElement: () => ({ style: {}, classList: { add() {}, remove() {} },
    appendChild() {}, setAttribute() {}, addEventListener() {} }),
  body: { appendChild() {} },
};

const { casella, pocketIniziali, categorieIniziali, profiliIniziali } = await import("./dati.js");
const { cicloDi, importoEffettivo, movimentiDelCiclo } = await import("./calcolo.js");
const { quotaDi, quotaDomani, tiroObiettivo, copreFino, fuoriPianoDelCiclo } = await import("./piano.js");
const { ripartizione, ritmoQuotidiano, controllaCopertura } = await import("./gruppi.js");
const { euro } = await import("../../core/ui.js");

const OGGI = "2026-10-10";

let rotti = 0;
function ok(nome, condizione, visto = "") {
  if (!condizione) rotti++;
  console.log(`${condizione ? "ok  " : "NO  "} ${nome.padEnd(56)} ${String(visto)}`);
}
function eq(nome, visto, atteso) {
  ok(`${nome} = ${atteso}`, String(visto) === String(atteso), String(visto));
}

/* ---------------------------------------------------------- l'archivio -- */
/* La giornata dello screenshot: 139,81 € in tasca all'alba, 13 giorni allo
   stipendio, e 46,51 € gia' usciti. L'ancora dei pocket e' OGGI, cosi' il
   saldo di inizio giornata e' esattamente quello scritto e il movimento di
   oggi non lo tocca (`saldoGruppoA` guarda l'inizio, non l'adesso). */
casella.scrivi({
  v: 7,
  movs: [
    { id: "a", data: OGGI, tipo: "out", imp: 2651, nota: "Spesa", cat: "spesa", sub: "Supermercato", pocket: "principale", up: 1, ts: 1 },
    { id: "b", data: OGGI, tipo: "out", imp: 2000, nota: "Cena fuori", cat: "cibo", sub: "Ristorante", pocket: "principale", up: 1, ts: 1 },
    { id: "c", data: "2026-10-02", tipo: "out", imp: 85000, nota: "Affitto ottobre", cat: "fisse", sub: "Affitto", pocket: "fisse", up: 1, ts: 1 },
    { id: "d", data: "2026-10-06", tipo: "out", imp: 10590, nota: "Monitor PC", cat: "svago", sub: "Tech", pocket: "principale", fuoriPiano: true, up: 1, ts: 1 },
    /* Il Telepass: 368 € sopra soglia, nessuna scadenza collegata, quindi
       `eFuoriPiano()` da solo dice «fuori piano». Esce da ING: non lo e'. */
    { id: "e", data: "2026-09-30", tipo: "out", imp: 36805, nota: "Telepass Fee", cat: "auto", sub: "Pedaggio", pocket: "ing", up: 1, ts: 1 },
  ],
  cats: categorieIniziali(),
  profili: profiliIniziali(),
  pockets: pocketIniziali().map((p) => ({
    ...p, up: 1, ancoraDa: OGGI,
    saldo: { principale: 5700, contanti: 0, cassa: 8281, fondo: 0, ing: 70000 }[p.id] ?? 0,
  })),
  config: {
    giornoStipendio: 23, entrate: 2041,
    obiettivo: { nome: "Naso", target: 350000, data: "2027-08-01", pocket: "fondo",
      versamento: 15600, dal: "2026-10-07", provvisorio: true, extra: [] },
  },
  soglie: { fuoriPiano: 3000, quotaMinima: 1000 },
  rules: {}, lista: [], previsti: [], ricorrenti: [], up: 1,
});

const ciclo = cicloDi(OGGI);
const q = quotaDi(OGGI);
console.log(`\nIl 10 ottobre: ${euro(q.spendibile)} da far durare ${q.giorni} giorni.\n`);

/* ====================================================== 1. LA GIORNATA == */
console.log("— la giornata —");
eq("spendibile", euro(q.spendibile), "139,81 €");
eq("giorni allo stipendio", q.giorni, 13);
eq("quota del giorno", euro(q.quota), "10,75 €");
eq("speso oggi", euro(q.speso), "46,51 €");
eq("resta", euro(q.resta), "−35,76 €");
eq("sforo", euro(q.sforo), "35,76 €");

/* LA REGOLA CHE MANCAVA. Il numero grande della schermata e della carta in
   home deve essere quello che RESTA, non la razione: sono la stessa cosa
   solo all'alba, e da li' in poi mostrarne una per l'altra e' una bugia. */
ok("il numero grande è `resta`, non `quota`", q.resta !== q.quota && q.resta < 0,
  `${euro(q.resta)} ≠ ${euro(q.quota)}`);
ok("resta = quota − speso", q.resta === q.quota - q.speso);
ok("la quota non supera il divisibile", q.quota * q.giorni <= Math.max(0, q.spendibile));
ok("una quota in più sforerebbe", (q.quota + 1) * q.giorni > Math.max(0, q.spendibile));
ok("`livello` è rosso quando si è oltre", q.livello === "male", q.livello);

/* Dopo uno sforo il sistema si raddrizza da se': e' la cosa che la
   schermata non diceva, e che faceva sembrare lo sforo definitivo. */
const dom = quotaDomani(OGGI);
eq("la quota di domani", euro(dom.quota), "7,77 €");
ok("domani la quota scende, non resta ferma", dom.quota < q.quota);
ok("domani lo sforo non c'è più", dom.speso === 0 && dom.resta === dom.quota);
ok("domani un giorno in meno", dom.giorni === q.giorni - 1, dom.giorni);

/* ====================================================== 2. LA CARTA ===== */
/* Le due schermate devono dire LO STESSO numero per la stessa domanda:
   due numeri diversi sono due app. */
console.log("\n— la carta in home contro la schermata —");
const { oggi } = await import("./contratto.js");
const c = oggi();
eq("il numero grande della carta", c.oggiPuoi, euro(q.resta));
eq("il numero grande della carta larga", c.valore, euro(q.resta));
ok("l'etichetta sa che il numero è negativo",
  /oltre/i.test(c.oggiEti) && c.oggiMale === true, c.oggiEti);
ok("la carta è marcata urgente", c.urgente === true);

/* NESSUNA FRASE DICE «RESTANO» DAVANTI A UN NUMERO NEGATIVO. E' l'errore
   di lingua che rendeva illeggibile la riga: «restano −35,76 €» non e'
   un'informazione, e' una sottrazione lasciata a meta'. */
const frasi = [c.oggiEti, c.oggiFino, c.dettaglio, c.allarme, c.eti].filter(Boolean);
ok("nessun «restano −…» in giro", !frasi.some((f) => /restano\s*−/.test(f)),
  frasi.find((f) => /restano\s*−/.test(f)) || "");
ok("l'allarme dice di quanto hai sforato", /sforato/i.test(c.allarme || ""), c.allarme);
ok("la barra della carta è piena quando si è oltre", c.avanzamento === 1, c.avanzamento);

/* ====================================================== 3. I GRUPPI ===== */
console.log("\n— i gruppi contro i movimenti —");
const r = ripartizione(ciclo);
const sommaOut = movimentiDelCiclo(ciclo)
  .filter((m) => m.tipo === "out" && importoEffettivo(m) > 0)
  .reduce((t, m) => t + importoEffettivo(m), 0);
ok("i cinque gruppi coprono tutte le uscite", r.totale === sommaOut, euro(r.totale));
ok("nessuna uscita resta senza gruppo", controllaCopertura(ciclo).senza.length === 0);
ok("«decise da te» = fuori piano + quotidiano",
  r.decise === r.perId.fuoriPiano.totale + r.perId.quotidiano.totale, euro(r.decise));
ok("l'affitto non è fra le decise", r.perId.fisse.totale === 85000, euro(r.perId.fisse.totale));
ok("il Telepass è una spesa da riserva", r.perId.riserva.totale === 36805, euro(r.perId.riserva.totale));

/* LA CONTRADDIZIONE CHE QUESTO BLOCCO ESISTE PER NON RIPETERE. Il Riepilogo
   contava il fuori piano con `eFuoriPiano()` nudo, l'Analisi con la
   gerarchia dei gruppi: l'affitto (850 €, sopra soglia, nessuna scadenza
   collegata) e il Telepass finivano fra le decisioni su una schermata e al
   loro posto sull'altra. Due numeri per la stessa parola. */
const fp = fuoriPianoDelCiclo(ciclo, OGGI);
ok("Riepilogo e Analisi contano lo stesso fuori piano",
  fp.totale === r.perId.fuoriPiano.totale && fp.n === r.perId.fuoriPiano.n,
  `${euro(fp.totale)} (${fp.n}) contro ${euro(r.perId.fuoriPiano.totale)} (${r.perId.fuoriPiano.n})`);
ok("l'affitto non è una decisione presa sul momento",
  !fp.voci.some((m) => m.id === "c"));
ok("il Telepass non è una decisione presa sul momento",
  !fp.voci.some((m) => m.id === "e"));

/* Il ritmo del quotidiano e il blocco «dove sono andati» devono partire
   dallo stesso numero: sono due viste dello stesso gruppo. */
const rq = ritmoQuotidiano(ciclo, OGGI);
ok("il ritmo parte dal quotidiano della ripartizione",
  rq.quotidiano === r.perId.quotidiano.totale, euro(rq.quotidiano));
ok("il ritmo non vede l'affitto", rq.quotidiano < r.perId.fisse.totale);

/* ====================================================== 4. L'OBIETTIVO == */
console.log("\n— l'obiettivo —");
const o = tiroObiettivo(OGGI);
ok("proiezione = saldo + versamenti + extra",
  o.proiezione === o.saldo + o.daiVersamenti + o.daiExtra, euro(o.proiezione));
ok("gap = quanto manca alla proiezione",
  o.gap === Math.max(0, o.target - o.proiezione), euro(o.gap));
ok("un verdetto solo: ci arrivi o no", o.cela === (o.gap <= 0), String(o.cela));

/* IL VERDETTO NON PUO' ESSERE DOPPIO. Prima la riga diceva «in linea ·
   mancano 640 €»: «in linea» guarda i versamenti passati, che a obiettivo
   appena nato sono zero, quindi era vera per definizione e verde sopra un
   salvadanaio vuoto. */
ok("a obiettivo appena nato non si dice «in linea»",
  o.cominciato === false && o.previsto === 0, `previsto ${euro(o.previsto)}`);
ok("saldo a zero e non ci si arriva", o.saldo === 0 && o.cela === false);

/* La via d'uscita dev'essere un numero che CHIUDE il buco, se no e' un
   suggerimento che non serve a niente. */
ok("l'aumento proposto chiude il buco",
  o.inPiu != null && o.inPiu * o.versamenti >= o.gap,
  `+${euro(o.inPiu)} × ${o.versamenti} = ${euro(o.inPiu * o.versamenti)} per ${euro(o.gap)}`);
ok("l'aumento è il più piccolo che basta",
  (o.inPiu - 100) * o.versamenti < o.gap, euro(o.inPiu));
/* UNA CIFRA SOLA PER IL VERSAMENTO. La lista del giorno di paga leggeva
   `config.versamenti.fondo`, l'obiettivo `config.obiettivo.versamento`: due
   campi per lo stesso numero, e cambiando il versamento dal foglio
   dell'obiettivo la lista del 23 continuava a chiedere quello vecchio. */
const { travasiPaga } = await import("./paga.js");
const { prossimoStipendio } = await import("./calcolo.js");
const fondoPaga = () => travasiPaga(prossimoStipendio(OGGI)).righe.find((r) => r.id === "fondo").imp;
eq("la lista del 23 chiede il versamento dell'obiettivo", euro(fondoPaga()), euro(o.versamento));
{
  const prima = casella.leggi();
  casella.scrivi({ ...prima, config: { ...prima.config, obiettivo: { ...prima.config.obiettivo, versamento: 22000 } } });
  eq("cambiato il versamento, la lista segue", euro(fondoPaga()), "220,00 €");
  casella.scrivi(prima);
}

ok("gli stipendi in più chiudono il buco",
  o.stipendiInPiu * o.versamento >= o.gap, `${o.stipendiInPiu} × ${euro(o.versamento)}`);

/* ====================================================== 5. L'ORIZZONTE == */
/* `copreFino` guarda solo le tasche spendibili, la quota divide anche la
   Cassa: due orizzonti su due denari diversi. Non si contraddicono, ma
   vanno detti per quello che sono — e la schermata mostra il secondo solo
   quando arriva PRIMA del primo, se no è una riga che non aggiunge niente. */
console.log("\n— i due orizzonti —");
const fin = copreFino(OGGI);
/* Qui in tasca sono rimasti 10,49 € contro una quota di 10,75: `copreFino`
   torna `null`, cioe' «non basta nemmeno per un giorno». E' il caso in cui
   la riga spariva dalla schermata — proprio quello in cui c'e' qualcosa da
   fare, cioe' ricaricare dalla Cassa. */
ok("l'orizzonte breve esiste solo se è davvero più corto", fin == null || fin < q.fine,
  `${fin} contro ${q.fine}`);
ok("la Cassa non è in tasca: i due orizzonti guardano denari diversi",
  q.spendibile > 13000 && fin == null, euro(q.spendibile));
ok("lo stipendio chiude la finestra della quota", q.fine === ciclo.a, q.fine);

/* ====================================================== 6. I TRAVASI ==== */
/* La domanda della domenica sera — «ho questi saldi, quanto butto dove?» —
   che prima si faceva a una chat. Le regole: ING non si tocca, prima le
   Fisse, una razione sola (quella di domani), il Principale fino a
   domenica e la Cassa per il resto. */
console.log("\n— i travasi —");
const { pianoTravasi, ricaricaLunedi } = await import("./travasi.js");

/* Sabato 10: la giornata è già sforata, ma la domanda dei travasi è
   un'altra — il Principale arriva a domani? */
const sab = pianoTravasi(OGGI);
ok("sabato: la finestra è la domenica", sab.f.da === "2026-10-11" && sab.f.a === "2026-10-11", `${sab.f.da}…${sab.f.a}`);
/* LA REGOLA CHE TIENE INSIEME LE DUE CARTE: la razione del piano è il
   «Domani» della carta di oggi. Una cifra sola per la stessa domanda. */
ok("la razione del piano è il «Domani» della carta", sab.razione === dom.quota, euro(sab.razione));
ok("sabato: 10,49 € bastano per domenica a 7,77", sab.mosse.length === 0 && sab.esito !== "non-basta",
  `principale ${euro(sab.prima.principale)}`);
/* Niente da spostare non vuol dire tutto bene: 7,77 € al giorno sono sotto
   la soglia dei 10, e la carta lo deve dire anche quando non c'è una
   mossa da fare. */
eq("sabato: ma la razione è stretta", sab.esito, "stretto");

/* Domenica 11: si prepara la settimana dopo. Il vecchio `ricaricaLunedi`
   la domenica guardava un giorno solo, e diceva di ricaricare per stanotte. */
const dom11 = pianoTravasi("2026-10-11");
ok("domenica: si prepara lunedì → domenica", dom11.f.prepara && dom11.f.da === "2026-10-12" && dom11.f.a === "2026-10-18",
  `${dom11.f.da}…${dom11.f.a}`);
eq("domenica: giorni della settimana", dom11.f.giorni, 7);
eq("domenica: la razione", euro(dom11.razione), "8,48 €");
const verso = dom11.mosse.find((m) => m.a === "principale");
ok("domenica: una mossa dalla Cassa al Principale", verso && verso.da === "cassa", verso ? euro(verso.imp) : "nessuna");
eq("domenica: quanto", verso ? euro(verso.imp) : "—", "50,00 €");
ok("domenica: a cifre tonde, di 5 in 5", verso && verso.imp % 500 === 0);
ok("dopo il travaso il Principale arriva a domenica",
  dom11.dopo.principale >= dom11.razione * dom11.f.giorni, euro(dom11.dopo.principale));
/* La Cassa che resta deve bastare per i giorni dopo la settimana. Entro
   un euro: è l'arrotondamento in su del travaso. */
const restanti = dom11.f.allaPaga - dom11.f.giorni;
ok("e la Cassa basta per i giorni dopo, entro i 5 € dell'arrotondamento",
  dom11.dopo.cassa + 500 >= dom11.razione * restanti,
  `${euro(dom11.dopo.cassa)} per ${restanti} × ${euro(dom11.razione)}`);
ok("ING non si tocca", dom11.dopo.ing === dom11.prima.ing && !dom11.mosse.some((m) => m.da === "ing"));
ok("niente soldi inventati: la somma non cambia",
  dom11.dopo.principale + dom11.dopo.cassa + dom11.dopo.fisse === dom11.prima.principale + dom11.prima.cassa + dom11.prima.fisse);

/* UN MOTORE SOLO. `ricaricaLunedi` era un conto a sé: la domenica, il
   foglio della chiusura e il Riepilogo davano tre cifre. */
eq("la ricarica del lunedì è la mossa del piano", euro(ricaricaLunedi("2026-10-11").importo), euro(verso?.imp || 0));

/* --- sotto i 3 € non si sposta -------------------------------------- */
/* Il primo disegno proponeva «Cassa → Principale: 1 €» con 10,59 € sul
   Principale e una razione da 10,89. Nessuno apre Revolut per un euro. */
{
  const prima = casella.leggi();
  casella.scrivi({ ...prima, movs: [...prima.movs,
    { id: "z", data: OGGI, tipo: "out", imp: 300, nota: "Caffè e cornetto", cat: "cibo", sub: "Bar e colazioni", pocket: "principale", up: 1, ts: 1 }] });
  const quasi = pianoTravasi(OGGI);
  // Il buco c'è davvero — pochi centesimi — e non deve diventare un giro.
  ok("c'è un buco, ma di pochi centesimi",
    quasi.serve > quasi.prima.principale && quasi.serve - quasi.prima.principale < 300,
    `serve ${euro(quasi.serve)}, sul Principale ${euro(quasi.prima.principale)}`);
  ok("e non diventa un travaso", quasi.mosse.length === 0 && quasi.esito !== "non-basta");
  casella.scrivi(prima);
}

/* --- le Fisse scoperte vengono prima ---------------------------------- */
const archivioBase = casella.leggi();
casella.scrivi({
  ...archivioBase,
  pockets: archivioBase.pockets.map((p) => p.id === "fisse" ? { ...p, saldo: 0 } : p),
  ricorrenti: [{ id: "windtre", nome: "WindTRE", cat: "fisse", pocket: "fisse", tipo: "fissa",
    imp: 499, cadenza: "mensile", giorno: 15, attivo: true, da: null, pagato: null, up: 1 }],
});
const fis = pianoTravasi("2026-10-11");
ok("Fisse vuote e WindTRE il 15: la prima mossa va alle Fisse",
  fis.mosse[0]?.a === "fisse" && fis.mosse[0]?.da === "cassa", fis.mosse.map((m) => `${m.da}→${m.a} ${euro(m.imp)}`).join(", "));
eq("alle Fisse, all'euro", euro(fis.mosse[0]?.imp || 0), "5,00 €");
ok("la razione tiene conto delle Fisse scoperte", fis.razione < dom11.razione,
  `${euro(fis.razione)} contro ${euro(dom11.razione)}`);
ok("e resta la stessa del «Domani» della carta", fis.razione === quotaDomani("2026-10-11").quota);

/* --- quando neanche la Cassa basta ------------------------------------ */
casella.scrivi({
  ...archivioBase,
  pockets: archivioBase.pockets.map((p) => p.id === "cassa" ? { ...p, saldo: 0 } : p),
  ricorrenti: [{ id: "affitto-x", nome: "Bolletta", cat: "casa", pocket: "principale", tipo: "fissa",
    imp: 8000, cadenza: "mensile", giorno: 14, attivo: true, da: null, pagato: null, up: 1 }],
});
const nb = pianoTravasi("2026-10-11");
ok("Cassa vuota e una bolletta da 80 € martedì: non basta", nb.esito === "non-basta", nb.esito);
ok("dice la cifra che manca", nb.manca > 0, euro(nb.manca));
ok("e non la prende da ING da solo", !nb.mosse.some((m) => m.da === "ing") && nb.dopo.ing === nb.prima.ing);
casella.scrivi(archivioBase);

console.log(rotti ? `\n${rotti} controlli non passano.` : "\nNessuna contraddizione.");

/* `contratto.js` apre il canale di sync e lascia dei timer: senza questo
   il processo resta su per sempre e la prova non finisce mai. */
Deno.exit(rotti ? 1 : 0);
