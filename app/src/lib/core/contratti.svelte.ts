// contratti.svelte.ts — i contratti dei moduli, man mano che arrivano.
//
// La home e le impostazioni parlano con TUTTI i moduli, e i contratti si
// caricano pigramente: qui c'è l'elenco di quelli già pronti, reattivo, così
// una carta della home compare appena il suo modulo è arrivato invece di
// aspettare il più lento.

import { MODULI_DATI, prendiContratto, type Contratto } from "./registro";

let pronti = $state.raw<Record<string, Contratto>>({});

export const contratti = {
  get pronti() { return pronti; },
};

export function caricaContratti() {
  for (const m of MODULI_DATI) {
    prendiContratto(m.id)
      .then((c) => { if (c) pronti = { ...pronti, [m.id]: c }; })
      .catch((e) => console.error(`[contratti] "${m.id}" non caricato`, e));
  }
}
