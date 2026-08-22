// moduli/abitudini/calcolo.js — funzioni pure: stato → numeri.
//
// Nessun DOM, nessun localStorage, nessuna scrittura. È questa purezza che
// rende possibile `oggi()`: la home ha bisogno dei numeri di Abitudini
// senza montarne l'interfaccia.
//
// Tre tipi di pianificazione, e vale la pena averli chiari perché uno dei
// tre si comporta diversamente da come ci si aspetta:
//
//   daily   ogni giorno. `days` e `times` sono ignorati.
//   days    solo nei giorni elencati in `days` (0 = domenica, alla JS).
//   weekly  `times` volte A SETTIMANA, giorno libero. Non "times al giorno":
//           quell'errore produce una schermata che chiede tre spunte
//           quando ne serve una.
//
// `weekly` è l'unico che non si risolve guardando il solo giorno: per
// sapere se è attesa oggi bisogna contare i log della settimana.

import { abitudiniVive, eFatta, stato, partiDi, parteFatta, FASCE, fasciaAdesso } from "./dati.js";
import { isoDi, daISO, piuGiorni, oggiISO } from "../../core/ui.js";

const PREDEFINITA = { type: "daily", days: [1, 2, 3, 4, 5, 6, 0], times: 3 };

export const pianoDi = (h) => h.sched || PREDEFINITA;

/** Il giorno della settimana alla JavaScript: 0 = domenica. */
export const dowDi = (iso) => daISO(iso).getDay();

/** Il primo giorno della settimana che contiene `iso`, secondo le preferenze. */
export function inizioSettimana(iso) {
  const primo = stato().meta.weekStart === 0 ? 0 : 1;
  const d = daISO(iso);
  d.setDate(d.getDate() - ((d.getDay() - primo + 7) % 7));
  return isoDi(d);
}

export function giorniSettimana(iso) {
  const s = inizioSettimana(iso);
  return Array.from({ length: 7 }, (_, i) => piuGiorni(s, i));
}

/** Quante volte è stata fatta nella settimana di `iso`. */
export const conteggioSettimana = (h, iso) =>
  giorniSettimana(iso).filter((g) => eFatta(h.id, g)).length;

/**
 * L'abitudine esiste in quel giorno? Un'abitudine creata ieri non è
 * "saltata" tutti i giorni precedenti — senza questo controllo ogni nuova
 * abitudine nascerebbe con una serie interrotta alle spalle.
 */
export function ePrevista(h, iso) {
  if (h.created && iso < isoDi(new Date(h.created))) return false;
  const p = pianoDi(h);
  if (p.type === "days") return (p.days || []).includes(dowDi(iso));
  return true;   // daily e weekly esistono tutti i giorni
}

/**
 * Una settimanale diventa OBBLIGATORIA il giorno in cui saltarla ti farebbe
 * mancare la quota: quando i giorni rimasti bastano appena.
 *
 * È la regola che rende utile il tipo `weekly`. Senza, l'app o la chiede
 * ogni giorno (e allora tanto vale che sia `daily`) o non la chiede mai.
 */
export function settimanaleObbligatoria(h, iso) {
  const p = pianoDi(h);
  const quota = Math.max(1, p.times || 1);
  const fatte = conteggioSettimana(h, iso);
  if (fatte >= quota) return false;
  const giorni = giorniSettimana(iso);
  const i = giorni.indexOf(iso);
  if (i < 0) return false;
  const rimasti = 7 - i;               // oggi compreso
  return quota - fatte >= rimasti;
}

/** È attesa oggi? Per le settimanali: solo se obbligatoria o già fatta. */
export function eAttesa(h, iso) {
  if (!ePrevista(h, iso)) return false;
  if (pianoDi(h).type === "weekly") return settimanaleObbligatoria(h, iso) || eFatta(h.id, iso);
  return true;
}

/** Quante attese e quante fatte in un giorno. È il numero che vede la home. */
export function progressoGiorno(iso = oggiISO()) {
  let attese = 0, fatte = 0;
  for (const h of abitudiniVive()) {
    if (!ePrevista(h, iso)) continue;
    const p = pianoDi(h);
    if (p.type === "weekly") {
      // Una settimanale entra nel conteggio del giorno solo se è già stata
      // fatta o se oggi è diventata obbligatoria. Altrimenti gonfierebbe il
      // denominatore ogni giorno per una cosa che è in pari.
      if (eFatta(h.id, iso)) { attese++; fatte++; }
      else if (settimanaleObbligatoria(h, iso)) attese++;
      continue;
    }
    // Un'abitudine con parti conta per le sue parti: «integratori» sono
    // quattro spunte in tre momenti diversi, e contarla come una sola
    // faceva sembrare completa una giornata in cui ne avevi presi due.
    const parti = partiDi(h);
    if (parti.length) {
      attese += parti.length;
      fatte += parti.filter((p) => parteFatta(h.id, p.id, iso)).length;
      continue;
    }
    attese++;
    if (eFatta(h.id, iso)) fatte++;
  }
  return { attese, fatte, frazione: attese ? fatte / attese : 1 };
}

/** Le abitudini ancora da spuntare oggi. */
export const mancantiOggi = (iso = oggiISO()) =>
  abitudiniVive().filter((h) => eAttesa(h, iso) && !eFatta(h.id, iso));

/**
 * La serie in corso.
 *
 * Il dettaglio che conta: se oggi è prevista ma non ancora fatta, la serie
 * NON è spezzata — è solo "non ancora". Senza questa riga la striscia si
 * azzera ogni mattina e l'app diventa scoraggiante invece che motivante.
 */
export function serie(h, oggi = oggiISO()) {
  const p = pianoDi(h);

  if (p.type === "weekly") {
    const quota = Math.max(1, p.times || 1);
    let n = 0;
    let settimana = inizioSettimana(oggi);
    // La settimana corrente conta solo se la quota è già raggiunta.
    if (conteggioSettimana(h, settimana) >= quota) n++;
    settimana = piuGiorni(settimana, -7);
    for (let g = 0; g < 260; g++) {
      if (h.created && settimana < isoDi(new Date(h.created))) break;
      if (conteggioSettimana(h, settimana) < quota) break;
      n++;
      settimana = piuGiorni(settimana, -7);
    }
    return n;
  }

  let d = oggi, n = 0;
  if (ePrevista(h, d) && !eFatta(h.id, d)) d = piuGiorni(d, -1);
  for (let i = 0; i < 730; i++) {
    if (h.created && d < isoDi(new Date(h.created))) break;
    if (!ePrevista(h, d)) { d = piuGiorni(d, -1); continue; }
    if (!eFatta(h.id, d)) break;
    n++;
    d = piuGiorni(d, -1);
  }
  return n;
}

export function serieMigliore(h, oggi = oggiISO()) {
  const p = pianoDi(h);
  const partenza = h.created ? isoDi(new Date(h.created)) : piuGiorni(oggi, -365);
  let migliore = 0, corrente = 0;

  if (p.type === "weekly") {
    const quota = Math.max(1, p.times || 1);
    let w = inizioSettimana(partenza);
    const fine = inizioSettimana(oggi);
    while (w <= fine) {
      if (conteggioSettimana(h, w) >= quota) migliore = Math.max(migliore, ++corrente);
      else corrente = 0;
      w = piuGiorni(w, 7);
    }
    return migliore;
  }

  let d = partenza, guardia = 0;
  while (d <= oggi && guardia++ < 1500) {
    if (ePrevista(h, d)) {
      if (eFatta(h.id, d)) migliore = Math.max(migliore, ++corrente);
      else corrente = 0;
    }
    d = piuGiorni(d, 1);
  }
  return migliore;
}

/** La percentuale sugli ultimi N giorni previsti. */
export function costanza(h, giorni = 30, oggi = oggiISO()) {
  let previsti = 0, fatti = 0, d = oggi;
  for (let i = 0; i < giorni; i++) {
    if (ePrevista(h, d)) { previsti++; if (eFatta(h.id, d)) fatti++; }
    d = piuGiorni(d, -1);
  }
  return previsti ? Math.round((fatti * 100) / previsti) : 0;
}

/** L'etichetta leggibile del piano. */
export function etichettaPiano(h) {
  const p = pianoDi(h);
  if (p.type === "daily") return "Ogni giorno";
  if (p.type === "weekly") return `${p.times || 1}× a settimana`;
  const primo = stato().meta.weekStart === 0 ? 0 : 1;
  const giorni = [...(p.days || [])].sort((a, b) => ((a - primo + 7) % 7) - ((b - primo + 7) % 7));
  if (!giorni.length) return "Nessun giorno";
  if (giorni.length === 7) return "Ogni giorno";
  const nomi = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];
  return giorni.map((d) => nomi[d]).join(" · ");
}

/* ---------------------------------------------------------- i promemoria */
/*
   Le parti non ancora spuntate la cui fascia è ADESSO.

   È la ragione per cui le parti esistono: la home non deve dire «ti mancano
   4 integratori», deve dire «prendi il magnesio», perché alle dieci di sera
   il magnesio è l'unica delle quattro che ha ancora senso.
*/

export function promemoriaAdesso(iso = oggiISO(), ora = new Date().getHours()) {
  const fasce = fasciaAdesso(ora);
  const out = [];
  for (const h of abitudiniVive()) {
    if (!ePrevista(h, iso)) continue;
    for (const p of partiDi(h)) {
      const f = p.fascia || "qualsiasi";
      if (!fasce.includes(f)) continue;
      if (parteFatta(h.id, p.id, iso)) continue;
      out.push({
        habitId: h.id, parteId: p.id,
        abitudine: h.name, nome: p.nome,
        emoji: h.emoji, tint: h.tint,
        fascia: f, nomeFascia: FASCE[f]?.nome || "",
      });
    }
  }
  return out.sort((a, b) => (FASCE[a.fascia]?.ordine || 9) - (FASCE[b.fascia]?.ordine || 9));
}

/** Tutte le parti di oggi, spuntate o no. Serve al conteggio della home. */
export function partiDiOggi(iso = oggiISO()) {
  const out = [];
  for (const h of abitudiniVive()) {
    if (!ePrevista(h, iso)) continue;
    for (const p of partiDi(h)) {
      out.push({ habitId: h.id, parteId: p.id, nome: p.nome, fascia: p.fascia || "qualsiasi",
        fatta: parteFatta(h.id, p.id, iso) });
    }
  }
  return out;
}
