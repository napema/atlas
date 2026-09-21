// statoSync.svelte.ts — il pallino e la parola accanto: una fonte sola.
//
// Nella app di prima la parola «sincronizzato» era scritta a mano mentre il
// pallino seguiva lo stato vero: bastava un sync non ancora partito per
// avere un pallino grigio accanto alla parola «sincronizzato». Qui colore e
// parola si leggono dallo stesso oggetto.
//
// Si mostra il PEGGIO fra i canali: un solo modulo in errore è comunque un
// problema da vedere.

import { configurato, osservaStato, type InfoCanale, type StatoCanale } from "./sync";
import { osservaToken } from "./credenziali";

const PESO: Record<StatoCanale, number> = { err: 3, corso: 2, off: 1, ok: 0, inattivo: 0 };

const TITOLI: Record<StatoCanale, string> = {
  off: "Sync non configurato: i dati restano su questo dispositivo",
  ok: "Sincronizzato",
  corso: "Sincronizzazione in corso",
  inattivo: "In attesa",
  err: "Errore di sincronizzazione",
};
const ETICHETTE: Record<StatoCanale, string> = {
  off: "non sincronizzato",
  ok: "sincronizzato",
  corso: "sincronizzo…",
  inattivo: "in attesa",
  err: "errore di sync",
};

const canali = new Map<string, InfoCanale>();
let stato = $state<StatoCanale>(configurato() ? "ok" : "off");
let messaggio = $state("");

function ricalcola() {
  let peggiore: StatoCanale = configurato() ? "ok" : "off";
  let msg = "";
  for (const c of canali.values()) {
    if (PESO[c.stato] > PESO[peggiore]) { peggiore = c.stato; msg = c.messaggio; }
  }
  stato = peggiore;
  messaggio = msg;
}

osservaStato((i) => { canali.set(i.id, i); ricalcola(); });
osservaToken(ricalcola);

export const statoSync = {
  get stato() { return stato; },
  get etichetta() { return ETICHETTE[stato]; },
  get titolo() { return stato === "err" && messaggio ? `${TITOLI.err} — ${messaggio}` : TITOLI[stato]; },
  get canali() { stato; return [...canali.values()]; },
};
