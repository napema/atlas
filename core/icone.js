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
  /* UN INGRANAGGIO VERO, con i denti.
     Prima erano tre cursori con le manopole — l'icona dei «filtri», non
     quella delle impostazioni. Somigliano abbastanza da non stonare e
     abbastanza poco da non farti trovare la voce che cerchi: in una barra
     di cinque icone quella differenza si paga ogni volta. */
  /* UNA RUOTA DENTATA CALCOLATA, non disegnata a mano.
     La versione precedente era un tracciato scritto a occhio, e si vedeva:
     il dente in cima stava a 12,8 invece che a 12, quindi l'intera ruota
     pendeva da un lato. A quella misura mezzo millimetro non è un dettaglio
     — è l'unica cosa che l'occhio nota.

     Questi trentadue punti vengono da otto denti a 45° esatti l'uno
     dall'altro, fra raggio 10,3 e raggio 7,7. Specchiando l'insieme
     sull'asse verticale torna se stesso, e il centro cade a (12, 12) con
     scarto zero: la simmetria è una proprietà del calcolo, non una
     speranza. Otto e non sette proprio per questo — un numero dispari di
     denti non può essere simmetrico rispetto alla verticale. */
  ingranaggio:
    '<path d="M9.81 4.62L10.12 1.87L13.88 1.87L14.19 4.62L15.67 5.23L17.83 3.51' +
    'L20.49 6.17L18.77 8.33L19.38 9.81L22.13 10.12L22.13 13.88L19.38 14.19' +
    'L18.77 15.67L20.49 17.83L17.83 20.49L15.67 18.77L14.19 19.38L13.88 22.13' +
    'L10.12 22.13L9.81 19.38L8.33 18.77L6.17 20.49L3.51 17.83L5.23 15.67' +
    'L4.62 14.19L1.87 13.88L1.87 10.12L4.62 9.81L5.23 8.33L3.51 6.17L6.17 3.51' +
    'L8.33 5.23Z"/>' +
    '<circle cx="12" cy="12" r="3.1"/>',

  /* ENTRARE, non scendere.
     Prima era una freccia che scendeva dentro un vassoio: è il disegno
     universale del DOWNLOAD, e infatti si leggeva così. Ma qui non si
     scarica niente — si prende un file e lo si fa entrare nell'app. Una
     freccia orizzontale che entra in un contenitore lo dice senza
     didascalia, e non somiglia a nient'altro nella barra. */
  importa:
    '<path d="M9 3.6H5.4A1.8 1.8 0 0 0 3.6 5.4v13.2a1.8 1.8 0 0 0 1.8 1.8H9"/>' +
    '<path d="M20.4 12H8.4"/><path d="M12.6 7.8 8.4 12l4.2 4.2"/>',

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

  /* Forchetta e coltello. Il piatto visto dall'alto sarebbe un cerchio con
     dentro un arco, e a 24px un cerchio con dentro un arco e' un cerchio:
     si confonde con `bersaglio`, che sta due schede piu' in la nella stessa
     barra. Le posate no, a nessuna misura. */
  piatto:
    '<path d="M6.1 3.4v4.3a1.9 1.9 0 0 0 1.9 1.9 1.9 1.9 0 0 0 1.9-1.9V3.4"/>' +
    '<path d="M8 3.4v4.3"/><path d="M8 9.6v11"/>' +
    '<path d="M17.4 3.4v17.2"/>' +
    '<path d="M17.4 3.4c1.7 1.4 2.6 3.5 2.6 5.9 0 1.9-1.1 3.3-2.6 3.7"/>',
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

  /* ----------------------------------------------------- icone aggiunte
     Le 24 icone di `redesign/icone.zip`, inserite come sono: arrivavano gia
     sulla griglia 24x24 con tratto 1,7 e `currentColor`, cioe' esattamente la
     geometria di questo file. I nomi con il trattino stanno fra virgolette.
     Ne mancano ~16 sulle ~40 dell'app: quelle restano quelle di prima. */
  abitudini:
    '<path d="M5 6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v13.2c0 .9-1 1.4-1.7.9L12 17l-5.3 3.1c-.7.5-1.7 0-1.7-.9V6Z"/><path d="m9 11 2 2 4-4"/>',
  "avviso-triangolo":
    '<path d="M12 4 21 19H3Z"/><path d="M12 10v4"/><circle cx="12" cy="16.6" r=".2" fill="currentColor"/>',
  bell:
    '<path d="M12 4.5c-2.3 0-4 1.9-4 4.5v2.8c0 .8-.3 1.6-.9 2.2l-.7.7c-.6.6-.2 1.6.6 1.6h9.9c.8 0 1.2-1 .6-1.6l-.6-.7c-.6-.6-.9-1.4-.9-2.2V9c0-2.6-1.7-4.5-4-4.5Z"/><path d="M10.2 19a1.9 1.9 0 0 0 3.6 0"/>',
  "chevron-d":
    '<path d="m6 9 6 6 6-6"/>',
  "chevron-r":
    '<path d="m9 6 6 6-6 6"/>',
  close:
    '<path d="M6 6l12 12M18 6 6 18"/>',
  corpo:
    '<circle cx="12" cy="5.2" r="2.2"/><path d="M8 11.2c1-1 2.4-1.5 4-1.5s3 .5 4 1.5M8 11.2 6 20M16 11.2l2 8.8M9.6 14h4.8"/>',
  down:
    '<path d="M12 5v14M5 12l7 7 7-7"/>',
  finanze:
    '<path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h12a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5h-12A2.5 2.5 0 0 1 4 15.5v-7Z"/><path d="M4 8.5V7a2 2 0 0 1 2-2h9"/><circle cx="16.2" cy="13" r="1.4"/>',
  impostazioni:
    '<circle cx="12" cy="12" r="2.8"/><path d="M12 3.6v2.1M12 18.3v2.1M20.4 12h-2.1M5.7 12H3.6M17.5 6.5l-1.5 1.5M8 16l-1.5 1.5M17.5 17.5 16 16M8 8 6.5 6.5"/>',
  oggi:
    '<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-13Z"/><path d="M4 10h16"/><path d="M9 4v3"/><path d="M15 4v3"/>',
  pasti:
    '<path d="M7 3.5v6a1.5 1.5 0 0 0 3 0v-6M7 3.5v3M10 3.5v3M8.5 9.5v11M16.5 3.5c-1.4 0-2.5 1.6-2.5 4.3 0 2 1 3.2 2 3.5v9"/>',
  plus:
    '<path d="M12 5v14M5 12h14"/>',
  ricerca:
    '<circle cx="10.5" cy="10.5" r="6"/><path d="m20 20-4.8-4.8"/>',
  sync:
    '<path d="M5 12a7 7 0 0 1 11.6-5.3M19 12a7 7 0 0 1-11.6 5.3"/><path d="M16 4.5V7h2.5M8 19.5V17H5.5"/>',
  up:
    '<path d="M12 19V5M5 12l7-7 7 7"/>',
  wallet:
    '<path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h9a1.5 1.5 0 0 1 1.5 1.5V17a2 2 0 0 1-2 2H6.5A2.5 2.5 0 0 1 4 16.5v-8Z"/><path d="M17 10.8h1.6c.8 0 1.4.6 1.4 1.4v1.6c0 .8-.6 1.4-1.4 1.4H17"/>',

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
