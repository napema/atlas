// moduli/finanze/esporta.js — il pacchetto da dare in pasto a un modello.
//
// Non è il backup: quello sta in Impostazioni → Dati ed è lo stato grezzo,
// fatto per essere ricaricato dall'app. Questo è fatto per essere LETTO da
// qualcuno che non ha il codice davanti, e la differenza sta tutta in tre
// cose che il backup non fa:
//
//   1. GLI IMPORTI SONO IN EURO. Dentro l'app sono centesimi — `1800` sono
//      18,00 € — ed è la prima trappola di questo schema, quella che sbaglia
//      di due ordini di grandezza senza che si veda. Un file destinato a
//      essere analizzato non può portarsela dietro.
//   2. GLI ID SONO RISOLTI. `cat: "cibo"` diventa anche «Cibo fuori»,
//      `pocket: "fisse"` diventa «Spese fisse». Un id da solo costringe a
//      indovinare, e chi indovina sbaglia sulle categorie che si somigliano.
//   3. C'È LA LEGENDA. Le convenzioni che nel codice sono commenti — cosa
//      distingue un'uscita ordinaria da una eccezionale, perché uno
//      sforamento non è una spesa, quali categorie pesano sulla settimana —
//      qui sono scritte nel file. Senza, i numeri si leggono tutti uguali.
//
// C'è anche un riepilogo per mese già fatto. Non perché manchino i dati per
// calcolarlo, ma perché sommare a mano trecento righe è proprio la cosa che
// un modello sbaglia più volentieri: meglio dargli i totali e lasciargli il
// ragionamento.

import {
  stato, movimentiVivi, ricorrentiVivi, previstiTutti,
  TIPI, TIPI_POCKET, classeDi, CATEGORIE_CASSA,
} from "./dati.js";
import { importoEffettivo, saldoPocket, cicloDi, prossimaScadenza } from "./calcolo.js";

const eur = (c) => Math.round(c || 0) / 100;

/** Il mese di una data ISO, come "2026-08". */
const meseDi = (iso) => (iso || "").slice(0, 7);

const NOMI_CLASSE = {
  automatico: "addebito automatico, non lo decidi ogni volta",
  necessario: "spesa necessaria ma variabile",
  discrezionale: "spesa che dipende da una scelta del momento",
};

/**
 * Tutto quello che serve per capire come si spende, in un oggetto solo.
 *
 * Le lapidi (`del: true`) restano fuori: sono un dettaglio del meccanismo di
 * sincronizzazione, non un fatto contabile, e in un'analisi si conterebbero
 * come movimenti veri.
 */
export function pacchettoAnalisi() {
  const s = stato();
  const cats = s.cats || [];
  const nomeCat = Object.fromEntries(cats.map((c) => [c.id, c.nome]));
  const nomePocket = Object.fromEntries((s.pockets || []).map((p) => [p.id, p.nome]));
  const movs = movimentiVivi();

  const movimenti = movs
    .slice()
    .sort((a, b) => (a.data || "").localeCompare(b.data || ""))
    .map((m) => {
      const eff = importoEffettivo(m);
      const riga = {
        id: m.id,
        data: m.data,
        tipo: m.tipo,
        tipoNome: TIPI[m.tipo]?.nome || m.tipo,
        euro: eur(m.imp),
        nota: m.nota || "",
        categoria: m.cat || null,
        categoriaNome: nomeCat[m.cat] || m.cat || null,
        sottocategoria: m.sub || null,
        pocket: m.pocket || "principale",
        pocketNome: nomePocket[m.pocket || "principale"] || m.pocket || null,
        eccezionale: Boolean(m.ecc),
      };
      // Solo quando aggiungono qualcosa: un file pieno di `null` si legge peggio.
      if (m.tipo === "out") riga.classe = classeDi(m.cat, m.sub);
      if (eff !== m.imp) {
        riga.euroEffettivo = eur(eff);
        riga.notaEffettivo = "Un rimborso o un reso collegato ha ridotto questa uscita: per i totali vale euroEffettivo.";
      }
      if (m.pocketTo) riga.pocketVerso = nomePocket[m.pocketTo] || m.pocketTo;
      if (m.rif) riga.riferimentoA = m.rif;
      return riga;
    });

  return {
    formato: "atlas-finanze-analisi",
    versione: 1,
    generato: new Date().toISOString(),

    comeLeggerlo: {
      cosaContiene:
        "Il registro personale di spese di una persona sola, tenuto con l'app ATLAS. "
        + "Ogni importo in questo file è in EURO come numero decimale: 18.5 sono diciotto euro e cinquanta.",
      periodo: movimenti.length
        ? `Dal ${movimenti[0].data} al ${movimenti[movimenti.length - 1].data}.`
        : "Nessun movimento registrato.",
      tipiDiMovimento: Object.fromEntries(Object.entries(TIPI).map(([k, v]) => [k, v.nome])),
      leRegoleCheContano: [
        "Un'uscita `eccezionale: true` è una una-tantum dichiarata tale. Conta nel totale speso ma va tenuta fuori da medie, previsioni e confronti fra mesi: è il motivo per cui esiste il campo.",
        "Un movimento di tipo `extra` NON è una spesa: è una ricarica presa dalla riserva perché il budget non è bastato. Contarlo come spesa raddoppierebbe il conto, perché la spesa vera è già registrata a parte. Il numero di `extra` in un mese è la misura di quanto il budget ha retto.",
        "Un movimento di tipo `giro` è uno spostamento fra conti dello stesso proprietario: non è né entrata né uscita, il patrimonio non cambia.",
        "Se una riga ha `euroEffettivo`, per i totali vale quello e non `euro`: un rimborso o un reso l'ha già ridotta.",
        "Le categorie con `pesaSullaSettimana: true` sono le uniche che dipendono da decisioni quotidiane. Le altre sono addebiti automatici o accantonamenti, e mescolarle alle prime rende illeggibile qualsiasi analisi di autocontrollo.",
        "`classe` divide le uscite in automatiche, necessarie e discrezionali. È su quelle discrezionali che ha senso cercare margini: le altre si cambiano solo cambiando contratto o casa.",
      ],
      cosaVuolDireClasse: NOMI_CLASSE,
      unitaDiMisura: {
        movimenti: "euro (decimali)",
        pockets: "euro (decimali)",
        ricorrentiEPrevisti: "euro (decimali)",
        budgetPerProfilo: "euro INTERI — è l'unico blocco con un'unità diversa, perché è così che si inseriscono nell'app",
      },
      sulCicloDelMese:
        "Il mese contabile non parte il giorno 1 ma dal giorno dello stipendio "
        + `(il ${s.config?.giornoStipendio || 1}). Il riepilogo qui sotto è invece raggruppato per mese di calendario, `
        + "che è più semplice da confrontare; i movimenti hanno la data esatta per rifare i conti in un altro modo.",
      sulSaldoDeiPocket:
        "Il campo `saldo` di un pocket è un SALDO CALCOLATO: ancora + movimenti da quella data in poi. "
        + "`ancora` è il valore dichiarato a mano l'ultima volta, e `ancoraDal` la data. "
        + "Il pocket ING è marcato `esterno`: le spese non lo attraversano, lo muovono solo i travasi espliciti.",
    },

    profilo: {
      entrateMensili: eur(s.config?.entrate),
      cassaSettimanale: eur(s.config?.cassaSettimanale),
      cassaSettimanaleSpiegazione:
        "Quanto passa ogni lunedì dal pocket Cassa al pocket Principale. È il budget della settimana per le spese di decisione quotidiana.",
      giornoStipendio: s.config?.giornoStipendio || 1,
      cicloCorrente: cicloDi(),
    },

    pockets: (s.pockets || []).map((p) => ({
      id: p.id,
      nome: p.nome,
      tipo: TIPI_POCKET[p.tipo]?.nome || p.tipo,
      saldo: eur(saldoPocket(p.id)),
      ancora: eur(p.saldo),
      ancoraDal: p.ancoraDa || s.config?.pocketDa || null,
      esterno: Boolean(p.external),
    })),

    categorie: cats.map((c) => ({
      id: c.id,
      nome: c.nome,
      sottocategorie: c.sub || [],
      pesaSullaSettimana: CATEGORIE_CASSA.includes(c.id),
    })),

    // ATTENZIONE, ed è l'unico punto del file dove le unità cambiano: i
    // budget dei profili si inseriscono in EURO INTERI, non in centesimi
    // come i movimenti. Passarli da `eur()` li dividerebbe per cento.
    budgetPerProfilo: Object.fromEntries(
      Object.entries(s.profili || {}).map(([id, p]) => [id, {
        nome: p.nome,
        cassaSettimanale: p.cassa,
        perCategoria: Object.fromEntries(
          Object.entries(p.b || {}).map(([cat, v]) => [nomeCat[cat] || cat, v])),
      }]),
    ),

    ricorrenti: ricorrentiVivi().map((r) => ({
      nome: r.nome,
      euro: eur(r.imp),
      cadenza: r.cadenza,
      giorno: r.giorno,
      categoria: nomeCat[r.cat] || r.cat,
      pocket: nomePocket[r.pocket] || r.pocket,
      attivo: r.attivo !== false,
      ultimaScadenzaSaldata: r.pagato || null,
      prossimaScadenza: r.attivo === false ? null : prossimaScadenza(r),
    })),

    previsti: previstiTutti().map((p) => ({
      nome: p.nome,
      euro: eur(p.imp),
      quando: p.quando || p.data || null,
      pocket: nomePocket[p.pocket] || p.pocket,
      pagatoIl: p.pagatoIl || null,
    })),

    riepilogoMensile: riepilogoMensile(movs, cats, nomeCat),

    movimenti,
  };
}

/**
 * I totali per mese e per categoria, già fatti.
 *
 * Le uscite eccezionali stanno in una colonna a parte invece che dentro il
 * totale: il mese della maxi rata, sommato agli altri, farebbe sembrare
 * fuori controllo un anno che non lo è.
 */
function riepilogoMensile(movs, cats, nomeCat) {
  const mesi = new Map();
  const vuoto = () => ({
    usciteOrdinarie: 0, usciteEccezionali: 0, entrate: 0, rimborsiSciolti: 0,
    sforamenti: 0, numeroSforamenti: 0,
    perCategoria: {}, perClasse: { automatico: 0, necessario: 0, discrezionale: 0 },
    numeroMovimenti: 0,
  });

  for (const m of movs) {
    const k = meseDi(m.data);
    if (!k) continue;
    if (!mesi.has(k)) mesi.set(k, vuoto());
    const r = mesi.get(k);
    r.numeroMovimenti++;

    if (m.tipo === "extra") { r.sforamenti += m.imp; r.numeroSforamenti++; continue; }
    if (m.tipo === "giro") continue;                       // neutro: non è né dentro né fuori

    // Un rimborso COLLEGATO a un'uscita è già stato scalato da quell'uscita
    // (`euroEffettivo`): sommarlo anche alle entrate lo conterebbe due volte,
    // e faceva salire il mese di dieci euro che non erano mai entrati. Uno
    // scollegato invece non lo scala nessuno, e va tenuto a parte perché non
    // è nemmeno un reddito.
    if (m.tipo === "rimb" || m.tipo === "reso") {
      if (!m.rif) r.rimborsiSciolti += m.imp;
      continue;
    }
    if (m.tipo !== "out") { r.entrate += m.imp; continue; }

    const eff = importoEffettivo(m);
    if (m.ecc) { r.usciteEccezionali += eff; continue; }
    r.usciteOrdinarie += eff;
    const nome = nomeCat[m.cat] || m.cat || "senza categoria";
    r.perCategoria[nome] = (r.perCategoria[nome] || 0) + eff;
    r.perClasse[classeDi(m.cat, m.sub)] += eff;
  }

  return [...mesi.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([mese, r]) => ({
    mese,
    usciteOrdinarie: eur(r.usciteOrdinarie),
    usciteEccezionali: eur(r.usciteEccezionali),
    entrate: eur(r.entrate),
    rimborsiNonCollegati: eur(r.rimborsiSciolti),
    sforamentiDallaRiserva: eur(r.sforamenti),
    numeroSforamenti: r.numeroSforamenti,
    numeroMovimenti: r.numeroMovimenti,
    perCategoria: Object.fromEntries(
      Object.entries(r.perCategoria).sort(([, a], [, b]) => b - a).map(([k, v]) => [k, eur(v)])),
    perClasse: Object.fromEntries(Object.entries(r.perClasse).map(([k, v]) => [k, eur(v)])),
  }));
}

/** Il file, con un nome che dice cos'è e di quando. */
export function scaricaAnalisi() {
  const testo = JSON.stringify(pacchettoAnalisi(), null, 2);
  const url = URL.createObjectURL(new Blob([testo], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `finanze-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return testo.length;
}

/**
 * Lo stesso pacchetto negli appunti.
 *
 * Serve su iPhone: da un'app installata sulla home il download di un file
 * finisce in un posto che poi va cercato, mentre incollare in una
 * conversazione è un gesto solo. Il testo è lo stesso.
 */
export async function copiaAnalisi() {
  const testo = JSON.stringify(pacchettoAnalisi(), null, 2);
  await navigator.clipboard.writeText(testo);
  return testo.length;
}

