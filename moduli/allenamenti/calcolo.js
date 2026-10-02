// moduli/allenamenti/calcolo.js — funzioni pure: piano + corse → numeri.
//
// Nessun DOM, nessuna scrittura. È questa purezza che permette a `oggi()`
// di dare i suoi numeri alla home senza montare l'interfaccia del modulo.

import {
  PIANO, SETTIMANE, OBIETTIVO, slotDi, fatto, corseVive, stato,
  inizioSettimana, fineSettimana, settimanaDi, settimanaCorrente, pianoDi,
} from "./dati.js";
import { oggiISO, piuGiorni } from "../../core/ui.js";

/* ------------------------------------------------------------- formati -- */

/** Secondi → "mm:ss". Per i passi e per i tempi sotto l'ora. */
export function mmss(secondi) {
  const s = Math.max(0, Math.round(secondi));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Secondi al km → "4:00/km". */
export const passo = (secPerKm) => `${mmss(secPerKm)}/km`;

/** Km con una cifra, alla italiana. */
export const km = (n) => `${(Math.round((n || 0) * 10) / 10).toString().replace(".", ",")} km`;

/* --------------------------------------------------------- la settimana -- */

/** Quanti slot sono chiusi, e quanti sono in tutto. */
export function progressoSettimana(n) {
  /* SENZA I BONUS. Un allenamento in piu' non fa parte del programma:
     contarlo nel totale farebbe SCENDERE la percentuale della settimana
     appena lo aggiungi — cioe' il contrario di quello che e' successo. */
  const slot = slotDi(n).filter((s) => !s.bonus);
  const fatti = slot.filter((s) => fatto(s.id));
  return {
    fatti: fatti.length,
    totali: slot.length,
    corse: fatti.filter((s) => s.genere === "corsa").length,
    corseTotali: slot.filter((s) => s.genere === "corsa").length,
    palestra: fatti.filter((s) => s.genere === "palestra").length,
    palestraTotali: slot.filter((s) => s.genere === "palestra").length,
    frazione: slot.length ? fatti.length / slot.length : 0,
  };
}

/** I km che il piano prevede in una settimana: la somma dei tre slot di corsa. */
export const kmPrevisti = (n) =>
  slotDi(n).filter((s) => s.genere === "corsa").reduce((t, s) => t + (s.km || 0), 0);

/** Le corse davvero registrate dentro la settimana n. */
export const corseDi = (n) => {
  const da = inizioSettimana(n), a = fineSettimana(n);
  return corseVive().filter((c) => c.data >= da && c.data <= a);
};

export const kmFatti = (n) => corseDi(n).reduce((t, c) => t + (c.km || 0), 0);

/* ----------------------------------------------------------- andamento -- */

/**
 * Settimana per settimana: previsti, fatti, e se il tetto del +10% regge.
 *
 * Il tetto si misura sui km VERI, non su quelli del piano: è una regola che
 * protegge le articolazioni da quello che hai corso davvero, e confrontarla
 * col piano la renderebbe una decorazione.
 */
export function andamento(fino = settimanaCorrente()) {
  const righe = [];
  let precedenti = null;
  for (let n = 1; n <= SETTIMANE; n++) {
    const previsti = kmPrevisti(n);
    const fattiKm = kmFatti(n);
    const passata = n < fino;
    const corrente = n === fino;
    // Il tetto ha senso solo fra due settimane in cui hai corso davvero.
    const tetto = precedenti > 0 ? precedenti * 1.1 : null;
    righe.push({
      n, previsti, fatti: fattiKm, passata, corrente,
      fase: pianoDi(n)?.fase || "",
      scarico: Boolean(pianoDi(n)?.scarico),
      test: Boolean(pianoDi(n)?.test),
      tetto,
      sopraIlTetto: tetto !== null && fattiKm > tetto + 0.05,
    });
    if (fattiKm > 0) precedenti = fattiKm;
  }
  return righe;
}

export const kmTotali = () => corseVive().reduce((t, c) => t + (c.km || 0), 0);

/* --------------------------------------------------------- la proiezione -- */

/**
 * Dov'è il sub-20 rispetto a oggi.
 *
 * La formula è quella di Riegel — T₂ = T₁ × (D₂/D₁)^1.06 — che è il modo
 * standard di portare una prestazione su un'altra distanza. Si applica alla
 * corsa più veloce degli ultimi 42 giorni sopra i 3 km: sotto quella
 * distanza la proiezione su 5 km diventa fantasia, e più indietro di sei
 * settimane non racconta più la forma di adesso.
 *
 * Restituisce `null` quando non c'è abbastanza materiale, e la vista deve
 * dirlo invece di inventare un numero: una previsione costruita su una corsa
 * sola è esattamente il tipo di cifra che poi guida le decisioni sbagliate.
 */
export function proiezione(oggi = oggiISO()) {
  const da = piuGiorni(oggi, -42);
  const buone = corseVive().filter((c) => c.data >= da && (c.km || 0) >= 3 && (c.secondi || 0) > 0);
  if (!buone.length) return null;

  let migliore = null;
  for (const c of buone) {
    const secKm = c.secondi / c.km;
    if (!migliore || secKm < migliore.secKm) migliore = { ...c, secKm };
  }

  const t5 = migliore.secondi * Math.pow(OBIETTIVO.metri / 1000 / migliore.km, 1.06);
  return {
    da: migliore,
    secondi: t5,
    passo: t5 / 5,
    scarto: t5 - OBIETTIVO.secondi,      // positivo = ancora sopra il muro
    dentro: t5 <= OBIETTIVO.secondi,
    quante: buone.length,
  };
}

/**
 * Quanto vale una corsa SUI 5 KM, con Riegel.
 *
 * E' l'unica cosa che l'orologio non puo' dire: Garmin sa com'e' andata
 * quella corsa, non sa che stai andando verso un 5000 sotto i venti. Un
 * 3,53 in 17:01 e un 8 in 41:00 non si confrontano; i loro equivalenti sui
 * 5 km si', ed e' l'unico modo per vedere se stai avvicinandoti.
 *
 * `null` sotto i 2 km: l'esponente di Riegel regge fra il mezzo e il
 * doppio della distanza, e su uno sprint di 800 m darebbe un numero
 * bellissimo e falso.
 */
export function equivalente5k(c) {
  if (!c || !(c.km >= 2) || !(c.secondi > 0)) return null;
  return c.secondi * Math.pow(OBIETTIVO.metri / 1000 / c.km, 1.06);
}

/**
 * IL TETTO DI OGGI SULLA LUNGA: la corsa piu' lunga degli ultimi trenta
 * giorni, piu' il dieci per cento.
 *
 * Non e' una regola del piano, e' il freno che impedisce al piano di farti
 * male: il salto di distanza e' il modo piu' comune di rompersi, e in quattro
 * settimane non c'e' il tempo di rimettersi. `null` quando non c'e' storico —
 * senza dati un tetto sarebbe un numero inventato, e un numero inventato su
 * questa domanda e' peggio di nessun numero.
 */
export function tettoLunga(iso = oggiISO()) {
  const da = piuGiorni(iso, -30);
  const recenti = corseVive().filter((c) => c.data >= da && (c.km || 0) > 0);
  if (!recenti.length) return null;
  const max = Math.max(...recenti.map((c) => c.km));
  return Math.round(max * 1.1 * 10) / 10;
}

/* ------------------------------------------------------------- il resto -- */

/** Gli slot ancora aperti nella settimana n, nell'ordine del piano. */
export const restaSettimana = (n) => slotDi(n).filter((s) => !fatto(s.id));

/** Quanti giorni mancano alla fine della settimana n (oggi compreso). */
export function giorniRimasti(n, oggi = oggiISO()) {
  const a = fineSettimana(n);
  if (oggi > a) return 0;
  const da = oggi > inizioSettimana(n) ? oggi : inizioSettimana(n);
  return Math.round((new Date(`${a}T12:00:00`) - new Date(`${da}T12:00:00`)) / 86400000) + 1;
}

/** Quante settimane mancano al test, oggi compresa. */
export function settimaneAlTest(oggi = oggiISO()) {
  const n = settimanaDi(oggi);
  if (n === null) return oggi < inizioSettimana(1) ? SETTIMANE : 0;
  return SETTIMANE - n + 1;
}

/** La data del test: l'ultimo giorno del blocco. */
export const giornoTest = () => fineSettimana(SETTIMANE);

/* ------------------------------------------------- il vincolo del piano -- */
/*
   «MAI PALESTRA GAMBE IL GIORNO PRIMA DELLA QUALITÀ.»

   È scritto nel piano, e finché sta solo scritto è una cosa che ti devi
   ricordare tu il martedì sera. L'app invece sa cosa hai spuntato e quando:
   può dirtelo nel momento in cui serve, che è l'unico modo in cui una regola
   smette di essere una nota a piè di pagina.

   La lunga no, e nemmeno quello è un dettaglio: il piano precisa che
   «tollera le gambe stanche, è in Z2». Dire «oggi niente corsa» sarebbe più
   prudente e sbagliato — toglierebbe di mezzo l'allenamento che proprio
   oggi si può fare.
*/

/** Hai fatto stacchi o squat in quel giorno? Vale su tutto il blocco. */
export const gambeIl = (iso) =>
  (stato().slot || []).some((r) => r && !r.del && r.fatta && r.giorno === iso
    && /-(lower|total)$/.test(r.id));

/**
 * Una riga di consiglio, o `null`.
 *
 * `null` la maggior parte dei giorni, ed è voluto: una riga che compare
 * sempre diventa parte dell'arredamento e smette di essere letta proprio il
 * giorno in cui dice qualcosa. Parla solo quando sa una cosa che l'elenco
 * degli slot non mostra da sé.
 */
export function consiglio(n, oggi = oggiISO()) {
  const aperti = restaSettimana(n);
  if (!aperti.length) return null;

  /* LE DUE SEDUTE DURE. Nella fase 5K la «qualita'» si e' sdoppiata in
     intervalli e soglia: sono quelle che chiedono gambe fresche, e le
     regole che valevano per una valgono per tutte e due. */
  const dura = aperti.find((s) => s.chiave === "intervalli" || s.chiave === "soglia");
  const piano = pianoDi(n);

  // La settimana del test ha una regola sua, più forte di tutte le altre.
  if (piano?.test && aperti.some((s) => s.genere === "palestra")) {
    return { tono: "avviso", testo: "Settimana del test: la palestra va a inizio settimana, e solo upper." };
  }

  if (dura && gambeIl(piuGiorni(oggi, -1))) {
    return { tono: "avviso", testo: `Gambe ieri: oggi ${dura.nome.toLowerCase()} no. La lunga sì, è in Z2.` };
  }

  // Le sedute dure chiedono gambe fresche. Lasciarle per ultime è il modo
  // tipico di sprecarle, e succede perché sono anche le più faticose da
  // cominciare.
  if (dura && giorniRimasti(n, oggi) <= 3) {
    return { tono: "avviso", testo: `${dura.nome} è ancora aperta, e va fatta da freschi. Non lasciarla a domenica.` };
  }
  return null;
}

/**
 * Lo stato della settimana in una parola, e serve alla home.
 *
 * «indietro» non guarda solo quanto manca: guarda quanto manca RISPETTO ai
 * giorni che restano. Tre slot aperti di mercoledì sono normali, tre slot
 * aperti di sabato sono una settimana che non si chiude più.
 */
export function passoSettimana(n, oggi = oggiISO()) {
  const p = progressoSettimana(n);
  const aperti = p.totali - p.fatti;
  if (!aperti) return "chiusa";
  const giorni = giorniRimasti(n, oggi);
  if (giorni <= 0) return "persa";
  return aperti > giorni ? "indietro" : "in pari";
}
