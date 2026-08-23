// moduli/oggi — la home.
//
// Struttura da uno sketch: intestazione centrata con data e stato in alto a
// destra, e sotto TRE COLONNE — la centrale larga, le due laterali strette.
//
//   ┌──────── buongiorno, Ema. ────────┐        data
//   │        il verdetto + avviso      │        stato
//   ├─────────┬──────────────┬─────────┤
//   │  serie  │ resta da fare│ costanza│
//   │         ├──────────────┤         │
//   │         │   finanze    │         │
//   └─────────┴──────────────┴─────────┘
//
// Le regole che tengono insieme il tutto:
//
// 1. TUTTE LE CARTE SONO LA STESSA CARTA. Stesso raggio, stesso fondo, stessa
//    intestazione — emoji, nome, e a destra un numero o niente. Cambia solo
//    la tinta, e la tinta dice di che cosa parla la carta, non quanto è
//    urgente. Con carte tutte diverse l'occhio deve reimparare a leggere ogni
//    riquadro; con carte uguali impara una volta sola.
//
// 2. UNA COSA SOLA È GRANDE PER CARTA. Il numero, e il resto gli sta intorno.
//
// 3. LA COLONNA CENTRALE È QUELLA CHE SI USA. Le laterali si guardano; la
//    centrale si tocca — è lì che si spuntano le cose senza cambiare
//    schermata. Su telefono le tre colonne diventano una e l'ordine resta
//    quello dell'importanza.
//
// Non ha dati propri: interroga gli altri moduli con `oggi()`.

import { MODULI_DATI, prendiModulo } from "../../core/registro.js";
import {
  el, aggiungi, plurale, euro, tocco,
  GIORNI_INIZIALI, dataUmana, oggiISO,
} from "../../core/ui.js";
import { icona } from "../../core/icone.js";
import { ascolta } from "../../core/bus.js";
import { fattiDelGiorno, ultimiGiorni, giornoCorrente } from "../../core/contesto.js";

let contenitore = null;
const staccatori = [];

// `disegna()` è asincrona perché carica i moduli, e fra lo svuotamento e
// l'append c'è un await. Due chiamate ravvicinate — e ne arrivano, la home
// ascolta tre eventi — si intreccerebbero appendendo tutte e due. Solo
// l'ultimo disegno partito ha il diritto di scrivere.
let gettoneDisegno = 0;

const NOME = "Ema";
const SALUTI = [[5, "buonanotte"], [13, "buongiorno"], [18, "buon pomeriggio"], [22, "buonasera"], [24, "buonanotte"]];
const saluto = () => SALUTI.find(([h]) => new Date().getHours() < h)?.[1] || "ciao";
const dataLunga = () =>
  new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });

// Le tinte delle abitudini hanno nomi inglesi nei dati di partenza. La
// tabella sta qui perché la home non importa Abitudini: legge `oggi()`.
const TINTA_CSS = {
  blue: "blu", green: "verde", red: "rosso", orange: "arancio", purple: "viola",
  pink: "rosa", yellow: "giallo", mint: "menta", indigo: "indaco", ciano: "ciano",
};
const tintaDi = (t) => `var(--${TINTA_CSS[t] || t || "blu"})`;

/* ================================================================ vista == */

async function disegna() {
  if (!contenitore) return;
  const mio = ++gettoneDisegno;

  // Tollerante di proposito: un modulo rotto non deve portarsi via la home,
  // che è la schermata che si apre più spesso di tutte.
  const esiti = await Promise.allSettled(MODULI_DATI.map(async (voce) => {
    const mod = await prendiModulo(voce.id);
    return { mod, dati: mod?.oggi?.() ?? null };
  }));
  if (mio !== gettoneDisegno || !contenitore) return;

  const q = quadro(esiti.filter((e) => e.status === "fulfilled").map((e) => e.value));

  contenitore.replaceChildren();
  aggiungi(contenitore, [
    testa(q),
    el("div", { class: "og-griglia" }, [
      el("div", { class: "og-col og-col-sx" }, [cartaSerie(q)]),
      el("div", { class: "og-col og-col-centro" }, [
        cartaResta(q, () => disegna()),
        cartaFinanze(q),
      ]),
      el("div", { class: "og-col og-col-dx" }, [cartaCostanza(), cartaModuli(q)]),
    ]),
  ]);
}

/** Tutto quello che serve a decidere cosa dire, calcolato una volta sola. */
function quadro(schede) {
  const conDati = schede.filter((s) => s.dati);
  const daFare = conDati.filter((s) => s.dati.fatto === false || s.dati.urgente);
  const fatti = conDati.filter((s) => s.dati.fatto === true);

  // La checklist unica: le voci arrivano già pronte dai moduli, che sanno
  // cosa vuol dire «resta» per sé. La home le impila e basta.
  const resta = [];
  for (const s of conDati) for (const v of s.dati.resta || []) resta.push({ ...v, mod: s.mod });
  const peso = { tardi: 0, adesso: 1, presto: 2 };
  resta.sort((a, b) => (peso[a.quando] ?? 1) - (peso[b.quando] ?? 1));

  return {
    schede, conDati, daFare, fatti, resta,
    inRitardo: resta.filter((v) => v.quando === "tardi"),
    allarme: conDati.map((s) => s.dati.allarme).find(Boolean) || null,
    serie: Math.max(0, ...conDati.map((s) => s.dati.serie || 0)),
    finanze: conDati.find((s) => s.mod.id === "finanze")?.dati || null,
    ora: new Date().getHours(),
  };
}

/* ------------------------------------------------------- l'intestazione -- */
/*
   Saluto al centro, data e stato in alto a destra. Lo stato del sync vive
   qui e in Impostazioni: in cima a ogni modulo cambiava colore da solo in
   un punto diverso ogni volta, e un indicatore che lampeggia dove non te lo
   aspetti distrae invece di informare.
*/

function testa(q) {
  const { titolo, sotto, tono } = verdetto(q);
  return el("header", { class: "og-testa" }, [
    el("div", { class: "og-meta" }, [
      el("span", { class: "og-meta-data", testo: dataLunga() }),
      el("span", { class: "og-meta-stato" }, [
        el("span", { class: "sync-pallino", "data-ruolo": "sync" }),
        el("span", { testo: "sincronizzato" }),
      ]),
    ]),
    el("h1", { class: "og-saluto" }, [
      el("span", { class: "og-saluto-parola", testo: `${saluto()}, ` }),
      el("span", { testo: NOME }),
      el("span", { class: "og-punto", testo: "." }),
    ]),
    el("div", { class: "og-riga-verdetto" }, [
      el("p", { class: "og-verdetto", testo: titolo }),
      sotto && el("span", { class: `og-avviso ${tono}`.trim() }, [
        el("span", { class: "og-avviso-punto" }),
        el("span", { testo: sotto }),
      ]),
    ]),
  ]);
}

/**
 * La frase che riassume la giornata, e l'avviso che la corregge.
 *
 * Vince la prima regola che si applica. Il tono non colpevolizza mai: «ti
 * mancano due cose» è un fatto, «non hai fatto niente» è un giudizio, e
 * un'app che giudica si smette di aprirla.
 */
function verdetto(q) {
  const { resta, inRitardo, fatti, conDati, allarme, ora } = q;

  if (!conDati.length) {
    return { titolo: "Non c'è ancora niente da guardare.", sotto: null, tono: "" };
  }
  if (!resta.length) {
    return {
      titolo: fatti.length ? "Hai chiuso tutto. Puoi staccare." : "Niente in programma oggi.",
      sotto: allarme, tono: "male",
    };
  }
  if (inRitardo.length) {
    const nomi = elenco(inRitardo.slice(0, 2).map((v) => v.nome.toLowerCase()));
    return {
      titolo: inRitardo.length === 1 ? `Ti è sfuggito ${nomi}.` : `Ti sono sfuggiti ${nomi}.`,
      sotto: allarme, tono: "male",
    };
  }
  if (ora >= 21) {
    return {
      titolo: `${plurale(resta.length, "cosa", "cose")} e hai chiuso la giornata.`,
      sotto: allarme, tono: "male",
    };
  }
  return {
    titolo: `${plurale(resta.length, "cosa", "cose")} da fare, e c'è tutto il tempo.`,
    sotto: allarme, tono: "male",
  };
}

const elenco = (n) => n.length === 1 ? n[0] : `${n.slice(0, -1).join(", ")} e ${n[n.length - 1]}`;

/* -------------------------------------------------------------- la carta */
/*
   Il mattone. Tutte le carte della home passano di qui, ed è quello che le
   fa sembrare parte della stessa cosa invece che sei riquadri disegnati in
   sei momenti diversi.
*/

function carta({ emoji, nome, valore, tinta, classe = "", corpo }) {
  const c = el("section", { class: `og-carta ${classe}`.trim() }, [
    el("div", { class: "og-carta-testa" }, [
      emoji && el("span", { class: "og-carta-emoji emoji", testo: emoji }),
      el("span", { class: "og-carta-nome", testo: nome }),
      valore != null && el("span", { class: "og-carta-valore", testo: String(valore) }),
    ]),
    el("div", { class: "og-carta-corpo" }, [].concat(corpo).filter(Boolean)),
  ]);
  if (tinta) c.style.setProperty("--tinta", tinta);
  return c;
}

/* ------------------------------------------------------- 1. RESTA DA FARE */
/*
   La carta centrale, e l'unica su cui si tocca per FARE invece che per
   andare. Abitudini, parti e sessione di mobilità nella stessa lista: «cosa
   mi resta adesso» è una domanda sola, e finché la risposta stava in due
   schermate diverse bisognava aprirle tutte e due.
*/

function cartaResta(q, ridisegna) {
  if (!q.resta.length) {
    return carta({
      emoji: "✅", nome: "Resta da fare", tinta: "var(--ok)", classe: "og-vuota",
      corpo: el("p", { class: "og-tuttofatto", testo: "Niente. Hai spuntato tutto quello che c'era oggi." }),
    });
  }

  return carta({
    emoji: "📋", nome: "Resta da fare", valore: q.resta.length,
    tinta: "var(--accento)", classe: "og-resta",
    corpo: el("ul", { class: "og-lista" }, q.resta.map((v) => {
      const b = el("button", {
        class: `og-voce ${v.quando === "tardi" ? "tardi" : ""}`.trim(),
        type: "button",
        "aria-label": v.apre ? `Apri ${v.nome}` : `Segna ${v.nome}`,
        onClick: async () => {
          // Una sessione non si spunta, si fa: toccarla apre il player e il
          // cerchietto si riempie da sé quando è finita.
          if (v.apre) { location.hash = v.apre; return; }
          const mod = await prendiModulo(v.mod.id);
          mod?.spuntaParte?.(v.habitId, v.parteId) ?? mod?.spunta?.(v.habitId);
          tocco(12);
          ridisegna();
        },
      }, [
        el("span", { class: "og-voce-cerchio", html: icona("spunta", 13, 3) }),
        el("span", { class: "og-voce-testo" }, [
          el("span", { class: "og-voce-nome", testo: v.nome }),
          v.dentro && el("span", { class: "og-voce-dentro", testo: v.dentro }),
        ]),
        el("span", { class: "og-voce-quando", testo: v.quando === "tardi" ? "in ritardo" : (v.nomeFascia || "") }),
        v.apre && el("span", { class: "og-voce-freccia", html: icona("freccia", 14) }),
      ]);
      b.style.setProperty("--tinta", tintaDi(v.tint));
      return el("li", {}, [b]);
    })),
  });
}

/* ------------------------------------------------------------ 2. FINANZE */
/*
   Tre numeri e nient'altro: quanto è uscito oggi, quanto resta, cosa sta per
   uscire. Sono le tre domande che si fanno davanti a una cena fuori.
*/

function cartaFinanze(q) {
  const f = q.finanze;
  if (!f) return null;

  return carta({
    emoji: "💶", nome: "Finanze", tinta: "var(--lime)", classe: "og-soldi",
    corpo: [
      el("div", { class: "og-soldi-eroe" }, [
        el("span", { class: "og-soldi-cifra", testo: f.valore ?? "—" }),
        el("span", { class: "og-soldi-eti", testo: "restano questa settimana" }),
      ]),
      el("div", { class: "og-soldi-riga" }, [
        el("div", { class: "og-soldi-voce" }, [
          el("span", { class: "og-soldi-eti", testo: "Oggi" }),
          el("span", { class: "og-soldi-num", testo: f.spesoOggi ?? "0 €" }),
        ]),
        el("div", { class: "og-soldi-voce" }, [
          el("span", { class: "og-soldi-eti", testo: "Al giorno" }),
          el("span", { class: "og-soldi-num", testo: f.alGiorno ?? "—" }),
        ]),
        el("div", { class: "og-soldi-voce" }, [
          el("span", { class: "og-soldi-eti", testo: f.prossima ? f.prossima.quando : "In arrivo" }),
          el("span", { class: "og-soldi-num", testo: f.prossima ? f.prossima.importo : "niente" }),
        ]),
      ]),
      f.prossima && el("p", { class: "og-soldi-nota", testo: f.prossima.nome }),
      el("a", { class: "og-apri", href: "#/finanze" }, [
        el("span", { testo: "Apri Finanze" }),
        el("span", { html: icona("freccia", 14) }),
      ]),
    ],
  });
}

/* -------------------------------------------------------------- 3. SERIE */

function cartaSerie(q) {
  const n = q.serie;
  return carta({
    emoji: "🔥", nome: "Serie", tinta: "var(--arancio)", classe: "og-serie",
    corpo: [
      el("div", { class: "og-serie-cifra", testo: String(n) }),
      el("div", { class: "og-serie-eti", testo: n === 1 ? "giorno di fila" : "giorni di fila" }),
      el("p", { class: "og-serie-frase", testo: fraseSerie(n, q.resta.length === 0) }),
    ],
  });
}

/**
 * La frase cambia con la lunghezza della serie.
 *
 * Una formula ripetuta identica ogni giorno smette di significare qualcosa
 * dopo tre giorni: è il difetto di tutte le app che gamificano con una
 * stringa sola.
 */
function fraseSerie(n, chiusa) {
  if (n === 0) return "Nessuna serie aperta. Ne parte una appena spunti qualcosa.";
  if (chiusa) return `Giornata chiusa. La serie sale a ${n + 1} domani.`;
  if (n >= 30) return "Non è più una prova, è come vivi.";
  if (n >= 14) return "Sarebbe un peccato spezzarla stasera.";
  if (n >= 7) return "Una settimana piena. Tienila.";
  if (n >= 3) return "Adesso comincia a contare. Non mollare.";
  return "È l'inizio. I primi tre giorni sono i più cari.";
}

/* ----------------------------------------------------------- 4. COSTANZA */

function cartaCostanza() {
  const giorni = ultimiGiorni(7).reverse();
  const oggi = giornoCorrente();
  const attivi = giorni.filter(({ fatti }) => Object.keys(fatti).length).length;

  return carta({
    emoji: "📅", nome: "Costanza", valore: `${attivi}/7`, tinta: "var(--menta)",
    classe: "og-costanza",
    corpo: [
      el("div", { class: "og-sett" }, giorni.map(({ giorno, fatti }) => {
        const quanti = Object.values(fatti).reduce((n, m) => n + Object.keys(m).length, 0);
        const d = new Date(`${giorno}T12:00:00`);
        return el("div", {
          class: "og-sett-g" + (quanti ? " pieno" : "") + (giorno === oggi ? " oggi" : ""),
          title: `${dataUmana(giorno)} · ${quanti ? plurale(quanti, "cosa segnata", "cose segnate") : "niente"}`,
        }, [
          el("span", { class: "og-sett-punto" }),
          el("span", { class: "og-sett-lettera", testo: GIORNI_INIZIALI[(d.getDay() + 6) % 7] }),
        ]);
      })),
      el("p", { class: "og-nota", testo: attivi === 0
        ? "Negli ultimi sette giorni non hai segnato niente."
        : `Hai segnato qualcosa in ${plurale(attivi, "giorno", "giorni")} su 7.` }),
    ],
  });
}

/* ------------------------------------------------------------ 5. I MODULI */
/*
   Lo stato dei tre moduli, in tre righe. Non tessere grandi: qui non si
   decide niente, si controlla soltanto, e il controllo costa una riga.
*/

function cartaModuli(q) {
  const righe = q.schede.filter((s) => s.mod.id !== "oggi" && s.mod.id !== "impostazioni");
  if (!righe.length) return null;

  return carta({
    emoji: "🧭", nome: "I moduli", tinta: "var(--indaco)", classe: "og-moduli",
    corpo: el("ul", { class: "og-modlista" }, righe.map((s) => {
      const d = s.dati;
      const a = el("a", { class: "og-modriga", href: d?.azione?.rotta || `#/${s.mod.id}` }, [
        el("span", { class: "og-modicona", html: icona(s.mod.icona, 17) }),
        el("span", { class: "og-modnome", testo: s.mod.nome }),
        el("span", { class: `og-modstato ${d?.fatto === true ? "ok" : d?.fatto === false ? "avviso" : ""}`.trim(),
          testo: d ? String(d.valore ?? "—") : "—" }),
      ]);
      a.style.setProperty("--tinta", s.mod.accento);
      return el("li", {}, [a]);
    })),
  });
}

/* ============================================================ contratto == */

export default {
  async monta(cont) {
    contenitore = cont;
    await disegna();

    // La home è l'unica schermata che deve reagire a tutto: se un modulo
    // scrive un fatto mentre sei qui, il numero cambia sotto gli occhi.
    for (const evento of ["fatto:scritto", "dati:arrivati", "giorno:cambiato"]) {
      staccatori.push(ascolta(evento, () => { disegna(); }));
    }
  },

  smonta() {
    while (staccatori.length) staccatori.pop()();
    contenitore = null;
  },
};
