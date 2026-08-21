// registro.js — l'elenco dei moduli e il contratto che devono rispettare.
//
// Questo file è il ponte fra la shell e i moduli. È l'UNICO posto da
// toccare per aggiungere un modulo nuovo: si aggiunge una riga qui, e la
// barra, il router, il sync e la schermata Oggi lo prendono da soli.
//
// ---------------------------------------------------------------------
// IL CONTRATTO — ogni moduli/<id>/modulo.js esporta di default un oggetto:
//
//   {
//     id:      "finanze",          // uguale alla cartella e alla casella
//     nome:    "Finanze",          // come appare nella barra
//     icona:   "portafoglio",      // chiave in core/icone.js
//     accento: "var(--verde)",     // il colore del modulo, uno solo
//
//     async monta(contenitore) {}  // disegna la vista dentro il contenitore
//     smonta() {}                  // opzionale: timer da fermare, listener da togliere
//
//     oggi() { return { ... } }    // opzionale: la scheda per la home. Vedi sotto.
//     avviaSync() {}               // opzionale: apre il proprio canale
//   }
//
// `oggi()` restituisce, in modo sincrono e senza effetti collaterali:
//   { titolo, valore, dettaglio, urgente, azione: { etichetta, rotta } }
// È la riga che il modulo mostra nella schermata Oggi. Se il modulo non ha
// niente da dire per la giornata, restituisce null e sparisce dalla home.
// ---------------------------------------------------------------------

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
  },
  {
    id: "finanze",
    nome: "Finanze",
    icona: "portafoglio",
    accento: "var(--verde)",
    carica: () => import("../moduli/finanze/modulo.js"),
  },
  {
    id: "mobilita",
    nome: "Mobilità",
    icona: "corpo",
    accento: "var(--blu)",
    carica: () => import("../moduli/mobilita/modulo.js"),
  },
  {
    id: "abitudini",
    nome: "Abitudini",
    icona: "spunta",
    accento: "var(--viola)",
    carica: () => import("../moduli/abitudini/modulo.js"),
  },
  {
    id: "impostazioni",
    nome: "Impostazioni",
    icona: "ingranaggio",
    accento: "var(--etichetta-2)",
    carica: () => import("../moduli/impostazioni/modulo.js"),
  },
];

/** I moduli che compaiono nella barra in basso. Gli altri restano raggiungibili per rotta. */
export const MODULI_IN_BARRA = MODULI.filter((m) => m.id !== "impostazioni");

const caricati = new Map();

/** Carica (una volta sola) e restituisce l'oggetto modulo. */
export async function prendiModulo(id) {
  if (caricati.has(id)) return caricati.get(id);
  const voce = MODULI.find((m) => m.id === id);
  if (!voce) return null;
  const mod = (await voce.carica()).default;
  // La voce del registro è la verità su nome/icona/accento: un modulo non
  // può cambiarli da solo, altrimenti la barra si muove sotto le dita.
  const completo = { ...mod, id: voce.id, nome: voce.nome, icona: voce.icona, accento: voce.accento };
  caricati.set(id, completo);
  return completo;
}

/** I moduli già caricati in questa sessione. */
export const moduliCaricati = () => [...caricati.values()];

/**
 * Carica tutti i moduli e apre i loro canali di sync.
 * Va fatto una volta all'avvio, in sottofondo: i dati di Finanze devono
 * arrivare anche se stai guardando Mobilità, altrimenti la home mente.
 */
export async function avviaTuttiISync() {
  const esiti = await Promise.allSettled(MODULI.map((m) => prendiModulo(m.id)));
  for (const e of esiti) {
    if (e.status !== "fulfilled" || !e.value?.avviaSync) continue;
    try { e.value.avviaSync(); }
    catch (err) { console.error(`[registro] sync di "${e.value.id}" non avviato`, err); }
  }
}
