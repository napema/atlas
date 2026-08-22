// icone.js — le icone come SVG inline, non come font né come file.
//
// Inline per due ragioni. Ereditano `currentColor`, quindi la scheda attiva
// della barra cambia colore senza una riga di JavaScript. E non arrivano
// dalla rete: un'icona che si scarica è un'icona che offline non c'è.
//
// Tutte sulla stessa griglia 24×24, tratto 1.7, estremi e giunzioni tonde —
// è la geometria di SF Symbols, ed è ciò che le fa sembrare una famiglia
// invece di un assortimento.

const TRATTI = {
  // ---------------------------------------------------------- navigazione
  sole:
    '<circle cx="12" cy="12" r="4"/>' +
    '<path d="M12 2.6v2.1M12 19.3v2.1M2.6 12h2.1M19.3 12h2.1' +
    'M5.4 5.4l1.5 1.5M17.1 17.1l1.5 1.5M18.6 5.4l-1.5 1.5M6.9 17.1l-1.5 1.5"/>',
  luna:      '<path d="M20.5 14.6A8.6 8.6 0 0 1 9.4 3.5a8.6 8.6 0 1 0 11.1 11.1z"/>',
  portafoglio:
    '<path d="M3.6 8.6A2.6 2.6 0 0 1 6.2 6h11.2A2.6 2.6 0 0 1 20 8.6v8.8a2.6 2.6 0 0 1-2.6 2.6H6.2A2.6 2.6 0 0 1 3.6 17.4z"/>' +
    '<path d="M3.6 9.3V6.5a2 2 0 0 1 1.7-2l9.9-1.9"/>' +
    '<path d="M20 12.1h-3.3a1.95 1.95 0 0 0 0 3.9H20"/>',
  // Non più l'omino stilizzato: a 21px il tronco, le braccia e le gambe
  // diventavano quattro trattini che si toccano, e sembrava un ragno. Questa
  // è una figura in allungo — testa, schiena inarcata, gamba distesa — che
  // alla stessa misura resta una silhouette riconoscibile.
  corpo:
    '<circle cx="8.2" cy="5.1" r="2.2"/>' +
    '<path d="M6.3 9.4c2.6-1.1 5-0.6 6.4 1.2l2.1 2.7 3.6 1.1"/>' +
    '<path d="M12.7 10.6 10.9 15l4.3 1.1-1.1 4.2"/>' +
    '<path d="M10.9 15 6.4 16.9l-2.6-2.4"/>',
  spunta:    '<path d="M4.4 12.5l4.5 4.5L19.6 6.4"/>',
  // Tre cursori, non un ingranaggio. La ruota dentata era un poligono a
  // mano libera: a 21px i denti si impastavano e sembrava un glifo rotto.
  // Questa è fatta di sole linee e cerchi, e regge qualunque misura.
  ingranaggio:
    '<path d="M4 7h9.5M18.5 7H20M4 12h3.5M12 12h8M4 17h8.5M17.5 17H20"/>' +
    '<circle cx="16" cy="7" r="2.2"/><circle cx="9.5" cy="12" r="2.2"/><circle cx="15" cy="17" r="2.2"/>',

  // ------------------------------------------------------------- controlli
  piu:       '<path d="M12 5.2v13.6M5.2 12h13.6"/>',
  meno:      '<path d="M5.2 12h13.6"/>',
  freccia:   '<path d="M9.2 5.6L15.6 12l-6.4 6.4"/>',
  indietro:  '<path d="M14.8 5.6L8.4 12l6.4 6.4"/>',
  su:        '<path d="M5.6 14.8L12 8.4l6.4 6.4"/>',
  giu:       '<path d="M5.6 9.2L12 15.6l6.4-6.4"/>',
  chiudi:    '<path d="M6.4 6.4l11.2 11.2M17.6 6.4L6.4 17.6"/>',
  matita:
    '<path d="M16.5 3.9a2.1 2.1 0 0 1 3 3L8.6 17.8l-4 1 1-4z"/>' +
    '<path d="M14.6 5.8l3.6 3.6"/>',
  cestino:
    '<path d="M4.6 6.6h14.8M9.4 6.6V4.8a1.2 1.2 0 0 1 1.2-1.2h2.8a1.2 1.2 0 0 1 1.2 1.2v1.8"/>' +
    '<path d="M6.4 6.6l.9 12.1a1.6 1.6 0 0 0 1.6 1.5h6.2a1.6 1.6 0 0 0 1.6-1.5l.9-12.1"/>',
  cerca:     '<circle cx="10.8" cy="10.8" r="6.2"/><path d="M15.3 15.3l4.3 4.3"/>',
  filtro:    '<path d="M3.8 5.8h16.4L14 13v5.6l-4-2v-3.6z"/>',

  // ---------------------------------------------------------------- tempo
  calendario:
    '<rect x="3.6" y="5.2" width="16.8" height="15.2" rx="2.6"/>' +
    '<path d="M3.6 9.8h16.8M8.4 3.6v3.2M15.6 3.6v3.2"/>',
  orologio:  '<circle cx="12" cy="12" r="8.4"/><path d="M12 7.2V12l3.2 1.9"/>',
  campanella:
    '<path d="M18 16.4V10.8a6 6 0 1 0-12 0v5.6L4.4 18.6h15.2z"/>' +
    '<path d="M10 21.2a2.3 2.3 0 0 0 4 0"/>',
  fiamma:    '<path d="M12 3s.9 3.2-1.4 5.4C8.3 10.6 6 12 6 15a6 6 0 0 0 12 0c0-2.6-1.5-4.3-2.6-5.6-.6 1.3-1.4 1.9-1.4 1.9s.6-4.6-2-8.3z"/>',

  // -------------------------------------------------------------- sessione
  riproduci: '<path d="M7.6 4.8l11.2 7.2-11.2 7.2z"/>',

  // Le quattro che Mobilità porta con sé da mobility-blueprint. Stanno qui e
  // non nel modulo perché il registro delle icone è uno solo: un modulo che
  // si disegna i propri SVG è la strada per averne tre versioni diverse.
  play:       '<path d="M7.5 4.8 19 12 7.5 19.2z"/>',
  avviso:     '<path d="M12 4.2 21 19.6H3z"/><path d="M12 10v3.6M12 16.6v.6"/>',
  bersaglio:  '<circle cx="12" cy="12" r="8.6"/><circle cx="12" cy="12" r="4.8"/><circle cx="12" cy="12" r="1.2"/>',
  onda:       '<path d="M2.5 12h3l2.5-6 4 12 3-8 2 2h4.5"/>',
  fotocamera: '<path d="M3.5 8.5h3.2l1.5-2.4h7.6l1.5 2.4h3.2a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1z"/><circle cx="12" cy="14" r="3.4"/>',
  pausa:     '<path d="M9 5.2v13.6M15 5.2v13.6"/>',
  salta:     '<path d="M6 5.2L14.4 12 6 18.8z"/><path d="M18 5.2v13.6"/>',
  ricomincia:
    '<path d="M20 12a8 8 0 1 1-2.4-5.7"/><path d="M20.4 4.4v4.4h-4.4"/>',

  // ------------------------------------------------------------------ dati
  grafico:   '<path d="M4 19.4V9.2M9.4 19.4V4.6M14.8 19.4v-7.2M20.2 19.4v-4.6"/>',
  tendenza:  '<path d="M3.6 15.6l5-5.2 3.6 3.4 6.4-6.6"/><path d="M14.4 7.2h4.8V12"/>',
  foto:
    '<rect x="3.4" y="5.2" width="17.2" height="14" rx="2.6"/>' +
    '<circle cx="8.8" cy="10" r="1.6"/>' +
    '<path d="M4.2 17.2l4.6-4.4 3.2 3 3.2-2.8 4.4 4.2"/>',
  nuvola:    '<path d="M7 18.4h9.8a4 4 0 0 0 .6-7.9 5.6 5.6 0 0 0-10.8-1.3A3.9 3.9 0 0 0 7 18.4z"/>',
  scarica:   '<path d="M12 3.6v11.2M7.6 10.4l4.4 4.4 4.4-4.4"/><path d="M4.4 19.6h15.2"/>',

  // ----------------------------------------------------------------- stato
  info:      '<circle cx="12" cy="12" r="8.4"/><path d="M12 11v5.2M12 7.9v.1"/>',
  allarme:   '<path d="M12 3.6l8.8 15.2H3.2z"/><path d="M12 9.6v4M12 16.6v.1"/>',
  fatto:     '<circle cx="12" cy="12" r="8.4"/><path d="M8.2 12.2l2.6 2.6 5-5.4"/>',
  cuore:     '<path d="M12 20s-7.4-4.6-7.4-9.4A4.2 4.2 0 0 1 12 8.2a4.2 4.2 0 0 1 7.4 2.4C19.4 15.4 12 20 12 20z"/>',
  stella:    '<path d="M12 3.8l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z"/>',
};

/**
 * Un'icona come stringa SVG.
 * @param {string} nome    chiave in TRATTI
 * @param {number} misura  lato in px
 * @param {number} [tratto]
 */
export function icona(nome, misura = 24, tratto = 1.7) {
  const d = TRATTI[nome];
  if (!d) return "";
  return (
    `<svg viewBox="0 0 24 24" width="${misura}" height="${misura}" fill="none" ` +
    `stroke="currentColor" stroke-width="${tratto}" stroke-linecap="round" stroke-linejoin="round" ` +
    'aria-hidden="true" focusable="false">' + d + "</svg>"
  );
}

/** L'icona come nodo, quando serve manipolarla dopo. */
export function nodoIcona(nome, misura = 24) {
  const s = document.createElement("span");
  s.className = "icona";
  s.innerHTML = icona(nome, misura);
  return s;
}

export const nomiIcone = () => Object.keys(TRATTI);
export const esisteIcona = (n) => n in TRATTI;
