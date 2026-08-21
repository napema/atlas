// ui.js — i mattoni condivisi. Niente framework, niente build.
//
// La regola: qui sta solo ciò che serve a PIÙ di un modulo. Un componente
// usato da uno solo vive nel suo modulo. Se un giorno serve al secondo,
// allora sale qui — non prima.

import { icona } from "./icone.js";

/** Crea un elemento. Le proprietà con `on` davanti diventano listener. */
export function el(tag, prop = {}, figli = []) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(prop)) {
    if (v == null || v === false) continue;
    if (k === "class") n.className = v;
    else if (k === "html") n.innerHTML = v;
    else if (k === "testo") n.textContent = v;
    else if (k === "dataset") Object.assign(n.dataset, v);
    else if (k.startsWith("on")) n.addEventListener(k.slice(2).toLowerCase(), v);
    else n.setAttribute(k, v === true ? "" : v);
  }
  for (const f of [].concat(figli)) {
    if (f == null || f === false) continue;
    n.append(typeof f === "string" ? document.createTextNode(f) : f);
  }
  return n;
}

/** Intestazione grande in cima a una vista. */
export function intestazione(titolo, occhiello = "") {
  return el("header", { class: "intestazione" }, [
    el("div", {}, [
      occhiello && el("div", { class: "occhiello", testo: occhiello }),
      el("h1", { testo: titolo }),
    ]),
    el("span", { class: "sync-pallino", "data-ruolo": "sync" }),
  ]);
}

export function scheda(titolo, corpo, { accento } = {}) {
  const s = el("section", { class: "scheda" }, [
    titolo && el("div", { class: "scheda-titolo" }, [
      el("span", { class: "pallino" }),
      el("span", { testo: titolo }),
    ]),
  ]);
  if (accento) s.style.setProperty("--accento", accento);
  for (const c of [].concat(corpo)) if (c) s.append(typeof c === "string" ? el("p", { testo: c }) : c);
  return s;
}

/** Riga di lista con freccia. `azione` può essere una funzione o una rotta. */
export function riga({ etichetta, valore, azione, icona: nome }) {
  const dentro = [
    nome && el("span", { class: "icona", html: icona(nome, 22) }),
    el("span", { testo: etichetta }),
    valore != null && el("span", { class: "valore", testo: String(valore) }),
  ];
  if (typeof azione === "string") {
    return el("li", {}, [el("a", { class: "riga", href: azione.startsWith("#") ? azione : `#/${azione}` }, [
      ...dentro, el("span", { class: "valore", html: icona("freccia", 18) }),
    ])]);
  }
  if (typeof azione === "function") {
    return el("li", {}, [el("button", { class: "riga", type: "button", onClick: azione }, dentro)]);
  }
  return el("li", {}, [el("div", { class: "riga" }, dentro)]);
}

export function vuoto(messaggio, nota = "") {
  return el("div", { class: "vuoto" }, [
    el("p", { testo: messaggio }),
    nota && el("p", { class: "nota", testo: nota }),
  ]);
}

/** Notifica breve, in fondo allo schermo. Non blocca niente. */
export function avviso(testo, { durata = 2600, tono = "" } = {}) {
  let cassetto = document.getElementById("avvisi");
  if (!cassetto) {
    cassetto = el("div", { id: "avvisi", role: "status", "aria-live": "polite" });
    document.body.append(cassetto);
  }
  const a = el("div", { class: `avviso ${tono}`, testo });
  cassetto.append(a);
  setTimeout(() => { a.classList.add("via"); setTimeout(() => a.remove(), 300); }, durata);
}

// ---------------------------------------------------------------- formati --

const EUR = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });
const NUM = new Intl.NumberFormat("it-IT");

export const euro = (n) => EUR.format(Number(n) || 0);
export const numero = (n) => NUM.format(Number(n) || 0);

/** "oggi", "ieri", "lun 18 ago" — le date lontane si scrivono per esteso. */
export function dataUmana(iso) {
  const d = new Date(iso);
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

/** La data di oggi come "2026-08-21". È la chiave con cui i moduli indicizzano i giorni. */
export function oggiISO(d = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * Id di un record. Deve essere stabile fra dispositivi e non collidere:
 * il tempo da solo non basta, due tocchi nello stesso millisecondo esistono.
 */
export function nuovoId(prefisso = "r") {
  return `${prefisso}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
