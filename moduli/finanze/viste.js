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
  campo, segmenti, pillole, euro, euroRicco, euroGrande, centesimi, nuovoId, plurale,
  tessera, spezzata, gettone, selettore,
  oggiISO, dataUmana, dataBreve, daISO, GIORNI, GIORNI_INIZIALI, MESI,
} from "../../core/ui.js";
import { icona } from "../../core/icone.js";
import {
  stato, movimentiVivi, categoriaPerId, profiloDi, chiaveProfilo, coloreCat, emojiCat, TIPI,
  salvaMovimento, eliminaMovimento, impara, normalizza, scriviMeta, casella,
  CATEGORIE_CASSA, TIPI_POCKET, SOGLIE_PREDEFINITE, pocketPerId, scriviPocket,
  salvaRicorrente, eliminaRicorrente, pendenti, metteInSospeso, togliDaSospeso,
} from "./dati.js";
import {
  statistiche, budgetTotale, cassaSettimana, avvisi, verdetto, proiezione,
  cumulata, risparmioReale, movimentiDelMese, importoEffettivo, giorniDelMese,
  nomeMese, autoCategoria, spostaMese, stessoGiornoMesePrima, statisticheDelMese,
  mediaPerGiornoSettimana, ultimiSeiMesi, sottocategorieDelMese, categoriaSuSeiMesi,
  movimentiSottocategoria, contestoMovimento, quadratura,
  cicloDi, spostaCiclo, nomeCiclo, movimentiDelCiclo, categorieDelCiclo,
  settimana, saldoPocket, pocketConSaldi, inArrivo, comeSpendi, sforamenti,
  alert, spesoOggi, importoRicorrente, prossimaScadenza,
} from "./calcolo.js";
import { graficoCumulato, graficoCiambella, graficoBarre } from "./grafici.js";
import { preparaImport, eseguiImport } from "./importa.js";

const ETICHETTA_TIPO = Object.fromEntries(Object.entries(TIPI).map(([k, v]) => [k, v.nome]));

/* ==================================================================== HOME
   Una domanda sola: posso spendere oggi, e quanto.

   L'ordine dei blocchi è quello della spec, e non è arbitrario. Prima il
   numero — il saldo vero del Principale, non un budget calcolato. Poi le
   due azioni. Poi cosa sta per uscire, che è la cosa che ribalta la
   risposta al numero: 67 € restano tanti finché non scopri che dopodomani
   esce l'affitto.

   Il tono è quello di un cruscotto: riporta, non sgrida. */

export function vistaHome(mese, grafico, cambia, apriCat, azioni = {}) {
  const oggi = oggiISO();
  const ciclo = cicloDi(oggi);
  const set = settimana(oggi);
  const arrivo = inArrivo(14, oggi);
  const av = alert(oggi);

  const fuori = el("div", {});

  aggiungi(fuori, [
    ilNumero(set, azioni),
    av.length > 0 && blocchoAlert(av),
    blocchoSospese(() => cambia({})),
    inArrivoBlocco(arrivo),
    dovSonoISoldi(azioni),
    categorieDelCicloBlocco(ciclo, apriCat),
    comeSpendiBlocco(ciclo),
    sforamentiBlocco(ciclo),
  ]);

  return fuori;
}

/* ------------------------------------------------------- 1. IL NUMERO --- */
/*
   Il saldo del pocket Principale. Denaro reale, non budget residuo.

   Il colore resta neutro fino al 70% consumato: rosso al primo giorno solo
   perché hai fatto la spesa grossa il lunedì è un allarme che insegna a
   ignorare gli allarmi.
*/

function ilNumero(s, azioni) {
  const tono = s.finita ? "male" : s.frazione >= 0.9 ? "male" : s.frazione >= 0.7 ? "avviso" : "";
  const box = el("section", { class: `fi-numero ${tono}`.trim() });

  // PRIMA DI TUTTO: zero perché non è configurato non è zero perché hai
  // finito i soldi. Sono due stati diversi e vanno detti in due modi
  // diversi, altrimenti al primo avvio l'app annuncia un disastro che non
  // c'è e non si capisce cosa fare.
  if (!pocketConSaldi().some((p) => p.saldo)) {
    aggiungi(box, [
      el("div", { class: "micro", testo: "Questa settimana" }),
      el("div", { class: "cifra cifra-xl", testo: "—" }),
      el("p", { class: "fi-numero-nota", testo:
        "I pocket non hanno ancora un saldo, quindi il conto della settimana non può partire." }),
      el("button", {
        class: "btn pieno grande", type: "button", testo: "Imposta i saldi",
        stile: { marginTop: "var(--s5)" },
        onClick: () => azioni.pocketSetup?.(),
      }),
      el("p", { class: "nota-2", stile: { marginTop: "var(--s3)" }, testo:
        "Si copiano da Revolut e da ING una volta sola. Da lì in poi li muovono i movimenti." }),
    ]);
    return box;
  }

  if (s.finita) {
    aggiungi(box, [
      el("div", { class: "micro male", testo: "Questa settimana" }),
      el("div", { class: "cifra cifra-xl negativo", html: euroGrande(0) }),
      el("p", { class: "fi-numero-nota", testo:
        `La settimana è finita · ${plurale(s.giorniRimasti, "giorno", "giorni")} a lunedì` }),
      el("div", { class: "fi-numero-scelta" }, [
        el("button", { class: "btn morbido", type: "button", testo: "Non ricaricare",
          onClick: () => avviso("Va bene così. Lunedì si riparte.") }),
        el("button", { class: "btn", type: "button", testo: "Devo ricaricare",
          onClick: () => azioni.ricarica?.() }),
      ]),
    ]);
    return box;
  }

  aggiungi(box, [
    el("div", { class: "fi-numero-testa" }, [
      el("div", { class: "micro", testo: "Questa settimana" }),
      s.budget > 0 && el("div", { class: `micro ${tono}`,
        testo: `${Math.round(s.frazione * 100)}% consumato` }),
    ]),
    el("div", { class: "cifra cifra-xl", html: euroGrande(s.resta) }),
    el("p", { class: "fi-numero-nota", testo:
      `restano · ${plurale(s.giorniRimasti, "giorno", "giorni")} a lunedì` }),
    s.budget > 0 && el("div", { class: "fi-consumo" }, [
      el("i", { stile: { width: `${Math.round(s.frazione * 100)}%` } }),
    ]),
    el("p", { class: "fi-numero-ritmo", testo: s.alGiorno > 0
      ? `${euro(s.alGiorno)} al giorno fino a domenica`
      : "Meglio non spendere altro fino a lunedì" }),
  ]);
  return box;
}

/* ---------------------------------------------------------- 2. ALERT ---- */

function blocchoAlert(lista) {
  return el("div", { class: "fi-avvisi" }, lista.map((a) => {
    const r = el("div", { class: "fi-avviso" }, [
      el("span", { class: "fi-avviso-punto" }),
      el("div", {}, [el("span", { class: "fi-avviso-testo", testo: a.testo })]),
    ]);
    r.style.setProperty("--tinta",
      a.livello === "critico" ? "var(--male)" : a.livello === "warn" ? "var(--avviso)" : "var(--accento)");
    return r;
  }));
}

/* ------------------------------------------------------- 3. IN ARRIVO --- */
/*
   Risponde a «posso permettermi questa cena, o fra tre giorni mi arriva una
   bolletta?». Ogni voce dice da quale pocket uscirà, e in fondo c'è la riga
   di verifica: se il pocket Fisse non copre i ricorrenti dei prossimi
   quattordici giorni, si vede subito. È l'errore che ha spaccato luglio.
*/

function inArrivoBlocco(a) {
  if (!a.voci.length) {
    return el("section", { class: "scheda" }, [
      el("div", { class: "micro", testo: "In arrivo · prossimi 14 giorni" }),
      el("p", { class: "nota", stile: { marginTop: "8px", marginBottom: "0" },
        testo: "Niente in scadenza. I ricorrenti si configurano in Impostazioni." }),
    ]);
  }

  return el("section", { class: "scheda fi-arrivo" }, [
    el("div", { class: "fi-arrivo-testa" }, [
      el("span", { class: "micro", testo: "In arrivo · prossimi 14 giorni" }),
      el("span", { class: "cifra cifra-s negativo", html: euroGrande(a.totale, { centesimi: false }) }),
    ]),

    el("ul", { class: "fi-arrivo-lista" }, a.voci.map((v) => el("li", {
      class: "fi-arrivo-riga" + (v.fra <= 2 ? " vicina" : ""),
    }, [
      el("span", { class: "fi-arrivo-quando", testo: dataBreve(v.quando) }),
      el("span", { class: "fi-arrivo-nome" }, [
        el("span", { testo: v.nome }),
        v.stimato && el("span", { class: "fi-tag ambra", testo: "stima" }),
      ]),
      el("span", { class: "fi-arrivo-importo num", testo: v.stimato
        ? `${euro(v.stimaMin, { tondo: true })}–${euro(v.stimaMax, { tondo: true })}`
        : euro(v.importo) }),
      el("span", { class: "fi-arrivo-pocket", testo: nomePocket(v.pocket) }),
    ]))),

    el("div", { class: `fi-arrivo-verifica ${a.coperte ? "ok" : "male"}` }, [
      el("span", { testo: a.coperte
        ? "Coperto da Spese fisse"
        : "Le Spese fisse non bastano" }),
      el("span", { class: "num", testo: a.coperte
        ? `${euro(a.daFisse, { tondo: true })} / ${euro(a.saldoFisse, { tondo: true })}`
        : `mancano ${euro(a.scoperto, { tondo: true })}` }),
    ]),
  ]);
}

const NOMI_POCKET = { principale: "Principale", cassa: "Cassa", fisse: "Fisse", ing: "ING" };
const nomePocket = (id) => NOMI_POCKET[id] || id;

/* --------------------------------------------------- 4. DOVE SONO I SOLDI */

function dovSonoISoldi(azioni) {
  const pk = pocketConSaldi();
  if (!pk.length) return null;
  const soglie = { ...SOGLIE_PREDEFINITE, ...(stato().soglie || {}) };
  const totale = pk.reduce((s, p) => s + p.saldoVero, 0);

  const nota = {
    principale: "spendibile",
    cassa: "parcheggio · non spendere",
    fisse: "addebiti automatici",
    ing: "riserva · non toccare",
  };

  return el("section", { class: "scheda fi-pocket" }, [
    el("div", { class: "micro", testo: "Dove sono i soldi" }),
    el("ul", { class: "fi-pocket-lista" }, pk.map((p) => {
      const sotto = p.id === "ing" && p.saldoVero > 0 && p.saldoVero < soglie.ingMinimo;
      const riga = el("li", { class: "fi-pocket-riga" + (sotto ? " sotto" : "") }, [
        el("span", { class: "fi-pocket-nome", testo: p.nome }),
        el("span", { class: "fi-pocket-saldo num", testo: euro(p.saldoVero) }),
        el("span", { class: "fi-pocket-nota", testo: sotto
          ? "sotto il minimo di sicurezza"
          : (nota[p.id] || TIPI_POCKET[p.tipo]?.nome || "") }),
      ]);
      // ING lo si aggiorna a mano: è l'unico saldo che l'app non può sapere.
      if (p.external) {
        riga.classList.add("tocca");
        riga.addEventListener("click", () => azioni.saldoING?.());
      }
      return riga;
    })),
    el("div", { class: "fi-pocket-totale" }, [
      el("span", { class: "micro", testo: "Totale" }),
      el("span", { class: "cifra cifra-s", html: euroGrande(totale, { centesimi: false }) }),
    ]),
  ]);
}

/* -------------------------------------------------- 5. LE CATEGORIE ----- */
/*
   Solo quelle della cassa settimanale più le due che sforano di più: nove
   barre non si leggono, e le sei che vanno bene rendono invisibili le tre
   che non vanno.
*/

function categorieDelCicloBlocco(ciclo, apriCat) {
  const tutte = categorieDelCiclo(ciclo).filter((c) => c.budget > 0 || c.speso > 0);
  const dellaCassa = tutte.filter((c) => CATEGORIE_CASSA.includes(c.id));
  const altre = tutte
    .filter((c) => !CATEGORIE_CASSA.includes(c.id) && c.budget > 0)
    .sort((a, b) => (b.speso / b.budget) - (a.speso / a.budget))
    .slice(0, 2);
  const mostrate = [...dellaCassa, ...altre];
  if (!mostrate.length) return null;

  return el("section", { class: "scheda fi-cat-ciclo" }, [
    el("div", { class: "fi-arrivo-testa" }, [
      el("span", { class: "micro", testo: "Questo mese" }),
      el("span", { class: "nota", testo: nomeCiclo(ciclo) }),
    ]),
    el("ul", { class: "fi-catlista" }, mostrate.map((c) => {
      const f = c.budget > 0 ? c.speso / c.budget : 0;
      const oltre = c.budget > 0 && c.speso > c.budget;
      const b = el("li", {}, [el("button", { class: "fi-catriga", type: "button",
        onClick: () => apriCat(c.id) }, [
        el("span", { class: "fi-catriga-nome" }, [
          el("span", { class: "fi-catriga-emoji", testo: emojiCat(c.id) }),
          el("span", { testo: c.nome }),
        ]),
        el("span", { class: `fi-catriga-cifra num ${oltre ? "negativo" : ""}`,
          testo: `${euro(c.speso, { tondo: true })} / ${euro(c.budget, { tondo: true })}` }),
        el("span", { class: "fi-catriga-barra" }, [
          el("i", { stile: { width: `${Math.min(100, Math.round(f * 100))}%` } }),
        ]),
      ])]);
      b.querySelector(".fi-catriga").style.setProperty("--tinta",
        oltre ? "var(--male)" : f >= 0.85 ? "var(--avviso)" : coloreCat(c.id));
      return b;
    })),
  ]);
}

/* ------------------------------------------------------- 6. COME SPENDI - */

function comeSpendiBlocco(ciclo) {
  const c = comeSpendi(ciclo);
  if (!c.totale) return null;
  const pct = Math.round(c.pctDiscrezionale * 100);

  return el("section", { class: "scheda fi-come" }, [
    el("div", { class: "micro", testo: "Come spendi · questo ciclo" }),
    el("div", { class: "fi-come-barra" }, [
      el("i", { class: "necessario", stile: { width: `${100 - pct}%` } }),
      el("i", { class: "discrezionale", stile: { width: `${pct}%` } }),
    ]),
    el("div", { class: "fi-come-legenda" }, [
      el("span", {}, [
        el("i", { class: "necessario" }),
        el("span", { testo: `Necessario ${euro(c.necessarioTotale, { tondo: true })}` }),
      ]),
      el("span", {}, [
        el("i", { class: "discrezionale" }),
        el("span", { testo: `Discrezionale ${euro(c.discrezionale, { tondo: true })} (${pct}%)` }),
      ]),
    ]),
  ]);
}

/* ------------------------------------------------------ 7. SFORAMENTI --- */
/*
   Sempre visibile, e soprattutto quando è a zero: è l'unica abitudine che è
   cambiata davvero — giugno 440, luglio 619, agosto 0 — e uno zero che si
   vede è quello che la protegge.
*/

function sforamentiBlocco(ciclo) {
  const s = sforamenti(ciclo);
  return el("section", { class: `scheda fi-sfor ${s.n ? "male" : "ok"}` }, [
    el("div", { class: "fi-arrivo-testa" }, [
      el("span", { class: `micro ${s.n ? "avviso" : "ok"}`, testo: "Sforamenti" }),
      el("span", { class: `cifra cifra-s ${s.n ? "attenzione" : "positivo"}`,
        testo: String(s.n) }),
    ]),
    el("p", { class: "nota", stile: { margin: "6px 0 0" }, testo: s.n === 0
      ? "Questo ciclo · nessuna ricarica fuori dal budget."
      : `Questo ciclo · ${euro(s.totale, { tondo: true })} in ${plurale(s.n, "ricarica", "ricariche")}.` }),
    s.ultimo && el("p", { class: "nota-2", stile: { margin: "4px 0 0" },
      testo: `Ultimo: ${dataBreve(s.ultimo.data)} · ${euro(s.ultimo.imp, { tondo: true })}${s.ultimo.nota ? ` — ${s.ultimo.nota}` : ""}` }),
  ]);
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
    fuori.append(vuoto("Nessun movimento", "Con Uscita, Entrata o ⋯ qui sopra ne registri uno."));
    return fuori;
  }

  const perGiorno = new Map();
  for (const m of ms) {
    if (!perGiorno.has(m.data)) perGiorno.set(m.data, []);
    perGiorno.get(m.data).push(m);
  }

  // Ogni giorno è un blocco chiuso — intestazione più righe. Serve perché da
  // scrivania l'elenco va su due colonne, e con intestazione e righe come
  // fratelli sciolti il taglio della colonna capitava in mezzo a un giorno.
  const colonne = el("div", { class: "fi-mov-colonne" });
  for (const [data, movs] of perGiorno) {
    // Il totale del giorno è il NETTO: entrate meno uscite ordinarie. Gli
    // straordinari non ci sono dentro, per lo stesso motivo per cui stanno
    // fuori dal budget.
    const netto = movs.reduce((s, m) =>
      s + (m.tipo === "in" ? m.imp : (m.tipo === "out" && !m.ecc) ? -importoEffettivo(m) : 0), 0);
    colonne.append(el("div", { class: "fi-giorno-blocco" }, [
      el("div", { class: "fi-giorno-testa" }, [
        el("span", { testo: dataUmana(data) }),
        netto !== 0 && el("span", { class: `num ${netto < 0 ? "" : "positivo"}`, testo: euro(netto, { segno: true }) }),
      ]),
      lista(movs.map((m) => rigaMovimento(m, apriDett))),
    ]));
  }
  fuori.append(colonne);
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
  else if (m.tipo === "extra") descrizione = "Ricarica fuori budget";  // «sforamento» lo dice già la targhetta
  else {
    const origine = movimentiVivi().find((x) => x.id === m.rif);
    descrizione = ETICHETTA_TIPO[m.tipo] + (origine ? ` → ${origine.nota}` : " · non agganciato");
  }

  const segno = { in: "+", out: "−", extra: "+", giro: "", rimb: "−", reso: "−" }[m.tipo] ?? "−";
  // Un quadratino con il simbolo della categoria al posto del pallino: in un
  // elenco di trenta movimenti il simbolo si riconosce prima della nota, e
  // dà alla lista un ritmo che una colonna di testo non ha.
  const tinta = m.tipo === "out" ? coloreCat(m.cat)
    : m.tipo === "in" ? "var(--ok)"
    : m.tipo === "extra" ? "var(--male)" : "var(--grigio)";
  const simbolo = m.tipo === "out" ? emojiCat(m.cat)
    : m.tipo === "in" ? "↓" : m.tipo === "extra" ? "!" : m.tipo === "giro" ? "⇄" : "↩";

  return el("li", {}, [el("button", {
    class: `riga fi-mov${straordinario ? " straordinario" : ""}`, type: "button",
    onClick: () => apriDett(m.id),
  }, [
    gettone(simbolo, tinta),
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
      el("span", { class: "micro", testo: "Andamento del mese" }),
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
      el("div", { class: "micro", testo: "Ripartizione uscite" }),
      graficoCiambella(fette, st.usciteNette),
    ])]);
  }

  // 3 — lo stesso giorno del mese scorso: l'unico paragone onesto a metà mese
  const cfr = stessoGiornoMesePrima(mese);
  if (cfr.alloraSpeso > 0 || st.ordinaria > 0) {
    const meglio = cfr.scarto <= 0;
    aggiungi(fuori, [el("section", { class: "scheda" }, [
      el("div", { class: "micro", testo: "Oggi, un mese fa" }),
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
    el("div", { class: "micro", testo: "Statistiche del mese" }),
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
    el("div", { class: "micro", testo: "Uscite nette · 6 mesi" }),
    graficoBarre(sei.usciteNette, sei.etichette, 5, bt || null),
    el("p", { class: "nota", testo: `Linea tratteggiata: budget del profilo ${p.nome} (${euro(bt, { tondo: true })}).` }),
  ])]);

  // 6 — sei mesi di sforamenti: l'unico numero che deve restare a zero
  aggiungi(fuori, [el("section", { class: "scheda" }, [
    el("div", { class: "micro male", testo: "Sforamenti · 6 mesi" }),
    graficoBarre(sei.sforamenti, sei.etichette, 5, null, "var(--rosso)"),
    el("p", { class: "nota", testo: st.sforamentiTot > 0
      ? `Questo mese: ${st.sforamentiN} ricariche per ${euro(st.sforamentiTot)}.`
      : "Questo mese: zero. Così deve restare." }),
  ])]);

  // 7 — dove si concentra il ritmo
  aggiungi(fuori, [el("section", { class: "scheda" }, [
    el("div", { class: "micro", testo: "Media per giorno della settimana" }),
    graficoBarre(mediaPerGiornoSettimana(mese), ["lun", "mar", "mer", "gio", "ven", "sab", "dom"],
      eCorrente ? (daISO(oggi).getDay() + 6) % 7 : -1),
  ])]);

  // 8 — le sottocategorie che pesano
  const top = sottocategorieDelMese(mese).slice(0, 5);
  if (top.length) {
    aggiungi(fuori, [el("section", { class: "scheda" }, [
      el("div", { class: "micro", testo: "Top sottocategorie" }),
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
    : { id: nuovoId("m"), tipo, imp: 0, nota: "", cat: null, sub: null, rif: null, ecc: false,
        data: oggiISO(),
        // Il Principale è l'unico conto da cui si spende: è il valore giusto
        // per default, e non va chiesto ogni volta.
        pocket: tipo === "in" ? "ing" : "principale", pocketTo: null, rimborsoDi: null };

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

  const scrivi = (imp, eccezionale) => {
    salvaMovimento({ ...b, imp, ecc: b.tipo === "out" ? Boolean(eccezionale) : false });
    // Si impara solo da una scelta esplicita: memorizzare quello che ha
    // indovinato l'app la farebbe convergere sui propri errori.
    if (categoriaManuale && b.nota && b.cat) impara(b.nota, b.cat, b.sub);
    chiudiFoglio();
    tocco(12);
    avviso(nuovo ? "Registrato." : "Aggiornato.");
    ridisegna();
  };

  const salva = (eccezionale) => {
    const imp = centesimi(testoImporto);
    if (!imp) { avviso("Manca l'importo.", { tono: "errore" }); return; }
    if (b.tipo === "out" && !b.cat) { avviso("Manca la categoria.", { tono: "errore" }); return; }

    // FRIZIONE SULLE SPESE GROSSE. Sopra la soglia si passa da una domanda:
    // le uscite sopra i 50 € sono cinque in due mesi e pesano più di tutte
    // le colazioni sommate, quindi è lì che tre secondi di attesa valgono
    // qualcosa — e su un caffè non devono esserci.
    const soglia = { ...SOGLIE_PREDEFINITE, ...(stato().soglie || {}) }.spesaGrossa;
    if (nuovo && b.tipo === "out" && imp >= soglia) {
      chiediSeCiDormi(imp, b, () => scrivi(imp, eccezionale), ridisegna);
      return;
    }
    scrivi(imp, eccezionale);
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

  // Il ciclo, i pocket, i ricorrenti e le soglie: tutto quello che il
  // Registro v2 ha aggiunto e che va configurato una volta sola.
  aggiungi(fuori, [vistaSetupV2(ridisegna)]);

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

/* ============================================================== RICARICA
   Il flusso anti-sforamento. È il cuore del prodotto.

   Quando il Principale è vuoto e servono soldi, l'app NON deve impedirlo:
   deve renderlo cosciente e tracciato. Da qui le tre cose che sembrano
   attrito e sono il punto:

   1. si deve scegliere DA DOVE, e l'app dice cosa comporta;
   2. il campo «perché» è obbligatorio — tre secondi di frizione fermano
      metà delle ricariche impulsive, e lo storico dei motivi è la cosa più
      utile da rileggere a fine mese;
   3. dalla seconda volta nello stesso ciclo, l'app lo dice.
*/

export function apriRicarica(ridisegna) {
  const oggi = oggiISO();
  const ciclo = cicloDi(oggi);
  const s = settimana(oggi);
  const sf = sforamenti(ciclo);

  const b = { fonte: "cassa", imp: 0, perche: "" };
  let testoImporto = "";

  const { corpo } = apriFoglio({
    titolo: "Ricarica fuori ciclo",
    sinistra: el("button", { class: "btn nudo", type: "button", testo: "Annulla",
      onClick: () => chiudiFoglio() }),
    alChiudi: ridisegna,
  });

  const schermo = el("div", { class: "fi-importo cifra vuoto", testo: "0,00" });
  const conseguenza = el("p", { class: "fi-conseguenza" });
  const zonaConferma = el("div", {});

  const saldoCassa = saldoPocket("cassa");

  const aggiornaConseguenza = () => {
    if (b.fonte === "cassa") {
      const dopo = saldoCassa - b.imp;
      const settimaneCoperte = s.budget > 0 ? Math.floor(Math.max(0, dopo) / s.budget) : 0;
      conseguenza.textContent = b.imp > 0
        ? `Anticipi la prossima settimana: lunedì avrai ${euro(Math.max(0, s.budget - b.imp))} invece di ${euro(s.budget)}.`
        : `Nella Cassa ci sono ${euro(saldoCassa)}, cioè ${plurale(settimaneCoperte, "settimana", "settimane")}.`;
      conseguenza.className = "fi-conseguenza";
    } else {
      conseguenza.textContent = "Intacchi la riserva. Viene contato come sforamento.";
      conseguenza.className = "fi-conseguenza male";
    }
  };

  const disegnaConferma = () => {
    zonaConferma.replaceChildren();
    const perche = b.perche.trim();
    const ok = b.imp > 0 && perche.length >= 3;
    zonaConferma.append(el("button", {
      class: "btn pieno grande", type: "button", disabled: !ok,
      testo: ok ? `Ricarica ${euro(b.imp)}` : perche.length < 3 && b.imp > 0
        ? "Scrivi perché, anche due parole"
        : "Quanto ti serve?",
      onClick: () => {
        // Un travaso dalla Cassa NON è uno sforamento: sposta soldi miei fra
        // pocket miei. Dall'ING sì, ed è la distinzione che rende il
        // contatore degli sforamenti una metrica e non un rumore.
        salvaMovimento(b.fonte === "cassa"
          ? { id: nuovoId("m"), data: oggi, tipo: "giro", imp: b.imp,
              pocket: "cassa", pocketTo: "principale", cat: null, sub: null,
              nota: `Anticipo — ${perche}` }
          : { id: nuovoId("m"), data: oggi, tipo: "extra", imp: b.imp,
              pocket: "principale", pocketTo: null, cat: null, sub: null,
              nota: perche });
        tocco(14);
        avviso(b.fonte === "cassa" ? "Anticipo registrato." : "Sforamento registrato.");
        chiudiFoglio();
      },
    }));
  };

  aggiungi(corpo, [
    el("p", { class: "fi-ric-stato", testo:
      `Restano ${plurale(s.giorniRimasti, "giorno", "giorni")} a lunedì. ` +
      (sf.n === 0
        ? "Questo ciclo non hai ancora ricaricato."
        : `Questo ciclo hai già ricaricato ${plurale(sf.n, "volta", "volte")}.`) }),

    // Dalla seconda in poi si aggiunge il contesto. Non è un rimprovero: è
    // il numero che serve per decidere, e senza va nascosto.
    sf.n >= 1 && el("p", { class: "fi-ric-avviso", testo:
      `L'ultima è del ${dataBreve(sf.ultimo.data)} da ${euro(sf.ultimo.imp, { tondo: true })}${sf.ultimo.nota ? ` — «${sf.ultimo.nota}»` : ""}.` }),

    el("div", { class: "gruppo-titolo", testo: "Da dove" }),
    segmenti([["cassa", "Cassa"], ["ing", "ING"]], b.fonte, (v) => {
      b.fonte = v; aggiornaConseguenza();
    }),
    conseguenza,

    el("div", { class: "gruppo-titolo", testo: "Quanto" }),
    schermo,
    tastierino((t) => {
      testoImporto = digita(testoImporto, t);
      b.imp = centesimi(testoImporto);
      schermo.textContent = testoImporto || "0,00";
      schermo.classList.toggle("vuoto", !testoImporto);
      tocco(5);
      aggiornaConseguenza();
      disegnaConferma();
    }),

    el("div", { class: "campo-gruppo" }, [
      el("label", { class: "campo-etichetta", testo: "Perché" }),
      el("input", { class: "campo", type: "text", maxlength: "80",
        placeholder: "cena fuori non prevista",
        onInput: (e) => { b.perche = e.target.value; disegnaConferma(); } }),
      el("p", { class: "nota-2", stile: { marginTop: "6px" },
        testo: "Obbligatorio. A fine mese rileggere i motivi vale più dei totali." }),
    ]),

    zonaConferma,
  ]);

  aggiornaConseguenza();
  disegnaConferma();
}

/** Un tasto premuto sopra un testo di importo: torna il testo nuovo. */
function digita(v, t) {
  if (t === "←") return v.slice(0, -1);
  if (t === ",") return v.includes(",") ? v : (v ? v + "," : "0,");
  const [, dec] = v.split(",");
  if (dec != null && dec.length >= 2) return v;
  if (v.replace(",", "").length >= 8) return v;
  return v + t;
}

/* ================================================================ SALDO ING
   L'unico saldo che l'app non può dedurre: ING vive fuori di qui. */

export function apriSaldoING(ridisegna) {
  const p = pocketPerId("ing");
  let testo = p?.saldo ? (p.saldo / 100).toFixed(2).replace(".", ",") : "";

  const { corpo } = apriFoglio({
    titolo: "Saldo ING",
    sinistra: el("button", { class: "btn nudo", type: "button", testo: "Annulla", onClick: () => chiudiFoglio() }),
    alChiudi: ridisegna,
    mezzo: true,
  });

  const schermo = el("div", { class: "fi-importo cifra" + (testo ? "" : " vuoto"), testo: testo || "0,00" });

  aggiungi(corpo, [
    el("p", { class: "nota", testo:
      "ING è una riserva che sta fuori dall'app: il saldo non si deduce dai movimenti, si copia dall'estratto conto." }),
    schermo,
    tastierino((t) => {
      testo = digita(testo, t);
      schermo.textContent = testo || "0,00";
      schermo.classList.toggle("vuoto", !testo);
      tocco(5);
    }),
    el("button", {
      class: "btn pieno grande", type: "button", testo: "Salva",
      onClick: () => { scriviPocket("ing", { saldo: centesimi(testo) }); avviso("Saldo aggiornato."); chiudiFoglio(); },
    }),
  ]);
}

/* ============================================================ CI DORMO SU
   La frizione sulle spese grosse.

   Sopra la soglia — 50 € di serie — prima di confermare si passa da una
   domanda sola, con il costo espresso in una unità che significa qualcosa:
   non «194 €» ma «una settimana e mezza di budget».

   «Ci dormo su» non annulla: mette la spesa fra le INTENZIONI. Se dopo
   ventiquattro ore la confermi si registra, se la ignori decade da sola
   dopo sette giorni. Sulla base dello storico questa singola funzione vale
   più di tutte le altre: le uscite sopra i 50 € sono cinque in due mesi e
   pesano più di tutte le colazioni sommate.
*/

function chiediSeCiDormi(imp, bozza, conferma, ridisegna) {
  const s = settimana();
  const settimane = s.budget > 0 ? imp / s.budget : 0;
  const quanto = settimane >= 0.9
    ? `Sono ${settimane.toFixed(1).replace(".", ",")} settimane di budget.`
    : `Sono ${Math.round((imp / Math.max(1, s.budget)) * 100)}% del budget della settimana.`;

  const { corpo } = apriFoglio({
    titolo: "Un momento",
    sinistra: el("button", { class: "btn nudo", type: "button", testo: "Indietro", onClick: () => chiudiFoglio() }),
    mezzo: true,
  });

  aggiungi(corpo, [
    el("div", { class: "fi-dormo-cifra cifra", html: euroGrande(imp) }),
    el("p", { class: "fi-dormo-quanto", testo: quanto }),
    s.resta > 0 && el("p", { class: "nota", testo:
      `Dopo questa ne restano ${euro(s.resta - imp)} per ${plurale(s.giorniRimasti, "giorno", "giorni")}.` }),

    el("div", { class: "fi-dormo-scelta" }, [
      el("button", { class: "btn morbido", type: "button", testo: "Ci dormo su",
        onClick: () => {
          metteInSospeso({ ...bozza, imp, id: nuovoId("p") });
          chiudiFoglio();   // il foglio della domanda
          chiudiFoglio();   // il foglio del movimento
          avviso("Messa in sospeso. La ritrovi in Riepilogo.");
          ridisegna();
        } }),
      el("button", { class: "btn", type: "button", testo: "Registra",
        onClick: () => { chiudiFoglio(); conferma(); } }),
    ]),
  ]);
}

/* --------------------------------------------------------- le in sospeso */

function blocchoSospese(ridisegna) {
  const p = pendenti();
  if (!p.length) return null;

  return el("section", { class: "scheda fi-sospese" }, [
    el("div", { class: "micro", testo: "Ci hai dormito su" }),
    el("ul", { class: "fi-sospese-lista" }, p.map((x) => {
      const ore = Math.floor((Date.now() - x.ts) / 3600000);
      const pronta = ore >= 24;
      return el("li", { class: "fi-sospesa" }, [
        el("div", { class: "fi-sospesa-testo" }, [
          el("div", { class: "fi-sospesa-nota", testo: x.nota || categoriaPerId(x.cat)?.nome || "Spesa" }),
          el("div", { class: "nota-2", testo: pronta
            ? "Sono passate 24 ore. La vuoi ancora?"
            : `Ancora ${plurale(24 - ore, "ora", "ore")} di attesa` }),
        ]),
        el("span", { class: "fi-sospesa-cifra num", testo: euro(x.imp) }),
        el("div", { class: "fi-sospesa-azioni" }, [
          el("button", { class: "btn piccolo nudo", type: "button", testo: "Lascia stare",
            onClick: () => { togliDaSospeso(x.id); avviso("Lasciata perdere."); ridisegna(); } }),
          el("button", { class: "btn piccolo", type: "button", testo: "Registra", disabled: !pronta,
            onClick: () => {
              const { ts, ...m } = x;
              salvaMovimento({ ...m, id: nuovoId("m"), data: oggiISO() });
              togliDaSospeso(x.id);
              avviso("Registrata.");
              ridisegna();
            } }),
        ]),
      ]);
    })),
  ]);
}

/* ========================================================= SALDI DEI POCKET
   Si compila una volta sola, copiando da Revolut e da ING. Da lì in poi i
   saldi li muovono i movimenti, e questa schermata serve solo a rimetterli
   in bolla quando ci si accorge di uno scostamento.

   La cassa settimanale sta qui e non in Impostazioni perché è il numero che
   trasforma i quattro saldi in «quanto posso spendere oggi»: separarli
   vorrebbe dire compilarne metà e non capire perché il conto non parte. */

export function apriSetupPocket(ridisegna) {
  const b = {};
  for (const p of pocketConSaldi()) b[p.id] = p.saldo || 0;
  let cassaSett = Number(stato().config?.cassaSettimanale) || 0;

  const { corpo } = apriFoglio({
    titolo: "Saldi dei pocket",
    sinistra: el("button", { class: "btn nudo", type: "button", testo: "Annulla", onClick: () => chiudiFoglio() }),
    alChiudi: ridisegna,
  });

  const NOTE = {
    principale: "Revolut · la settimana corrente. È l'unico conto da cui si spende.",
    cassa: "Revolut · le settimane future del mese. Parcheggio, non spendibile.",
    fisse: "Revolut · gli addebiti automatici. Non si tocca.",
    ing: "Il deposito. Riserva: alimenta gli altri, non si spende da qui.",
  };

  aggiungi(corpo, [
    el("p", { class: "nota", testo:
      "Copia i quattro saldi come sono adesso. I movimenti già in archivio non li toccano: contano da oggi in avanti." }),

    ...pocketConSaldi().map((p) => el("div", { class: "campo-gruppo fi-setup-pocket" }, [
      el("label", { class: "campo-etichetta", testo: p.nome }),
      campo({
        tipo: "text", valore: p.saldo ? (p.saldo / 100).toFixed(2).replace(".", ",") : "",
        segnaposto: "0,00",
        inputmode: "decimal",
        alCambio: (v) => { b[p.id] = centesimi(v); },
      }),
      el("p", { class: "nota-2", testo: NOTE[p.id] || "" }),
    ])),

    el("div", { class: "gruppo-titolo", testo: "Il travaso del lunedì" }),
    el("div", { class: "campo-gruppo" }, [
      campo({
        tipo: "text", valore: cassaSett ? (cassaSett / 100).toFixed(2).replace(".", ",") : "",
        segnaposto: "130,00",
        inputmode: "decimal",
        alCambio: (v) => { cassaSett = centesimi(v); },
      }),
      el("p", { class: "nota-2", testo:
        "Quanto passa dalla Cassa al Principale ogni lunedì. È il budget della settimana, e la barra del consumo si misura su questo." }),
    ]),

    el("button", {
      class: "btn pieno grande", type: "button", testo: "Salva i saldi",
      stile: { marginTop: "var(--s5)" },
      onClick: () => {
        for (const [id, saldo] of Object.entries(b)) scriviPocket(id, { saldo });
        scriviMeta((s) => {
          s.config.cassaSettimanale = cassaSett;
          // La data spartiacque si sposta a oggi: i saldi appena inseriti
          // sono di oggi, e i movimenti di ieri non devono riscalarli.
          s.config.pocketDa = oggiISO();
        });
        avviso("Saldi salvati.");
        chiudiFoglio();
      },
    }),
  ]);
}

/* ============================================== IMPOSTAZIONI — REGISTRO v2
   Il ciclo, i pocket, i ricorrenti e le soglie. Sta in fondo alla sezione
   Finanze di #/impostazioni, sotto quello che c'era già. */

export function vistaSetupV2(ridisegna) {
  const s = stato();
  const soglie = { ...SOGLIE_PREDEFINITE, ...(s.soglie || {}) };
  const fuori = el("div", {});

  /* --- il ciclo ------------------------------------------------------- */
  const g = Number(s.config?.giornoStipendio) || 21;
  aggiungi(fuori, [el("section", { class: "scheda" }, [
    el("div", { class: "scheda-titolo", testo: "Il ciclo dello stipendio" }),
    el("p", { class: "nota", testo:
      "Il mese finanziario non parte il primo. Da questo giorno si contano budget, proiezioni e «quanto manca alla fine del mese»: col mese solare i conti sbagliavano di venti giorni tutti i mesi." }),
    el("div", { class: "campo-gruppo", stile: { marginTop: "var(--s3)" } }, [
      el("label", { class: "campo-etichetta", testo: "Giorno dello stipendio" }),
      el("div", { class: "fi-riga-doppia" }, [
        campo({ tipo: "number", valore: String(g), min: "1", max: "28",
          alCambio: (v) => {
            const n = Math.min(28, Math.max(1, Number(v) || 1));
            scriviMeta((st) => { st.config.giornoStipendio = n; });
          } }),
        el("span", { class: "nota", testo: `Ciclo in corso: ${nomeCiclo(cicloDi())}` }),
      ]),
    ]),
  ])]);

  /* --- i pocket -------------------------------------------------------- */
  aggiungi(fuori, [el("section", { class: "scheda" }, [
    el("div", { class: "scheda-titolo", testo: "I pocket" }),
    lista(pocketConSaldi().map((p) => riga({
      etichetta: p.nome,
      valore: euro(p.saldoVero),
      dettaglio: TIPI_POCKET[p.tipo]?.nome + (p.external ? " · saldo a mano" : ""),
    }))),
    el("button", {
      class: "btn tenue pieno", type: "button", testo: "Correggi i saldi",
      onClick: () => apriSetupPocket(ridisegna),
    }),
    el("p", { class: "nota", testo:
      `I movimenti muovono i saldi da ${dataBreve(s.config?.pocketDa || oggiISO())} in avanti. Quelli precedenti restano nello storico e non li toccano.` }),
  ])]);

  /* --- i ricorrenti ---------------------------------------------------- */
  const zonaRic = el("div", {});
  const disegnaRic = () => {
    zonaRic.replaceChildren();
    const ric = s.ricorrenti || [];
    aggiungi(zonaRic, [
      ric.length === 0
        ? el("p", { class: "nota", testo: "Nessun ricorrente. Senza, la sezione «In arrivo» della home resta vuota." })
        : lista(ric.map((r) => riga({
            etichetta: r.nome,
            valore: r.tipo === "variabile"
              ? `${euro(r.stimaMin, { tondo: true })}–${euro(r.stimaMax, { tondo: true })}`
              : euro(r.imp, { tondo: true }),
            dettaglio: `${etichettaCadenza(r)} · ${nomePocket(r.pocket)}${r.attivo ? "" : " · sospeso"}`,
            tono: r.attivo ? "" : "",
            azione: () => apriRicorrente(r, () => { disegnaRic(); ridisegna(); }),
          }))),
      el("button", {
        class: "btn tenue pieno", type: "button", testo: "Aggiungi un ricorrente",
        onClick: () => apriRicorrente(null, () => { disegnaRic(); ridisegna(); }),
      }),
    ]);
  };
  disegnaRic();

  aggiungi(fuori, [el("section", { class: "scheda" }, [
    el("div", { class: "scheda-titolo", testo: "Uscite ricorrenti" }),
    el("p", { class: "nota", testo:
      "Alimentano «In arrivo» e l'allarme sulle Spese fisse scoperte. Le variabili si dichiarano con un intervallo, e nelle proiezioni vale sempre il massimo." }),
    zonaRic,
  ])]);

  /* --- le soglie ------------------------------------------------------- */
  aggiungi(fuori, [el("section", { class: "scheda" }, [
    el("div", { class: "scheda-titolo", testo: "Soglie" }),
    campoSoglia("Minimo della riserva ING", soglie.ingMinimo, (v) => scriviSoglia("ingMinimo", v),
      "Sotto questa cifra ING passa in ambra e compare l'avviso."),
    campoSoglia("Frizione sulle spese grosse", soglie.spesaGrossa, (v) => scriviSoglia("spesaGrossa", v),
      "Sopra questo importo, prima di registrare l'app chiede se ci vuoi dormire su."),
    el("div", { class: "campo-gruppo" }, [
      el("label", { class: "campo-etichetta", testo: "Avviso di categoria" }),
      segmenti([["0.75", "75%"], ["0.85", "85%"], ["0.95", "95%"]], String(soglie.catAvviso),
        (v) => scriviSoglia("catAvviso", Number(v))),
      el("p", { class: "nota", testo: "A che punto del budget di categoria compare l'avviso." }),
    ]),
  ])]);

  return fuori;
}

const scriviSoglia = (k, v) => scriviMeta((s) => { s.soglie = { ...(s.soglie || {}), [k]: v }; });

function campoSoglia(etichetta, valore, alSalva, nota) {
  return el("div", { class: "campo-gruppo" }, [
    el("label", { class: "campo-etichetta", testo: etichetta }),
    campo({ tipo: "text", inputmode: "decimal",
      valore: valore ? (valore / 100).toFixed(2).replace(".", ",") : "",
      alCambio: (v) => alSalva(centesimi(v)) }),
    el("p", { class: "nota", testo: nota }),
  ]);
}

const CADENZE = [["mensile", "Ogni mese"], ["bimestrale", "Ogni 2 mesi"], ["trimestrale", "Ogni 3 mesi"], ["annuale", "Ogni anno"]];
const NOMI_MESI_LUNGHI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno",
  "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];

function etichettaCadenza(r) {
  const c = CADENZE.find(([k]) => k === r.cadenza)?.[1] || r.cadenza;
  if (r.cadenza === "mensile") return `${c} il ${r.giorno}`;
  return `${c} · ${r.giorno} ${NOMI_MESI_LUNGHI[(r.mese || 1) - 1]}`;
}

/** Il foglio di un ricorrente: fisso o variabile, con cadenza e pocket. */
function apriRicorrente(esistente, ridisegna) {
  const b = esistente
    ? { ...esistente }
    : { id: nuovoId("r"), nome: "", imp: 0, cat: "fisse", pocket: "fisse", tipo: "fissa",
        cadenza: "mensile", giorno: 1, mese: 1, stimaMin: 0, stimaMax: 0, attivo: true };

  const { corpo } = apriFoglio({
    titolo: esistente ? "Ricorrente" : "Nuovo ricorrente",
    sinistra: el("button", { class: "btn nudo", type: "button", testo: "Annulla", onClick: () => chiudiFoglio() }),
    destra: el("button", {
      class: "btn nudo", type: "button", testo: "Salva",
      onClick: () => {
        if (!b.nome.trim()) { avviso("Serve un nome.", { tono: "errore" }); return; }
        salvaRicorrente({ ...b, nome: b.nome.trim() });
        chiudiFoglio();
        avviso("Salvato.");
      },
    }),
    alChiudi: ridisegna,
  });

  const zonaImporto = el("div", {});
  const zonaQuando = el("div", {});

  const disegnaImporto = () => {
    zonaImporto.replaceChildren();
    if (b.tipo === "fissa") {
      aggiungi(zonaImporto, [
        el("label", { class: "campo-etichetta", testo: "Importo" }),
        campo({ tipo: "text", inputmode: "decimal",
          valore: b.imp ? (b.imp / 100).toFixed(2).replace(".", ",") : "",
          alCambio: (v) => { b.imp = centesimi(v); } }),
      ]);
    } else {
      aggiungi(zonaImporto, [
        el("label", { class: "campo-etichetta", testo: "Stima" }),
        el("div", { class: "fi-ric-range" }, [
          campo({ tipo: "text", inputmode: "decimal", segnaposto: "minimo",
            valore: b.stimaMin ? (b.stimaMin / 100).toFixed(2).replace(".", ",") : "",
            alCambio: (v) => { b.stimaMin = centesimi(v); } }),
          campo({ tipo: "text", inputmode: "decimal", segnaposto: "massimo",
            valore: b.stimaMax ? (b.stimaMax / 100).toFixed(2).replace(".", ",") : "",
            alCambio: (v) => { b.stimaMax = centesimi(v); } }),
        ]),
        el("p", { class: "nota", testo: "Nelle proiezioni vale il massimo: una bolletta sottostimata è esattamente il caso in cui il pocket non basta." }),
      ]);
    }
  };

  const disegnaQuando = () => {
    zonaQuando.replaceChildren();
    aggiungi(zonaQuando, [
      el("label", { class: "campo-etichetta", testo: "Giorno del mese" }),
      campo({ tipo: "number", min: "1", max: "31", valore: String(b.giorno),
        alCambio: (v) => { b.giorno = Math.min(31, Math.max(1, Number(v) || 1)); } }),
      // Le cadenze non mensili hanno bisogno di un mese di ancoraggio: senza,
      // un annuale cadrebbe ogni anno nel mese in cui lo stai guardando.
      b.cadenza !== "mensile" && el("div", { class: "campo-gruppo" }, [
        el("label", { class: "campo-etichetta", testo: "A partire da" }),
        pillole(NOMI_MESI_LUNGHI.map((n, i) => [String(i + 1), n.slice(0, 3)]),
          String(b.mese || 1), (v) => { b.mese = Number(v); }, { unaRiga: true }),
      ]),
    ]);
  };

  disegnaImporto();
  disegnaQuando();

  aggiungi(corpo, [
    campo({ etichetta: "Nome", valore: b.nome, segnaposto: "Rata prestito",
      alCambio: (v) => { b.nome = v; } }),

    el("div", { class: "campo-gruppo" }, [
      el("label", { class: "campo-etichetta", testo: "Importo" }),
      segmenti([["fissa", "Certo"], ["variabile", "Stimato"]], b.tipo,
        (v) => { b.tipo = v; disegnaImporto(); }),
    ]),
    el("div", { class: "campo-gruppo" }, [zonaImporto]),

    el("div", { class: "campo-gruppo" }, [
      el("label", { class: "campo-etichetta", testo: "Ogni quanto" }),
      segmenti(CADENZE, b.cadenza, (v) => { b.cadenza = v; disegnaQuando(); }),
    ]),
    el("div", { class: "campo-gruppo" }, [zonaQuando]),

    el("div", { class: "campo-gruppo" }, [
      el("label", { class: "campo-etichetta", testo: "Da quale pocket esce" }),
      pillole((stato().pockets || []).map((p) => [p.id, p.nome]), b.pocket,
        (v) => { b.pocket = v; }),
    ]),

    el("div", { class: "campo-gruppo" }, [
      el("label", { class: "campo-etichetta", testo: "Categoria" }),
      pillole(stato().cats.map((c) => [c.id, c.nome, coloreCat(c.id)]), b.cat,
        (v) => { b.cat = v; }, { unaRiga: true }),
    ]),

    el("div", { class: "campo-gruppo" }, [
      segmenti([["si", "Attivo"], ["no", "Sospeso"]], b.attivo ? "si" : "no",
        (v) => { b.attivo = v === "si"; }),
      el("p", { class: "nota", testo: "Un ricorrente sospeso resta configurato ma sparisce da «In arrivo»." }),
    ]),

    esistente && el("button", {
      class: "btn distruttivo nudo pieno", type: "button", testo: "Elimina",
      stile: { marginTop: "var(--s6)" },
      onClick: (e) => {
        const btn = e.currentTarget;
        if (btn.dataset.sicuro !== "1") {
          btn.dataset.sicuro = "1";
          btn.textContent = "Tocca di nuovo per eliminare";
          setTimeout(() => { btn.dataset.sicuro = ""; btn.textContent = "Elimina"; }, 3000);
          return;
        }
        eliminaRicorrente(b.id);
        chiudiFoglio();
        avviso("Eliminato.");
      },
    }),
  ]);
}
