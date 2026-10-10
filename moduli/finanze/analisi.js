// moduli/finanze/analisi.js — quale ciclo si sta guardando.
//
// QUI DENTRO C'ERA L'ANALISI INTERA, e il 10 ottobre 2026 se n'è andata in
// `gruppi.js`. Non è stato un trasloco: i conti che c'erano — `analisiCiclo`,
// `segnaliCiclo`, `storicoCicli` — rispondevano tutti alla stessa domanda
// sbagliata.
//
// Mettevano ogni uscita nello stesso mucchio. «Ritmo della spesa +426 €»,
// «media al giorno 98 €», «scontrino medio 50 €», «giorno più caro 875 €»,
// «3 categorie sforate»: numeri veri, tutti gonfiati dall'affitto e dalla
// rata, e nessuno dei quali dice niente su quello che si può cambiare. Una
// media che contiene un addebito automatico non è una media di niente.
//
// Riscriverli per escludere le Fisse non bastava: il problema non era la
// formula ma il raggruppamento, che non esisteva. `gruppi.js` lo fa — cinque
// gruppi, assegnati per regola, uno e uno solo per uscita — e da lì in poi
// ogni media si calcola su «quello che decidi tu».
//
// Qui resta solo la domanda di prima di tutte: QUALE ciclo. Sono due righe,
// le usano quattro schermate, e non c'è un posto migliore dove metterle.

import { movimentiVivi } from "./dati.js";
import { cicloDi, spostaCiclo } from "./calcolo.js";
import { oggiISO } from "../../core/ui.js";

/** Il ciclo con chiave `indice` («2026-09»), o quello di oggi. */
export const cicloPerIndice = (indice, iso = oggiISO()) =>
  indice ? spostaCiclo(indice, 0) : cicloDi(iso);

/**
 * Il primo ciclo che ha dei dati.
 *
 * Serve a non far sfogliare all'indietro all'infinito, e a non mostrare
 * cicli vuoti come se fossero cicli perfetti: la tabella di v3 metteva uno
 * zero verde a sei cicli in cui l'app non esisteva ancora.
 */
export function primoCiclo() {
  const prima = movimentiVivi().reduce(
    (min, m) => (m.data && (!min || m.data < min) ? m.data : min), null);
  return cicloDi(prima || oggiISO());
}
