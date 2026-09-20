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
//     impostazioni() { return nodo | null }    // la sua sezione in Impostazioni
//     avviaSync() {}                           // apre il proprio canale
//   }
//
// `impostazioni()` restituisce un nodo DOM, o null se il modulo non ha
// niente da configurare. Le impostazioni di TUTTI i moduli stanno in una
// schermata sola: sparse dentro i moduli non le trovava nessuno.
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
import { avviaSync as sincronizzaNotifiche } from "./notifiche.js";

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
    accento: "var(--pesca)",
    stile: true,
    carica: () => import("../moduli/oggi/modulo.js"),
    pubblica: [],
    ascolta: ["giorno:cambiato", "fatto:scritto", "dati:arrivati"],
  },
  {
    id: "finanze",
    nome: "Finanze",
    icona: "portafoglio",
    // Non verde: il verde in ATLAS vuol dire "fatto", e una tinta che
    // significa due cose non ne significa nessuna.
    accento: "var(--lime)",
    stile: true,
    carica: () => import("../moduli/finanze/modulo.js"),
    pubblica: ["finanze:movimento-registrato"],
    ascolta: ["giorno:cambiato"],
  },
  {
    id: "pasti",
    nome: "Pasti",
    icona: "piatto",
    // Non verde (vuol dire «fatto») e non lime, che e' di Finanze. Il rosa
    // non lo usava nessuno ed e' abbastanza lontano dall'arancio di Training
    // da non confondersi nella stessa barra.
    accento: "var(--rosa)",
    stile: true,
    carica: () => import("../moduli/pasti/modulo.js"),
    pubblica: [],
    ascolta: ["giorno:cambiato"],
  },
  {
    id: "mobilita",
    nome: "Mobilità",
    gruppo: "corpo",
    icona: "corpo",
    accento: "var(--ciano)",
    stile: true,
    carica: () => import("../moduli/mobilita/modulo.js"),
    // "mobilita:sessione-completata" è l'annuncio che evita all'utente di
    // spuntare a mano un'abitudine che ha appena fatto. È il caso concreto
    // per cui il bus esiste.
    pubblica: ["mobilita:sessione-completata"],
    ascolta: ["giorno:cambiato"],
  },
  {
    id: "allenamenti",
    nome: "Training",
    gruppo: "corpo",
    // Non `corpo`, che è di Mobilità: quello dice «il tuo corpo», questo dice
    // «un numero da colpire entro dicembre», e sono due cose diverse anche
    // quando si fanno con le stesse gambe.
    icona: "bersaglio",
    accento: "var(--arancio)",
    stile: true,
    carica: () => import("../moduli/allenamenti/modulo.js"),
    pubblica: [],
    ascolta: ["giorno:cambiato"],
  },
  {
    id: "abitudini",
    nome: "Abitudini",
    icona: "spunta",
    accento: "var(--viola)",
    stile: true,
    carica: () => import("../moduli/abitudini/modulo.js"),
    pubblica: [],
    ascolta: ["mobilita:sessione-completata", "giorno:cambiato"],
  },
  {
    id: "impostazioni",
    nome: "Impostazioni",
    icona: "ingranaggio",
    accento: "var(--grigio)",
    stile: true,
    carica: () => import("../moduli/impostazioni/modulo.js"),
    pubblica: [],
    ascolta: [],
  },
];

/* =========================================================================
   I GRUPPI — due moduli, una scheda sola nella barra.

   Mobilità e Allenamenti raccontano la stessa cosa da due lati: uno è «il
   tuo corpo», l'altro è «un numero da colpire entro dicembre». Meritavano
   due moduli separati — archivi diversi, file di sync diversi, ritmi
   diversi — ma non due schede su cinque.

   IL GRUPPO È SOLO UN FATTO DELLA BARRA. Non fonde niente: ogni membro
   tiene la sua casella, il suo canale, il suo `oggi()` nella home e le sue
   rotte. `#/mobilita` e `#/mobilita/inizia` continuano a funzionare
   esattamente come prima — e devono, perché sono gli indirizzi che aprono
   le NOTIFICHE. Un gruppo che rinominasse gli id romperebbe il tocco su
   una notifica arrivata ieri.
   ========================================================================= */

export const GRUPPI = [
  {
    id: "corpo",
    nome: "Corpo",
    icona: "corpo",
    membri: ["mobilita", "allenamenti"],
  },
];

export const gruppoDi = (idModulo) => GRUPPI.find((g) => g.membri.includes(idModulo)) || null;

/* Quale membro aprire quando tocchi la scheda del gruppo: l'ultimo che hai
   guardato. È una preferenza di questo dispositivo, come il tema — non un
   dato, quindi localStorage diretto e niente sync. Tornare sempre sul primo
   membro vorrebbe dire due tocchi ogni volta per chi vive nell'altro. */
const CHIAVE_MEMBRO = (idGruppo) => `atlas.gruppo.${idGruppo}`;

export function membroRicordato(gruppo) {
  try {
    const v = localStorage.getItem(CHIAVE_MEMBRO(gruppo.id));
    if (v && gruppo.membri.includes(v)) return v;
  } catch { /* privata o piena: si riparte dal primo */ }
  return gruppo.membri[0];
}

export function ricordaMembro(idGruppo, idModulo) {
  try { localStorage.setItem(CHIAVE_MEMBRO(idGruppo), idModulo); } catch { /* vedi sopra */ }
}

/**
 * Le VOCI della barra: i moduli senza gruppo, più una voce per gruppo.
 *
 * Impostazioni resta fuori. Ci era entrata per una ragione buona — prima
 * stava dentro un pulsante in Oggi e le impostazioni dei moduli non le
 * trovava nessuno — ma quel problema l'ha risolto l'AVER RADUNATO le
 * impostazioni in una schermata sola, non l'averle messe nella barra.
 *
 * E la barra ha un costo che cresce: a sei schede le etichette da 60px
 * diventano illeggibili proprio dove il pollice ha meno spazio per
 * sbagliare. Cinque è il tetto, e i gruppi sono il modo di restarci sotto
 * senza rinunciare a un modulo.
 */
export const MODULI_IN_BARRA = (() => {
  const visti = new Set();
  const voci = [];
  for (const m of MODULI) {
    if (m.id === "impostazioni") continue;
    const g = m.gruppo && GRUPPI.find((x) => x.id === m.gruppo);
    if (!g) { voci.push({ id: m.id, nome: m.nome, icona: m.icona, rotte: [m.id] }); continue; }
    if (visti.has(g.id)) continue;
    visti.add(g.id);
    voci.push({ id: g.id, nome: g.nome, icona: g.icona, rotte: g.membri, gruppo: g });
  }
  return voci;
})();

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
    id: voce.id, nome: voce.nome, icona: voce.icona,
    accento: voce.accento,
    stile: Boolean(voce.stile),
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

  // Le iscrizioni push non appartengono a nessun modulo: sono di core, e
  // il workflow che manda le notifiche legge da quel file.
  try {
    sincronizzaNotifiche();
  } catch (e) { console.error("[registro] sync delle notifiche non avviato", e); }

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
