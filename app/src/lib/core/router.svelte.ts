// router.svelte.ts — navigazione a hash.
//
// Hash e non History API: GitHub Pages serve file statici e non sa
// riscrivere /finanze su index.html, quindi con History API un refresh
// dentro la app dà 404. In PWA standalone la barra degli indirizzi non si
// vede comunque.
//
// Le rotte sono IDENTICHE a quelle della app di prima — `#/mobilita/inizia`,
// `#/abitudini/nuova`, `#/finanze` — ed è un vincolo, non una comodità: sono
// gli indirizzi che aprono le NOTIFICHE. Una notifica arrivata ieri deve
// aprire la schermata giusta anche nella app nuova.
//
// Forma:  #/<modulo>[/<resto>]      #/  →  oggi

import { MODULI } from "./registro";

const PREDEFINITA = "oggi";

function analizza(hash: string) {
  const pezzi = (hash || "").replace(/^#\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
  const id = pezzi[0] || PREDEFINITA;
  return { id: MODULI.some((m) => m.id === id) ? id : PREDEFINITA, resto: pezzi.slice(1) };
}

let rotta = $state(analizza(location.hash));

globalThis.addEventListener("hashchange", () => { rotta = analizza(location.hash); });

export const router = {
  get id() { return rotta.id; },
  get resto() { return rotta.resto; },
};

/** Naviga. `sostituisci` non lascia una tappa nella cronologia. */
export function vaiA(destinazione: string, { sostituisci = false } = {}) {
  const h = destinazione.startsWith("#") ? destinazione : `#/${destinazione.replace(/^\/+/, "")}`;
  if (location.hash === h) return;
  if (sostituisci) { history.replaceState(null, "", h); rotta = analizza(h); }
  else location.hash = h;
}

/** Indietro, o alla home se non c'è un indietro (arrivo da notifica). */
export function indietro() {
  if (history.length > 1) history.back();
  else vaiA(PREDEFINITA, { sostituisci: true });
}

/** Un collegamento dentro un modulo: link("finanze", "nuovo") → "#/finanze/nuovo". */
export const link = (id: string, ...pezzi: string[]) =>
  [`#/${id}`, ...pezzi.map(encodeURIComponent)].join("/");
