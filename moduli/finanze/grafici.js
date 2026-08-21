// moduli/finanze/grafici.js — i tre grafici, portati dall'app di partenza.
//
// Sono gli stessi di prima: cumulato del mese, ciambella della ripartizione,
// barre a sei mesi. Cambia solo da dove prendono i colori — token invece di
// variabili proprie — e il fatto che restituiscono nodi invece di stringhe.
//
// Nessuna libreria. Un grafico che dipende da un CDN è un grafico che offline
// non c'è, e la schermata Analisi si guarda anche in treno.

import { el, euro } from "../../core/ui.js";

const NS = "http://www.w3.org/2000/svg";

/**
 * Crea un nodo SVG.
 *
 * `attr` sono attributi normali; `stile` sono PROPRIETÀ CSS, ed è una
 * distinzione che qui non è pedanteria: `var(--blu)` dentro un attributo di
 * presentazione SVG (`fill`, `stroke`, `font-family`) NON si risolve — resta
 * la stringa letterale e il browser la butta. Come proprietà CSS invece
 * funziona. È il motivo per cui tutti i colori e i font di questi grafici
 * passano da `stile` e non da `attr`.
 */
function tag(nome, attr = {}, dentro = [], stile = {}) {
  const n = document.createElementNS(NS, nome);
  for (const [k, v] of Object.entries(attr)) if (v != null) n.setAttribute(k, v);
  for (const [k, v] of Object.entries(stile)) if (v != null) n.style.setProperty(k, v);
  for (const f of [].concat(dentro)) if (f) n.append(f);
  return n;
}

/** Le etichette dei grafici. Il font arriva dal CSS (`.fi-svg text`). */
function testo(x, y, contenuto, { misura = 13, peso = 600, colore = "var(--etichetta-3)", ancora = "middle" } = {}) {
  const t = tag("text",
    { x, y, "text-anchor": ancora },
    [],
    { "font-size": `${misura}px`, "font-weight": peso, fill: colore });
  t.textContent = contenuto;
  return t;
}

/**
 * L'andamento cumulato del mese contro il ritmo ideale del budget.
 *
 * La retta tratteggiata è il budget speso in modo perfettamente uniforme.
 * Stare sopra quella retta è l'unica cosa che conta, e per questo la linea
 * cambia colore: verde sotto, rossa sopra. Il colore fa il lavoro che
 * altrimenti servirebbe una legenda a fare.
 */
export function graficoCumulato(cum, budget, giornoOggi, giorniMese) {
  const L = 520, A = 150;
  const bordo = 4;
  const massimo = Math.max(budget || 0, cum[cum.length - 1] || 0, 1) * 1.05;
  const x = (i) => bordo + (i / Math.max(1, giorniMese - 1)) * (L - bordo * 2);
  const y = (v) => A - (v / massimo) * A;
  const fino = giornoOggi != null ? Math.min(giornoOggi, giorniMese) : giorniMese;
  const sopra = budget > 0 && giornoOggi != null && cum[fino - 1] > (budget * fino) / giorniMese;
  const colore = sopra ? "var(--rosso)" : "var(--verde)";
  const idg = `g${Math.random().toString(36).slice(2, 8)}`;

  const svg = tag("svg", { viewBox: `0 0 ${L} ${A + 22}`, role: "img",
    "aria-label": "Andamento della spesa nel mese", class: "fi-svg" });

  // Anche `stop-color` è un attributo di presentazione: il token va passato
  // come proprietà CSS, o il gradiente esce nero.
  const fermata = (offset, opacita) =>
    tag("stop", { offset }, [], { "stop-color": colore, "stop-opacity": opacita });

  svg.append(tag("defs", {}, [
    tag("linearGradient", { id: `${idg}l`, x1: 0, y1: 0, x2: 1, y2: 0 }, [
      fermata("0%", ".35"), fermata("100%", "1"),
    ]),
    tag("linearGradient", { id: `${idg}a`, x1: 0, y1: 0, x2: 0, y2: 1 }, [
      fermata("0%", ".22"), fermata("100%", "0"),
    ]),
  ]));

  // Griglia orizzontale appena percettibile. Verticale nessuna: aggiungerebbe
  // reticolo senza aggiungere informazione.
  for (const f of [0.25, 0.5, 0.75, 1]) {
    svg.append(tag("line", { x1: bordo, y1: A - f * A, x2: L - bordo, y2: A - f * A, "stroke-width": 1, opacity: ".07" },
      [], { stroke: "var(--etichetta-3)" }));
  }

  if (budget > 0) {
    svg.append(tag("line", { x1: x(0), y1: y(0), x2: x(giorniMese - 1), y2: y(budget),
      "stroke-width": 1.5, "stroke-dasharray": "5 5", opacity: ".45" }, [], { stroke: "var(--etichetta-3)" }));
  }

  const punti = [];
  for (let i = 0; i < fino; i++) punti.push(`${x(i)},${y(cum[i])}`);
  if (punti.length) {
    svg.append(tag("polygon", {
      points: `${x(0)},${A} ${x(0)},${y(0)} ${punti.join(" ")} ${x(fino - 1)},${A}`,
      fill: `url(#${idg}a)`,
    }));
    svg.append(tag("polyline", {
      points: `${x(0)},${y(0)} ${punti.join(" ")}`, fill: "none",
      stroke: `url(#${idg}l)`, "stroke-width": 3, "stroke-linejoin": "round", "stroke-linecap": "round",
    }));
    svg.append(tag("circle", { cx: x(fino - 1), cy: y(cum[fino - 1]), r: 4.5 }, [], { fill: colore }));
  }

  for (const g of [1, 10, 20, giorniMese]) svg.append(testo(x(g - 1), A + 15, String(g)));
  return el("div", { class: "fi-grafico" }, [svg]);
}

/** La ciambella della ripartizione, con la legenda accanto. */
export function graficoCiambella(voci, totale) {
  const R = 56, SP = 26, C = R + SP / 2 + 2, S = C * 2;
  const svg = tag("svg", { width: S, height: S, viewBox: `0 0 ${S} ${S}`, "aria-hidden": "true" });

  if (voci.length === 1) {
    svg.append(tag("circle", { cx: C, cy: C, r: R, "stroke-width": SP }, [], { fill: "none", stroke: voci[0].colore }));
  } else {
    let a0 = -Math.PI / 2;
    for (const v of voci) {
      const a1 = a0 + (v.valore / totale) * 2 * Math.PI;
      const stacco = 0.03;                       // il filo di respiro fra due fette
      const b0 = a0 + stacco / 2;
      const b1 = Math.max(b0 + 0.01, a1 - stacco / 2);
      const grande = b1 - b0 > Math.PI ? 1 : 0;
      const [x0, y0] = [C + R * Math.cos(b0), C + R * Math.sin(b0)];
      const [x1, y1] = [C + R * Math.cos(b1), C + R * Math.sin(b1)];
      svg.append(tag("path", {
        d: `M ${x0} ${y0} A ${R} ${R} 0 ${grande} 1 ${x1} ${y1}`,
        "stroke-width": SP, "stroke-linecap": "butt",
      }, [], { fill: "none", stroke: v.colore }));
      a0 = a1;
    }
  }
  svg.append(testo(C, C - 3, euro(totale, { tondo: true }), { misura: 15, peso: 700, colore: "var(--etichetta)" }));
  svg.append(testo(C, C + 14, "USCITE", { misura: 11, peso: 700 }));

  const legenda = el("div", { class: "fi-legenda" }, voci.map((v) => el("div", { class: "fi-legenda-riga" }, [
    el("span", { class: "fi-punto", stile: { background: v.colore } }),
    el("span", { class: "fi-legenda-nome", testo: v.etichetta }),
    el("span", { class: "num fi-legenda-pct", testo: `${Math.round((v.valore / totale) * 100)}%` }),
    el("span", { class: "num fi-legenda-cifra", testo: euro(v.valore, { tondo: true }) }),
  ])));

  return el("div", { class: "fi-ciambella-fuori" }, [svg, legenda]);
}

/**
 * Barre. `evidenzia` è l'indice della barra a piena opacità — di solito
 * l'ultima, cioè il mese corrente: le altre servono come contesto e restare
 * tutte accese renderebbe impossibile capire dove si è.
 */
export function graficoBarre(valori, etichette, evidenzia, retta = null, colore = "var(--accento)") {
  const L = 520, A = 130, bordo = 4;
  const massimo = Math.max(retta || 0, ...valori, 1);
  const larghezza = (L - bordo * 2) / valori.length;

  const svg = tag("svg", { viewBox: `0 0 ${L} ${A + 22}`, role: "img", "aria-label": "Confronto", class: "fi-svg" });

  if (retta) {
    const ry = A - (retta / massimo) * A;
    svg.append(tag("line", { x1: bordo, y1: ry, x2: L - bordo, y2: ry,
      "stroke-width": 1.5, "stroke-dasharray": "5 5", opacity: ".6" }, [], { stroke: "var(--etichetta-3)" }));
  }

  valori.forEach((v, i) => {
    const h = Math.max(2, (v / massimo) * A);
    svg.append(tag("rect", {
      x: bordo + i * larghezza + larghezza * 0.15, y: A - h,
      width: larghezza * 0.7, height: h, rx: 7,
      opacity: i === evidenzia ? 1 : 0.18,
    }, [], { fill: i === evidenzia ? colore : "var(--etichetta-3)" }));
    svg.append(testo(bordo + i * larghezza + larghezza / 2, A + 15, String(etichette[i]).toUpperCase(), { misura: 12 }));
  });

  return el("div", { class: "fi-grafico fi-grafico-basso" }, [svg]);
}
