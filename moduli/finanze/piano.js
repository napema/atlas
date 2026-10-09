// moduli/finanze/piano.js — l'obiettivo, la quota del giorno, il fuori piano.
//
// I tre numeri di v3, e sono tre perché rispondono a tre domande che prima
// non avevano risposta:
//
//   OBIETTIVO    sto andando dove voglio andare?
//   QUOTA        quanto posso spendere oggi?
//   FUORI PIANO  cosa ho fatto fuori dal piano, e quanto mi è costato?
//
// Prima di questo file il modulo registrava bene e non faceva risparmiare
// niente: mostrava budget per categoria, barre, percentuali — tutte cose
// vere che non cambiano nessuna decisione. Nove barre dicono dove sono
// finiti i soldi il mese scorso; un numero solo dice se stasera ci sta una
// pizza. È quello il numero che serve ogni giorno.
//
// Niente DOM, niente scritture: come `calcolo.js`, e per lo stesso motivo —
// la home deve poter leggere questi numeri senza montare Finanze.

import {
  stato, movimentiVivi, previsti, ricorrentiVivi, profiloDi,
  SOGLIE_PREDEFINITE, CATEGORIE_CASSA, vociLista, statoVoce,
} from "./dati.js";
import {
  cicloDi, prossimoStipendio, stipendiTra, dataStipendio, giorniFra,
  saldoPocket, deltaPocketTra, pocketSpendibili, pocketParcheggio, pocketRiserva,
  inArrivo, prossimaScadenza, importoRicorrente, importoEffettivo, movimentiDelCiclo,
} from "./calcolo.js";
import { oggiISO, daISO, piuGiorni } from "../../core/ui.js";

export const soglie = () => ({ ...SOGLIE_PREDEFINITE, ...(stato().soglie || {}) });

/* ========================================================================
   LE TASCHE DELLA VITA.

   Principale + Contanti + Cassa. La Cassa è parcheggio, non spendibile, ma
   la quota la deve contare: quei soldi arrivano sul Principale lunedì, e
   lasciarli fuori dal conto dava «3,27 € al giorno» a chi ne aveva
   ventiquattro. Il Fondo invece resta fuori per definizione, e ING resta
   fuori perché è riserva: se entrassero, la quota di oggi conterebbe soldi
   che per arrivare qui devono passare da una decisione.
   ======================================================================== */

export const tascheVita = () => [...pocketSpendibili(), ...pocketParcheggio()];

/** Il saldo di un gruppo di pocket ALL'INIZIO di `iso`. */
function saldoGruppoA(ids, iso) {
  const pockets = stato().pockets || [];
  let t = 0;
  for (const id of ids) {
    const p = pockets.find((x) => x.id === id);
    if (!p) continue;
    const da = p.ancoraDa || stato().config?.pocketDa || "9999-12-31";
    t += (p.saldo || 0) + deltaPocketTra(id, da, iso);
  }
  return t;
}

/** Quello che è già impegnato su quelle tasche prima del prossimo stipendio. */
function impegniSu(ids, iso) {
  // `inArrivo` si ferma da sé alla fine del ciclo: chiedergli dieci anni
  // vuol dire chiedergli «tutto quello che esce prima dello stipendio».
  const per = inArrivo(3650, iso).perPocket;
  return ids.reduce((t, id) => t + (per[id]?.totale || 0), 0);
}

/* ========================================================================
   FUORI PIANO.

   Quattro condizioni, e tutte e quattro servono. Togline una e la lista
   diventa un elenco di spese: la spesa al supermercato da 60 € non è fuori
   piano, la rata dell'affitto non è fuori piano, e la stampante che hai
   messo in lista d'attesa martedì e comprato giovedì non è fuori piano —
   quello è il piano che ha funzionato.

   Resta esattamente una cosa: i soldi usciti perché hai deciso sul momento
   di spenderli. Che è l'unica categoria su cui si può fare qualcosa.
   ======================================================================== */

/**
 * `m.fuoriPiano` è un OVERRIDE, non il valore: se c'è vince, perché è la
 * tua correzione a mano. Senza, si calcola.
 */
export function eFuoriPiano(m) {
  if (!m || m.del) return false;
  if (m.fuoriPiano != null) return Boolean(m.fuoriPiano);

  /* Una ricarica da ING verso le tasche di spesa è fuori piano SEMPRE,
     tranne quelle create dalla checklist del giorno di paga. Non ha soglia:
     attingere alla riserva è un fatto, non una questione di quanto. */
  if (m.tipo === "extra") return m.pianificata !== true;

  if (m.tipo !== "out") return false;
  if (m.imp < (soglie().fuoriPiano || 0)) return false;
  if (m.pian) return false;                   // nata dal «Paga» di una scadenza
  if (m.cat === "spesa") return false;        // la spesa alimentare non è una scelta
  if (m.lista) return false;                  // era in lista d'attesa, sbloccata
  return true;
}

/**
 * L'uscita è stata pagata con un travaso dalla riserva?
 *
 * Si riconosce dalla coppia e non da un campo: una ricarica `extra` dello
 * stesso giorno e dello stesso importo che arriva su una tasca di spesa è
 * quella che ha pagato questa uscita. Serve due volte — per non contarla
 * nello speso del giorno (quei soldi non venivano dalla quota) e per
 * scrivere «da ING» accanto alla riga in home.
 */
export function copertaDaRicarica(m) {
  if (!m || m.tipo !== "out") return false;
  const dentro = pocketSpendibili();
  return movimentiVivi().some((x) => x.tipo === "extra" && x.data === m.data
    && x.imp === m.imp && dentro.includes(x.pocketTo || ""));
}

/**
 * Quanto è uscito dalla quota di oggi.
 *
 * NON tutto quello che esce oggi: le rate erano già impegnate e i soldi di
 * una ricarica dalla riserva non venivano dalla quota. Contarli vorrebbe
 * dire dire «hai sforato di 105 €» a chi ha speso quello che aveva deciso.
 */
export function spesoDiPiano(iso = oggiISO()) {
  const dentro = pocketSpendibili();
  return movimentiVivi()
    .filter((m) => m.tipo === "out" && m.data === iso && dentro.includes(m.pocket || "principale"))
    .filter((m) => !m.pian)
    .filter((m) => !(eFuoriPiano(m) && copertaDaRicarica(m)))
    .reduce((t, m) => t + importoEffettivo(m), 0);
}

/** Il budget «Vita» del profilo, in centesimi. È la somma delle categorie cassa. */
export function budgetVita() {
  const p = profiloDi();
  const quali = Array.isArray(p.cassaCats) ? p.cassaCats : CATEGORIE_CASSA;
  return quali.reduce((t, id) => t + (Number(p.b?.[id]) || 0), 0) * 100;
}

/** La quota che il piano prevedeva: budget Vita diviso i giorni del ciclo. */
export function quotaDiPiano(iso = oggiISO()) {
  const c = cicloDi(iso);
  return Math.round(budgetVita() / Math.max(1, c.giorni));
}

/* ========================================================================
   LA QUOTA DI OGGI.

       spendibile = Principale + Contanti + Cassa − quello che esce da
                    quelle tasche prima del prossimo stipendio
       giorni     = da oggi compreso al giorno prima dello stipendio
       quota      = spendibile A INIZIO GIORNATA ÷ giorni
       resta      = quota − speso oggi

   «A inizio giornata» non è un dettaglio. Dividendo il saldo di ADESSO, la
   quota scenderebbe a ogni spesa insieme al resto, e il resto non
   arriverebbe mai a zero: avresti sempre qualche euro di margine, qualunque
   cosa tu abbia fatto. Fissata all'alba, la quota è un numero che la
   giornata consuma, ed è l'unico modo perché finisca.

   Se oggi spendi meno, domani la quota sale da sé: i soldi non spesi
   restano nel saldo e i giorni sono uno di meno.
   ======================================================================== */

export function quotaDi(iso = oggiISO()) {
  const ciclo = cicloDi(iso);
  const fine = ciclo.a > iso ? ciclo.a : iso;
  const giorni = Math.max(1, giorniFra(iso, fine));
  const ids = tascheVita();

  const inizio = saldoGruppoA(ids, iso);
  const impegni = impegniSu(ids, iso);
  const spendibile = inizio - impegni;
  const quota = Math.floor(Math.max(0, spendibile) / giorni);

  const speso = spesoDiPiano(iso);
  const piano = quotaDiPiano(iso);
  const resta = quota - speso;
  const s = soglie();

  return {
    iso, fine, giorni, spendibile, impegni, quota, speso, resta, piano,
    /* Tre stati, e il rosso costa caro: si accende solo quando la giornata
       è già oltre la quota o quando la quota è così bassa che non ci sta
       niente. Sotto il piano è ambra — stai stringendo, non hai sbagliato. */
    livello: resta < 0 || quota < (s.quotaMinima || 0) ? "male"
      : piano > 0 && quota < piano ? "avviso"
      : "",
  };
}

/** Di quanto è cambiata la quota rispetto a ieri. */
export function variazioneQuota(iso = oggiISO()) {
  return quotaDi(iso).quota - quotaDi(piuGiorni(iso, -1)).quota;
}

/**
 * Fin dove arriva quello che hai in tasca, a questa quota.
 *
 * È la riga che smonta l'illusione del saldo: 57 € sembrano tanti finché
 * non leggi che sono quattro giorni. Guarda SOLO le tasche spendibili e non
 * la Cassa, perché la domanda è «fin quando posso andare avanti senza
 * toccare altro».
 */
export function copreFino(iso = oggiISO(), quota = null) {
  const q = quota ?? quotaDi(iso).quota;
  if (q <= 0) return null;
  const saldo = pocketSpendibili().reduce((t, id) => t + saldoPocket(id), 0);
  const g = Math.floor(saldo / q);
  return g <= 0 ? null : piuGiorni(iso, g - 1);
}

/* ------------------------------------------------------- il fuori piano -- */

/**
 * Il fuori piano di un ciclo: le uscite, le ricariche, e il confronto che
 * rende la cifra leggibile.
 *
 * `pct` è il totale sul versamento mensile al Fondo. È il paragone giusto
 * perché è un cambio, non una percentuale: 240 € non vogliono dire niente,
 * «un mese e mezzo di Fondo» vuol dire che l'obiettivo si è spostato.
 */
export function fuoriPianoDelCiclo(ciclo = cicloDi(), iso = oggiISO()) {
  const movs = movimentiDelCiclo(ciclo);

  const voci = movs
    .filter((m) => m.tipo === "out" && eFuoriPiano(m))
    .map((m) => ({ ...m, daRiserva: copertaDaRicarica(m) }));
  const ricariche = movs.filter((m) => m.tipo === "extra" && eFuoriPiano(m));

  const totale = voci.reduce((t, m) => t + importoEffettivo(m), 0);
  const vers = Number(obiettivo()?.versamento) || 0;

  /* I GIORNI SENZA. Lo zero da solo non si vede; «11 giorni senza fuori
     piano» è un numero che cresce, e un numero che cresce lo si difende.
     Si conta dall'ultima, o dall'inizio del ciclo se non ce n'è nessuna. */
  const ultima = voci.map((m) => m.data).sort().at(-1) || null;
  const da = ultima ? piuGiorni(ultima, 1) : ciclo.da;
  const giorniSenza = iso >= da ? giorniFra(da, iso) : 0;

  return {
    voci, n: voci.length, totale, ultima, giorniSenza,
    pct: vers > 0 ? totale / vers : null,
    ricariche: {
      n: ricariche.length,
      totale: ricariche.reduce((t, m) => t + m.imp, 0),
      voci: ricariche,
    },
  };
}

/* ========================================================================
   L'OBIETTIVO.

   Quattro numeri, e nessuno dei quattro è il saldo:

     previsto a oggi   i versamenti programmati con data ≤ oggi
     stato             saldo − previsto. Sotto zero sei indietro
     proiezione        saldo + versamenti futuri + extra previsti
     gap               target − proiezione

   «Previsto a oggi» è quello che trasforma il fondo da un salvadanaio in un
   impegno: senza, un versamento saltato non si vede fino alla fine, e alla
   fine non si recupera. Con questo si vede il giorno dopo.
   ======================================================================== */

export const obiettivo = () => stato().config?.obiettivo || null;

/** Un extra previsto può essere datato «2026-12»: quel mese vale il giorno di paga. */
function quandoExtra(x) {
  const q = String(x?.quando || "");
  if (/^\d{4}-\d{2}-\d{2}$/.test(q)) return q;
  const m = q.match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  return dataStipendio(Number(m[1]), Number(m[2]) - 1);
}

export function statoObiettivo(iso = oggiISO()) {
  const o = obiettivo();
  if (!o || !o.data) return null;

  const saldo = saldoPocket(o.pocket || "fondo");
  const vers = Number(o.versamento) || 0;

  /* I versamenti si contano dalla data di NASCITA dell'obiettivo. Contarli
     dall'inizio dei tempi vorrebbe dire che un obiettivo creato oggi nasce
     indietro di tutti gli stipendi passati, in cui al fondo non è mai
     andato niente: un debito inventato, e un'app che apre con un rimprovero
     la si chiude. */
  const dal = o.dal || iso;
  const passati = dal < iso ? stipendiTra(dal, iso) : [];
  const previsto = passati.length * vers;

  const futuri = stipendiTra(iso, o.data);
  const extra = (o.extra || [])
    .map((x) => ({ ...x, quando: quandoExtra(x) }))
    .filter((x) => x.quando && x.quando > iso && x.quando <= o.data);

  const daiVersamenti = futuri.length * vers;
  const daiExtra = extra.reduce((t, x) => t + (Number(x.imp) || 0), 0);
  const proiezione = saldo + daiVersamenti + daiExtra;

  return {
    nome: o.nome || "Obiettivo",
    target: Number(o.target) || 0,
    provvisorio: Boolean(o.provvisorio),
    data: o.data,
    pocket: o.pocket || "fondo",
    versamento: vers,
    saldo, previsto,
    scarto: saldo - previsto,
    inLinea: saldo >= previsto,
    frazione: o.target > 0 ? Math.min(1, saldo / o.target) : 0,
    proiezione, daiVersamenti, daiExtra, extra,
    gap: Math.max(0, (Number(o.target) || 0) - proiezione),
    // I giorni che restano, oggi escluso: oggi non è un giorno che manca.
    giorni: Math.max(0, giorniFra(iso, o.data) - 1),
    prossimo: futuri[0] || null,
    versamenti: futuri.length,
  };
}

/**
 * IL PROSSIMO PASSO verso l'obiettivo: cosa devi fare tu, e quando.
 *
 * Il blocco in home diceva quattro numeri (previsto, proiezione, gap,
 * prossimo versamento) e nessuna azione, e la domanda che tornava indietro
 * era «ma cosa ci devo fare, ci butto io i soldi?». Sì: il fondo si muove
 * solo quando sposti tu i soldi su Revolut e lo segni qui. Questa funzione
 * dice quale dei tre momenti è:
 *
 *   da-fare    lo stipendio di questo ciclo è arrivato e il versamento
 *              non c'è (o non tutto): è la cosa da fare adesso
 *   fatto      versato; il prossimo è allo stipendio dopo
 *   attesa     l'obiettivo è nato dopo lo stipendio di questo ciclo: il
 *              primo versamento è al prossimo
 */
export function passoObiettivo(iso = oggiISO()) {
  const o = statoObiettivo(iso);
  if (!o || !o.versamento) return null;
  const ciclo = cicloDi(iso);
  const dal = obiettivo()?.dal || null;
  // Come `previsto`: conta lo stipendio che apre il ciclo solo se è venuto
  // DOPO la nascita dell'obiettivo (`stipendiTra` esclude il primo estremo).
  const dovuto = Boolean(dal && ciclo.da > dal);
  const versato = versatoAlFondo(ciclo);
  if (dovuto && versato < o.versamento) {
    return { tipo: "da-fare", imp: o.versamento - versato, dataStip: ciclo.da, versato };
  }
  if (dovuto) return { tipo: "fatto", imp: versato, prossimo: o.prossimo, dataStip: ciclo.da };
  return { tipo: "attesa", imp: o.versamento, prossimo: o.prossimo };
}

/* ========================================================================
   IL MINIMO PREVISTO DI ING.

   Il saldo di ING non dice niente da solo: 709 € sono tanti o pochi a
   seconda di cosa ci deve uscire. Il bollo a dicembre e l'assicurazione a
   febbraio se li mangiano quasi tutti, e il momento in cui il conto arriva
   più in basso è l'unico numero che risponde a «posso attingere».

   Si proiettano dodici mesi: a ogni stipendio entra il versamento
   programmato, a ogni scadenza sul pocket esce quello che scade, e si tiene
   il punto più basso.

   IL VERSAMENTO È QUELLO DI BUDGET, non quello calcolato al momento della
   paga. Sono due numeri diversi per scelta: il secondo è il resto dopo aver
   coperto le fisse vere di quel mese, e proiettarlo a dodici mesi vorrebbe
   dire proiettare le bollette di un anno — una precisione finta su stime.
   Il budget è un piano, e una proiezione è un piano.
   ======================================================================== */

/** Quanto va su ING a una data di stipendio. L'eccezione vince sul budget. */
export function versamentoRiserva(dataStip) {
  const ecc = stato().config?.eccezioni?.[dataStip];
  if (ecc && ecc.ing != null) return Number(ecc.ing) || 0;
  return (Number(profiloDi().b?.acc) || 0) * 100;
}

/**
 * `delta` sposta il saldo di partenza: serve alla lista d'attesa, che deve
 * dire «da 216 a 91» senza scrivere niente.
 */
export function ingPrevisto(iso = oggiISO(), delta = 0) {
  const ids = pocketRiserva();
  const fine = piuGiorni(iso, 365);
  let saldo = ids.reduce((t, id) => t + saldoPocket(id), 0) + delta;

  const eventi = [];
  for (const d of stipendiTra(iso, fine)) eventi.push({ quando: d, delta: versamentoRiserva(d) });

  for (const r of ricorrentiVivi()) {
    if (!r.attivo || !ids.includes(r.pocket)) continue;
    let q = prossimaScadenza(r, iso);
    // Il tetto a 24 è una rete: `prossimaScadenza` non può restituire più
    // di una scadenza al mese, e dodici mesi ne fanno dodici.
    for (let k = 0; k < 24 && q && q <= fine; k++) {
      eventi.push({ quando: q, delta: -importoRicorrente(r) });
      const p = prossimaScadenza(r, piuGiorni(q, 1));
      if (!p || p <= q) break;
      q = p;
    }
  }
  for (const x of previsti()) {
    if (!ids.includes(x.pocket) || !x.quando || x.quando <= iso || x.quando > fine) continue;
    eventi.push({ quando: x.quando, delta: -(x.imp || 0) });
  }

  eventi.sort((a, b) => a.quando.localeCompare(b.quando));

  let minimo = saldo;
  let quando = iso;
  for (const e of eventi) {
    saldo += e.delta;
    if (saldo < minimo) { minimo = saldo; quando = e.quando; }
  }

  return {
    saldo: ids.reduce((t, id) => t + saldoPocket(id), 0),
    minimo, quando, fine,
    sotto: minimo < (soglie().ingPrevistoMin || 0),
  };
}

/* ========================================================================
   LA LISTA D'ATTESA: l'effetto, in numeri.

   Tre righe, una per serbatoio, e ognuna è un «da X a Y». Non c'è un
   verdetto e non c'è un consiglio, ed è voluto: la versione precedente
   diceva «puoi, ma anticipi la Cassa» e la domanda che arrivava indietro
   era sempre la stessa — «cosa cambia?». Un «da 11,82 a 3,50 €/g» non ha
   bisogno di essere interpretato.
   ======================================================================== */

export function effettoVoce(prezzo, iso = oggiISO()) {
  const q = quotaDi(iso);
  const dopoQuota = Math.floor(Math.max(0, q.spendibile - prezzo) / Math.max(1, q.giorni));

  const ing = ingPrevisto(iso);
  const ingDopo = ingPrevisto(iso, -prezzo);

  const o = statoObiettivo(iso);

  return {
    settimana: { da: q.quota, a: dopoQuota, giorni: q.giorni },
    ing: { da: ing.minimo, a: ingDopo.minimo, quando: ingDopo.quando },
    // Dal fondo: il gap si allarga esattamente del prezzo, perché la
    // proiezione cala di quello. Nessuna sottigliezza, e si vede.
    fondo: o ? { da: o.gap, a: Math.max(0, o.gap + prezzo) } : null,
  };
}

/** Le voci della lista con dentro lo stato vero e l'effetto. */
export function listaConEffetto(iso = oggiISO(), adesso = Date.now()) {
  return vociLista()
    .map((v) => ({ ...v, vista: statoVoce(v, adesso) }))
    .filter((v) => v.vista === "attesa" || v.vista === "sbloccata")
    .sort((a, b) => (b.ts || 0) - (a.ts || 0))
    .map((v) => ({ ...v, effetto: effettoVoce(v.imp || 0, iso) }));
}

/* ========================================================================
   LA RICARICA DEL LUNEDÌ.

   Non è più un importo fisso. L'importo fisso è la ragione per cui
   l'ultima settimana del mese era sempre quella povera: quattro giorni con
   quello che era avanzato.

   Adesso si porta il Principale a `quota × giorni fino a domenica`. Se lo
   stipendio arriva prima di domenica, l'orizzonte è lo stipendio: ricaricare
   per una settimana intera a tre giorni dalla paga vuol dire travasare
   soldi che tornano indietro il venerdì.
   ======================================================================== */

export function ricaricaLunedi(iso = oggiISO()) {
  const q = quotaDi(iso);
  const dow = (daISO(iso).getDay() + 6) % 7;             // 0 = lunedì
  const domenica = piuGiorni(iso, 6 - dow);
  const fino = domenica < q.fine ? domenica : q.fine;
  const giorni = Math.max(1, giorniFra(iso, fino));

  const bersaglio = q.quota * giorni;
  const saldo = pocketSpendibili().reduce((t, id) => t + saldoPocket(id), 0);
  const cassa = pocketParcheggio().reduce((t, id) => t + saldoPocket(id), 0);
  // Non si travasa più di quello che c'è in Cassa: un giro che porta la
  // Cassa sotto zero non è una ricarica, è un numero inventato.
  const importo = Math.max(0, Math.min(bersaglio - saldo, cassa));

  return { fino, giorni, bersaglio, saldo, cassa, importo, quota: q.quota };
}

/* ------------------------------------------------------- la copertura --- */

/**
 * «In arrivo», diviso dallo stipendio.
 *
 * Il controllo di copertura vale solo per quello che scade PRIMA del
 * prossimo stipendio: una bolletta del 9 novembre la paga lo stipendio del
 * 23 ottobre, segnalarla come scoperta oggi è un allarme su un mese che
 * torna. Quello che cade dopo si mostra sotto la riga del giorno di paga,
 * senza allarme.
 */
export function inArrivoDiviso(giorni = 14, iso = oggiISO()) {
  const paga = prossimoStipendio(iso);
  const limite = piuGiorni(iso, giorni);
  const a = inArrivo(giorni, iso);

  /* `fra` E `stimato` ANCHE QUI, e non sono di lusso: sono i due campi che
     il foglio di una voce legge per dire «fra 14 giorni» e «stima». Finche'
     le righe di «dopo» si potevano solo guardare nessuno se n'e' accorto;
     dal momento che si aprono, senza `fra` il foglio scriveva «fra
     undefined giorni». */
  const dopo = [];
  for (const r of ricorrentiVivi()) {
    if (!r.attivo) continue;
    let q = prossimaScadenza(r, paga);
    if (q && q <= limite) {
      dopo.push({
        ...r, quando: q, importo: importoRicorrente(r), origine: "ricorrente",
        stimato: r.tipo === "variabile", fra: giorniFra(iso, q),
      });
    }
  }
  for (const x of previsti()) {
    if (x.quando && x.quando >= paga && x.quando <= limite) {
      dopo.push({ ...x, importo: x.imp || 0, origine: "previsto", stimato: false, fra: giorniFra(iso, x.quando) });
    }
  }
  dopo.sort((p, s) => p.quando.localeCompare(s.quando));

  return { prima: a, paga, dopo, finestra: limite };
}

/**
 * Una voce di «In arrivo» ritrovata dal suo indirizzo.
 *
 * Serve alle rotte: `#/finanze/arrivo/<origine>/<id>/<quando>` arriva dalla
 * home o da una notifica e porta tre stringhe, non l'oggetto. La finestra e'
 * larga perche' il mittente puo' essere di ieri — una notifica aperta il
 * giorno dopo deve trovare la sua voce, non una schermata vuota.
 */
export function voceInArrivo(origine, id, quando, iso = oggiISO()) {
  const a = inArrivoDiviso(90, iso);
  return [...a.prima.voci, ...a.dopo].find((v) =>
    v.origine === origine && String(v.id) === String(id) && v.quando === quando) || null;
}

/* ========================================================================
   I CICLI — la tabella che sostituisce Analisi.

   Analisi aveva nove schede, tre grafici e una tabella categorie contro
   pocket. Era tutto vero e non si guardava: nove risposte in una schermata
   sono zero risposte, e il mese solare che usava spezzava a meta' il giro
   delle bollette, quindi i confronti fra mesi non erano nemmeno onesti.

   Qui c'e' una riga per ciclo e cinque colonne, e ogni colonna e' una delle
   cinque cose su cui si puo' fare qualcosa. Il resto — le categorie — sta
   nel dettaglio di una riga, dove serve: a cose fatte, non ogni mattina.
   ======================================================================== */

/** Il patrimonio alla FINE di `iso`: tutti i pocket sommati. */
export function patrimonioA(iso) {
  const pockets = stato().pockets || [];
  const dopo = piuGiorni(iso, 1);
  let t = 0;
  let attendibile = true;
  for (const p of pockets) {
    const da = p.ancoraDa || stato().config?.pocketDa || null;
    // Prima dell'ancora non si sa: il saldo di allora non e' ricostruibile
    // dai movimenti, e un numero inventato in una tabella storica e' peggio
    // di una cella vuota.
    if (da && dopo < da) { attendibile = false; continue; }
    t += (p.saldo || 0) + deltaPocketTra(p.id, da || "0000-01-01", dopo);
  }
  return { totale: t, attendibile };
}

/** Quanto e' entrato nel pocket dell'obiettivo in un ciclo, al netto delle uscite. */
export function versatoAlFondo(ciclo) {
  const id = obiettivo()?.pocket || "fondo";
  return movimentiDelCiclo(ciclo).reduce((t, m) => {
    if (m.tipo === "giro" || m.tipo === "extra") {
      if (m.pocketTo === id) return t + m.imp;
      if (m.pocket === id) return t - m.imp;
    }
    return t;
  }, 0);
}

/** Lo speso «Vita» di un ciclo: le categorie della cassa, solo le scelte. */
export function vitaDelCiclo(ciclo) {
  const p = profiloDi();
  const quali = new Set(Array.isArray(p.cassaCats) ? p.cassaCats : CATEGORIE_CASSA);
  return movimentiDelCiclo(ciclo)
    .filter((m) => m.tipo === "out" && quali.has(m.cat) && !m.pian)
    .reduce((t, m) => t + importoEffettivo(m), 0);
}

/** Una riga della tabella Cicli. */
export function rigaCiclo(ciclo, iso = oggiISO()) {
  const fp = fuoriPianoDelCiclo(ciclo, iso);
  const pat = patrimonioA(ciclo.a > iso ? iso : ciclo.a);
  return {
    ciclo,
    corrente: iso >= ciclo.da && iso <= ciclo.a,
    vita: vitaDelCiclo(ciclo),
    budget: budgetVita(),
    fuoriPiano: { n: fp.n, totale: fp.totale },
    ricariche: fp.ricariche.n,
    fondo: versatoAlFondo(ciclo),
    patrimonio: pat,
  };
}

/** Gli ultimi `quanti` cicli, dal più recente. */
export function cicliRecenti(quanti = 8, iso = oggiISO()) {
  const ora = cicloDi(iso);
  const fuori = [];
  let c = ora;
  for (let k = 0; k < quanti; k++) {
    fuori.push(rigaCiclo(c, iso));
    const prima = cicloDi(piuGiorni(c.da, -1));
    if (prima.da >= c.da) break;
    c = prima;
  }
  return fuori;
}

/* ========================================================================
   LA CURVA DEL FONDO.

   Un grafico solo: il saldo del fondo contro la linea dei versamenti
   programmati, fino alla data obiettivo. E' il grafico che risponde alla
   domanda per cui l'obiettivo esiste — ci arrivo? — e non ce n'e' un
   secondo che la risponda meglio.

   I punti sono le date di stipendio, perche' e' lì che il fondo si muove:
   un punto al giorno darebbe una scala a gradini piatta per trenta giorni.
   ======================================================================== */

export function serieFondo(iso = oggiISO()) {
  const o = statoObiettivo(iso);
  if (!o) return null;

  const dal = obiettivo()?.dal || iso;
  const id = o.pocket;
  const date = [dal, ...stipendiTra(dal, o.data)];
  if (date.at(-1) !== o.data) date.push(o.data);

  const pockets = stato().pockets || [];
  const p = pockets.find((x) => x.id === id);
  const ancora = p?.ancoraDa || null;

  const extra = (o.extra || []).map((x) => ({ ...x, quando: quandoExtra(x) })).filter((x) => x.quando);

  let piano = 0;
  const punti = date.map((q, i) => {
    // Il piano: un versamento a ogni stipendio, più gli extra previsti.
    if (i > 0) piano += o.versamento;
    for (const x of extra) if (x.quando > (date[i - 1] || dal) && x.quando <= q) piano += Number(x.imp) || 0;

    // Il reale si ferma a oggi: una linea che continua nel futuro non è un
    // dato, è la stessa previsione disegnata due volte.
    const reale = q <= iso && p && (!ancora || q >= ancora)
      ? (p.saldo || 0) + deltaPocketTra(id, ancora || "0000-01-01", piuGiorni(q, 1))
      : null;

    return { quando: q, piano, reale };
  });

  return { punti, target: o.target, data: o.data, proiezione: o.proiezione };
}
