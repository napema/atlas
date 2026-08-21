// cantiere.js — la schermata provvisoria dei moduli non ancora portati.
//
// Esiste per una ragione precisa: ATLAS va installato sull'iPhone SUBITO,
// prima che i moduli siano pronti. Se una scheda della barra portasse a una
// pagina bianca, l'app sembrerebbe rotta e non verrebbe più aperta. Qui
// invece dice cosa manca e intanto manda all'app originale, che è viva.
//
// Questo file sparisce quando l'ultimo modulo è portato.

import { el, intestazione, scheda } from "../core/ui.js";

/**
 * @param {object} opz
 * @param {string} opz.titolo     nome del modulo
 * @param {string} opz.origine    URL dell'app di partenza, ancora in funzione
 * @param {string} opz.repoDati   repo/file dei dati oggi
 * @param {string[]} opz.daFare   cosa resta da portare, in ordine
 */
export function cantiere({ titolo, origine, repoDati, daFare = [] }) {
  return async function monta(contenitore) {
    contenitore.append(intestazione(titolo, "in migrazione"));

    contenitore.append(scheda("Dove sono i dati adesso", [
      el("p", { html: `Nel repo <code>${repoDati}</code>, dove li scrive l'app di partenza.` }),
      el("p", {
        class: "nota",
        testo: "Finché la migrazione non è finita, quella resta la copia buona. " +
               "ATLAS non scrive ancora niente qui: non c'è modo di perdere dati.",
      }),
      origine && el("a", { class: "btn pieno", href: origine, target: "_blank", rel: "noopener",
                           testo: "Apri l'app di partenza" }),
    ]));

    if (daFare.length) {
      const lista = el("ol", { class: "cantiere-passi" });
      for (const p of daFare) lista.append(el("li", { testo: p }));
      contenitore.append(scheda("Cosa resta da portare", [lista]));
    }
  };
}
