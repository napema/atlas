// moduli/finanze/pesa.js — una voce della lista d'attesa, pesata fino in fondo.
//
// LA DOMANDA. La carta della lista dice tre «da X a Y» e si ferma lì: dice
// cosa cambia, non cosa fare. Ma davanti a un profumo da 95 € le domande
// vere sono altre: da dove escono, quali travasi devo fare, ha senso adesso
// o è meglio aspettare, e quanto vale davvero quella cifra. È la stessa
// domanda che la domenica andava a una chat, ristretta a una cosa sola.
//
// LE QUATTRO FONTI, in ordine di quanto costa attingerci:
//
//   SETTIMANA   Principale + Cassa, cioè la razione dei giorni che restano
//               fino allo stipendio. Costa una razione più bassa, e basta.
//   STIPENDIO   aspettare il prossimo e pagarlo con la Vita del ciclo dopo.
//               Costa i giorni di attesa — che sono anche il tempo in cui
//               la voglia passa — e una razione un po' più bassa dopo.
//   ING         la riserva. Costa il punto più basso dei prossimi dodici
//               mesi, quello che deve reggere bollo e assicurazione.
//   FONDO       l'obiettivo. Costa settimane di ritardo sul traguardo.
//
// IL CONSIGLIO è la prima fonte che regge, in quell'ordine. Stringere è
// un consiglio solo quando costa poco — un quarto della razione al massimo:
// 15 € che portano la giornata da 10,75 a 9,60 si assorbono, 95 € che la
// portano a 3,41 per tredici giorni no, e lì aspettare vince. Non ci sono
// preferenze nascoste: ogni fonte porta con sé i suoi numeri, e la
// schermata li mostra tutti.
//
// Funzioni pure, niente DOM, niente scritture: come piano.js.

import { stato, vociLista, statoVoce } from "./dati.js";
import { cicloDi, prossimoStipendio, giorniFra } from "./calcolo.js";
import {
  quotaDi, quotaDiPiano, budgetVita, ingPrevisto, tiroObiettivo, fuoriPianoDelCiclo, soglie,
} from "./piano.js";
import { pianoTravasi } from "./travasi.js";
import { oggiISO } from "../../core/ui.js";

/* LE ORE DI LAVORO DI UN MESE. Lunedì–giovedì 08–17 con un'ora di pausa
   sono 8 ore, il venerdì 08–12 sono 4: 36 a settimana, 156 al mese. È una
   misura, non una paga oraria: serve a tradurre un prezzo in qualcosa che
   si sente. */
const ORE_MESE = (36 * 52) / 12;

/* Sotto questa frazione della quota minima la settimana non è «stretta»:
   è finita. 6 € al giorno sono un caffè e un panino; 3 € non sono niente. */
const FONDO_STRETTO = 0.6;
/* Quanto della razione si può cedere perché «stringi» sia un consiglio e
   non una punizione. */
const STRINGI_FINO = 0.25;

/**
 * Tutto quello che serve a decidere su un prezzo.
 *
 * `id` è la voce della lista: serve solo a escluderla dal «resto della
 * lista», che è l'altra domanda da farsi — non questa cosa, ma tutte
 * quelle che aspetti insieme.
 */
export function pesaVoce(prezzo, iso = oggiISO(), { id = null, adesso = Date.now() } = {}) {
  const s = soglie();
  const minima = s.quotaMinima || 0;
  const q = quotaDi(iso);
  const paga = prossimoStipendio(iso);
  const attesa = Math.max(0, giorniFra(iso, paga) - 1);

  /* ---------------------------------------------------- QUANTO VALE -- */
  const entrate = (Number(stato().config?.entrate) || 0) * 100;
  const allOra = entrate > 0 ? entrate / ORE_MESE : 0;
  const razionePiano = quotaDiPiano(iso);
  const o = tiroObiettivo(iso);
  const vale = {
    ore: allOra > 0 ? prezzo / allOra : null,
    allOra,
    // In giorni della razione DEL PIANO, non di quella di oggi: la razione
    // di oggi cambia con la settimana, il piano no.
    giorni: razionePiano > 0 ? prezzo / razionePiano : null,
    razionePiano,
    // In giorni di risparmio per l'obiettivo: un versamento al mese.
    giorniFondo: o?.versamento > 0 ? (prezzo / o.versamento) * (365 / 12) : null,
    nomeFondo: o?.nome || null,
  };

  /* ---------------------------------------------------- LE FONTI ------ */
  const fonti = [];

  // 1. LA SETTIMANA. Il conto è quello della carta: lo spendibile di inizio
  //    giornata diviso i giorni, prima e dopo il prezzo.
  {
    const dopo = Math.floor(Math.max(0, q.spendibile - prezzo) / Math.max(1, q.giorni));
    const piano = pianoTravasi(iso, { spesa: prezzo });
    const verdetto = q.spendibile < prezzo || dopo < minima * FONDO_STRETTO ? "no"
      : dopo < minima ? "stretto"
      : "regge";
    fonti.push({
      id: "settimana",
      verdetto,
      da: q.quota, a: dopo, giorni: q.giorni,
      conti: {
        // STAMATTINA, non adesso: la quota si divide sul saldo di inizio
        // giornata, e i conti mostrati devono essere quelli fatti davvero.
        inizio: q.spendibile + q.impegni, impegni: q.impegni, spendibile: q.spendibile,
        dopo: q.spendibile - prezzo, giorni: q.giorni, fine: q.fine,
      },
      // I travasi CON l'acquisto: cosa spostare perché la settimana regga
      // anche dopo. Se non basta nemmeno la Cassa, `manca` lo dice.
      mosse: piano.esito === "stipendio" ? [] : piano.mosse,
      manca: piano.esito === "stipendio" ? 0 : piano.manca,
      razione: piano.esito === "stipendio" ? dopo : piano.razione,
    });
  }

  // 2. LO STIPENDIO. Il prezzo esce dalla Vita del ciclo dopo.
  {
    const vita = budgetVita();
    const giorniDopo = cicloDi(paga).giorni;
    const da = quotaDiPiano(paga);
    const a = Math.floor(Math.max(0, vita - prezzo) / Math.max(1, giorniDopo));
    const verdetto = vita <= 0 || vita < prezzo || a <= 0 ? "no"
      : a < minima ? "stretto"
      : "regge";
    fonti.push({
      id: "stipendio",
      verdetto,
      da, a, giorni: giorniDopo, paga, attesa,
      conti: { vita, dopo: vita - prezzo, giorni: giorniDopo },
      mosse: [],
    });
  }

  // 3. ING. Il minimo previsto dei prossimi dodici mesi, prima e dopo.
  {
    const ing = ingPrevisto(iso);
    const dopo = ingPrevisto(iso, -prezzo);
    const pavimento = s.ingPrevistoMin || 0;
    const verdetto = dopo.minimo < 0 ? "no"
      : dopo.minimo < pavimento ? (ing.minimo < pavimento ? "no" : "stretto")
      : "regge";
    fonti.push({
      id: "ing",
      verdetto,
      da: ing.minimo, a: dopo.minimo, quando: dopo.quando, pavimento,
      giaSotto: ing.minimo < pavimento,
      saldo: ing.saldo,
      mosse: [{ da: "ing", a: "principale", imp: Math.ceil(prezzo / 100) * 100, perche: "il prezzo" }],
    });
  }

  // 4. IL FONDO. Il gap si allarga esattamente del prezzo; il ritardo è
  //    quanti giorni di versamenti servono a rimetterlo.
  if (o) {
    const avanzo = o.cela ? o.avanzo : 0;
    const verdetto = o.cela && avanzo >= prezzo ? "regge" : "no";
    fonti.push({
      id: "fondo",
      verdetto,
      da: o.gap, a: Math.max(0, o.gap + prezzo - avanzo),
      nome: o.nome, target: o.target, data: o.data,
      ritardo: vale.giorniFondo,
      mosse: [{ da: "fondo", a: "principale", imp: Math.ceil(prezzo / 100) * 100, perche: "il prezzo" }],
    });
  }

  /* ---------------------------------------------------- IL CONSIGLIO -- */
  const per = Object.fromEntries(fonti.map((f) => [f.id, f]));
  const sett = per.settimana, stip = per.stipendio;
  const settPuo = sett.verdetto !== "no" && !sett.manca;
  const cede = sett.da > 0 ? (sett.da - sett.a) / sett.da : 1;
  let consiglio;
  if (sett.verdetto === "regge" && !sett.manca) consiglio = { tipo: "adesso", fonte: "settimana" };
  else if (settPuo && cede <= STRINGI_FINO) consiglio = { tipo: "stringi", fonte: "settimana" };
  else if (stip.verdetto !== "no") consiglio = { tipo: "aspetta", fonte: "stipendio" };
  else if (settPuo) consiglio = { tipo: "stringi", fonte: "settimana" };
  else if (per.ing.verdetto === "regge") consiglio = { tipo: "riserva", fonte: "ing" };
  else consiglio = { tipo: "no", fonte: null };

  /* ---------------------------------------------------- IL CONTESTO --- */
  const voci = vociLista().map((v) => ({ ...v, vista: statoVoce(v, adesso) }));
  const altre = voci.filter((v) => v.id !== id && (v.vista === "attesa" || v.vista === "sbloccata"));
  const resto = altre.reduce((t, v) => t + (v.imp || 0), 0);
  const tutte = prezzo + resto;
  const scartate = voci.filter((v) => v.vista === "scartata");
  const fp = fuoriPianoDelCiclo(cicloDi(iso), iso);

  return {
    prezzo, iso, paga, attesa, minima,
    vale, fonti, per, consiglio,
    contesto: {
      altre: altre.length, resto, tutte,
      // La razione se comprassi tutta la lista oggi: la cosa che una voce
      // alla volta non fa mai vedere.
      tutteRazione: altre.length
        ? Math.floor(Math.max(0, q.spendibile - tutte) / Math.max(1, q.giorni)) : null,
      scartate: scartate.length,
      risparmiato: scartate.reduce((t, v) => t + (v.imp || 0), 0),
      fuoriPiano: fp.totale, fuoriPianoN: fp.n,
    },
  };
}
