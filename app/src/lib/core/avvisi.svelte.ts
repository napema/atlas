// avvisi.svelte.ts — la conferma che compare in alto e se ne va da sola.
//
// «Sessione registrata.», «Abitudine spuntata dalla sessione.»: frasi che
// dicono che una cosa è successa, spesso a schermata chiusa. La logica
// condivisa le chiede con `avviso(testo)` importato da `core/ui.js`, che il
// nucleo unico gira su `ui.ts`, che lo prende da qui.
//
// Uno alla volta, sempre. Due conferme impilate si leggono come un errore.

export type TipoAvviso = "info" | "errore";

export interface Avviso {
  id: number;
  testo: string;
  tipo: TipoAvviso;
  /** Un'azione di annullamento, quando la cosa appena fatta si può disfare. */
  azione?: { etichetta: string; fai: () => void };
}

let corrente = $state<Avviso | null>(null);
let timer: ReturnType<typeof setTimeout> | undefined;
let prossimo = 1;

export const avvisi = {
  get corrente() { return corrente; },
};

/**
 * Mostra un avviso. Accetta anche la forma della app di prima,
 * `{ durata, tono: "male" }`, così la logica condivisa non cambia.
 */
export function avviso(
  testo: string,
  o: { tipo?: TipoAvviso; tono?: string; durata?: number; azione?: Avviso["azione"] } = {},
) {
  clearTimeout(timer);
  corrente = { id: prossimo++, testo, tipo: o.tipo ?? (o.tono === "male" ? "errore" : "info"), azione: o.azione };
  // Con un'azione resta di più: bisogna avere il tempo di leggere e di
  // decidere se toccarla.
  timer = setTimeout(chiudiAvviso, o.durata ?? (o.azione ? 5000 : 2600));
}

export function chiudiAvviso() {
  clearTimeout(timer);
  corrente = null;
}

/* ------------------------------------------------------------ celebra --
   La conferma grande al centro: una spunta che si disegna e una parola.
   Per le chiusure vere — il check della giornata, una scadenza pagata, la
   settimana ricaricata — non per ogni salvataggio: se festeggia tutto non
   festeggia niente. */

let festa = $state<{ id: number; testo: string } | null>(null);
let timerFesta: ReturnType<typeof setTimeout> | undefined;

export const celebrazione = { get corrente() { return festa; } };

export function celebra(testo = "") {
  clearTimeout(timerFesta);
  festa = { id: prossimo++, testo };
  timerFesta = setTimeout(() => (festa = null), 1400);
}
