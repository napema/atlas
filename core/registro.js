// registro.js — l'elenco dei moduli e il contratto che devono rispettare.
//
// È il ponte fra la shell e i moduli, e l'UNICO file da toccare per
// aggiungerne uno: si aggiunge una voce qui, e barra, router, sync e
// schermata Oggi lo prendono da soli.
//
// ---------------------------------------------------------------------
// IL CONTRATTO — ogni moduli/<id>/modulo.js esporta di default:
//
//   {
//     async monta(contenitore, posizione) {}   // disegna. `posizione` dice
//                                              // dove si trova: vedi router.js
//     smonta() {}                              // stacca ascoltatori, ferma timer
//     oggi() { return {...} | null }           // la scheda per la home
//     avviaSync() {}                           // apre il proprio canale
//   }
//
// `id`, `nome`, `icona` e `accento` NON li dichiara il modulo: stanno qui.
// Un modulo non può spostarsi nella barra o cambiarsi colore da solo.
//
// `oggi()` è SINCRONA e SENZA EFFETTI COLLATERALI. Restituisce
//   { titolo, valore, dettaglio, urgente, azione: { etichetta, rotta } }
// oppure null. La home la chiama a ogni apertura: se legge dalla rete o
// scrive da qualche parte, la home diventa lenta e imprevedibile.
//
// `pubblica` e `ascolta` non sono codice: sono la mappa di chi parla con
// chi (vedi bus.js). Tenerla aggiornata è ciò che permette di rinominare un
// evento senza rompere in silenzio un altro modulo.
// ---------------------------------------------------------------------


import { avviaSync as sincronizzaContesto } from "./contesto.js";

/**
 * L'ordine di questa lista è l'ordine della barra in basso.
 * Il caricamento è pigro: il codice di un modulo arriva solo quando lo apri.
 * È il motivo per cui ATLAS può crescere senza che l'avvio rallenti.
 */
export const MODULI = [
  {
    id: "oggi",
    nome: "Oggi",
    icona: "sole",
    accento: "var(--blu)",
    carica: () => import("../moduli/oggi/modulo.js"),
    pubblica: [],
    ascolta: ["giorno:cambiato", "fatto:scritto", "dati:arrivati"],
  },
  {
    id: "finanze",
    nome: "Finanze",
    icona: "portafoglio",
    accento: "var(--verde)",
    carica: () => import("../moduli/finanze/modulo.js"),
    // Previsti: "finanze:movimento-registrato" — permetterà ad Abitudini di
    // spuntare da sé un'eventuale abitudine "segnare le spese".
    pubblica: [],
    ascolta: [],
  },
  {
    id: "mobilita",
    nome: "Mobilità",
    icona: "corpo",
    accento: "var(--blu)",
    carica: () => import("../moduli/mobilita/modulo.js"),
    // Previsti: "mobilita:sessione-completata" — è l'annuncio che evita
    // all'utente di spuntare a mano un'abitudine che ha appena fatto.
    pubblica: [],
    ascolta: [],
  },
  {
    id: "abitudini",
    nome: "Abitudini",
    icona: "spunta",
    accento: "var(--viola)",
    carica: () => import("../moduli/abitudini/modulo.js"),
    pubblica: [],
    // Previsto: ascolterà "mobilita:sessione-completata".
    ascolta: [],
  },
  {
    id: "impostazioni",
    nome: "Impostazioni",
    icona: "ingranaggio",
    accento: "var(--etichetta-2)",
    carica: () => import("../moduli/impostazioni/modulo.js"),
    pubblica: [],
    ascolta: [],
  },
];

/** I moduli con una scheda nella barra. Impostazioni si raggiunge da Oggi. */
export const MODULI_IN_BARRA = MODULI.filter((m) => m.id !== "impostazioni");

/** I tre moduli veri: quelli che hanno dati propri e una scheda nella home. */
export const MODULI_DATI = MODULI.filter((m) => !["oggi", "impostazioni"].includes(m.id));

const caricati = new Map();

/** Carica (una volta sola) e restituisce l'oggetto modulo. */
export async function prendiModulo(id) {
  if (caricati.has(id)) return caricati.get(id);
  const voce = MODULI.find((m) => m.id === id);
  if (!voce) return null;
  const mod = (await voce.carica()).default;
  const completo = {
    ...mod,
    id: voce.id, nome: voce.nome, icona: voce.icona, accento: voce.accento,
    pubblica: voce.pubblica || [], ascolta: voce.ascolta || [],
  };
  caricati.set(id, completo);
  return completo;
}

/** I moduli già caricati in questa sessione. */
export const moduliCaricati = () => [...caricati.values()];

/**
 * Apre tutti i canali di sincronizzazione, compreso quello della lavagna
 * del giorno.
 *
 * Va fatto una volta all'avvio, in sottofondo, e per TUTTI i moduli — non
 * solo per quello aperto. I dati di Finanze devono arrivare anche mentre
 * guardi Mobilità, altrimenti la home mostra numeri vecchi e non si capisce
 * perché.
 */
export async function avviaTuttiISync() {
  // La lavagna per prima: è il pezzo che gli altri leggono.
  try {
    sincronizzaContesto();
  } catch (e) { console.error("[registro] sync della lavagna non avviato", e); }

  const esiti = await Promise.allSettled(MODULI.map((m) => prendiModulo(m.id)));
  for (const e of esiti) {
    if (e.status !== "fulfilled" || !e.value?.avviaSync) continue;
    try { e.value.avviaSync(); }
    catch (err) { console.error(`[registro] sync di "${e.value.id}" non avviato`, err); }
  }
}

/** La mappa di chi annuncia cosa e chi ascolta. Per la diagnostica. */
export function mappaEventi() {
  const parlano = {}, sentono = {};
  for (const m of MODULI) {
    for (const e of m.pubblica || []) (parlano[e] ||= []).push(m.id);
    for (const e of m.ascolta || []) (sentono[e] ||= []).push(m.id);
  }
  // Un evento ascoltato che nessuno annuncia è quasi sempre un refuso.
  const orfani = Object.keys(sentono).filter((e) => !parlano[e] && !e.startsWith("giorno:")
    && !e.startsWith("fatto:") && !e.startsWith("dati:") && !e.startsWith("modulo:"));
  return { parlano, sentono, orfani };
}
