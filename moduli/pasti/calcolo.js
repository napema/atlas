// moduli/pasti/calcolo.js — quanto serve, quanto è arrivato, e cosa tende a
// ripetersi. Puro: legge lo stato, non lo scrive, non tocca il DOM.
//
// LA REGOLA DI LETTURA DI TUTTO IL FILE: il piano è il registro.
//
// Il bilancio di una giornata non si costruisce sommando quello che l'utente
// ha registrato — non registra quasi mai. Si costruisce così:
//
//     previsto dal piano  +  scostamenti dichiarati  =  la giornata
//
// dove il previsto, fascia per fascia, è il pasto pianificato se quel giorno
// si mangia a casa, la stima del profilo se si mangia fuori, e zero se quella
// fascia non la fa. Uno `scostamento` di tipo `cambio` o `salto` toglie il
// previsto di quella fascia prima di aggiungere il suo.

import {
  FASCE, ID_FASCE, ATTIVITA, OBIETTIVI, slug,
  profilo, pesoAttuale, pianoSettimana, pasto, pastiPerFascia, scostamentiDi,
  regimeDi, lunediDi, giorniSettimana,
} from "./dati.js";
import { oggiISO, daISO } from "../../core/ui.js";

/* =========================================================================
   IL FABBISOGNO
   ========================================================================= */

/**
 * Anni compiuti.
 *
 * Due strade, e la seconda esiste per un motivo pratico: l'utente l'età la
 * dice («23»), la data di nascita quasi mai. Un 23 salvato liscio però
 * invecchia male — fra due anni il fabbisogno sarebbe calcolato su un
 * ventitreenne che non esiste più. Quindi si salva insieme al GIORNO in cui
 * è stata dichiarata, e da lì si contano gli anni passati. Non è preciso al
 * mese come una data di nascita, ma non mente col tempo.
 */
export function eta(p = profilo()) {
  if (p?.nascita) {
    const n = daISO(p.nascita), o = new Date();
    let a = o.getFullYear() - n.getFullYear();
    const m = o.getMonth() - n.getMonth();
    if (m < 0 || (m === 0 && o.getDate() < n.getDate())) a -= 1;
    return a >= 10 && a <= 100 ? a : null;
  }
  if (p?.etaDichiarata && p?.etaDichiarataIl) {
    // Anni di CALENDARIO, non millisecondi diviso un anno medio: dividendo
    // per 365,2425 il giorno dell'anniversario dà 1,998 e il floor lo taglia
    // a 1. Sbagliava di un anno esattamente quando doveva scattare.
    const da = daISO(p.etaDichiarataIl), o = new Date();
    let passati = o.getFullYear() - da.getFullYear();
    const m = o.getMonth() - da.getMonth();
    if (m < 0 || (m === 0 && o.getDate() < da.getDate())) passati -= 1;
    const a = Number(p.etaDichiarata) + Math.max(0, passati);
    return a >= 10 && a <= 100 ? a : null;
  }
  return null;
}

/**
 * Metabolismo basale, Mifflin-St Jeor.
 *
 * È la formula che sbaglia meno sulla popolazione generale — Harris-Benedict
 * sovrastima di un 5% abbondante — e soprattutto è quella che usano tutte le
 * app con cui l'utente confronterà il numero. Un numero giusto ma diverso da
 * quello che leggi altrove viene creduto sbagliato.
 *
 * `ETA_DI_RIPIEGO` serve solo finché l'assessment non ha chiesto la data di
 * nascita: nella formula l'età pesa 5 kcal per anno, quindi sbagliarla di
 * cinque anni sposta il fabbisogno di 25 kcal su tremila. Poco — ma è un
 * ripiego dichiarato, non un dato.
 */
export const ETA_DI_RIPIEGO = 25;

export function metabolismoBasale({ kg = pesoAttuale(), p = profilo() } = {}) {
  const cm = Number(p.altezzaCm) || 0;
  if (!kg || !cm) return 0;
  const anni = eta(p) ?? ETA_DI_RIPIEGO;
  const base = 10 * kg + 6.25 * cm - 5 * anni;
  return Math.round(base + (p.sesso === "f" ? -161 : 5));
}

/** Mantenimento: basale per il fattore di attività dichiarato. */
export function mantenimento(opzioni = {}) {
  const p = opzioni.p || profilo();
  const f = ATTIVITA[p.attivita]?.fattore || 1.55;
  return Math.round(metabolismoBasale(opzioni) * f);
}

/**
 * I bersagli del giorno: calorie e i tre macro in grammi.
 *
 * L'ordine del calcolo non è arbitrario. Proteine e grassi si fissano sul
 * PESO, perché sono fabbisogni; i carboidrati prendono quello che resta,
 * perché sono il carburante. Fare il contrario — fissare i carboidrati e
 * lasciare alle proteine l'avanzo — è il modo in cui una dieta in massa
 * finisce per ingrassare invece che costruire.
 */
export function bersagli(opzioni = {}) {
  const p = opzioni.p || profilo();
  if (p.bersagliManuali) return { ...p.bersagliManuali, manuali: true };

  const kg = opzioni.kg ?? pesoAttuale();
  const base = mantenimento({ ...opzioni, p });
  if (!base || !kg) return { kcal: 0, p: 0, c: 0, g: 0, manuali: false };

  const segno = OBIETTIVI[p.obiettivo]?.segno ?? 0;
  const kcal = Math.round(base + segno * (Number(p.surplusKcal) || 0));

  const prot = Math.round((Number(p.proteineGkg) || 2) * kg);
  const gras = Math.round((Number(p.grassiGkg) || 0.9) * kg);
  // Quello che avanza va ai carboidrati, e non può essere negativo: con un
  // deficit aggressivo e proteine alte la sottrazione andrebbe sotto zero.
  const carb = Math.max(0, Math.round((kcal - prot * 4 - gras * 9) / 4));

  return { kcal, p: prot, c: carb, g: gras, manuali: false, mantenimento: base };
}

/* =========================================================================
   LA GIORNATA
   ========================================================================= */

const ZERO = () => ({ kcal: 0, p: 0, c: 0, g: 0 });

const somma = (a, b) => ({
  kcal: a.kcal + (b?.kcal || 0),
  p: a.p + (b?.p || 0),
  c: a.c + (b?.c || 0),
  g: a.g + (b?.g || 0),
});

export const macroDi = (x) => (x ? { kcal: x.kcal || 0, p: x.p || 0, c: x.c || 0, g: x.g || 0 } : ZERO());

/**
 * Cosa DOVREBBE esserci in una fascia, prima degli scostamenti.
 *
 * Restituisce anche `certo`: falso quando la fascia è `casa` ma il piano di
 * quella settimana non esiste ancora. La differenza fra «zero perché non
 * mangi» e «zero perché non lo so» non è un dettaglio: la seconda, mostrata
 * come un numero, è una bugia.
 */
export function previstoFascia(iso, fascia) {
  const regime = regimeDi(iso, fascia);
  if (regime === "salto") return { regime, certo: true, macro: ZERO(), nome: null, pastoId: null };

  if (regime === "fuori") {
    const stima = profilo().stimeFuori?.[fascia];
    return {
      regime, certo: Boolean(stima),
      macro: macroDi(stima), nome: stima ? "Fuori (stima)" : null, pastoId: null,
    };
  }

  const piano = pianoSettimana(lunediDi(iso));
  const id = piano?.giorni?.[iso]?.[fascia] || null;
  const scelto = id ? pasto(id) : null;
  return {
    regime, certo: Boolean(scelto),
    macro: macroDi(scelto), nome: scelto?.nome || null, pastoId: id,
  };
}

/**
 * La giornata intera: previsto, scostamenti, e il totale che ne esce.
 *
 * Un `cambio` o un `salto` ANNULLANO il previsto della loro fascia. Senza
 * questo, dichiarare di aver mangiato altro al posto della cena farebbe
 * contare due cene, e il giorno in cui l'utente è più preciso sarebbe quello
 * in cui i numeri sbagliano di più.
 */
export function giornata(iso = oggiISO()) {
  const scost = scostamentiDi(iso);
  const annullate = new Set(scost.filter((s) => s.tipo === "cambio" || s.tipo === "salto").map((s) => s.fascia));

  const fasce = FASCE.map((f) => {
    const prev = previstoFascia(iso, f.id);
    const spento = annullate.has(f.id);
    return {
      fascia: f.id, nome: f.nome, ...prev,
      contato: spento ? ZERO() : prev.macro,
      sostituito: spento,
    };
  });

  let totale = fasce.reduce((t, f) => somma(t, f.contato), ZERO());
  for (const s of scost) {
    if (s.tipo === "salto") continue;          // il salto toglie e basta
    totale = somma(totale, macroDi(s));
  }

  // Incerto quando una fascia prevista non sa ancora cosa contiene: il
  // totale c'è lo stesso, ma chi lo disegna deve poterlo dire.
  const incerte = fasce.filter((f) => !f.certo && !f.sostituito && f.regime !== "salto");

  return { data: iso, fasce, scostamenti: scost, totale, incerte: incerte.map((f) => f.fascia) };
}

/** Quanto manca (positivo) o di quanto hai sforato (negativo) rispetto ai bersagli. */
export function resta(iso = oggiISO(), b = bersagli()) {
  const t = giornata(iso).totale;
  return { kcal: b.kcal - t.kcal, p: b.p - t.p, c: b.c - t.c, g: b.g - t.g, totale: t, bersagli: b };
}

/** La settimana: i sette totali e la media. La media conta più del singolo giorno. */
export function settimana(lunedi = lunediDi()) {
  const giorni = giorniSettimana(lunedi).map((iso) => ({ iso, ...giornata(iso) }));
  const tot = giorni.reduce((t, g) => somma(t, g.totale), ZERO());
  const n = giorni.length || 1;
  return {
    lunedi, giorni, totale: tot,
    media: { kcal: Math.round(tot.kcal / n), p: Math.round(tot.p / n), c: Math.round(tot.c / n), g: Math.round(tot.g / n) },
  };
}

/* =========================================================================
   LE TENDENZE — derivate, mai salvate.

   «Se importo tre volte il panino col prosciutto alle 10:30, sai che è una
   tendenza.» Vero, ed è un conto sul registro. Tenerne una lista a parte
   vorrebbe dire una seconda fonte di verità che si fonde per conto suo e
   che, alla prima divergenza, contraddice il registro che l'ha prodotta.
   ========================================================================= */

/** Quante volte una cosa deve tornare prima di chiamarla abitudine. */
export const SOGLIA_TENDENZA = 3;

/**
 * Le cose che si ripetono, più frequenti per prime.
 *
 * Raggruppa per NOME e FASCIA, non per orario esatto: lo stesso panino alle
 * 10:28 e alle 10:41 è lo stesso gesto, e un raggruppamento al minuto non
 * troverebbe mai niente. L'ora tipica che esce è la mediana — la media la
 * sposterebbe una volta sola che l'hai mangiato a mezzanotte.
 */
export function tendenze({ settimane = 8, soglia = SOGLIA_TENDENZA, quando = oggiISO() } = {}) {
  const da = new Date(daISO(quando).getTime() - settimane * 7 * 86400000)
    .toISOString().slice(0, 10);

  const gruppi = new Map();
  for (const r of scostamentiNelPeriodo(da, quando)) {
    if (r.tipo === "salto" || !r.nome) continue;
    const chiave = `${slug(r.nome)}|${r.fascia || "-"}`;
    if (!gruppi.has(chiave)) {
      gruppi.set(chiave, { chiave, nome: r.nome, fascia: r.fascia, pastoId: r.pastoId, volte: 0, ore: [], macro: macroDi(r), ultima: r.data });
    }
    const g = gruppi.get(chiave);
    g.volte += 1;
    if (r.ora) g.ore.push(r.ora);
    if (r.data > g.ultima) { g.ultima = r.data; g.macro = macroDi(r); }
  }

  return [...gruppi.values()]
    .filter((g) => g.volte >= soglia)
    .map((g) => ({ ...g, ora: mediana(g.ore) }))
    .sort((a, b) => b.volte - a.volte || b.ultima.localeCompare(a.ultima));
}

function mediana(ore) {
  if (!ore.length) return "";
  const m = [...ore].sort();
  return m[Math.floor(m.length / 2)];
}

// Importato qui e non in cima per tenere insieme la sezione: è l'unica
// lettura del registro che guarda un intervallo invece di un giorno.
function scostamentiNelPeriodo(da, a) {
  const giorni = [];
  for (let d = daISO(da); d <= daISO(a); d = new Date(d.getTime() + 86400000)) {
    giorni.push(d.toISOString().slice(0, 10));
  }
  return giorni.flatMap((iso) => scostamentiDi(iso));
}

/**
 * Le tendenze che varrebbe la pena promuovere a pasto del database.
 *
 * Solo quelle che non ci sono già: suggerire di aggiungere una cosa che hai
 * già fa sembrare che l'app non sappia cosa contiene.
 */
export function daPromuovere(opzioni) {
  return tendenze(opzioni).filter((t) => !t.pastoId && !pasto(`p-${slug(t.nome)}`));
}

/* =========================================================================
   LA DIAGNOSI — dove il piano non regge, detta una volta sola.
   ========================================================================= */

/**
 * Controlla che con i pasti dichiarati i bersagli siano raggiungibili.
 *
 * Serve all'assessment e alle impostazioni, non alla schermata di ogni
 * giorno: un'app che ogni mattina ti ricorda che sei sotto di 700 calorie
 * è un'app che si disinstalla. Lo si dice una volta, dove si sistema.
 */
export function copertura() {
  const b = bersagli();
  const avvisi = [];
  const p = profilo();

  for (const f of FASCE) {
    const giorniCasa = p.settimanaTipo.filter((g) => g?.[f.id] === "casa").length;
    if (!giorniCasa) continue;
    const quanti = pastiPerFascia(f.id).length;
    if (quanti < 3 && giorniCasa >= 3) {
      avvisi.push({
        tipo: "poca-varieta", fascia: f.id,
        testo: `${quanti} ${quanti === 1 ? "opzione" : "opzioni"} per ${f.nome.toLowerCase()}, ma la fai ${giorniCasa} giorni su 7.`,
      });
    }
  }

  return { bersagli: b, avvisi };
}
