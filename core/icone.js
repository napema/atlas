// icone.js — le icone come SVG inline, non come font né come file.
//
// Inline perché devono ereditare `currentColor` (la scheda attiva della
// barra cambia colore) e perché un'icona che arriva con una richiesta di
// rete è un'icona che offline non c'è. Sono poche e piccole: stanno qui.
//
// Tutte disegnate sulla stessa griglia 24×24, tratto 1.8, estremi tondi.

const TRATTI = {
  sole:
    '<circle cx="12" cy="12" r="4.2"/>' +
    '<path d="M12 2.4v2.2M12 19.4v2.2M2.4 12h2.2M19.4 12h2.2' +
    'M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M18.8 5.2l-1.6 1.6M6.8 17.2l-1.6 1.6"/>',

  portafoglio:
    '<path d="M3.5 8.5A2.5 2.5 0 0 1 6 6h11.5A2.5 2.5 0 0 1 20 8.5v9a2.5 2.5 0 0 1-2.5 2.5H6a2.5 2.5 0 0 1-2.5-2.5z"/>' +
    '<path d="M3.5 9.2V6.4A2 2 0 0 1 5.9 4.4l9.6-1.8"/>' +
    '<path d="M20 12h-3.4a1.9 1.9 0 0 0 0 3.8H20"/>',

  corpo:
    '<circle cx="12" cy="4.4" r="2.1"/>' +
    '<path d="M12 6.9v6.2M12 13.1l-3.1 7.4M12 13.1l3.1 7.4M6.6 9.1L12 10.4l5.4-1.3"/>',

  spunta:
    '<path d="M4.2 12.4l4.6 4.6L19.8 6"/>' +
    '<path d="M4.2 6.6h7" opacity=".45"/>',

  ingranaggio:
    '<circle cx="12" cy="12" r="3"/>' +
    '<path d="M19.1 14.4a1.6 1.6 0 0 0 .32 1.77l.06.06a1.95 1.95 0 1 1-2.76 2.76l-.06-.06a1.6 1.6 0 0 0-1.77-.32 1.6 1.6 0 0 0-.97 1.47v.17a1.95 1.95 0 1 1-3.9 0v-.09a1.6 1.6 0 0 0-1.05-1.47 1.6 1.6 0 0 0-1.77.32l-.06.06a1.95 1.95 0 1 1-2.76-2.76l.06-.06a1.6 1.6 0 0 0 .32-1.77 1.6 1.6 0 0 0-1.47-.97H3.1a1.95 1.95 0 1 1 0-3.9h.09a1.6 1.6 0 0 0 1.47-1.05 1.6 1.6 0 0 0-.32-1.77l-.06-.06A1.95 1.95 0 1 1 7.04 3.9l.06.06a1.6 1.6 0 0 0 1.77.32h.08a1.6 1.6 0 0 0 .97-1.47V2.6a1.95 1.95 0 1 1 3.9 0v.09a1.6 1.6 0 0 0 .97 1.47 1.6 1.6 0 0 0 1.77-.32l.06-.06a1.95 1.95 0 1 1 2.76 2.76l-.06.06a1.6 1.6 0 0 0-.32 1.77v.08a1.6 1.6 0 0 0 1.47.97h.17a1.95 1.95 0 1 1 0 3.9h-.09a1.6 1.6 0 0 0-1.47.97z"/>',

  piu:      '<path d="M12 5v14M5 12h14"/>',
  freccia:  '<path d="M9 5.5l6.5 6.5L9 18.5"/>',
  indietro: '<path d="M15 5.5L8.5 12l6.5 6.5"/>',
  chiudi:   '<path d="M6 6l12 12M18 6L6 18"/>',
  nuvola:   '<path d="M7 18.5h9.8a4 4 0 0 0 .6-7.95 5.6 5.6 0 0 0-10.85-1.3A3.9 3.9 0 0 0 7 18.5z"/>',
  fiamma:   '<path d="M12 3s.9 3.2-1.4 5.4C8.3 10.6 6 12 6 15a6 6 0 0 0 12 0c0-2.6-1.5-4.3-2.6-5.6-.6 1.3-1.4 1.9-1.4 1.9s.6-4.6-2-8.3z"/>',
};

/**
 * Un'icona come stringa SVG.
 * @param {string} nome    chiave in TRATTI
 * @param {number} misura  lato in px
 */
export function icona(nome, misura = 24) {
  const d = TRATTI[nome];
  if (!d) return "";
  return (
    `<svg viewBox="0 0 24 24" width="${misura}" height="${misura}" fill="none" ` +
    'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ' +
    'aria-hidden="true" focusable="false">' + d + "</svg>"
  );
}

export const nomiIcone = () => Object.keys(TRATTI);
