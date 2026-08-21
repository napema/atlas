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
 * Il titolo grande in cima a una vista, con il pallino del sync.
 * Il collasso su scorrimento lo gestisce core/app.js: qui c'è solo la forma.
 */
export function intestazione(titolo, occhiello = "", azione = null) {
  return el("header", { class: "intestazione" }, [
    el("div", {}, [
      occhiello && el("div", { class: "occhiello", testo: occhiello }),
      el("h1", { testo: titolo }),
    ]),
    azione || el("span", { class: "sync-pallino", "data-ruolo": "sync" }),
  ]);
}

export function scheda(titolo, corpo, { accento, classe = "" } = {}) {
  const s = el("section", { class: `scheda ${classe}`.trim() }, [
    titolo && el("div", { class: "scheda-titolo" }, [
      el("span", { class: "pallino" }),
      el("span", { testo: titolo }),
    ]),
  ]);
  if (accento) s.style.setProperty("--accento", accento);
  aggiungi(s, [].concat(corpo).map((c) => (typeof c === "string" ? el("p", { testo: c }) : c)));
  return s;
}

/** Riquadro con una cifra sola. `tono` colora la cifra, non lo sfondo. */
export function riquadro({ etichetta, valore, dettaglio, tono = "" }) {
  return el("div", { class: "riquadro" }, [
    el("div", { class: "etichetta-riga", testo: etichetta }),
    el("div", { class: `cifra ${tono}`.trim(), html: String(valore) }),
    dettaglio && el("div", { class: "nota", testo: dettaglio }),
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

/** Barra di avanzamento. `stato` = "" | "avviso" | "oltre". */
export function traccia(frazione, stato = "", { sottile = false } = {}) {
  const pct = Math.max(0, Math.min(1, Number(frazione) || 0)) * 100;
  return el("div", { class: `traccia ${sottile ? "sottile" : ""}`.trim() }, [
    el("div", { class: `barra ${stato}`.trim(), stile: { width: `${Math.max(2, pct)}%` } }),
  ]);
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
  for (const [stroke, dash] of [["var(--sfondo-4)", null], [colore, off]]) {
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

  // Un frame di ritardo: senza, il browser applica lo stato finale subito
  // e la transizione non si vede.
  requestAnimationFrame(() => { velo.classList.add("aperto"); foglio.classList.add("aperto"); });
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
  const a = el("div", { class: `avviso ${tono}`.trim(), testo });
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

/** Come `euro`, ma coi centesimi rimpiccioliti alla Wallet. Restituisce HTML. */
export function euroRicco(centesimi, { segno = false } = {}) {
  const s = euro(centesimi, { segno });
  const i = s.lastIndexOf(",");
  if (i < 0) return escapa(s);
  return `${escapa(s.slice(0, i))}<span class="cts">${escapa(s.slice(i))}</span>`;
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
