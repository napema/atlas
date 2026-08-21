// moduli/finanze/viste.js — dal risultato del calcolo agli elementi.
//
// Quattro schermate (Riepilogo, Movimenti, Analisi, Setup) e quattro fogli
// (categoria, sottocategoria, dettaglio, inserimento). È la stessa struttura
// dell'app di partenza, funzione per funzione: cambia lo stile, non cosa c'è.
//
// Nessun calcolo qui dentro. Se compare un `reduce` che somma soldi è nel
// posto sbagliato: sta in calcolo.js.

import {
  el, aggiungi, apriFoglio, chiudiFoglio, avviso, tocco, traccia, lista, riga, vuoto,
  campo, segmenti, pillole, euro, euroRicco, centesimi, nuovoId, plurale,
  oggiISO, dataUmana, dataBreve, daISO, GIORNI, GIORNI_INIZIALI, MESI,
} from "../../core/ui.js";
import { icona } from "../../core/icone.js";
import {
  stato, movimentiVivi, categoriaPerId, profiloDi, chiaveProfilo, coloreCat, TIPI,
  salvaMovimento, eliminaMovimento, impara, normalizza, scriviMeta, casella,
} from "./dati.js";
import {
  statistiche, budgetTotale, cassaSettimana, avvisi, verdetto, proiezione,
  cumulata, risparmioReale, movimentiDelMese, importoEffettivo, giorniDelMese,
  nomeMese, autoCategoria, spostaMese, stessoGiornoMesePrima, statisticheDelMese,
  mediaPerGiornoSettimana, ultimiSeiMesi, sottocategorieDelMese, categoriaSuSeiMesi,
  movimentiSottocategoria, contestoMovimento, quadratura,
} from "./calcolo.js";
import { graficoCumulato, graficoCiambella, graficoBarre } from "./grafici.js";
import { preparaImport, eseguiImport } from "./importa.js";

const ETICHETTA_TIPO = Object.fromEntries(Object.entries(TIPI).map(([k, v]) => [k, v.nome]));

/* ==================================================================== HOME
   Risponde a "come sto andando", non elenca movimenti. Un colpo d'occhio,
   un grafico, quattro numeri. Il resto sta nelle altre schermate. */

export function vistaHome(mese, grafico, cambia, apriCat) {
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
  const avvisiBox = el("div", { class: "fi-avvisi", hidden: true },
    av.map((a) => el("div", { class: `fi-avviso ${a.livello}` }, [
      el("span", { class: "fi-avviso-icona", html: icona(a.livello === "rosso" ? "allarme" : "info", 16) }),
      el("div", {}, [el("b", { testo: a.titolo }), el("span", { class: "nota", testo: a.testo })]),
    ])));

  aggiungi(fuori, [
    el("div", { class: `fi-verdetto ${v.livello}` }, [
      el("span", { class: "fi-verdetto-punto" }),
      el("div", { class: "fi-verdetto-testo" }, [
        el("b", { testo: v.testo }),
        el("span", { class: "nota", testo: `${euro(st.ordinaria)} di ${euro(bt, { tondo: true })} · giorno ${giorno} di ${giorni}` }),
      ]),
      av.length > 0 && el("button", {
        class: "fi-verdetto-conta", type: "button", testo: String(av.length),
        "aria-label": `${av.length} avvisi`,
        onClick: (e) => {
          avvisiBox.hidden = !avvisiBox.hidden;
          e.currentTarget.classList.toggle("aperto", !avvisiBox.hidden);
        },
      }),
    ]),
    av.length > 0 && avvisiBox,
  ]);

  // 2 — il grafico: settimana o mese
  const cassa = eCorrente ? cassaSettimana(mese, oggi) : { attiva: false };
  const scheda = el("section", { class: "scheda" }, [
    segmenti([["settimana", "Settimana"], ["mese", "Mese"]], grafico, (x) => cambia({ grafico: x })),
  ]);

  if (grafico === "settimana" && cassa.attiva) {
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
          el("span", { testo: `${plurale(cassa.giorniRimasti, "giorno", "giorni")} alla ricarica` }),
        ]),
      ]),
      el("div", { class: "fi-barre" }, cassa.perGiorno.map((d, i) => el("div", {
        class: "fi-barra" + (d.iso === oggi ? " oggi" : ""),
        title: `${dataUmana(d.iso)} · ${euro(d.speso)}`,
      }, [
        el("div", { class: "fi-barra-colonna" }, [
          el("div", { class: "fi-barra-riempimento",
            stile: { height: `${massimo > 0 ? Math.min(100, Math.round((d.speso / massimo) * 100)) : 0}%` } }),
        ]),
        el("span", { class: "fi-barra-lettera", testo: GIORNI_INIZIALI[i] }),
      ]))),
      el("div", { class: "nota", testo: `${euro(cassa.speso)} di ${euro(cassa.tetto)} · copre spesa, cibo fuori e personale` }),
    ]);
  } else {
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
      graficoCumulato(cumulata(mese), bt, eCorrente ? giorno : null, giorni),
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
      el("div", { class: "nota", testo: st.eccezionale > 0
        ? `${plurale(st.movEccezionali.length, "una tantum", "una tantum")}, fuori budget` : "nessuna una tantum" }),
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
      s.append(el("button", { class: "fi-cat", type: "button", onClick: () => apriCat(r.c.id) }, [
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
      el("span", { class: `cifra fi-medio ${risp.valore < 0 ? "negativo" : "positivo"}`,
        testo: (risp.valore < 0 ? "−" : "") + euro(Math.abs(risp.valore)) }),
    ]),
    el("div", { class: "nota", testo: `${euro(risp.base, { tondo: true })} − affitto ${euro(risp.affitto, { tondo: true })} − utenze ${euro(risp.utenze, { tondo: true })}` }),
  ])]);

  return fuori;
}

/* ============================================================== MOVIMENTI */

const FILTRI = [
  ["tutti", "Tutti"], ["out", "Uscite"], ["ecc", "Straordinari"],
  ["in", "Entrate"], ["extra", "Sforamenti"], ["altri", "Altri"],
];

export function vistaMovimenti(mese, filtro, cambia, apriDett) {
  let ms = movimentiDelMese(mese);
  if (filtro === "altri") ms = ms.filter((m) => ["giro", "rimb", "reso"].includes(m.tipo));
  else if (filtro === "ecc") ms = ms.filter((m) => m.tipo === "out" && m.ecc);
  else if (filtro === "out") ms = ms.filter((m) => m.tipo === "out" && !m.ecc);
  else if (filtro !== "tutti") ms = ms.filter((m) => m.tipo === filtro);

  const fuori = el("div", {}, [
    el("div", { class: "fi-filtri" }, [
      pillole(FILTRI, filtro, (v) => cambia({ filtro: v }), { unaRiga: true }),
    ]),
  ]);

  if (!ms.length) {
    fuori.append(vuoto("Nessun movimento", "Con il + in alto ne registri uno."));
    return fuori;
  }

  const perGiorno = new Map();
  for (const m of ms) {
    if (!perGiorno.has(m.data)) perGiorno.set(m.data, []);
    perGiorno.get(m.data).push(m);
  }

  for (const [data, movs] of perGiorno) {
    // Il totale del giorno è il NETTO: entrate meno uscite ordinarie. Gli
    // straordinari non ci sono dentro, per lo stesso motivo per cui stanno
    // fuori dal budget.
    const netto = movs.reduce((s, m) =>
      s + (m.tipo === "in" ? m.imp : (m.tipo === "out" && !m.ecc) ? -importoEffettivo(m) : 0), 0);
    fuori.append(el("div", { class: "fi-giorno-testa" }, [
      el("span", { testo: dataUmana(data) }),
      netto !== 0 && el("span", { class: `num ${netto < 0 ? "" : "positivo"}`, testo: euro(netto, { segno: true }) }),
    ]));
    fuori.append(lista(movs.map((m) => rigaMovimento(m, apriDett))));
  }
  return fuori;
}

export function rigaMovimento(m, apriDett) {
  const cat = categoriaPerId(m.cat);
  const effettivo = importoEffettivo(m);
  const ridotto = m.tipo === "out" && effettivo !== m.imp;
  const straordinario = m.tipo === "out" && m.ecc;

  let descrizione;
  if (m.tipo === "out") descrizione = (cat?.nome || "—") + (m.sub ? ` · ${m.sub}` : "");
  else if (m.tipo === "in") descrizione = "Entrata";
  else if (m.tipo === "giro") descrizione = "Giroconto tra pocket";
  else if (m.tipo === "extra") descrizione = "Ricarica extra — sforamento";
  else {
    const origine = movimentiVivi().find((x) => x.id === m.rif);
    descrizione = ETICHETTA_TIPO[m.tipo] + (origine ? ` → ${origine.nota}` : " · non agganciato");
  }

  const segno = { in: "+", out: "−", extra: "+", giro: "", rimb: "−", reso: "−" }[m.tipo] ?? "−";
  const colorePunto = m.tipo === "out" ? coloreCat(m.cat)
    : m.tipo === "in" ? "var(--verde)"
    : m.tipo === "extra" ? "var(--rosso)" : "var(--etichetta-4)";

  return el("li", {}, [el("button", {
    class: `riga fi-mov${straordinario ? " straordinario" : ""}`, type: "button",
    onClick: () => apriDett(m.id),
  }, [
    el("span", { class: "fi-mov-punto", stile: { background: colorePunto } }),
    el("span", { class: "fi-mov-testo" }, [
      el("span", { class: "fi-mov-nota" }, [
        el("span", { testo: m.nota || ETICHETTA_TIPO[m.tipo] || "—" }),
        straordinario && el("span", { class: "fi-tag ambra", testo: "straordinaria" }),
        m.tipo === "extra" && el("span", { class: "fi-tag rosso", testo: "sforamento" }),
      ]),
      el("span", { class: "nota", testo: descrizione }),
    ]),
    el("span", { class: "fi-mov-cifra" }, [
      el("span", { class: `num ${m.tipo === "in" ? "positivo" : ""}`,
        testo: segno + euro(m.tipo === "out" ? effettivo : m.imp) }),
      ridotto && el("span", { class: "nota", testo: `lordo ${euro(m.imp)}` }),
    ]),
  ])]);
}

/* ================================================================ ANALISI
   Nove pannelli. Sono le domande che uno si fa davvero guardando un mese,
   e ognuna esiste perché una risposta sola non basta a capire se il mese
   sta andando bene. */

export function vistaAnalisi(mese, apriCat, apriSub) {
  const st = statistiche(mese);
  const p = profiloDi(mese);
  const bt = budgetTotale(mese);
  const oggi = oggiISO();
  const eCorrente = oggi.slice(0, 7) === mese;
  const giorni = giorniDelMese(mese);
  const giorno = eCorrente ? Number(oggi.slice(8, 10)) : giorni;
  const uscite = movimentiDelMese(mese).filter((m) => m.tipo === "out");

  if (!uscite.length && st.usciteNette === 0 && st.sforamentiN === 0) {
    return vuoto("Niente da analizzare",
      "Registra le uscite e qui trovi grafici, statistiche e il dettaglio voce per voce.");
  }

  const fuori = el("div", { class: "fi-analisi" });
  const sm = statisticheDelMese(mese);
  const sei = ultimiSeiMesi(mese);
  const passo = eCorrente && bt > 0 ? st.usciteNette - Math.round((bt * giorno) / giorni) : null;

  // 1 — andamento cumulato contro il ritmo del budget
  aggiungi(fuori, [el("section", { class: "scheda fi-larga" }, [
    el("div", { class: "fi-riga-doppia" }, [
      el("span", { class: "etichetta-riga", testo: "Andamento del mese" }),
      el("span", { class: "nota num", testo: `budget ${euro(bt, { tondo: true })}` }),
    ]),
    graficoCumulato(cumulata(mese), bt, eCorrente ? giorno : null, giorni),
    el("p", { class: "nota", testo: passo === null
      ? `Mese chiuso a ${euro(st.usciteNette)}.`
      : passo > 0
        ? `La retta tratteggiata è il ritmo ideale. Sei ${euro(passo, { tondo: true })} sopra.`
        : `La retta tratteggiata è il ritmo ideale. Sei ${euro(-passo, { tondo: true })} sotto.` }),
  ])]);

  // 2 — ripartizione
  const fette = stato().cats
    .map((c) => ({ etichetta: c.nome, valore: st.perCat[c.id]?.tot || 0, colore: coloreCat(c.id) }))
    .filter((e) => e.valore > 0);
  if (fette.length) {
    aggiungi(fuori, [el("section", { class: "scheda" }, [
      el("div", { class: "etichetta-riga", testo: "Ripartizione uscite" }),
      graficoCiambella(fette, st.usciteNette),
    ])]);
  }

  // 3 — lo stesso giorno del mese scorso: l'unico paragone onesto a metà mese
  const cfr = stessoGiornoMesePrima(mese);
  if (cfr.alloraSpeso > 0 || st.ordinaria > 0) {
    const meglio = cfr.scarto <= 0;
    aggiungi(fuori, [el("section", { class: "scheda" }, [
      el("div", { class: "etichetta-riga", testo: "Oggi, un mese fa" }),
      el("div", { class: "fi-confronto" }, [
        el("div", { class: "fi-cfr" }, [
          el("span", { class: "nota", testo: `${MESI[Number(cfr.mesePrima.slice(5, 7)) - 1]} al giorno ${cfr.taglio}` }),
          el("span", { class: "num", testo: euro(cfr.alloraSpeso) }),
        ]),
        el("div", { class: "fi-cfr adesso" }, [
          el("span", { class: "nota", testo: `${MESI[Number(mese.slice(5, 7)) - 1]} al giorno ${cfr.giorno}` }),
          el("span", { class: "num", testo: euro(cfr.adesso) }),
        ]),
      ]),
      traccia(cfr.alloraSpeso > 0 ? cfr.adesso / Math.max(cfr.alloraSpeso, cfr.adesso) : 1,
        meglio ? "" : "oltre", { sottile: true }),
      el("p", { class: "nota", testo: cfr.alloraSpeso === 0
        ? "Nessun termine di paragone: il mese scorso a questo punto non avevi speso nulla."
        : cfr.scarto === 0 ? "Stesso identico ritmo del mese scorso."
        : meglio ? `Stai spendendo ${euro(-cfr.scarto, { tondo: true })} in meno del mese scorso.`
                 : `Stai spendendo ${euro(cfr.scarto, { tondo: true })} in più del mese scorso.` }),
    ])]);
  }

  // 4 — i sei numeri del mese
  aggiungi(fuori, [el("section", { class: "scheda" }, [
    el("div", { class: "etichetta-riga", testo: "Statistiche del mese" }),
    el("div", { class: "fi-statgrid" }, [
      casella_("Media al giorno", euro(sm.mediaGiorno)),
      casella_("Scontrino medio", sm.nUscite ? euro(sm.scontrinoMedio) : "—"),
      casella_("Giorno più caro", sm.piuCaro ? euro(sm.piuCaro.valore) : "—",
        sm.piuCaro ? `il ${sm.piuCaro.giorno}` : ""),
      casella_("Vs mese scorso", sm.delta === null ? "—" : `${sm.delta > 0 ? "+" : ""}${sm.delta}%`, "",
        sm.delta === null ? "" : sm.delta > 0 ? "negativo" : "positivo"),
      casella_("Movimenti", String(sm.nUscite), "uscite"),
      casella_("Rimborsi recuperati", euro(sm.recuperato)),
    ]),
  ])]);

  // 5 — sei mesi di uscite
  aggiungi(fuori, [el("section", { class: "scheda" }, [
    el("div", { class: "etichetta-riga", testo: "Uscite nette · 6 mesi" }),
    graficoBarre(sei.usciteNette, sei.etichette, 5, bt || null),
    el("p", { class: "nota", testo: `Linea tratteggiata: budget del profilo ${p.nome} (${euro(bt, { tondo: true })}).` }),
  ])]);

  // 6 — sei mesi di sforamenti: l'unico numero che deve restare a zero
  aggiungi(fuori, [el("section", { class: "scheda" }, [
    el("div", { class: "etichetta-riga negativo", testo: "Sforamenti · 6 mesi" }),
    graficoBarre(sei.sforamenti, sei.etichette, 5, null, "var(--rosso)"),
    el("p", { class: "nota", testo: st.sforamentiTot > 0
      ? `Questo mese: ${st.sforamentiN} ricariche per ${euro(st.sforamentiTot)}.`
      : "Questo mese: zero. Così deve restare." }),
  ])]);

  // 7 — dove si concentra il ritmo
  aggiungi(fuori, [el("section", { class: "scheda" }, [
    el("div", { class: "etichetta-riga", testo: "Media per giorno della settimana" }),
    graficoBarre(mediaPerGiornoSettimana(mese), ["lun", "mar", "mer", "gio", "ven", "sab", "dom"],
      eCorrente ? (daISO(oggi).getDay() + 6) % 7 : -1),
  ])]);

  // 8 — le sottocategorie che pesano
  const top = sottocategorieDelMese(mese).slice(0, 5);
  if (top.length) {
    aggiungi(fuori, [el("section", { class: "scheda" }, [
      el("div", { class: "etichetta-riga", testo: "Top sottocategorie" }),
      el("div", { class: "fi-sublista" }, top.map((x) => el("button", {
        class: "fi-subriga", type: "button", onClick: () => apriSub(x.catId, x.sub),
      }, [
        el("div", { class: "fi-subriga-testo" }, [
          el("div", { testo: x.sub }),
          el("div", { class: "nota", testo: `${x.categoria} · ${plurale(x.volte, "volta", "volte")}` }),
        ]),
        el("span", { class: "num", testo: euro(x.totale) }),
        el("span", { class: "freccia", html: icona("freccia", 16) }),
      ]))),
    ])]);
  }

  // 9 — categorie contro pocket, tutte
  const totale = st.usciteNette || 1;
  const righe = stato().cats
    .map((c) => ({ c, speso: st.perCat[c.id]?.tot || 0, budget: Math.round((p.b[c.id] || 0) * 100),
                   n: st.perCat[c.id]?.movs.length || 0 }))
    .filter((r) => r.speso > 0 || r.budget > 0)
    .sort((a, b) => b.speso - a.speso);

  const blocco = el("div", { class: "fi-larga" }, [
    el("div", { class: "gruppo-titolo", testo: "Categorie vs pocket — tocca per il dettaglio" }),
  ]);
  for (const r of righe) {
    const frazione = r.budget > 0 ? r.speso / r.budget : (r.speso > 0 ? 1.01 : 0);
    blocco.append(el("button", { class: "scheda fi-cat-riga", type: "button", onClick: () => apriCat(r.c.id) }, [
      el("div", { class: "fi-cat-testa" }, [
        el("span", { class: "fi-cat-nome" }, [
          el("i", { class: "fi-punto", stile: { background: coloreCat(r.c.id) } }),
          el("span", { testo: r.c.nome }),
        ]),
        el("span", { class: "num", testo: euro(r.speso) }),
      ]),
      traccia(Math.min(1, frazione), frazione >= 1 ? "oltre" : frazione >= 0.9 ? "avviso" : ""),
      el("div", { class: "nota", testo:
        `${r.budget > 0 ? `${Math.round(frazione * 100)}% di ${euro(r.budget, { tondo: true })} di pocket` : "senza budget nel profilo"}` +
        ` · ${Math.round((r.speso / totale) * 100)}% delle uscite · ${r.n} mov.` }),
    ]));
  }
  fuori.append(blocco);

  if (st.orfani > 0) {
    aggiungi(fuori, [el("div", { class: "fi-avviso ambra fi-larga" }, [
      el("span", { class: "fi-avviso-icona", html: icona("info", 16) }),
      el("div", {}, [
        el("b", { testo: `Rimborsi non agganciati: ${euro(st.orfani)}` }),
        el("span", { class: "nota", testo: "Riducono il totale ma non sai da quale spesa vengono. Aprili e collegali." }),
      ]),
    ])]);
  }

  return fuori;
}

function casella_(chiave, valore, sotto = "", tono = "") {
  return el("div", { class: "fi-statbox" }, [
    el("div", { class: "nota", testo: chiave }),
    el("div", { class: `num fi-statval ${tono}` }, [
      el("span", { testo: valore }),
      sotto && el("small", { testo: ` ${sotto}` }),
    ]),
  ]);
}

/* ================================================================== FOGLI */

/** Il dettaglio di una categoria: sei mesi, sottocategorie, movimenti. */
export function apriCategoria(mese, catId, ridisegna, apriSub, apriDett) {
  const c = categoriaPerId(catId);
  if (!c) return;
  const st = statistiche(mese);
  const d = st.perCat[catId];
  const budget = Math.round((profiloDi(mese).b[catId] || 0) * 100);
  const medio = d.movs.length ? Math.round(d.tot / d.movs.length) : 0;
  const sei = categoriaSuSeiMesi(mese, catId);
  const sub = Object.entries(d.sub).sort((a, b) => b[1].tot - a[1].tot);

  const { corpo } = apriFoglio({
    titolo: c.nome,
    sinistra: el("button", { class: "btn nudo", type: "button", testo: "Chiudi", onClick: () => chiudiFoglio() }),
    alChiudi: ridisegna,
  });

  aggiungi(corpo, [
    el("div", { class: "fi-statgrid tre" }, [
      casella_("Questo mese", euro(d.tot)),
      casella_("Pocket", budget ? euro(budget, { tondo: true }) : "—"),
      casella_("Scontrino medio", d.movs.length ? euro(medio) : "—"),
    ]),
    budget > 0 && traccia(Math.min(1, d.tot / budget), d.tot >= budget ? "oltre" : d.tot >= budget * 0.9 ? "avviso" : ""),
    budget > 0 && el("p", { class: "nota", testo:
      `${Math.round((d.tot / budget) * 100)}% del pocket · ${d.tot <= budget ? `restano ${euro(budget - d.tot)}` : `sforato di ${euro(d.tot - budget)}`}` }),

    graficoBarre(sei.valori, sei.etichette, 5, budget || null, coloreCat(catId)),

    sub.length > 0 && el("div", { class: "gruppo-titolo", testo: "Sottocategorie" }),
    sub.length > 0 && el("div", { class: "fi-sublista" }, sub.map(([nome, v]) => el("button", {
      class: "fi-subriga", type: "button", onClick: () => { chiudiFoglio(); setTimeout(() => apriSub(catId, nome), 200); },
    }, [
      el("div", { class: "fi-subriga-testo" }, [
        el("div", { testo: nome }),
        el("div", { class: "nota", testo: `${plurale(v.n, "volta", "volte")} · medio ${euro(Math.round(v.tot / v.n))}` }),
      ]),
      el("span", { class: "num", testo: euro(v.tot) }),
      el("span", { class: "freccia", html: icona("freccia", 16) }),
    ]))),

    el("div", { class: "gruppo-titolo", testo: "Movimenti del mese" }),
    d.movs.length
      ? lista(d.movs.map((m) => rigaMovimento(m, (id) => { chiudiFoglio(); setTimeout(() => apriDett(id), 200); })))
      : el("p", { class: "nota", testo: "Nessun movimento questo mese." }),
  ]);
}

/** Il drill-down su una sottocategoria: cosa ci sta sotto, anche fuori dal mese. */
export function apriSottocategoria(mese, catId, sub, ridisegna, apriDett) {
  const c = categoriaPerId(catId);
  if (!c) return;
  const tutti = movimentiSottocategoria(catId, sub);
  const delMese = tutti.filter((m) => m.data.slice(0, 7) === mese);
  const prima = tutti.filter((m) => m.data.slice(0, 7) !== mese).slice(0, 12);
  const totMese = delMese.reduce((s, m) => s + importoEffettivo(m), 0);
  const totTutti = tutti.reduce((s, m) => s + importoEffettivo(m), 0);

  const { corpo } = apriFoglio({
    titolo: sub,
    sinistra: el("button", { class: "btn nudo", type: "button", testo: "Chiudi", onClick: () => chiudiFoglio() }),
    alChiudi: ridisegna,
  });

  const vaiAlDettaglio = (id) => { chiudiFoglio(); setTimeout(() => apriDett(id), 200); };

  aggiungi(corpo, [
    el("p", { class: "nota", testo: c.nome }),
    el("div", { class: "fi-statgrid tre" }, [
      casella_("Questo mese", euro(totMese)),
      casella_("Volte", String(delMese.length)),
      casella_("Medio", delMese.length ? euro(Math.round(totMese / delMese.length)) : "—"),
    ]),
    el("div", { class: "gruppo-titolo", testo: `Movimenti di ${MESI[Number(mese.slice(5, 7)) - 1]}` }),
    delMese.length
      ? lista(delMese.map((m) => rigaMovimento(m, vaiAlDettaglio)))
      : el("p", { class: "nota", testo: "Nessun movimento questo mese." }),
    prima.length > 0 && el("div", { class: "gruppo-titolo", testo: "Prima di questo mese" }),
    prima.length > 0 && lista(prima.map((m) => rigaMovimento(m, vaiAlDettaglio))),
    prima.length > 0 && el("p", { class: "nota",
      testo: `In archivio: ${tutti.length} movimenti per ${euro(totTutti)} in totale.` }),
  ]);
}

/**
 * Il dettaglio di un movimento.
 *
 * Non è solo "quanto e quando": è il contesto. Sapere che quella cena costa
 * il 40% più della media delle cene è l'informazione che cambia il
 * comportamento; il numero da solo no.
 */
export function apriDettaglio(id, ridisegna, apriDett) {
  const m = movimentiVivi().find((x) => x.id === id);
  if (!m) return;
  const c = categoriaPerId(m.cat);
  const effettivo = importoEffettivo(m);
  const ctx = contestoMovimento(m);
  const d = daISO(m.data);

  const natura = m.tipo === "out"
    ? (m.ecc ? "Straordinaria · fuori budget" : "Ordinaria · dentro il budget")
    : m.tipo === "extra" ? "Sforamento del sistema pocket"
    : m.tipo === "giro" ? "Giroconto · neutro sul budget"
    : ETICHETTA_TIPO[m.tipo];

  const segno = m.tipo === "in" ? "+" : m.tipo === "giro" ? "" : "−";
  const tono = m.tipo === "in" ? "positivo" : m.tipo === "extra" ? "negativo" : m.ecc ? "attenzione" : "";

  const { corpo } = apriFoglio({
    titolo: m.tipo === "out" ? "Uscita" : ETICHETTA_TIPO[m.tipo],
    sinistra: el("button", { class: "btn nudo", type: "button", testo: "Chiudi", onClick: () => chiudiFoglio() }),
    destra: el("button", { class: "btn nudo", type: "button", testo: "Modifica",
      onClick: () => { chiudiFoglio(); setTimeout(() => apriMovimento({ movimento: m, ridisegna }), 200); } }),
    alChiudi: ridisegna,
  });

  aggiungi(corpo, [
    el("div", { class: "fi-dett-testa" }, [
      el("div", { class: `cifra fi-dett-cifra ${tono}`, html: segno + euroRicco(effettivo) }),
      effettivo !== m.imp && el("div", { class: "nota", testo: `lordo ${euro(m.imp)} · rimborsato ${euro(m.imp - effettivo)}` }),
      el("div", { class: "fi-dett-nota", testo: m.nota || ETICHETTA_TIPO[m.tipo] }),
      c && el("span", { class: "fi-badge-cat" }, [
        el("i", { class: "fi-punto", stile: { background: coloreCat(m.cat) } }),
        el("span", { testo: c.nome + (m.sub ? ` · ${m.sub}` : "") }),
      ]),
    ]),

    lista([
      riga({ etichetta: "Data", valore: `${GIORNI[(d.getDay() + 6) % 7]} ${d.getDate()} ${MESI[d.getMonth()]} ${d.getFullYear()}` }),
      riga({ etichetta: "Natura", valore: natura }),
      m.tipo === "out" && ctx.simili > 1 && riga({
        etichetta: `Media ${m.sub || c?.nome || "categoria"}`,
        valore: euro(ctx.media) + (ctx.scostamento !== null && Math.abs(ctx.scostamento) >= 5
          ? ` (${ctx.scostamento > 0 ? "+" : ""}${ctx.scostamento}%)` : ""),
        tono: ctx.scostamento > 0 ? "negativo" : "positivo",
      }),
      m.tipo === "out" && ctx.quotaSulMese !== null && riga({
        etichetta: "Peso sul mese", valore: `${ctx.quotaSulMese}% della spesa ordinaria` }),
      m.tipo === "out" && ctx.simili > 0 && riga({
        etichetta: "Frequenza", valore: `${plurale(ctx.simili, "volta", "volte")} in archivio` }),
      ctx.rimborsi.length > 0 && riga({
        etichetta: "Rimborsi",
        valore: `${ctx.rimborsi.length} · ${euro(ctx.rimborsi.reduce((s, x) => s + x.imp, 0))}` }),
      m.rif && riga({
        etichetta: "Agganciato a",
        valore: movimentiVivi().find((x) => x.id === m.rif)?.nota || "spesa non trovata" }),
    ].filter(Boolean)),

    ctx.rimborsi.length > 0 && el("div", { class: "gruppo-titolo", testo: "Rimborsi agganciati" }),
    ctx.rimborsi.length > 0 && lista(ctx.rimborsi.map((r) =>
      rigaMovimento(r, (x) => { chiudiFoglio(); setTimeout(() => apriDett(x), 200); }))),

    el("button", {
      class: "btn distruttivo pieno", type: "button", testo: "Elimina",
      style: "margin-top:var(--s5)",
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
   È la schermata che si apre dieci volte al giorno, quindi è quella che
   deve costare meno gesti: importo, nota, e la categoria si propone da sé. */

export function apriMovimento({ movimento = null, ridisegna, tipo = "out" } = {}) {
  const nuovo = !movimento;
  const b = movimento
    ? { ...movimento }
    : { id: nuovoId("m"), tipo, imp: 0, nota: "", cat: null, sub: null, rif: null, ecc: false, data: oggiISO() };

  let testoImporto = b.imp ? (b.imp / 100).toFixed(2).replace(".", ",") : "";
  let categoriaManuale = Boolean(movimento?.cat);
  let assegnataAuto = false;

  const { corpo } = apriFoglio({
    titolo: nuovo ? "Nuovo movimento" : "Modifica",
    sinistra: el("button", { class: "btn nudo", type: "button", testo: "Annulla", onClick: () => chiudiFoglio() }),
    alChiudi: ridisegna,
  });

  const schermo = el("div", { class: "fi-importo cifra" });
  const zonaCat = el("div", { class: "campo-gruppo" });
  const zonaSub = el("div", { class: "campo-gruppo" });
  const zonaRif = el("div", { class: "campo-gruppo" });
  const zonaSalva = el("div", {});

  const aggiornaImporto = () => {
    schermo.textContent = testoImporto || "0,00";
    schermo.classList.toggle("vuoto", !testoImporto);
    disegnaSalva();
  };

  const disegnaSub = () => {
    zonaSub.replaceChildren();
    const c = categoriaPerId(b.cat);
    if (b.tipo !== "out" || !c?.sub?.length) return;
    zonaSub.append(el("label", { class: "campo-etichetta", testo: "Sottocategoria" }));
    zonaSub.append(pillole(c.sub.map((s) => [s, s]), b.sub, (v) => {
      b.sub = b.sub === v ? null : v;
      categoriaManuale = true;
    }));
  };

  const disegnaCat = () => {
    zonaCat.replaceChildren();
    if (b.tipo !== "out") return;
    zonaCat.append(el("label", { class: "campo-etichetta" }, [
      el("span", { testo: "Categoria" }),
      assegnataAuto && el("span", { class: "fi-suggerita", testo: " · assegnata in automatico" }),
    ]));
    zonaCat.append(pillole(
      stato().cats.map((c) => [c.id, c.nome, coloreCat(c.id)]),
      b.cat,
      (v) => { b.cat = v; b.sub = null; assegnataAuto = false; categoriaManuale = true; disegnaCat(); disegnaSub(); disegnaSalva(); },
      { unaRiga: true }
    ));
    disegnaSub();
  };

  /** Le uscite recenti da agganciare a un rimborso o a un reso. */
  const disegnaRif = () => {
    zonaRif.replaceChildren();
    if (b.tipo !== "rimb" && b.tipo !== "reso") return;
    const recenti = movimentiVivi()
      .filter((m) => m.tipo === "out")
      .sort((a, c) => c.data.localeCompare(a.data) || (c.ts || 0) - (a.ts || 0))
      .slice(0, 12);
    zonaRif.append(el("label", { class: "campo-etichetta", testo: "Aggancia alla spesa" }));
    if (!recenti.length) {
      zonaRif.append(el("p", { class: "nota", testo: "Nessuna spesa recente da agganciare." }));
      return;
    }
    zonaRif.append(pillole(
      recenti.map((m) => [m.id, `${m.nota} · ${euro(m.imp)}`]),
      b.rif,
      (v) => { b.rif = b.rif === v ? null : v; },
      { unaRiga: true }
    ));
    zonaRif.append(el("p", { class: "nota",
      testo: "Senza aggancio il rimborso abbassa il totale ma non si sa da quale spesa venga." }));
  };

  const valido = () => {
    if (centesimi(testoImporto) === null) return false;
    if (b.tipo !== "giro" && b.tipo !== "extra" && !b.nota.trim()) return false;
    if (b.tipo === "out" && !b.cat) return false;
    return Boolean(b.data);
  };

  const salva = (eccezionale) => {
    const imp = centesimi(testoImporto);
    if (!imp) { avviso("Manca l'importo.", { tono: "errore" }); return; }
    if (b.tipo === "out" && !b.cat) { avviso("Manca la categoria.", { tono: "errore" }); return; }
    salvaMovimento({ ...b, imp, ecc: b.tipo === "out" ? Boolean(eccezionale) : false });
    // Si impara solo da una scelta esplicita: memorizzare quello che ha
    // indovinato l'app la farebbe convergere sui propri errori.
    if (categoriaManuale && b.nota && b.cat) impara(b.nota, b.cat, b.sub);
    chiudiFoglio();
    tocco(12);
    avviso(nuovo ? "Registrato." : "Aggiornato.");
    ridisegna();
  };

  // Ordinaria o straordinaria è la domanda che tiene in piedi tutto il
  // calcolo: si chiede al momento del salvataggio invece di nasconderla in
  // una casella che nessuno spunta.
  const disegnaSalva = () => {
    zonaSalva.replaceChildren();
    const ok = valido();
    if (b.tipo === "out") {
      zonaSalva.append(el("div", { class: "fi-doppio-salva" }, [
        el("button", { class: "btn pieno", type: "button", disabled: !ok, onClick: () => salva(false) }, [
          el("b", { testo: "Ordinaria" }), el("small", { testo: "capita spesso" }),
        ]),
        el("button", { class: "btn tenue pieno", type: "button", disabled: !ok, onClick: () => salva(true) }, [
          el("b", { testo: "Straordinaria" }), el("small", { testo: "una volta tanto" }),
        ]),
      ]));
    } else {
      zonaSalva.append(el("button", { class: "btn pieno", type: "button", testo: "Salva",
        disabled: !ok, style: "margin-top:var(--s4)", onClick: () => salva(false) }));
    }
  };

  const SEGNAPOSTO = {
    out: "Cosa hai pagato?", in: "Da dove arriva?", rimb: "Chi ti ha rimborsato?",
    reso: "Cosa hai reso?", giro: "Da quale a quale pocket?", extra: "Da quale carta?",
  };
  const campoNota = el("input", { class: "campo", type: "text", value: b.nota,
    placeholder: SEGNAPOSTO[b.tipo], autocomplete: "off" });

  campoNota.addEventListener("input", () => {
    b.nota = campoNota.value;
    disegnaSalva();
    // La proposta si aggiorna finché l'utente non ha scelto a mano: cambiare
    // una scelta esplicita mentre continua a scrivere è il modo più veloce
    // per far odiare l'autocategorizzazione.
    if (b.tipo !== "out" || !nuovo || categoriaManuale) return;
    const indovinata = autoCategoria(campoNota.value, { normalizza, categoriaPerId });
    if (indovinata && (indovinata.cat !== b.cat || indovinata.sub !== b.sub)) {
      b.cat = indovinata.cat; b.sub = indovinata.sub; assegnataAuto = true;
      disegnaCat(); disegnaSalva();
    } else if (!indovinata && assegnataAuto) {
      b.cat = null; b.sub = null; assegnataAuto = false;
      disegnaCat(); disegnaSalva();
    }
  });

  const cambiaTipo = (v) => {
    b.tipo = v; b.cat = null; b.sub = null; b.rif = null;
    assegnataAuto = false; categoriaManuale = false;
    campoNota.placeholder = SEGNAPOSTO[v];
    disegnaCat(); disegnaRif(); disegnaSalva();
  };

  disegnaCat();
  disegnaRif();
  aggiornaImporto();

  aggiungi(corpo, [
    el("div", { class: "campo-gruppo" }, [
      pillole(Object.entries(TIPI).map(([k, t]) => [k, t.nome]), b.tipo, cambiaTipo, { unaRiga: true }),
    ]),

    schermo,
    tastierino((tasto) => {
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
    }),

    el("div", { class: "campo-gruppo" }, [
      el("label", { class: "campo-etichetta", testo: "Nota" }),
      campoNota,
    ]),
    zonaCat,
    zonaSub,
    zonaRif,
    campo({ etichetta: "Data", tipo: "date", valore: b.data,
      alCambio: (v) => { if (v) { b.data = v; disegnaSalva(); } } }),
    zonaSalva,
  ]);
}

/** Il tastierino. Su iPhone è più veloce e non fa saltare la vista. */
function tastierino(premi) {
  const g = el("div", { class: "fi-tastierino" });
  for (const t of ["1", "2", "3", "4", "5", "6", "7", "8", "9", ",", "0", "←"]) {
    g.append(el("button", {
      class: "fi-tasto" + (t === "←" ? " fi-tasto-canc" : ""),
      type: "button",
      testo: t === "←" ? undefined : t,
      html: t === "←" ? icona("indietro", 22) : undefined,
      "aria-label": t === "←" ? "Cancella" : t,
      onClick: () => premi(t),
    }));
  }
  return g;
}

/* ================================================================== SETUP */

export function vistaSetup(mese, ridisegna) {
  const s = stato();
  const chiave = chiaveProfilo(mese);
  const p = profiloDi(mese);
  const fuori = el("div", {});

  // --- pocket per categoria, con la spunta "entra nella cassa"
  const quadra = el("div", { class: "fi-quadra" });
  const disegnaQuadra = () => {
    const q = quadratura(mese);
    quadra.className = `fi-quadra ${q.differenza < 0 ? "ko" : "ok"}`;
    quadra.replaceChildren(
      el("div", { class: "fi-riga-doppia" }, [
        el("span", { testo: q.differenza < 0 ? "Sfori le entrate di" : "Ti resta" }),
        el("b", { class: "num", testo: `${Math.abs(q.differenza).toLocaleString("it-IT")} €` }),
      ]),
      el("div", { class: "nota", testo: q.differenza < 0
        ? "Il budget non quadra: taglia qualche pocket finché non rientri."
        : q.differenza === 0 ? "Budget allocato al centesimo."
        : "Margine non allocato: puoi destinarlo a risparmio o accantonamenti." }),
    );
  };
  disegnaQuadra();

  const listaBudget = el("ul", { class: "lista" });
  for (const c of s.cats) {
    listaBudget.append(el("li", {}, [el("div", { class: "riga fi-setrow" }, [
      el("i", { class: "fi-punto", stile: { background: coloreCat(c.id) } }),
      el("span", { class: "fi-setnome", testo: c.nome }),
      el("label", { class: "fi-cassa-check" }, [
        el("input", {
          type: "checkbox", checked: p.cassaCats.includes(c.id),
          onChange: (e) => scriviMeta((st_) => {
            const cc = new Set(st_.profili[chiave].cassaCats);
            e.target.checked ? cc.add(c.id) : cc.delete(c.id);
            st_.profili[chiave].cassaCats = [...cc];
          }),
        }),
        el("span", { testo: "cassa" }),
      ]),
      el("input", {
        class: "campo fi-campo-corto", type: "number", inputmode: "numeric",
        value: String(p.b[c.id] ?? 0), min: "0",
        onChange: (e) => {
          scriviMeta((st_) => { st_.profili[chiave].b[c.id] = Math.max(0, Number(e.target.value) || 0); });
          disegnaQuadra();
        },
      }),
    ])]));
  }

  aggiungi(fuori, [
    el("div", { class: "gruppo-titolo", testo: `Profilo ${p.nome} — pocket mensili (€)` }),
    listaBudget,
    lista([
      el("li", {}, [el("div", { class: "riga" }, [
        el("span", { testo: "Entrate mensili attese" }),
        el("input", { class: "campo fi-campo-corto", type: "number", inputmode: "numeric",
          value: String(s.config.entrate),
          onChange: (e) => { scriviMeta((st_) => { st_.config.entrate = Math.max(0, Number(e.target.value) || 0); }); disegnaQuadra(); } }),
      ])]),
    ]),
    quadra,

    el("div", { class: "gruppo-titolo", testo: "Cassa settimanale" }),
    lista([
      el("li", {}, [el("div", { class: "riga" }, [
        el("span", { testo: "Tetto settimanale" }),
        el("input", { class: "campo fi-campo-corto", type: "number", inputmode: "numeric",
          value: String(p.cassa),
          onChange: (e) => scriviMeta((st_) => { st_.profili[chiave].cassa = Math.max(0, Number(e.target.value) || 0); }) }),
      ])]),
      el("li", {}, [el("div", { class: "riga" }, [
        el("span", { testo: "Finestra (giorni del mese)" }),
        el("input", { class: "campo fi-campo-mini", type: "number", inputmode: "numeric", value: String(p.dal), min: "1", max: "31",
          onChange: (e) => scriviMeta((st_) => { st_.profili[chiave].dal = Math.max(1, Number(e.target.value) || 1); }) }),
        el("input", { class: "campo fi-campo-mini", type: "number", inputmode: "numeric", value: String(p.al), min: "1", max: "31",
          onChange: (e) => scriviMeta((st_) => { st_.profili[chiave].al = Math.max(1, Number(e.target.value) || 31); }) }),
      ])]),
    ]),
    el("p", { class: "nota", testo: "La cassa copre solo le categorie spuntate qui sopra: quelle che dipendono da una decisione giornaliera. Le fisse dentro un tetto settimanale lo farebbero sforare da sole il giorno dell'affitto." }),

    el("div", { class: "gruppo-titolo", testo: "Regola del costo casa (€)" }),
    lista([
      el("li", {}, [el("div", { class: "riga" }, [
        el("span", { testo: "Base risparmio" }),
        el("input", { class: "campo fi-campo-corto", type: "number", inputmode: "numeric", value: String(s.config.casaBase),
          onChange: (e) => scriviMeta((st_) => { st_.config.casaBase = Math.max(0, Number(e.target.value) || 0); }) }),
      ])]),
      el("li", {}, [el("div", { class: "riga" }, [
        el("span", { testo: "Affitto mensile" }),
        el("input", { class: "campo fi-campo-corto", type: "number", inputmode: "numeric", value: String(s.config.affitto),
          onChange: (e) => scriviMeta((st_) => { st_.config.affitto = Math.max(0, Number(e.target.value) || 0); }) }),
      ])]),
    ]),

    bloccoImport(ridisegna),

    el("div", { class: "gruppo-titolo", testo: "Autocategorizzazione" }),
    el("section", { class: "scheda" }, [
      el("p", { class: "nota", testo: `${Object.keys(s.rules).length} corrispondenze apprese dalle tue correzioni. Hanno sempre la precedenza sul dizionario di partenza.` }),
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
          ridisegna();
        },
      }),
    ]),
  ]);

  return fuori;
}

/* ---------------------------------------------------------- import ----- */

function bloccoImport(ridisegna) {
  let righe = [];
  const anteprima = el("div", { class: "fi-anteprima" });

  const disegnaAnteprima = () => {
    anteprima.replaceChildren();
    if (!righe.length) {
      anteprima.append(el("p", { class: "nota", testo: "Nessuna riga riconosciuta." }));
      return;
    }
    const doppioni = righe.filter((r) => r.doppione).length;
    const senzaCat = righe.filter((r) => r.inc && !r.doppione && r.tipo === "out" && !r.cat).length;

    anteprima.append(el("p", { class: "nota" }, [
      el("b", { testo: `${righe.length} righe` }),
      doppioni > 0 && el("span", { testo: ` · ${doppioni} doppioni scartati` }),
      senzaCat > 0
        ? el("span", { class: "attenzione", testo: ` · ${senzaCat} senza categoria: assegnala tu` })
        : el("span", { testo: " · categorie tutte assegnate" }),
    ]));

    const BADGE = { out: "USCITA", in: "ENTRATA", extra: "EXTRA", reso: "RESO", giro: "GIRO", rimb: "RIMB" };

    for (const [i, r] of righe.entries()) {
      const scelta = el("input", { type: "checkbox", checked: r.inc && !r.doppione, disabled: r.doppione,
        onChange: (e) => { r.inc = e.target.checked; aggiornaConta(); } });

      const selettore = r.tipo === "out" && !r.doppione
        ? el("select", { class: "campo fi-select",
            onChange: (e) => { r.cat = e.target.value || null; r.sub = null; disegnaAnteprima(); } },
            [el("option", { value: "", testo: "— categoria —" }),
             ...stato().cats.map((c) => el("option", { value: c.id, selected: c.id === r.cat, testo: c.nome }))])
        : null;

      anteprima.append(el("div", { class: `fi-imp-riga${r.doppione ? " doppione" : ""}` }, [
        scelta,
        el("div", { class: "fi-imp-testo" }, [
          el("div", { class: "fi-imp-nota", testo: r.nota }),
          el("div", { class: "nota" }, [
            el("span", { testo: `${r.data} · ` }),
            el("b", { class: r.tipo === "extra" ? "negativo" : r.tipo === "in" ? "positivo" : "", testo: BADGE[r.tipo] }),
            r.doppione && el("span", { testo: " · già presente" }),
            !r.doppione && r.tipo === "out" && r.auto && el("span", { class: "positivo", testo: ` · auto${r.sub ? `: ${r.sub}` : ""}` }),
          ]),
          selettore,
        ]),
        el("span", { class: "num fi-imp-cifra",
          testo: (r.tipo === "in" ? "+" : r.tipo === "giro" ? "" : "−") + euro(r.imp) }),
      ]));
    }

    const bottone = el("button", { class: "btn pieno", type: "button", style: "margin-top:var(--s4)",
      onClick: () => {
        const { quante, ultimoMese } = eseguiImport(righe);
        righe = [];
        avviso(quante ? `${quante} movimenti importati.` : "Niente da importare.");
        ridisegna(ultimoMese ? { mese: ultimoMese } : {});
      } });
    const aggiornaConta = () => {
      const n = righe.filter((r) => r.inc && !r.doppione).length;
      bottone.textContent = n ? `Importa ${n} movimenti` : "Nessuna riga selezionata";
      bottone.disabled = !n;
    };
    aggiornaConta();
    anteprima.append(bottone);
  };

  const areaTesto = el("textarea", { class: "campo fi-textarea",
    placeholder: "…oppure incolla qui le righe dell'estratto conto" });

  const fileInput = el("input", { type: "file", accept: ".csv,text/csv,text/plain", hidden: true,
    onChange: (e) => {
      const f = e.target.files[0];
      if (!f) return;
      const lettore = new FileReader();
      lettore.onload = () => { righe = preparaImport(lettore.result); disegnaAnteprima(); };
      lettore.readAsText(f);
      e.target.value = "";
    } });

  return el("div", {}, [
    el("div", { class: "gruppo-titolo", testo: "Import estratto conto" }),
    el("section", { class: "scheda" }, [
      el("p", { class: "nota", testo:
        "CSV Revolut (TOPUP → sforamento, refund → reso, pocket → giroconto; DECLINED e valute estere scartati), " +
        "CSV italiani col punto e virgola, oppure righe incollate tipo «27/07 Barbiere 15,00» (+ davanti = entrata). " +
        "I doppioni vengono riconosciuti e scartati; la categoria si assegna da sola dalle note." }),
      fileInput,
      el("div", { class: "fi-imp-bottoni" }, [
        el("button", { class: "btn tenue", type: "button", testo: "Carica CSV", onClick: () => fileInput.click() }),
        el("button", { class: "btn tenue", type: "button", testo: "Analizza il testo",
          onClick: () => { righe = preparaImport(areaTesto.value); disegnaAnteprima(); } }),
      ]),
      areaTesto,
      anteprima,
    ]),
  ]);
}
