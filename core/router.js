// router.js — navigazione a hash.
//
// Hash e non History API: GitHub Pages serve file statici e non sa
// riscrivere /finanze su index.html. Con History API basta un refresh
// dentro l'app per prendere un 404. L'hash non ha questo problema, e in
// PWA standalone la barra degli indirizzi non si vede comunque.
//
// Forma della rotta:  #/<modulo>[/<resto>]
//   #/                    → oggi
//   #/finanze             → modulo finanze, vista principale
//   #/finanze/nuovo       → il modulo riceve ["nuovo"] e decide lui

import { MODULI, prendiModulo } from "./registro.js";

const PREDEFINITA = "oggi";

let attuale = null;      // il modulo montato adesso
let contenitore = null;
const ascoltatori = new Set();

function analizza(hash) {
  const pezzi = (hash || "").replace(/^#\/?/, "").split("/").filter(Boolean);
  const id = pezzi[0] || PREDEFINITA;
  return { id: MODULI.some((m) => m.id === id) ? id : PREDEFINITA, resto: pezzi.slice(1) };
}

export const rottaCorrente = () => analizza(location.hash);

/** Naviga. `sostituisci` evita di lasciare una tappa nella cronologia. */
export function vaiA(rotta, { sostituisci = false } = {}) {
  const h = rotta.startsWith("#") ? rotta : `#/${rotta.replace(/^\/+/, "")}`;
  if (location.hash === h) { disegna(); return; }
  if (sostituisci) history.replaceState(null, "", h);
  else location.hash = h;
}

/** Ascolta i cambi di rotta (serve alla barra per evidenziare la scheda). */
export function osservaRotta(fn) {
  ascoltatori.add(fn);
  return () => ascoltatori.delete(fn);
}

// La posizione di scorrimento va ricordata per modulo: tornare su Finanze
// e ritrovarsi in cima a una lista di trecento movimenti è un fastidio vero.
const scorrimenti = new Map();

async function disegna() {
  const { id, resto } = rottaCorrente();

  if (attuale) {
    scorrimenti.set(attuale.id, globalThis.scrollY);
    try { attuale.smonta?.(); } catch (e) { console.error(e); }
  }

  const mod = await prendiModulo(id);
  if (!mod) { contenitore.innerHTML = '<p class="vuoto">Questa schermata non esiste.</p>'; return; }

  // L'accento del modulo entra come variabile: da qui in giù ogni `var(--accento)`
  // dei componenti condivisi diventa il colore giusto, senza una riga di codice
  // nel modulo. Anche la barra di stato di iOS lo segue.
  document.documentElement.style.setProperty("--accento", mod.accento);

  contenitore.innerHTML = "";
  contenitore.dataset.modulo = id;
  attuale = mod;

  try {
    await mod.monta(contenitore, resto);
  } catch (e) {
    console.error(`[router] "${id}" non si è montato`, e);
    contenitore.innerHTML =
      '<div class="vuoto"><p>Questo modulo non è riuscito ad aprirsi.</p>' +
      '<p class="nota">I dati sono al sicuro: il guasto è nella schermata, non nell\'archivio.</p></div>';
  }

  // Una rotta con un "resto" è una vista di dettaglio: lì si parte dall'alto.
  globalThis.scrollTo(0, resto.length ? 0 : (scorrimenti.get(id) || 0));

  for (const f of ascoltatori) {
    try { f({ id, resto, modulo: mod }); } catch (e) { console.error(e); }
  }
}

export function avviaRouter(elemento) {
  contenitore = elemento;
  addEventListener("hashchange", disegna);
  if (!location.hash) history.replaceState(null, "", `#/${PREDEFINITA}`);
  return disegna();
}

/** Ridisegna la vista corrente. La chiama il sync quando arrivano dati nuovi. */
export const ridisegna = () => disegna();
