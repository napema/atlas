// reattivo.svelte.ts — il ponte fra i dati di ATLAS e Svelte.
//
// I dati vivono nelle caselle (storage.ts), che sono oggetti JavaScript
// normali: Svelte non sa quando cambiano. La app di prima risolveva
// chiamando `disegna()` a mano dopo ogni scrittura, in decine di posti — e
// ogni posto dimenticato era una schermata ferma sui numeri vecchi.
//
// Qui c'è un segnale solo, `dati.versione`. Cresce di uno a ogni scrittura
// in qualunque casella e a ogni cambio di giorno. Una vista che legge
// `dati.versione` dentro un `$derived` si ricalcola da sola quando serve:
//
//   const giornata = $derived.by(() => { dati.versione; return calcola(); });
//
// È grossolano di proposito. Ricalcolare una schermata di ATLAS costa
// microsecondi; sbagliare quale segnale ascoltare costa una schermata che
// mente. Fra i due, si sceglie il primo.

import { osservaTutto } from "./storage";
import { ascolta, EVENTI } from "./bus";

let versione = $state(0);

export const dati = {
  get versione() { return versione; },
};

const tocca = () => { versione++; };

osservaTutto(tocca);
// A mezzanotte nessuna casella cambia, ma «oggi» sì: la home deve passare
// al giorno nuovo anche se nessuno ha scritto niente.
ascolta(EVENTI.GIORNO_CAMBIATO, tocca);

// E una volta al minuto, allineata al cambio del minuto: le fasce della
// giornata («adesso», «in ritardo», «di sera») dipendono dall'ora, e alle
// 18:00 la sessione deve entrare in «Adesso» senza che nessuno scriva niente.
// Nascosta la app, niente battito: al ritorno ci pensa `visibilitychange`.
function battito() {
  setTimeout(() => { if (!document.hidden) tocca(); battito(); }, 60_000 - (Date.now() % 60_000) + 50);
}
battito();
document.addEventListener("visibilitychange", () => { if (!document.hidden) tocca(); });
