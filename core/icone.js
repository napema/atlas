// icone.js — le icone come SVG inline, non come font né come file.
//
// Inline per due ragioni. Ereditano `currentColor`, quindi la scheda attiva
// della barra cambia colore senza una riga di JavaScript. E non arrivano
// dalla rete: un'icona che si scarica è un'icona che offline non c'è.
//
// Tutte sulla stessa griglia 24×24, tratto 1.7, estremi e giunzioni tonde —
// è la geometria di SF Symbols, ed è ciò che le fa sembrare una famiglia
// invece di un assortimento.
//
// Un'eccezione, e una sola: `MASCHERE`, qui sotto, per le icone che arrivano
// da fuori già disegnate. Anche quelle stanno nel file e non nella rete, e
// anche quelle ereditano `currentColor` — cambia solo come.

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

/* ======================================================== le maschere ==
   Un'icona che non è un tracciato ma un bitmap ritagliato.

   Serve per quelle che arrivano da fuori già disegnate — la figura in
   allungo di Mobilità è di icons8, stile parakeet-line, usata col
   permesso dell'utente. Ricalcarla a mano l'ho provato tre volte e tre
   volte è venuta un'altra cosa.

   Il PNG NON va messo come immagine: un'immagine non eredita
   `currentColor`, e la scheda attiva della barra deve cambiare colore da
   sola come fanno tutte le altre. Va usato come MASCHERA sopra un fondo
   di `currentColor`: il colore resta quello del testo, il disegno resta
   quello originale.

   Il dato sta qui dentro e non in un file .png perché un'icona che si
   scarica è un'icona che offline non c'è — vale per i tracciati e vale
   per questa. 96px di sorgente per 21 di resa: regge il retina.
   ========================================================================= */

const MASCHERE = {
  corpo: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAYAAADimHc4AAAACXBIWXMAAAsTAAALEwEAmpwYAAAIQUlEQVR4nO2dCYzVRBjH/wvLwi6nCgLiHUEQAZEYIEFEiAE1ohFJxNV4cBggKHLoqkRAJRsVBK8oBC+MQQRdFDUoKB4EQVDwQEAERMQFFRZ9INeyz3zJt0nzOe2b9rWvr+38kknIttPOfPM6x3cBGAwGg8GQHScDGArgXQCbARzkspn/RtdOCruRcaQQwHgAVQDSGQrdM47rGHygBMD7GoKXZRmAxn40IMnUAbDUg/Bry1J+hsEj4xVC3cN/78BfRwn/ewKAvYr77wm7E1GlEYB9QpireSG24xQAa0SdvwA0zGG7Y8OdCkG20qjXmu+11h2eg/bGjreEECe7qDtF1F0YYDtjyw4hxC4u6nYVdbcH2M7YckgIkRZbXUpE3UMBtjO2ZDMAjUTdVIDtTMwUdJGLumYK8oFFQoi0sOoy1SzC2TNCsQ2lLWYmWivOD8N9aE/iMAexPGCcjSpiIoCOLNiG/O+JNqqIsWF3IunKuIKwOxF1aPv5ngfhf2TU0f5RyNORrkGGNKDGIBMAZG68HcA7ADbxASvF/17M14xJMo9oyYPyFCv3lvH54mUADwIYBKBN2I2MI+cCmA+gWnO9+AnAbABXAqgXduOjzvUA/sli57QPwByXqg+DRfjHsxB+WpQVAK4zdmU9zgRwQCHELQBmArgFwGAudwF4BsAXAI5qDMQ2AHcDKAq7k/nMq0JoxwCM0diONgTQn6cdacqUZaNLw1BiOJUFnq0Crh5POZ84DMJ+VncbLNwshLTBh2d2AfAigMOKQSBXyGIf3hEbnhUCKvPx2S0AvGCUfM5Ihd3AAN4xU7zjhwDeEVlWC+FcGsA7mgD41/KOGgDNAnhPJPlaDIDXRXIY26JpET5b4z0XZtnu2LBCCGaAh2e0F6oLUmVItoj3kE+qAcCbQjDk1uiWueIZpHG1cgFPO7XXjwCo71P7I880Ibxyl/VPY4Fan3GDuGexuL7cx/ZHniFCOJ+5rP+YqL8VQF3L9SsU29AgdlqR5XQhnCMuDkpNFJY26xRGqozvxfVVxtb8f7YJIfXRrHefqLdXDN5Ycf0EgEsC6kOkeUkI6nGNOkUAdot6k8QpWH4dtFgbFNwoBLVTY5q4Q9RJCcev2eL6AVb8GWzUygeFwHplqPONuJ/UDbV0VZg0yTPD4MB8IbDnMrgxpi3lOBt1wF/O5+I6eV4Ye3EGBgqhVTn4hZ4n7v3VYTrzerpOHHQy/UPzVFysMOLM4HQHf4q/UxoEg8dT8XcO91YofulpxZmibQ7bH3nOUHhG9HFQwKUyDMC9OW5/LKNrPnC4tzeASoXgaXp6yJx4vdFbIdBuGYJBRrDL4usck2ymnSyR28iKsBuUNPqLAagB0DnsRiUNGS9WEXaDksY1irWgp4vInEVsiCfX9gYBtzWW0A7mSzEAtDboGuit9Sj22KAJqR+uZX/PPYqvgL4MtwOQ4oAPgw3n8FZyiY07YdpSftYwqDdSDB55VBsYstn2BTCdNZVpl6VM4x1jRJ2jHH2DpKsaHgbwmwthpxQ+PSmN+LAihamTDmqJZZxwD3Qq5Nkwiz0a6rMlq8qDMEsVNuFEuqdL15G0YnpYzoPUTnNKqdGwmlF40npRj5yBE8XVNkI/wMb4QexeorNubBDPWC98gFQMULz7ciSIb0Xn/+Ydj5cgiV7CxZDKSA/+p2uSointJjpOhvIeWT5znnhmFbsnOtFdMXDSfTGWlIlO0z4/W1rxV2R97tse7Aybk5CT4g3R6VEu6pL+5jLW7y/gqaaOjcebzi/6fIW1jabCWLPORfRLMR/OprKDrupEPITvpYX3K3GtMkNGLrB6w1pnt8uMjpFD7t3t8saVK1zMVeURS51OikBt2lU50UaRUtPPoMC8orno6EGbnUdfF3kg2mbIsFjDhzcnyhWLeKYvJ5J0Fx2l7agKVRipNWfoKwButcklVKRwP9/Oyjg7mikSCj6BGFKqsVOhRfV3cd8Czg1R62qoM9DSD5Qcc52YKO4/zHqqWDFZw+W8h+KQ5iV2a4ZiKqITuNOCv0vUeS1ulrN5Gm6G5YpfvxdKFBrTSl6H7BiqmPKOcBaWaazCiHTiwFWic/0U92yy2WZ6PXUfc2HIr8sR804LfzVnWZnNqXIo6CMyyESsMni6nbh+zIfo9akKIVIyEDsGsIpaZxdWO7Vt5I1DaT6vG00Un3bdDAsh5QrNlnoA1iq2mWc51OnH+Yq2uxgIa9nB9YfxaTsvuFihd5GsFPeM9und7RWGn5Waeh+K2LwJwPP8S5cKPJ2yhzO+jwwzJGqwaBRlz7XSUnz6Ndx5vxijEAyZQt3SnJNAPclflm4mR+vhc0IYqu/7RUMo96eT2wh1zk8KFCmTq1m5lw2Ned14lH2UdNQnaXY+yCkydwP9Iq0scQgv9YsWikPeLp/9gxqwgpHa/6FDvEJNrq1wn4oGXCUcr6SmkxRrQdBPsctZ7/N0Z6WQA8HLFDHMOQ2V2ile3k7kB7VeI9eRICm3Sd43hXMGBWWU6aSwgecMmUKylcMJmRa4ICnMEE92nH+t63hqnMvnidG8APfkbaxbNUWx2EVV53IxltmpngbQlFXFcvqhiJigacA5hNJZln28Pf2YdUfTOd1+KceydeDDZAlrWKVLZc6YpNmhX3KYWriA9VH7fRgIL0Un/4VvNGXhOjWoJiTPhBJWxFVkcfp1Wyo5uj+ndHTwAT3BOaDzgfqs0+nJbvGjeA2Yw2vCWl4jvCYW382agVBoxnbcH/nQspdVzlHMWFjAZ4jO/H8V3AbgAT5kLmQ19la2OR9lTW95BpW4wWAwGAwGgwF2/Ad4RRRVt4MULQAAAABJRU5ErkJggg==",
};

/**
 * Un'icona, come stringa di HTML.
 *
 * Quasi sempre è un SVG di tracciati. Per quelle in `MASCHERE` è invece uno
 * `<span>` con il bitmap in maschera sopra `currentColor`: si comporta come
 * le altre — eredita il colore, si misura in px — e chi la usa non deve
 * sapere quale delle due è.
 *
 * @param {string} nome    chiave in TRATTI o in MASCHERE
 * @param {number} misura  lato in px
 * @param {number} [tratto]  spessore, solo per i tracciati
 */
export function icona(nome, misura = 24, tratto = 1.7) {
  const m = MASCHERE[nome];
  if (m) {
    return (
      `<span class="icona-maschera" aria-hidden="true" style="width:${misura}px;height:${misura}px;` +
      `-webkit-mask-image:url(${m});mask-image:url(${m})"></span>`
    );
  }
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

export const nomiIcone = () => [...Object.keys(TRATTI), ...Object.keys(MASCHERE)];
export const esisteIcona = (n) => n in TRATTI || n in MASCHERE;
