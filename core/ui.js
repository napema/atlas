// ui.js — i mattoni condivisi. Niente framework, niente build.
//
// La regola: qui sta solo ciò che serve a PIÙ di un modulo. Un componente
// usato da uno solo vive nel suo modulo; sale qui quando serve al secondo.
//
// Tutto restituisce nodi DOM veri, non stringhe di HTML. È una scelta:
// con le stringhe ogni valore che arriva dai dati va passato per un escape,
// e la volta che te ne dimentichi hai un buco. Con i nodi il problema non
// esiste, perché `testo` non può diventare markup.

import { icona } from "./icone.js";

/**
 * Crea un elemento.
 *   el("button", { class: "btn", testo: "Salva", onClick: f })
 * Le chiavi che iniziano per `on` diventano ascoltatori; `html` è l'unica
 * via per inserire markup, e va usata solo con stringhe che scrivi tu.
 */
export function el(tag, prop = {}, figli = []) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(prop)) {
    if (v == null || v === false) continue;
    if (k === "class") n.className = v;
    else if (k === "html") n.innerHTML = v;
    else if (k === "testo") n.textContent = v;
    else if (k === "dataset") Object.assign(n.dataset, v);
    else if (k === "stile") Object.assign(n.style, v);
    else if (k.startsWith("on")) n.addEventListener(k.slice(2).toLowerCase(), v);
    else n.setAttribute(k, v === true ? "" : v);
  }
  aggiungi(n, figli);
  return n;
}

/** Aggiunge figli saltando null/false: comodo per i figli condizionali. */
export function aggiungi(nodo, figli) {
  for (const f of [].concat(figli)) {
    if (f == null || f === false || f === "") continue;
    nodo.append(typeof f === "string" || typeof f === "number" ? String(f) : f);
  }
  return nodo;
}

export const svuota = (n) => { while (n.firstChild) n.removeChild(n.firstChild); return n; };

// ------------------------------------------------------------ struttura --

/**
 * Il titolo in cima a una vista: occhiello piccolo sopra, titolo grande
 * sotto, e le azioni a destra. `azione` può essere un nodo solo o un elenco.
 */
export function intestazione(titolo, occhiello = "", azione = null) {
  const azioni = [].concat(azione || []).filter(Boolean);
  return el("header", { class: "testa" }, [
    el("div", { class: "testa-testo" }, [
      occhiello && el("div", { class: "micro", testo: occhiello }),
      el("h1", { testo: titolo }),
    ]),
    el("div", { class: "testa-azioni" }, azioni.length
      ? azioni
      : [el("span", { class: "sync-pallino", "data-ruolo": "sync" })]),
  ]);
}

export function scheda(titolo, corpo, { accento, classe = "" } = {}) {
  const s = el("section", { class: `scheda ${classe}`.trim() }, [
    titolo && el("div", { class: "scheda-titolo", testo: titolo }),
  ]);
  if (accento) s.style.setProperty("--accento", accento);
  aggiungi(s, [].concat(corpo).map((c) => (typeof c === "string" ? el("p", { testo: c }) : c)));
  return s;
}

/** Riquadro con una cifra sola. `tono` colora la cifra, non lo sfondo. */
export function riquadro({ etichetta, valore, dettaglio, tono = "" }) {
  return el("div", { class: "riquadro" }, [
    el("div", { class: "micro", testo: etichetta }),
    el("div", { class: `cifra ${tono}`.trim(), html: String(valore) }),
    dettaglio && el("div", { class: "nota-2", testo: dettaglio }),
  ]);
}

export function lista(righe) {
  return el("ul", { class: "lista" }, righe.filter(Boolean));
}

/**
 * Riga di lista. `azione` può essere una rotta (stringa) o una funzione.
 * Senza azione la riga non è cliccabile e non mostra la freccia.
 */
export function riga({ etichetta, valore, azione, icona: nome, dettaglio, tono = "" }) {
  const dentro = [
    nome && el("span", { class: "icona", html: icona(nome, 22) }),
    el("span", {}, [
      el("span", { testo: etichetta }),
      dettaglio && el("div", { class: "nota", testo: dettaglio }),
    ]),
    valore != null && el("span", { class: `valore ${tono}`.trim(), testo: String(valore) }),
  ];
  if (typeof azione === "string") {
    return el("li", {}, [el("a", { class: "riga", href: azione }, [
      ...dentro, el("span", { class: "freccia", html: icona("freccia", 16) }),
    ])]);
  }
  if (typeof azione === "function") {
    return el("li", {}, [el("button", { class: "riga", type: "button", onClick: azione }, [
      ...dentro, el("span", { class: "freccia", html: icona("freccia", 16) }),
    ])]);
  }
  return el("li", {}, [el("div", { class: "riga" }, dentro)]);
}

export function vuoto(messaggio, nota = "") {
  return el("div", { class: "vuoto" }, [
    el("p", { class: "grande", testo: messaggio }),
    nota && el("p", { class: "nota", testo: nota }),
  ]);
}

// ------------------------------------------------------------- controlli --

/**
 * Controllo segmentato.
 * @param {Array<[valore, etichetta]>} voci
 * @param {string} attivo
 * @param {Function} alCambio
 */
export function segmenti(voci, attivo, alCambio) {
  const g = el("div", { class: "segmenti", role: "group" });
  for (const [valore, testo] of voci) {
    g.append(el("button", {
      class: "segmento", type: "button", testo,
      "aria-pressed": String(valore === attivo),
      dataset: { valore },
      onClick: () => {
        for (const b of g.children) b.setAttribute("aria-pressed", String(b.dataset.valore === valore));
        alCambio(valore);
      },
    }));
  }
  return g;
}

/**
 * Pillole. `multiplo: true` per una selezione a più valori.
 * `alCambio` riceve il valore selezionato (o l'elenco, se multiplo).
 */
export function pillole(voci, attivo, alCambio, { multiplo = false, unaRiga = false } = {}) {
  const scelti = new Set([].concat(attivo ?? []));
  const g = el("div", { class: `pillole ${unaRiga ? "riga-unica" : ""}`.trim() });
  for (const [valore, testo, colore] of voci) {
    const b = el("button", {
      class: "pillola", type: "button", testo,
      "aria-pressed": String(scelti.has(valore)),
      dataset: { valore },
      onClick: () => {
        if (multiplo) {
          scelti.has(valore) ? scelti.delete(valore) : scelti.add(valore);
        } else {
          scelti.clear(); scelti.add(valore);
        }
        for (const x of g.children) x.setAttribute("aria-pressed", String(scelti.has(x.dataset.valore)));
        alCambio(multiplo ? [...scelti] : valore);
      },
    });
    if (colore) b.style.setProperty("--accento", colore);
    g.append(b);
  }
  return g;
}

export function campo({ etichetta, valore = "", tipo = "text", segnaposto = "", alCambio, ...resto }) {
  const input = el("input", {
    class: "campo", type: tipo, value: valore, placeholder: segnaposto,
    ...(tipo === "number" || tipo === "text" ? { autocomplete: "off" } : {}),
    ...resto,
  });
  if (alCambio) input.addEventListener("input", () => alCambio(input.value, input));
  if (!etichetta) return input;
  return el("div", { class: "campo-gruppo" }, [
    el("label", { class: "campo-etichetta", testo: etichetta }),
    input,
  ]);
}

/**
 * Barra di avanzamento.
 *
 * `stato` ("" | "avviso" | "oltre") colora la barra per SEMAFORO, e va usato
 * solo dove il colore significa davvero "quanto sei messo male". Dove invece
 * ogni riga ha già un colore che la identifica — le categorie di Finanze —
 * si passa `colore` e si lascia `stato` vuoto: due significati sullo stesso
 * rosso, nella stessa schermata, non si distinguono più.
 */
export function traccia(frazione, stato = "", { sottile = false, colore = null } = {}) {
  const pct = Math.max(0, Math.min(1, Number(frazione) || 0)) * 100;
  const barra = el("div", { class: `barra ${stato}`.trim(), stile: { width: `${Math.max(3, pct)}%` } });
  if (colore) barra.style.background = colore;
  return el("div", { class: `traccia ${sottile ? "sottile" : ""}`.trim() }, [barra]);
}

/**
 * Anello di completamento. Il tratto è arrotondato e la transizione è sul
 * dashoffset, così l'anello si "riempie" invece di comparire.
 */
export function anello(frazione, { misura = 44, spessore = 4, colore = "var(--accento)" } = {}) {
  const r = (misura - spessore) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.max(0, Math.min(1, Number(frazione) || 0)));
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("class", "anello");
  svg.setAttribute("viewBox", `0 0 ${misura} ${misura}`);
  svg.setAttribute("width", misura);
  svg.setAttribute("height", misura);
  svg.setAttribute("aria-hidden", "true");
  for (const [stroke, dash] of [["var(--traccia)", null], [colore, off]]) {
    const cer = document.createElementNS(ns, "circle");
    cer.setAttribute("cx", misura / 2);
    cer.setAttribute("cy", misura / 2);
    cer.setAttribute("r", r);
    cer.setAttribute("stroke", stroke);
    cer.setAttribute("stroke-width", spessore);
    if (dash != null) {
      cer.setAttribute("stroke-linecap", "round");
      cer.setAttribute("stroke-dasharray", c.toFixed(2));
      cer.setAttribute("stroke-dashoffset", dash.toFixed(2));
      cer.style.transition = "stroke-dashoffset var(--lento) var(--curva)";
    }
    svg.append(cer);
  }
  return svg;
}

// ---------------------------------------------------------------- fogli --

let veloCondiviso = null;
const pila = [];   // i fogli aperti, dal più vecchio

function assicuraVelo() {
  if (veloCondiviso) return veloCondiviso;
  veloCondiviso = el("div", { class: "velo", onClick: () => chiudiFoglio() });
  document.body.append(veloCondiviso);
  return veloCondiviso;
}

/**
 * Apre un foglio modale. Restituisce { elemento, corpo, chiudi }.
 *
 * Il foglio è l'unico posto in cui ATLAS blocca l'utente, quindi ha tre
 * vie d'uscita: il pulsante, il velo, e Escape. Toglierne una qualsiasi
 * rende l'app claustrofobica su un telefono.
 */
export function apriFoglio({ titolo, sinistra, destra, mezzo = false, alChiudi } = {}) {
  const velo = assicuraVelo();
  const corpo = el("div", { class: "foglio-corpo" });

  const foglio = el("section", {
    class: `foglio ${mezzo ? "mezzo" : ""}`.trim(),
    role: "dialog", "aria-modal": "true",
    ...(titolo ? { "aria-label": titolo } : {}),
  }, [
    el("div", { class: "foglio-maniglia" }),
    (titolo || sinistra || destra) && el("div", { class: "foglio-testa" }, [
      sinistra || el("span"),
      titolo ? el("h3", { testo: titolo }) : el("span"),
      destra || el("span"),
    ]),
    corpo,
  ]);

  document.body.append(foglio);
  pila.push({ foglio, alChiudi });

  // Leggere una proprietà di layout forza il calcolo dello stato iniziale:
  // senza, il browser accorpa le due classi e la transizione non si vede.
  // Prima c'era un requestAnimationFrame, e in una scheda non visibile —
  // l'app riaperta da una notifica — quel frame non arriva mai e il foglio
  // resta trasparente sopra la schermata, invisibile e cliccabile.
  void foglio.offsetHeight;
  velo.classList.add("aperto");
  foglio.classList.add("aperto");
  document.body.style.overflow = "hidden";

  return { elemento: foglio, corpo, chiudi: () => chiudiFoglio(foglio) };
}

/** Chiude il foglio indicato, o quello in cima alla pila. */
export function chiudiFoglio(quale) {
  const i = quale ? pila.findIndex((p) => p.foglio === quale) : pila.length - 1;
  if (i < 0) return;
  const [voce] = pila.splice(i, 1);
  voce.foglio.classList.remove("aperto");
  if (!pila.length) {
    veloCondiviso?.classList.remove("aperto");
    document.body.style.overflow = "";
  }
  setTimeout(() => { voce.foglio.remove(); voce.alChiudi?.(); }, 320);
}

export const foglioAperto = () => pila.length > 0;

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && pila.length) { e.preventDefault(); chiudiFoglio(); }
});

// --------------------------------------------------------------- avvisi --

export function avviso(testo, { durata = 2400, tono = "" } = {}) {
  let cassetto = document.getElementById("avvisi");
  if (!cassetto) {
    cassetto = el("div", { id: "avvisi", role: "status", "aria-live": "polite" });
    document.body.append(cassetto);
  }
  const a = el("div", { class: `bolla ${tono}`.trim(), testo });
  cassetto.append(a);
  setTimeout(() => { a.classList.add("via"); setTimeout(() => a.remove(), 320); }, durata);
  return a;
}

/** Vibrazione breve. Su iOS in PWA spesso non c'è: fallisce in silenzio. */
export function tocco(ms = 8) {
  try { navigator.vibrate?.(ms); } catch { /* niente */ }
}

// -------------------------------------------------------------- formati --

const NUM = new Intl.NumberFormat("it-IT");
const NUM2 = new Intl.NumberFormat("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const numero = (n) => NUM.format(Number(n) || 0);

/**
 * Da CENTESIMI a stringa in euro. Gli importi in ATLAS sono sempre interi
 * di centesimi: i decimali in virgola mobile sui soldi producono totali
 * che non tornano per un centesimo, e nessuno capisce perché.
 */
export function euro(centesimi, { segno = false, tondo = false } = {}) {
  const c = Math.round(Number(centesimi) || 0);
  const n = Math.abs(c) / 100;
  const s = tondo ? `${NUM.format(Math.round(n))} €` : `${NUM2.format(n)} €`;
  if (!segno) return s;
  return (c < 0 ? "−" : "+") + s;
}

/**
 * Come `euro`, ma coi centesimi rimpiccioliti alla Wallet. Restituisce HTML.
 *
 * Si rimpiccioliscono SOLO le due cifre dei centesimi. Il simbolo € resta
 * al corpo pieno: alzato e ridotto insieme alla virgola diventava un apice
 * fluttuante, e "800,00 €" si leggeva come una nota a piè di pagina.
 */
export function euroRicco(centesimi, { segno = false } = {}) {
  const s = euro(centesimi, { segno });
  const m = s.match(/^(.*?)(,\d{2})(\s*€)$/);
  if (!m) return escapa(s);
  return `${escapa(m[1])}<span class="cts">${escapa(m[2])}</span>${escapa(m[3])}`;
}

/** Da stringa scritta a mano a centesimi. Accetta "12,50", "12.50", "12". */
export function centesimi(testo) {
  if (typeof testo !== "string") return null;
  const pulito = testo.replace(/[\s€]/g, "").replace(/\./g, testo.includes(",") ? "" : ".").replace(",", ".");
  const n = Number(pulito);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

export function escapa(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

export const MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno",
  "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
export const MESI_BREVI = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
export const GIORNI = ["lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato", "domenica"];
export const GIORNI_INIZIALI = ["L", "M", "M", "G", "V", "S", "D"];

/** "2026-08-21" da una Date. È la chiave con cui tutti i moduli indicizzano. */
export function isoDi(d = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
export const oggiISO = () => isoDi(new Date());

/** Da "2026-08-21" a Date, a mezzogiorno per non incappare nell'ora legale. */
export const daISO = (iso) => new Date(`${iso}T12:00:00`);

export function piuGiorni(iso, n) {
  const d = daISO(iso);
  d.setDate(d.getDate() + n);
  return isoDi(d);
}

/** "oggi", "ieri", "lun 18 ago". Le date lontane portano l'anno. */
export function dataUmana(iso) {
  const d = daISO(iso);
  if (Number.isNaN(+d)) return "";
  const giorno = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const scarto = Math.round((giorno(d) - giorno(new Date())) / 86400000);
  if (scarto === 0) return "oggi";
  if (scarto === -1) return "ieri";
  if (scarto === 1) return "domani";
  const opz = Math.abs(scarto) < 300
    ? { weekday: "short", day: "numeric", month: "short" }
    : { day: "numeric", month: "short", year: "numeric" };
  return d.toLocaleDateString("it-IT", opz);
}

export const dataBreve = (iso) => `${daISO(iso).getDate()} ${MESI_BREVI[daISO(iso).getMonth()]}`;

/**
 * Concorda il numero con la parola: `plurale(1, "giorno", "giorni")`.
 * Sembra una pignoleria e non lo è — "1 giorni di fila" in una schermata
 * che si guarda ogni sera si nota tutte le sere.
 */
export const plurale = (n, singolare, plur) => `${n} ${n === 1 ? singolare : plur}`;

/** Da secondi a "14 min" o "1 h 05". */
export function durata(secondi) {
  const m = Math.round((Number(secondi) || 0) / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}`;
}

/**
 * Id di un record: stabile, e non collide.
 * Il tempo da solo non basta — due tocchi nello stesso millisecondo
 * esistono, e su due dispositivi anche di più.
 */
export function nuovoId(prefisso = "r") {
  return `${prefisso}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/* =========================================================================
   LA TESSERA A BARRA
   L'oggetto caratteristico di ATLAS. Nome in alto, cifra grande al centro,
   e in fondo una barra colorata col cursore che dice a che punto sei.

   Perché il cursore a triangolo e non solo la barra piena: una barra al 40%
   e una al 45% sono indistinguibili di sfuggita, e su una griglia di sei
   tessere è proprio di sfuggita che si guardano. Il triangolo dà un punto
   preciso su cui posare l'occhio.
   ========================================================================= */

/**
 * @param {object} o
 * @param {string} o.nome       il titolo della tessera
 * @param {string} [o.emoji]    simbolo davanti al nome
 * @param {string} [o.icona]    in alternativa all'emoji, una chiave di icone.js
 * @param {string} [o.sotto]    la riga di contesto sotto il nome
 * @param {string} [o.micro]    l'etichetta minuscola sopra la cifra
 * @param {string} [o.tonoMicro] "" | "ok" | "avviso" | "male"
 * @param {string} o.cifra      HTML della cifra (di solito da euroGrande)
 * @param {string} [o.coda]     la riga sotto la cifra
 * @param {number} [o.frazione] 0–1, quanto è piena la barra
 * @param {string} [o.tinta]    il colore della tessera
 * @param {Function} [o.azione]
 */
export function tessera({ nome, emoji, icona: nomeIcona, sotto, micro, tonoMicro = "",
                          cifra, coda, frazione = 0, tinta, azione }) {
  const f = Math.max(0, Math.min(1, Number(frazione) || 0));
  const t = el(azione ? "button" : "div", {
    class: "tessera",
    ...(azione ? { type: "button", onClick: azione } : {}),
  }, [
    el("div", { class: "tessera-testa" }, [
      emoji && el("span", { class: "tessera-emoji", testo: emoji }),
      nomeIcona && el("span", { class: "tessera-icona", html: icona(nomeIcona, 16) }),
      el("span", { class: "tessera-nome", testo: nome }),
    ]),
    sotto && el("div", { class: "tessera-sotto", testo: sotto }),
    micro && el("div", { class: `micro ${tonoMicro}`.trim(), testo: micro }),
    el("div", { class: "cifra tessera-cifra", html: String(cifra ?? "—") }),
    coda && el("div", { class: "tessera-coda", testo: coda }),
    el("div", { class: "barra-cursore" }, [
      el("i", { stile: { width: `${f * 100}%` } }),
      // Il triangolo si ferma prima dei bordi: a 0% e a 100% mezzo cursore
      // uscirebbe dalla tessera e verrebbe tagliato dall'overflow.
      el("b", { stile: { left: `${Math.min(97, Math.max(3, f * 100))}%` } }),
    ]),
  ]);
  if (tinta) t.style.setProperty("--tinta", tinta);
  return t;
}

/**
 * La barra a segmenti con la legenda: una riga sola divisa in fette.
 * Dice la composizione di un totale senza chiedere una ciambella, e in
 * mezzo a una schermata di numeri costa molto meno spazio.
 *
 * @param {Array<{etichetta, valore, tinta}>} voci
 */
export function spezzata(voci, { legenda = true, quante = 4 } = {}) {
  const totale = voci.reduce((s, v) => s + v.valore, 0) || 1;
  const ordinate = [...voci].sort((a, b) => b.valore - a.valore);
  const mostrate = ordinate.slice(0, quante);
  const resto = ordinate.slice(quante).reduce((s, v) => s + v.valore, 0);
  if (resto > 0) mostrate.push({ etichetta: "Altro", valore: resto, tinta: "var(--testo-4)" });

  const barra = el("div", { class: "spezzata" }, mostrate.map((v) => {
    const i = el("i", { stile: { width: `${(v.valore / totale) * 100}%` } });
    i.style.setProperty("--tinta", v.tinta);
    return i;
  }));

  if (!legenda) return barra;

  return el("div", {}, [
    barra,
    el("div", { class: "legenda" }, mostrate.map((v) => {
      const p = el("span", { class: "punto" });
      p.style.setProperty("--tinta", v.tinta);
      return el("span", { class: "legenda-voce" }, [
        p,
        el("span", { testo: v.etichetta }),
        el("b", { testo: `${Math.round((v.valore / totale) * 100)}%` }),
      ]);
    })),
  ]);
}

/** La pillola con la tendina, tipo "settimana ⌄". Cicla fra le voci. */
export function selettore(voci, attivo, alCambio) {
  const etichetta = el("span", { testo: voci.find(([v]) => v === attivo)?.[1] || voci[0][1] });
  let corrente = attivo;
  return el("button", {
    class: "selettore", type: "button",
    onClick: () => {
      const i = voci.findIndex(([v]) => v === corrente);
      const [v, t] = voci[(i + 1) % voci.length];
      corrente = v;
      etichetta.textContent = t;
      alCambio(v);
    },
  }, [etichetta, el("span", { html: icona("giu", 14) })]);
}

/** Il quadratino con l'emoji davanti a una riga di elenco. */
export function gettone(simbolo, tinta = null) {
  const g = el("span", { class: `gettone${tinta ? " tinto" : ""}`, testo: simbolo });
  if (tinta) g.style.setProperty("--tinta", tinta);
  return g;
}

/**
 * Una cifra in euro alla maniera delle etichette dei prezzi: simbolo piccolo
 * e alzato, intero grande, centesimi piccoli. Restituisce HTML.
 */
export function euroGrande(cent, { segno = false, centesimi: conCentesimi = true } = {}) {
  const c = Math.round(Number(cent) || 0);
  const n = Math.abs(c) / 100;
  const intero = NUM.format(Math.trunc(n));
  const dec = String(Math.round((n - Math.trunc(n)) * 100)).padStart(2, "0");
  const meno = c < 0 ? "−" : (segno ? "+" : "");
  // Il simbolo va DOPO, come in `euro()` e come si scrive in italiano. Stava
  // davanti, e nella stessa schermata si leggeva "€38" sopra e "7,81 €"
  // sotto: due modi di scrivere la stessa cosa a due centimetri di distanza.
  return `${escapa(meno)}${escapa(intero)}` +
         (conCentesimi ? `<span class="cts">,${escapa(dec)}</span>` : "") +
         `<span class="val">€</span>`;
}
