// moduli/finanze/viste.js — dal risultato del calcolo agli elementi.
//
// Tre schermate e quattro fogli. Nessun calcolo qui dentro: se compare un
// `reduce` che somma soldi, è nel posto sbagliato — sta in calcolo.js.

import {
  el, aggiungi, apriFoglio, chiudiFoglio, avviso, tocco, traccia, lista, riga, vuoto,
  campo, segmenti, pillole, euro, euroRicco, centesimi, nuovoId,
  oggiISO, dataUmana, dataBreve, daISO, GIORNI_INIZIALI,
} from "../../core/ui.js";
import { icona } from "../../core/icone.js";
import {
  stato, movimentiVivi, categoriaPerId, profiloDi, chiaveProfilo, coloreCat, TIPI,
  salvaMovimento, eliminaMovimento, impara, normalizza, scriviMeta,
} from "./dati.js";
import {
  statistiche, budgetTotale, cassaSettimana, avvisi, verdetto, proiezione,
  cumulata, risparmioReale, movimentiDelMese, importoEffettivo,
  giorniDelMese, nomeMese, autoCategoria,
} from "./calcolo.js";

/* ===================================================================== HOME
   Risponde a "come sto andando", non elenca movimenti. Un colpo d'occhio,
   un grafico, quattro numeri. Il resto sta nelle altre schermate. */

export function vistaHome(mese, vista, ridisegna) {
  const st = statistiche(mese);
  const p = profiloDi(mese);
  const bt = budgetTotale(mese);
  const oggi = oggiISO();
  const eCorrente = oggi.slice(0, 7) === mese;
  const giorni = giorniDelMese(mese);
  const giorno = eCorrente ? Number(oggi.slice(8, 10)) : giorni;
  const av = avvisi(mese);
  const v = verdetto(mese);

  const fuori = el("div", {});

  // 1 — la riga che dice tutto
  aggiungi(fuori, [el("div", { class: `fi-verdetto ${v.livello}` }, [
    el("span", { class: "fi-verdetto-punto" }),
    el("div", { class: "fi-verdetto-testo" }, [
      el("b", { testo: v.testo }),
      el("span", { class: "nota", testo: `${euro(st.ordinaria)} di ${euro(bt, { tondo: true })} · giorno ${giorno} di ${giorni}` }),
    ]),
    av.length > 0 && el("span", { class: "fi-verdetto-conta", testo: String(av.length) }),
  ])]);

  if (av.length) {
    aggiungi(fuori, [el("div", { class: "fi-avvisi" }, av.map((a) => el("div", { class: `fi-avviso ${a.livello}` }, [
      el("span", { class: "fi-avviso-icona", html: icona(a.livello === "rosso" ? "allarme" : "info", 16) }),
      el("div", {}, [el("b", { testo: a.titolo }), el("span", { class: "nota", testo: a.testo })]),
    ])))]);
  }

  // 2 — il grafico: settimana o mese
  const cassa = eCorrente ? cassaSettimana(mese, oggi) : { attiva: false };
  const scheda = el("section", { class: "scheda" }, [
    segmenti([["settimana", "Settimana"], ["mese", "Mese"]], vista, (x) => ridisegna({ vista: x })),
  ]);

  if (vista === "settimana" && cassa.attiva) {
    const alGiorno = cassa.resta > 0 ? Math.floor(cassa.resta / cassa.giorniRimasti) : 0;
    const massimo = Math.max(cassa.tetto / 5, ...cassa.perGiorno.map((d) => d.speso));
    aggiungi(scheda, [
      el("div", { class: "fi-testata" }, [
        el("div", {}, [
          el("div", { class: "etichetta-riga", testo: "Resta in cassa" }),
          el("div", { class: `cifra fi-grande ${cassa.resta < 0 ? "negativo" : ""}`, html: euroRicco(cassa.resta) }),
        ]),
        el("div", { class: "fi-testata-lato" }, [
          el("span", { testo: `${euro(alGiorno)}/giorno` }),
          el("span", { testo: `${cassa.giorniRimasti} ${cassa.giorniRimasti === 1 ? "giorno" : "giorni"} alla ricarica` }),
        ]),
      ]),
      el("div", { class: "fi-barre" }, cassa.perGiorno.map((d, i) => el("div", {
        class: "fi-barra" + (d.iso === oggi ? " oggi" : ""),
        title: `${dataUmana(d.iso)} · ${euro(d.speso)}`,
      }, [
        el("div", { class: "fi-barra-colonna" }, [
          el("div", { class: "fi-barra-riempimento", stile: { height: `${massimo > 0 ? Math.min(100, Math.round((d.speso / massimo) * 100)) : 0}%` } }),
        ]),
        el("span", { class: "fi-barra-lettera", testo: GIORNI_INIZIALI[i] }),
      ]))),
      el("div", { class: "nota", testo: `${euro(cassa.speso)} di ${euro(cassa.tetto)} · copre spesa, cibo fuori e personale` }),
    ]);
  } else {
    const cum = cumulata(mese);
    const proj = proiezione(mese);
    aggiungi(scheda, [
      el("div", { class: "fi-testata" }, [
        el("div", {}, [
          el("div", { class: "etichetta-riga", testo: "Spesa ordinaria" }),
          el("div", { class: "cifra fi-grande", html: euroRicco(st.ordinaria) }),
        ]),
        el("div", { class: "fi-testata-lato" }, [
          el("span", { testo: `${bt ? Math.round((st.ordinaria / bt) * 100) : 0}% di ${euro(bt, { tondo: true })}` }),
          proj != null && el("span", { testo: `proiezione ${euro(proj, { tondo: true })}` }),
        ]),
      ]),
      graficoCumulata(cum, bt, eCorrente ? giorno : null, giorni),
    ]);
  }
  fuori.append(scheda);

  // 3 — due numeri, non di più
  aggiungi(fuori, [el("div", { class: "griglia-2" }, [
    el("div", { class: "riquadro" }, [
      el("div", { class: "etichetta-riga", testo: "Sforamenti" }),
      el("div", { class: `cifra ${st.sforamentiN ? "negativo" : "positivo"}`,
        testo: st.sforamentiN === 0 ? "0" : `${st.sforamentiN} · ${euro(st.sforamentiTot, { tondo: true })}` }),
      el("div", { class: "nota", testo: st.sforamentiN === 0 ? "target rispettato" : "ricariche da fuori" }),
    ]),
    el("div", { class: "riquadro" }, [
      el("div", { class: "etichetta-riga", testo: "Straordinari" }),
      el("div", { class: "cifra", html: euroRicco(st.eccezionale) }),
      el("div", { class: "nota", testo: st.eccezionale > 0 ? `${st.movEccezionali.length} una tantum, fuori budget` : "nessuna una tantum" }),
    ]),
  ])]);

  // 4 — dove stanno andando
  const righe = stato().cats
    .map((c) => ({ c, speso: st.perCat[c.id]?.ord || 0, budget: Math.round((p.b[c.id] || 0) * 100) }))
    .filter((r) => r.speso > 0)
    .sort((a, b) => b.speso - a.speso)
    .slice(0, 5);

  if (righe.length) {
    const massimo = righe[0].speso;
    const s = el("section", { class: "scheda" }, [
      el("div", { class: "etichetta-riga", testo: "Dove stanno andando" }),
    ]);
    for (const r of righe) {
      const frazione = r.budget > 0 ? r.speso / r.budget : 0;
      s.append(el("button", {
        class: "fi-cat", type: "button",
        onClick: () => apriCategoria(mese, r.c.id, ridisegna),
      }, [
        el("div", { class: "fi-cat-testa" }, [
          el("span", { class: "fi-cat-nome" }, [
            el("i", { class: "fi-punto", stile: { background: coloreCat(r.c.id) } }),
            el("span", { testo: r.c.nome }),
          ]),
          el("span", { class: "num", testo: euro(r.speso) }),
        ]),
        traccia(r.speso / massimo, r.budget && frazione >= 1 ? "oltre" : r.budget && frazione >= 0.9 ? "avviso" : "", { sottile: true }),
      ]));
    }
    fuori.append(s);
  }

  // 5 — il numero che guarda al mese prossimo
  const risp = risparmioReale(mese);
  aggiungi(fuori, [el("section", { class: "scheda" }, [
    el("div", { class: "fi-riga-doppia" }, [
      el("span", { class: "etichetta-riga", testo: "Risparmio reale" }),
      el("span", { class: `cifra fi-medio ${risp.valore < 0 ? "negativo" : "positivo"}`, testo: euro(risp.valore, { segno: false }) }),
    ]),
    el("div", { class: "nota", testo: `${euro(risp.base, { tondo: true })} − affitto ${euro(risp.affitto, { tondo: true })} − utenze ${euro(risp.utenze, { tondo: true })}` }),
  ])]);

  return fuori;
}

/** Il grafico cumulato del mese: l'area della spesa e la retta del budget. */
function graficoCumulata(cum, budget, giornoOggi, giorni) {
  const L = 300, A = 96;
  const massimo = Math.max(budget || 0, ...cum, 1);
  const x = (i) => (i / Math.max(1, giorni - 1)) * L;
  const y = (v) => A - (v / massimo) * A;

  const punti = cum.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const fino = giornoOggi != null ? Math.min(giornoOggi, cum.length) : cum.length;
  const areaPunti = cum.slice(0, fino).map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");

  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", `0 0 ${L} ${A}`);
  svg.setAttribute("class", "fi-gr");
  svg.setAttribute("preserveAspectRatio", "none");
  svg.setAttribute("aria-hidden", "true");

  const aggiungiTag = (tag, attr) => {
    const n = document.createElementNS(ns, tag);
    for (const [k, v] of Object.entries(attr)) n.setAttribute(k, v);
    svg.append(n);
    return n;
  };

  if (budget > 0 && budget <= massimo) {
    aggiungiTag("line", { x1: 0, y1: y(budget), x2: L, y2: y(budget),
      stroke: "var(--etichetta-4)", "stroke-width": 1, "stroke-dasharray": "3 4" });
  }
  if (areaPunti) {
    aggiungiTag("polygon", { points: `0,${A} ${areaPunti} ${x(fino - 1)},${A}`, fill: "var(--accento-tenue)" });
  }
  aggiungiTag("polyline", { points: punti, fill: "none", stroke: "var(--accento)",
    "stroke-width": 2, "stroke-linejoin": "round", "stroke-linecap": "round",
    "vector-effect": "non-scaling-stroke" });

  return el("div", { class: "fi-grafico" }, [svg]);
}

/* ============================================================== MOVIMENTI */

export function vistaMovimenti(mese, filtro, ridisegna) {
  const tutti = movimentiDelMese(mese);
  const filtrati = filtro === "tutti" ? tutti
    : filtro === "ecc" ? tutti.filter((m) => m.ecc)
    : tutti.filter((m) => m.tipo === filtro);

  const fuori = el("div", {}, [
    el("div", { class: "fi-filtri" }, [
      pillole(
        [["tutti", "Tutti"], ["out", "Uscite"], ["in", "Entrate"], ["ecc", "Straordinari"], ["extra", "Sforamenti"]],
        filtro, (v) => ridisegna({ filtro: v }), { unaRiga: true }
      ),
    ]),
  ]);

  if (!filtrati.length) {
    fuori.append(vuoto("Nessun movimento", "Con il + in alto ne aggiungi uno."));
    return fuori;
  }

  // Raggruppati per giorno, con il totale del giorno accanto alla data.
  const perGiorno = new Map();
  for (const m of filtrati) {
    if (!perGiorno.has(m.data)) perGiorno.set(m.data, []);
    perGiorno.get(m.data).push(m);
  }

  for (const [data, movs] of perGiorno) {
    const totale = movs.reduce((s, m) => s + (m.tipo === "out" ? importoEffettivo(m) : 0), 0);
    fuori.append(el("div", { class: "fi-giorno-testa" }, [
      el("span", { testo: dataUmana(data) }),
      totale > 0 && el("span", { class: "num", testo: euro(totale) }),
    ]));
    fuori.append(lista(movs.map((m) => rigaMovimento(m, ridisegna))));
  }
  return fuori;
}

function rigaMovimento(m, ridisegna) {
  const cat = categoriaPerId(m.cat);
  const effettivo = importoEffettivo(m);
  const ridotto = m.tipo === "out" && effettivo !== m.imp;
  const segno = TIPI[m.tipo]?.segno ?? -1;

  return el("li", {}, [el("button", {
    class: "riga fi-mov", type: "button",
    onClick: () => apriDettaglio(m.id, ridisegna),
  }, [
    el("span", { class: "fi-mov-punto", stile: { background: m.tipo === "out" ? coloreCat(m.cat) : "var(--verde)" } }),
    el("span", { class: "fi-mov-testo" }, [
      el("span", { class: "fi-mov-nota", testo: m.nota || TIPI[m.tipo]?.nome || "—" }),
      el("span", { class: "nota", testo: [cat?.nome, m.sub].filter(Boolean).join(" · ") || TIPI[m.tipo]?.nome || "" }),
    ]),
    el("span", { class: "fi-mov-cifra" }, [
      el("span", { class: `num ${segno > 0 ? "positivo" : ""}`, testo: euro(effettivo, { segno: segno > 0 }) }),
      m.ecc && el("span", { class: "fi-tag", testo: "straord." }),
      ridotto && el("span", { class: "fi-tag", testo: `era ${euro(m.imp)}` }),
    ]),
  ])]);
}

/* ================================================================ ANALISI */

export function vistaAnalisi(mese, ridisegna) {
  const st = statistiche(mese);
  const p = profiloDi(mese);
  const cats = stato().cats
    .map((c) => ({ c, dati: st.perCat[c.id], budget: Math.round((p.b[c.id] || 0) * 100) }))
    .filter((r) => r.dati && (r.dati.tot > 0 || r.budget > 0))
    .sort((a, b) => b.dati.tot - a.dati.tot);

  const totale = cats.reduce((s, r) => s + r.dati.tot, 0);
  const fuori = el("div", {});

  aggiungi(fuori, [el("section", { class: "scheda" }, [
    el("div", { class: "etichetta-riga", testo: "Ripartizione" }),
    el("div", { class: "fi-anelli" }, [
      ciambella(cats.filter((r) => r.dati.tot > 0).map((r) => ({ valore: r.dati.tot, colore: coloreCat(r.c.id) })), totale),
      el("div", { class: "fi-ciambella-centro" }, [
        el("div", { class: "cifra fi-medio", html: euroRicco(totale) }),
        el("div", { class: "nota", testo: "speso in totale" }),
      ]),
    ]),
  ])]);

  const l = el("ul", { class: "lista" });
  for (const r of cats) {
    const frazione = r.budget > 0 ? r.dati.ord / r.budget : 0;
    const stato_ = r.budget && frazione >= 1 ? "oltre" : r.budget && frazione >= 0.9 ? "avviso" : "";
    l.append(el("li", {}, [el("button", {
      class: "riga fi-ana", type: "button",
      onClick: () => apriCategoria(mese, r.c.id, ridisegna),
    }, [
      el("div", { class: "fi-ana-corpo" }, [
        el("div", { class: "fi-cat-testa" }, [
          el("span", { class: "fi-cat-nome" }, [
            el("i", { class: "fi-punto", stile: { background: coloreCat(r.c.id) } }),
            el("span", { testo: r.c.nome }),
          ]),
          el("span", { class: "num", testo: euro(r.dati.tot) }),
        ]),
        r.budget > 0 && traccia(frazione, stato_, { sottile: true }),
        r.budget > 0 && el("div", { class: "nota", testo:
          frazione >= 1 ? `${euro(r.dati.ord - r.budget)} oltre il budget di ${euro(r.budget, { tondo: true })}`
                        : `restano ${euro(r.budget - r.dati.ord)} di ${euro(r.budget, { tondo: true })}` }),
      ]),
      el("span", { class: "freccia", html: icona("freccia", 16) }),
    ])]));
  }
  fuori.append(l);
  return fuori;
}

/** La ciambella della ripartizione. Un solo SVG, nessuna libreria. */
function ciambella(fette, totale) {
  const R = 54, spessore = 14, c = 2 * Math.PI * R;
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 128 128");
  svg.setAttribute("width", "128");
  svg.setAttribute("height", "128");
  svg.setAttribute("class", "fi-ciambella");
  svg.setAttribute("aria-hidden", "true");

  const fondo = document.createElementNS(ns, "circle");
  for (const [k, v] of Object.entries({ cx: 64, cy: 64, r: R, fill: "none",
    stroke: "var(--sfondo-4)", "stroke-width": spessore })) fondo.setAttribute(k, v);
  svg.append(fondo);

  let offset = 0;
  for (const f of fette) {
    if (!totale) break;
    const lung = (f.valore / totale) * c;
    const arco = document.createElementNS(ns, "circle");
    for (const [k, v] of Object.entries({
      cx: 64, cy: 64, r: R, fill: "none", stroke: f.colore, "stroke-width": spessore,
      "stroke-dasharray": `${Math.max(0, lung - 1.5).toFixed(2)} ${(c - lung + 1.5).toFixed(2)}`,
      "stroke-dashoffset": (-offset).toFixed(2),
      transform: "rotate(-90 64 64)",
    })) arco.setAttribute(k, v);
    svg.append(arco);
    offset += lung;
  }
  return svg;
}

/* ================================================================== FOGLI */

/** Dettaglio di una categoria: le sottocategorie e i movimenti. */
export function apriCategoria(mese, catId, ridisegna) {
  const c = categoriaPerId(catId);
  if (!c) return;
  const st = statistiche(mese);
  const d = st.perCat[catId];
  const budget = Math.round((profiloDi(mese).b[catId] || 0) * 100);

  const { corpo } = apriFoglio({
    titolo: c.nome,
    sinistra: el("button", { class: "btn nudo", type: "button", testo: "Chiudi", onClick: () => chiudiFoglio() }),
    alChiudi: ridisegna,
  });

  const sub = Object.entries(d.sub).sort((a, b) => b[1].tot - a[1].tot);

  aggiungi(corpo, [
    el("div", { class: "fi-testata" }, [
      el("div", {}, [
        el("div", { class: "etichetta-riga", testo: "Speso" }),
        el("div", { class: "cifra fi-grande", html: euroRicco(d.tot) }),
      ]),
      budget > 0 && el("div", { class: "fi-testata-lato" }, [
        el("span", { testo: `di ${euro(budget, { tondo: true })}` }),
        el("span", { testo: d.ord >= budget ? `${euro(d.ord - budget)} oltre` : `restano ${euro(budget - d.ord)}` }),
      ]),
    ]),
    budget > 0 && traccia(d.ord / budget, d.ord >= budget ? "oltre" : d.ord >= budget * 0.9 ? "avviso" : ""),

    sub.length > 0 && el("div", { class: "gruppo-titolo", testo: "Per sottocategoria" }),
    sub.length > 0 && lista(sub.map(([nome, v]) => riga({
      etichetta: nome, valore: euro(v.tot), dettaglio: `${v.n} ${v.n === 1 ? "movimento" : "movimenti"}`,
    }))),

    d.movs.length > 0 && el("div", { class: "gruppo-titolo", testo: "Movimenti" }),
    d.movs.length > 0 && lista(d.movs.slice(0, 40).map((m) => riga({
      etichetta: m.nota || "—",
      valore: euro(importoEffettivo(m)),
      dettaglio: `${dataBreve(m.data)}${m.sub ? ` · ${m.sub}` : ""}`,
    }))),
  ]);
}

/** Dettaglio di un movimento, con modifica ed eliminazione. */
export function apriDettaglio(id, ridisegna) {
  const m = movimentiVivi().find((x) => x.id === id);
  if (!m) return;
  const cat = categoriaPerId(m.cat);
  const effettivo = importoEffettivo(m);

  const { corpo } = apriFoglio({
    titolo: TIPI[m.tipo]?.nome || "Movimento",
    mezzo: true,
    sinistra: el("button", { class: "btn nudo", type: "button", testo: "Chiudi", onClick: () => chiudiFoglio() }),
    destra: el("button", {
      class: "btn nudo", type: "button", testo: "Modifica",
      onClick: () => { chiudiFoglio(); apriMovimento({ movimento: m, ridisegna }); },
    }),
    alChiudi: ridisegna,
  });

  aggiungi(corpo, [
    el("div", { class: "fi-dett-cifra cifra", html: euroRicco(effettivo, { segno: (TIPI[m.tipo]?.segno ?? -1) > 0 }) }),
    m.nota && el("p", { class: "fi-dett-nota", testo: m.nota }),
    lista([
      riga({ etichetta: "Data", valore: dataUmana(m.data) }),
      cat && riga({ etichetta: "Categoria", valore: cat.nome }),
      m.sub && riga({ etichetta: "Sottocategoria", valore: m.sub }),
      m.ecc && riga({ etichetta: "Straordinario", valore: "sì" }),
      effettivo !== m.imp && riga({ etichetta: "Importo iniziale", valore: euro(m.imp) }),
    ].filter(Boolean)),
    el("button", {
      class: "btn distruttivo pieno", type: "button", testo: "Elimina",
      onClick: (e) => {
        const b = e.currentTarget;
        if (b.dataset.sicuro !== "1") {
          b.dataset.sicuro = "1";
          b.textContent = "Tocca di nuovo per eliminare";
          setTimeout(() => { b.dataset.sicuro = ""; b.textContent = "Elimina"; }, 3000);
          return;
        }
        eliminaMovimento(m.id);
        chiudiFoglio();
        avviso("Eliminato.");
        ridisegna();
      },
    }),
  ]);
}

/* ------------------------------------------- il foglio di inserimento --
   È la schermata che si usa dieci volte al giorno, quindi è quella che
   deve costare meno gesti: importo, nota, e il salvataggio propone già la
   categoria. Tutto il resto è opzionale. */

export function apriMovimento({ movimento = null, ridisegna, tipo = "out" } = {}) {
  const nuovo = !movimento;
  const b = movimento
    ? { ...movimento }
    : { id: nuovoId("m"), tipo, imp: 0, nota: "", cat: null, sub: null, rif: null, ecc: false, data: oggiISO() };

  let testoImporto = b.imp ? (b.imp / 100).toFixed(2).replace(".", ",") : "";
  let categoriaManuale = Boolean(movimento?.cat);

  const { corpo } = apriFoglio({
    titolo: nuovo ? "Nuovo movimento" : "Modifica",
    sinistra: el("button", { class: "btn nudo", type: "button", testo: "Annulla", onClick: () => chiudiFoglio() }),
    alChiudi: ridisegna,
  });

  // --- importo
  const schermo = el("div", { class: "fi-importo cifra", testo: testoImporto || "0,00" });
  const aggiornaImporto = () => {
    schermo.textContent = testoImporto || "0,00";
    schermo.classList.toggle("vuoto", !testoImporto);
  };
  aggiornaImporto();

  // --- nota, con autocategorizzazione
  const zonaCat = el("div", { class: "campo-gruppo" });
  const zonaSub = el("div", { class: "campo-gruppo" });

  const disegnaSub = () => {
    zonaSub.replaceChildren();
    const c = categoriaPerId(b.cat);
    if (!c?.sub?.length) return;
    zonaSub.append(el("label", { class: "campo-etichetta", testo: "Sottocategoria" }));
    zonaSub.append(pillole(c.sub.map((s) => [s, s]), b.sub, (v) => { b.sub = v; }));
  };

  const disegnaCat = () => {
    zonaCat.replaceChildren();
    if (b.tipo !== "out") return;
    zonaCat.append(el("label", { class: "campo-etichetta", testo: "Categoria" }));
    zonaCat.append(pillole(
      stato().cats.map((c) => [c.id, c.nome, coloreCat(c.id)]),
      b.cat, (v) => { b.cat = v; b.sub = null; categoriaManuale = true; disegnaSub(); },
      { unaRiga: true }
    ));
    disegnaSub();
  };

  const campoNota = campo({
    etichetta: "Nota", valore: b.nota, segnaposto: "Cosa hai pagato?",
    alCambio: (v) => {
      b.nota = v;
      // Si propone la categoria solo finché l'utente non ne ha scelta una:
      // sovrascrivere una scelta esplicita mentre si continua a scrivere è
      // il modo più veloce per far odiare l'autocategorizzazione.
      if (categoriaManuale || b.tipo !== "out") return;
      const indovinata = autoCategoria(v, { normalizza, categoriaPerId });
      if (indovinata && (indovinata.cat !== b.cat || indovinata.sub !== b.sub)) {
        b.cat = indovinata.cat;
        b.sub = indovinata.sub;
        disegnaCat();
      }
    },
  });

  disegnaCat();

  const salva = (eccezionale) => {
    const imp = centesimi(testoImporto);
    if (!imp) { avviso("Manca l'importo.", { tono: "errore" }); return; }
    if (b.tipo === "out" && !b.cat) { avviso("Manca la categoria.", { tono: "errore" }); return; }
    salvaMovimento({ ...b, imp, ecc: Boolean(eccezionale) });
    // Si impara solo da una scelta esplicita: memorizzare quello che ha
    // indovinato l'app la farebbe convergere sui propri errori.
    if (categoriaManuale && b.nota && b.cat) impara(b.nota, b.cat, b.sub);
    chiudiFoglio();
    tocco(12);
    avviso(nuovo ? "Registrato." : "Aggiornato.");
    ridisegna();
  };

  aggiungi(corpo, [
    el("div", { class: "campo-gruppo" }, [
      segmenti(
        [["out", "Uscita"], ["in", "Entrata"], ["rimb", "Rimborso"], ["extra", "Sforamento"]],
        b.tipo,
        (v) => { b.tipo = v; if (v !== "out") { b.cat = null; b.sub = null; } disegnaCat(); }
      ),
    ]),

    schermo,
    tastierino(
      (tasto) => {
        if (tasto === "←") testoImporto = testoImporto.slice(0, -1);
        else if (tasto === ",") { if (!testoImporto.includes(",")) testoImporto += testoImporto ? "," : "0,"; }
        else {
          const [, dec] = testoImporto.split(",");
          if (dec != null && dec.length >= 2) return;
          if (testoImporto.replace(",", "").length >= 8) return;
          testoImporto += tasto;
        }
        tocco(5);
        aggiornaImporto();
      }
    ),

    campoNota,
    zonaCat,
    zonaSub,

    campo({ etichetta: "Data", tipo: "date", valore: b.data, alCambio: (v) => { if (v) b.data = v; } }),

    // Ordinaria o eccezionale è la domanda che tiene in piedi tutto il
    // calcolo, quindi si chiede al momento del salvataggio invece di
    // nasconderla in una casella che nessuno spunta.
    b.tipo === "out"
      ? el("div", { class: "fi-doppio-salva" }, [
          el("button", { class: "btn pieno", type: "button", onClick: () => salva(false) }, [
            el("b", { testo: "Ordinaria" }), el("small", { testo: "capita spesso" }),
          ]),
          el("button", { class: "btn tenue pieno", type: "button", onClick: () => salva(true) }, [
            el("b", { testo: "Straordinaria" }), el("small", { testo: "una volta tanto" }),
          ]),
        ])
      : el("button", { class: "btn pieno", type: "button", testo: "Salva", onClick: () => salva(false) }),
  ]);
}

/** Il tastierino. Su iPhone è più veloce e non fa saltare la vista. */
function tastierino(premi) {
  const g = el("div", { class: "fi-tastierino" });
  for (const t of ["1", "2", "3", "4", "5", "6", "7", "8", "9", ",", "0", "←"]) {
    g.append(el("button", {
      class: "fi-tasto" + (t === "←" ? " fi-tasto-canc" : ""),
      type: "button", testo: t === "←" ? "" : t,
      "aria-label": t === "←" ? "Cancella" : t,
      html: t === "←" ? icona("indietro", 22) : undefined,
      onClick: () => premi(t),
    }));
  }
  return g;
}

/* -------------------------------------------------------- impostazioni -- */

export function apriImpostazioni(mese, ridisegna) {
  const s = stato();
  const chiave = chiaveProfilo(mese);
  const p = profiloDi(mese);

  const { corpo } = apriFoglio({
    titolo: "Budget e profili",
    sinistra: el("button", { class: "btn nudo", type: "button", testo: "Fine", onClick: () => chiudiFoglio() }),
    alChiudi: ridisegna,
  });

  aggiungi(corpo, [
    el("p", { class: "nota", testo: `Profilo in uso per ${nomeMese(mese)}: ${p.nome}. Agosto ha il suo profilo perché le spese d'agosto non somigliano a quelle degli altri mesi.` }),

    el("div", { class: "gruppo-titolo", testo: "Budget per categoria (euro al mese)" }),
    lista(s.cats.map((c) => el("li", {}, [el("div", { class: "riga" }, [
      el("i", { class: "fi-punto", stile: { background: coloreCat(c.id) } }),
      el("span", { testo: c.nome }),
      el("input", {
        class: "campo fi-campo-corto", type: "number", inputmode: "numeric",
        value: String(p.b[c.id] ?? 0), min: "0",
        onChange: (e) => scriviMeta((st_) => { st_.profili[chiave].b[c.id] = Number(e.target.value) || 0; }),
      }),
    ])]))),

    el("div", { class: "gruppo-titolo", testo: "Cassa settimanale" }),
    el("section", { class: "scheda" }, [
      campo({
        etichetta: "Tetto (euro)", tipo: "number", valore: String(p.cassa),
        alCambio: (v) => scriviMeta((st_) => { st_.profili[chiave].cassa = Number(v) || 0; }),
      }),
      el("p", { class: "nota", testo: "Copre solo spesa, cibo fuori e personale: le voci che dipendono da una decisione giornaliera. Le fisse e gli accantonamenti resterebbero fuori controllo dentro un tetto settimanale." }),
    ]),

    el("div", { class: "gruppo-titolo", testo: "Casa" }),
    el("section", { class: "scheda" }, [
      campo({ etichetta: "Budget casa (euro)", tipo: "number", valore: String(s.config.casaBase),
        alCambio: (v) => scriviMeta((st_) => { st_.config.casaBase = Number(v) || 0; }) }),
      campo({ etichetta: "Affitto (euro)", tipo: "number", valore: String(s.config.affitto),
        alCambio: (v) => scriviMeta((st_) => { st_.config.affitto = Number(v) || 0; }) }),
      campo({ etichetta: "Entrate mensili (euro)", tipo: "number", valore: String(s.config.entrate),
        alCambio: (v) => scriviMeta((st_) => { st_.config.entrate = Number(v) || 0; }) }),
    ]),

    el("div", { class: "gruppo-titolo", testo: "Autocategorizzazione" }),
    el("section", { class: "scheda" }, [
      el("p", { class: "nota", testo: `${Object.keys(s.rules).length} corrispondenze apprese dalle tue correzioni.` }),
      el("button", {
        class: "btn tenue pieno", type: "button", testo: "Dimentica tutto",
        onClick: (e) => {
          const btn = e.currentTarget;
          if (btn.dataset.sicuro !== "1") {
            btn.dataset.sicuro = "1";
            btn.textContent = "Tocca di nuovo per dimenticare";
            setTimeout(() => { btn.dataset.sicuro = ""; btn.textContent = "Dimentica tutto"; }, 3000);
            return;
          }
          scriviMeta((st_) => { st_.rules = {}; });
          avviso("Regole dimenticate.");
          chiudiFoglio();
        },
      }),
    ]),
  ]);
}
