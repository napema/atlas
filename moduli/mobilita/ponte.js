// moduli/mobilita/ponte.js — lo `storage.js` di mobility-blueprint, sopra la
// casella di ATLAS.
//
// PERCHÉ ESISTE QUESTO FILE.
//
// Il primo porting di Mobilità l'ha riscritta invece di innestarla, e per
// strada ha perso i video degli esercizi, l'assessment intero, le pillole del
// player e le schermate di preparazione. Il briefing diceva «innesto, non
// riscrittura» e non è stato seguito.
//
// La seconda volta i file del riferimento — `sessione.js`, `assessment.js`,
// `progressi.js`, `oggi.js` — sono stati copiati **come sono**, incluse le
// classi CSS: cambia solo il foglio di stile. L'unica cosa che non poteva
// restare uguale è l'accesso ai dati, perché ATLAS ha una casella sola per
// modulo e un motore di sync condiviso.
//
// Da qui il ponte: espone `getState` e `updateState` con la FORMA PIATTA che
// quei file si aspettano — `assessment`, `programma`, `streak` e
// `storicoSessioni` alla radice — mentre sotto vivono dentro `meta` e
// `records` della casella. Nessuno dei file portati sa che è successo.
//
// Costa venti righe e in cambio i quattro file si possono ri-copiare dal
// riferimento quando cambiano, senza rimetterci le mani.

import { casella, stato } from "./dati.js";

/** Lo stato nella forma piatta dell'app di partenza. Sola lettura. */
export function getState() {
  const s = stato();
  return {
    assessment: s.meta.assessment,
    programma: s.meta.programma,
    streak: s.meta.streak,
    storicoSessioni: s.records.filter((r) => r && !r.del),
    giornoCorrente: s.giornoCorrente,
    sessioneInCorso: s.sessioneInCorso,
    foto: s.foto,
    metaUp: s.metaUp,
  };
}

/**
 * Come `updateState` dell'originale: riceve una bozza e la modifica.
 *
 * La bozza è fatta di accessori che puntano ai veri oggetti dentro la
 * casella, quindi `s.programma.avvisoColloMostrato = true` e
 * `s.storicoSessioni.push(...)` scrivono dove devono senza copie di mezzo.
 *
 * `tocca: false` non si usa qui: una scrittura del programma o dello storico
 * è un dato vero e deve far partire il sync.
 */
export function updateState(fn) {
  casella.aggiorna((s) => {
    fn({
      get assessment() { return s.meta.assessment; },
      set assessment(v) { s.meta.assessment = v; },
      get programma() { return s.meta.programma; },
      set programma(v) { s.meta.programma = v; },
      get streak() { return s.meta.streak; },
      set streak(v) { s.meta.streak = v; },
      // `storicoSessioni` è `records` senza le lapidi. In scrittura si torna
      // sull'array vero: una lapide cancellata qui non deve sparire, perché
      // senza lapide l'altro dispositivo resuscita il record.
      get storicoSessioni() { return s.records; },
      set storicoSessioni(v) { s.records = v; },
      get giornoCorrente() { return s.giornoCorrente; },
      set giornoCorrente(v) { s.giornoCorrente = v; },
      get sessioneInCorso() { return s.sessioneInCorso; },
      set sessioneInCorso(v) { s.sessioneInCorso = v; },
      get foto() { return s.foto; },
      set foto(v) { s.foto = v; },
      get metaUp() { return s.metaUp; },
      set metaUp(v) { s.metaUp = v; },
    });
  });
}

/**
 * L'originale scriveva qui la data dell'ultima sessione per il service
 * worker, che la leggeva per decidere se mandare il promemoria. In ATLAS il
 * promemoria lo manda GitHub Actions leggendo `mobilita.json` dal repo dati,
 * quindi non c'è niente da scrivere: resta la firma perché i file portati la
 * chiamano, e toglierla vorrebbe dire modificarli.
 */
export function salvaStatoSW() { /* in ATLAS lo fa il workflow, non il worker */ }

/** L'originale annunciava così ogni scrittura. Qui ci pensa la casella. */
export function annunciaCambio() {
  document.dispatchEvent(new CustomEvent("dati-cambiati"));
}
