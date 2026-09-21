// Il foglio aperto in Finanze, uno alla volta.
//
// I fogli di Finanze si aprono l'uno dall'altro — categoria → sottocategoria
// → movimento → modifica — e due fogli impilati su un telefono non si
// leggono. Aprirne uno nuovo chiude quello di prima e aspetta che sia sceso:
// il cambio si vede, e il dito non tocca mai un foglio a metà corsa.

import type { Foglio } from "./comune";

let corrente = $state.raw<Foglio | null>(null);
let aperto = $state(false);
let timer: ReturnType<typeof setTimeout> | undefined;

export const fogli = {
  get corrente() { return corrente; },
  get aperto() { return aperto; },
  set aperto(v: boolean) { aperto = v; },
};

export function apri(f: Foglio) {
  clearTimeout(timer);
  if (aperto) {
    aperto = false;
    timer = setTimeout(() => { corrente = f; aperto = true; }, 320);
  } else {
    corrente = f;
    aperto = true;
  }
}

export function chiudi() {
  aperto = false;
}
