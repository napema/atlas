// router.js — navigazione a hash, e il senso dell'orientamento dei moduli.
//
// Hash e non History API: GitHub Pages serve file statici e non sa
// riscrivere /finanze su index.html. Con History API basta un refresh
// dentro l'app per prendere un 404. In PWA standalone la barra degli
// indirizzi non si vede comunque.
//
// Forma della rotta:  #/<modulo>[/<resto>]
//   #/                    → oggi
//   #/finanze             → Finanze, vista principale
//   #/finanze/nuovo       → Finanze riceve resto = ["nuovo"] e decide lui
//
// Un modulo NON costruisce mai un URL a mano. Riceve la sua `posizione` e
// usa `link()` per stare dentro casa propria e `vaiA()` per uscire. È il
// motivo per cui rinominare un modulo non rompe i suoi collegamenti interni.

import { MODULI, prendiModulo } from "./registro.js";
import { annuncia, EVENTI } from "./bus.js";

const PREDEFINITA = "oggi";

let attuale = null;      // il modulo montato adesso
let contenitore = null;
const ascoltatori = new Set();

function analizza(hash) {
  const pezzi = (hash || "").replace(/^#\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
  const id = pezzi[0] || PREDEFINITA;
  return { id: MODULI.some((m) => m.id === id) ? id : PREDEFINITA, resto: pezzi.slice(1) };
}

export const rottaCorrente = () => analizza(location.hash);

/** Naviga. `sostituisci` evita di lasciare una tappa nella cronologia. */
export function vaiA(rotta, { sostituisci = false } = {}) {
  const h = rotta.startsWith("#") ? rotta : `#/${rotta.replace(/^\/+/, "")}`;
  if (location.hash === h) { disegna(); return; }
  if (sostituisci) { history.replaceState(null, "", h); disegna(); }
  else location.hash = h;
}

/** Torna indietro, o alla home se non c'è un indietro (arrivo da notifica). */
export function indietro() {
  if (history.length > 1) history.back();
  else vaiA(PREDEFINITA, { sostituisci: true });
}

/** Ascolta i cambi di rotta. Serve alla barra per evidenziare la scheda. */
export function osservaRotta(fn) {
  ascoltatori.add(fn);
  return () => ascoltatori.delete(fn);
}

/**
 * La `posizione`: tutto ciò che un modulo deve sapere su dove si trova.
 * Gliela passa il router come secondo argomento di `monta`.
 */
function posizioneDi(id, resto) {
  return {
    id,
    resto,                                  // i pezzi dopo il nome del modulo
    base: `#/${id}`,

    /** Un collegamento dentro il proprio modulo: link("nuovo") → "#/finanze/nuovo" */
    link: (...pezzi) => [`#/${id}`, ...pezzi.map(encodeURIComponent)].join("/"),

    /** Un collegamento a un altro modulo. Esplicito, perché è un'uscita. */
    linkA: (altro, ...pezzi) => [`#/${altro}`, ...pezzi.map(encodeURIComponent)].join("/"),

    vaiA,
    indietro,

    /** Vero se siamo alla vista principale del modulo, non in un dettaglio. */
    inRadice: resto.length === 0,
  };
}

// La posizione di scorrimento va ricordata per modulo: tornare su Finanze e
// ritrovarsi in cima a una lista di trecento movimenti è un fastidio vero.
const scorrimenti = new Map();

/**
 * Il foglio di stile di un modulo arriva insieme al modulo, non prima.
 *
 * Si ASPETTA che abbia finito di caricare: montare la vista mentre il CSS è
 * ancora in volo produce un lampo di contenuto senza stile, e su una PWA
 * installata quel lampo si nota a ogni cambio di scheda.
 */
const stiliCaricati = new Set();

function caricaStile(mod) {
  if (!mod.stile || stiliCaricati.has(mod.id)) return Promise.resolve();
  stiliCaricati.add(mod.id);
  return new Promise((risolvi) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `./moduli/${mod.id}/stile.css`;
    link.dataset.modulo = mod.id;
    // Anche in caso di errore si prosegue: senza il suo CSS il modulo è
    // brutto, ma funziona. Bloccarlo lo renderebbe irraggiungibile.
    link.onload = link.onerror = () => risolvi();
    document.head.append(link);
  });
}

async function disegna() {
  const { id, resto } = rottaCorrente();

  if (attuale) {
    scorrimenti.set(attuale.id, globalThis.scrollY);
    // `smonta` è dove un modulo stacca i suoi ascoltatori del bus e ferma i
    // suoi timer. Saltarlo significa accumularne una copia a ogni visita.
    try { attuale.smonta?.(); } catch (e) { console.error(`[router] smonta di "${attuale.id}"`, e); }
  }

  const mod = await prendiModulo(id);
  if (!mod) { contenitore.innerHTML = '<p class="vuoto">Questa schermata non esiste.</p>'; return; }

  await caricaStile(mod);

  // L'accento del modulo entra come variabile: da qui in giù ogni
  // `var(--accento)` dei componenti condivisi diventa il colore giusto,
  // senza una riga di codice nel modulo.
  document.documentElement.style.setProperty("--accento", mod.accento);
  // La variante da testo va impostata insieme: usare la tinta piena per
  // scrivere su fondo chiaro scende sotto i 4,5:1 e il numero non si legge.
  document.documentElement.style.setProperty("--accento-testo", mod.accentoTesto || mod.accento);
  document.documentElement.style.setProperty("--accento-pieno", mod.accentoPieno || mod.accento);

  contenitore.innerHTML = "";
  contenitore.dataset.modulo = id;
  attuale = mod;

  try {
    await mod.monta(contenitore, posizioneDi(id, resto));
  } catch (e) {
    console.error(`[router] "${id}" non si è montato`, e);
    contenitore.innerHTML =
      '<div class="vuoto"><p>Questo modulo non è riuscito ad aprirsi.</p>' +
      '<p class="nota">I dati sono al sicuro: il guasto è nella schermata, non nell\'archivio.</p></div>';
  }

  // Una rotta con un "resto" è una vista di dettaglio: lì si parte dall'alto.
  globalThis.scrollTo(0, resto.length ? 0 : (scorrimenti.get(id) || 0));

  annuncia(EVENTI.MODULO_APERTO, { id, resto });
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

/** Ridisegna la vista corrente. La chiamano il sync e il cambio di giorno. */
export const ridisegna = () => disegna();

/** Il modulo montato adesso, o null. */
export const moduloAttivo = () => attuale;
