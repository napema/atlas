// moduli/oggi — la home.
//
//   ┌──────── buongiorno, Ema. ────────┐        data
//   │            il verdetto           │        stato
//   ├─────────┬──────────────┬─────────┤
//   │ finanze │ resta da fare│  serie  │
//   │         │              ├─────────┤
//   │         │              │ costanza│
//   ├─────────┴──────────────┴─────────┤
//   │            i moduli              │
//   └──────────────────────────────────┘
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
// 3. LA RIGA DI CARTE HA UN'ALTEZZA SOLA. Le tre colonne si stirano alla più
//    alta e la striscia dei moduli chiude sotto. Tre carte che finiscono a
//    tre altezze diverse non sono un cruscotto, sono tre ritagli.
//
// 4. NELLA CHECKLIST CI VA SOLO QUELLO CHE HA UN'ORA. La prima versione
//    impilava tutte le abitudini del giorno e faceva nove righe: una lista
//    di nove cose non è una priorità, è un elenco, e un elenco lo si smette
//    di leggere. Qui entra ciò che è in ritardo, ciò che tocca ADESSO e la
//    sessione. Il resto sta in Abitudini, che è la schermata fatta per
//    quello. → `prioritarie()`
//
// 5. DA TELEFONO LA PRIMA SCHERMATA BASTA. Niente si scopre scorrendo:
//    l'intestazione è più bassa, le carte hanno meno aria e le righe sono
//    più corte. Le misure compatte stanno tutte in stile.css sotto il
//    media query del telefono, in un posto solo.
//
// Non ha dati propri: interroga gli altri moduli con `oggi()`.

import { MODULI_DATI, prendiModulo } from "../../core/registro.js";
import {
  el, aggiungi, plurale, tocco,
  GIORNI_INIZIALI, dataUmana, oggiISO,
} from "../../core/ui.js";
import { icona } from "../../core/icone.js";
import { ascolta } from "../../core/bus.js";
import { ultimiGiorni, giornoCorrente } from "../../core/contesto.js";

let contenitore = null;
const staccatori = [];

// `disegna()` è asincrona perché carica i moduli, e fra lo svuotamento e
// l'append c'è un await. Due chiamate ravvicinate — e ne arrivano, la home
// ascolta tre eventi — si intreccerebbero appendendo tutte e due. Solo
// l'ultimo disegno partito ha il diritto di scrivere.
let gettoneDisegno = 0;

const NOME = "Ema";
const SALUTI = [[5, "Buonanotte"], [13, "Buongiorno"], [18, "Buon pomeriggio"], [22, "Buonasera"], [24, "Buonanotte"]];
const saluto = () => SALUTI.find(([h]) => new Date().getHours() < h)?.[1] || "Ciao";
const dataLunga = () =>
  new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });

// Quante righe della checklist stanno in una carta prima che diventi un
// elenco. Oltre, il resto si conta e si manda in Abitudini.
const MAX_RIGHE = 5;

// L'ora da cui «dopo» non esiste più: quello che resta è tutto prioritario.
const ORA_SERA = 20;

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
      el("div", { class: "og-col og-col-sx" }, [cartaFinanze(q)]),
      el("div", { class: "og-col og-col-centro" }, [cartaResta(q, () => disegna())]),
      el("div", { class: "og-col og-col-dx" }, [cartaCostanza(q)]),
      el("div", { class: "og-col og-col-sotto" }, [cartaModuli(q)]),
    ]),
  ]);
}

/** Tutto quello che serve a decidere cosa dire, calcolato una volta sola. */
function quadro(schede) {
  const conDati = schede.filter((s) => s.dati);
  const fatti = conDati.filter((s) => s.dati.fatto === true);
  const ora = new Date().getHours();

  // La checklist unica: le voci arrivano già pronte dai moduli, che sanno
  // cosa vuol dire «resta» per sé. La home le impila e basta.
  const resta = [];
  for (const s of conDati) for (const v of s.dati.resta || []) resta.push({ ...v, mod: s.mod });
  const peso = { tardi: 0, adesso: 1, presto: 2 };
  resta.sort((a, b) => (peso[a.quando] ?? 1) - (peso[b.quando] ?? 1));

  const prio = prioritarie(resta, ora);

  return {
    schede, conDati, fatti, resta, prio, ora,
    // Quello che resta oggi ma non adesso: si conta, non si elenca.
    dopo: resta.length - prio.length,
    inRitardo: prio.filter((v) => v.quando === "tardi"),
    allarme: conDati.map((s) => s.dati.allarme).find(Boolean) || null,
    serie: Math.max(0, ...conDati.map((s) => s.dati.serie || 0)),
    finanze: conDati.find((s) => s.mod.id === "finanze")?.dati || null,
  };
}

/**
 * Cosa merita una riga adesso.
 *
 * Non tutto quello che è di oggi è di adesso. La distinzione la fanno già i
 * moduli — una parte con una fascia oraria sa se è presto, se è il momento o
 * se il momento è passato — e qui si sfrutta: la checklist della home è la
 * fetta «adesso» di quella lista, non la lista.
 *
 * Restano fuori le abitudini senza un'ora: farle è una cosa che riguarda la
 * giornata intera, e metterle qui accanto a un integratore in ritardo dice
 * che pesano uguale. Non pesano uguale.
 */
function prioritarie(resta, ora) {
  // Di sera non c'è più un «dopo» in cui rimandare: torna tutto.
  if (ora >= ORA_SERA) return resta;
  return resta.filter((v) =>
    v.quando === "tardi" ||               // il momento è passato: è la voce che conta di più
    Boolean(v.apre) ||                    // la sessione: si fa, e ha una durata
    (Boolean(v.fascia) && v.quando === "adesso"), // l'integratore di questa fascia
  );
}

/* ------------------------------------------------------- l'intestazione -- */
/*
   Saluto al centro, data e stato in alto a destra, e sotto una riga sola di
   verdetto. Niente altro: l'avviso di Finanze stava qui e finiva per essere
   un secondo titolo largo mezzo schermo attaccato al saluto. Adesso sta
   dentro la carta Finanze, che è la carta di cui parla.

   Lo stato del sync vive qui e in Impostazioni: in cima a ogni modulo
   cambiava colore da solo in un punto diverso ogni volta, e un indicatore
   che lampeggia dove non te lo aspetti distrae invece di informare.
*/

function testa(q) {
  return el("header", { class: "og-testa" }, [
    el("div", { class: "og-meta" }, [
      el("span", { class: "og-meta-data", testo: dataLunga() }),
      el("span", { class: "og-meta-stato" }, [
        el("span", { class: "sync-pallino", "data-ruolo": "sync" }),
        el("span", { testo: "sincronizzato" }),
      ]),
    ]),
    el("h1", { class: "og-saluto" }, [
      el("span", { testo: `${saluto()}, ${NOME}` }),
      el("span", { class: "og-punto", testo: "." }),
    ]),
    el("p", { class: "og-verdetto", testo: verdetto(q) }),
  ]);
}

/**
 * La frase che riassume la giornata.
 *
 * Vince la prima regola che si applica. Il tono non colpevolizza mai: «ti
 * mancano due cose» è un fatto, «non hai fatto niente» è un giudizio, e
 * un'app che giudica si smette di aprirla.
 */
function verdetto(q) {
  const { prio, resta, inRitardo, fatti, conDati, dopo, ora } = q;

  if (!conDati.length) return "Non c'è ancora niente da guardare.";

  if (!resta.length) {
    return fatti.length ? "Hai chiuso tutto. Puoi staccare." : "Niente in programma oggi.";
  }
  if (inRitardo.length) {
    const nomi = elenco(inRitardo.slice(0, 2).map((v) => v.nome.toLowerCase()));
    return inRitardo.length === 1 ? `Ti è sfuggito ${nomi}.` : `Ti sono sfuggiti ${nomi}.`;
  }
  // Niente da fare adesso, ma la giornata non è chiusa: è una buona notizia
  // e va detta come tale, senza far sparire il resto.
  if (!prio.length) {
    return `Adesso sei in pari. ${plurale(dopo, "cosa", "cose")} più avanti nella giornata.`;
  }
  if (ora >= 21) return `${plurale(prio.length, "cosa", "cose")} e hai chiuso la giornata.`;
  return `${plurale(prio.length, "cosa", "cose")} da fare adesso.`;
}

const elenco = (n) => n.length === 1 ? n[0] : `${n.slice(0, -1).join(", ")} e ${n[n.length - 1]}`;

/* -------------------------------------------------------------- la carta */
/*
   Il mattone. Tutte le carte della home passano di qui, ed è quello che le
   fa sembrare parte della stessa cosa invece che cinque riquadri disegnati
   in cinque momenti diversi.
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
   andare. Integratori in ritardo, integratori di questa fascia e sessione
   di mobilità nella stessa lista: «cosa mi resta adesso» è una domanda sola,
   e finché la risposta stava in due schermate diverse bisognava aprirle
   tutte e due.
*/

function cartaResta(q, ridisegna) {
  // Tutto fatto davvero: non resta niente, né adesso né dopo.
  if (!q.resta.length) {
    return carta({
      emoji: "✅", nome: "Resta da fare", tinta: "var(--ok)", classe: "og-vuota",
      corpo: el("p", { class: "og-tuttofatto", testo:
        "Niente. Hai spuntato tutto quello che c'era oggi." }),
    });
  }

  // In pari adesso, ma la giornata continua. Non è la stessa cosa di sopra e
  // non va detta allo stesso modo: qui c'è ancora roba, solo non ora.
  if (!q.prio.length) {
    return carta({
      emoji: "🌤️", nome: "Resta da fare", tinta: "var(--ok)", classe: "og-vuota",
      corpo: [
        el("p", { class: "og-tuttofatto", testo:
          `Adesso non ti tocca niente. ${plurale(q.dopo, "cosa aspetta", "cose aspettano")} più avanti.` }),
        collegamentoAbitudini(q.dopo),
      ],
    });
  }

  const mostrate = q.prio.slice(0, MAX_RIGHE);
  const nascoste = (q.prio.length - mostrate.length) + q.dopo;

  return carta({
    emoji: "📋", nome: "Adesso", valore: q.prio.length,
    tinta: "var(--accento)", classe: "og-resta",
    corpo: [
      el("ul", { class: "og-lista" }, mostrate.map((v) => voce(v, ridisegna))),
      nascoste > 0 && collegamentoAbitudini(nascoste),
    ],
  });
}

function voce(v, ridisegna) {
  const b = el("button", {
    class: `og-voce ${v.quando === "tardi" ? "tardi" : ""}`.trim(),
    type: "button",
    "aria-label": v.apre ? `Apri ${v.nome}` : `Segna ${v.nome}`,
    onClick: async () => {
      // Una sessione non si spunta, si fa: toccarla apre il player e il
      // cerchietto si riempie da sé quando è finita.
      if (v.apre) { location.hash = v.apre; return; }
      const mod = await prendiModulo(v.mod.id);
      // Parte e abitudine intera sono due chiamate diverse. La versione
      // precedente le univa con un `??`, e per un'abitudine senza parti
      // finiva a spuntare la parte `null`: la spunta veniva scritta sotto
      // la chiave `<id>#null`, che non è quella che nessuno rilegge. Il
      // tocco sembrava non fare niente.
      if (v.parteId) mod?.spuntaParte?.(v.habitId, v.parteId);
      else mod?.spunta?.(v.habitId);
      tocco(12);
      ridisegna();
    },
  }, [
    el("span", { class: "og-voce-cerchio", html: icona("spunta", 13, 3) }),
    el("span", { class: "og-voce-testo" }, [
      el("span", { class: "og-voce-nome", testo: v.nome }),
      v.dentro && el("span", { class: "og-voce-dentro", testo: v.dentro }),
    ]),
    el("span", { class: "og-voce-quando",
      testo: v.quando === "tardi" ? "in ritardo" : (v.nomeFascia || "") }),
    v.apre && el("span", { class: "og-voce-freccia", html: icona("freccia", 14) }),
  ]);
  b.style.setProperty("--tinta", tintaDi(v.tint));
  return el("li", {}, [b]);
}

const collegamentoAbitudini = (n) => el("a", { class: "og-apri og-apri-piano", href: "#/abitudini" }, [
  el("span", { testo: `Altre ${n} in Abitudini` }),
  el("span", { html: icona("freccia", 14) }),
]);

/* ------------------------------------------------------------ 2. FINANZE */
/*
   Tre numeri e nient'altro: quanto è uscito oggi, quanto resta, cosa sta per
   uscire. Sono le tre domande che si fanno davanti a una cena fuori.

   L'avviso sta qui e non nell'intestazione: parla di soldi, e messo sotto il
   saluto era un cartello grigio largo mezzo schermo che si leggeva prima del
   numero di cui è la nota a piè di pagina.
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
        soldiVoce("Oggi", f.spesoOggi ?? "0 €"),
        soldiVoce("Al giorno", f.alGiorno ?? "—"),
        soldiVoce(f.prossima ? f.prossima.quando : "In arrivo",
          f.prossima ? f.prossima.importo : "niente",
          f.prossima ? f.prossima.nome : null),
      ]),
      q.allarme && el("p", { class: "og-soldi-avviso" }, [
        el("span", { class: "og-soldi-punto" }),
        el("span", { testo: q.allarme }),
      ]),
      el("a", { class: "og-apri", href: "#/finanze" }, [
        el("span", { testo: "Apri Finanze" }),
        el("span", { html: icona("freccia", 14) }),
      ]),
    ],
  });
}

const soldiVoce = (eti, num, nota) => el("div", { class: "og-soldi-voce" }, [
  el("span", { class: "og-soldi-eti", testo: eti }),
  el("span", { class: "og-soldi-num", testo: num }),
  nota && el("span", { class: "og-soldi-nota", testo: nota }),
]);

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

/* ----------------------------------------------------------- 3. COSTANZA */
/*
   Serie e settimana erano due carte, ed erano la stessa carta: «3 giorni di
   fila» e «3 giorni su 7» rispondono tutte e due a «sto tenendo il ritmo?»,
   con lo stesso numero, a due centimetri di distanza. Due riquadri che
   dicono la stessa cosa non la dicono due volte più forte — si annullano,
   perché chi legge si chiede in che cosa differiscono invece di leggerli.

   Qui il numero è la serie, la striscia è la settimana, e la striscia
   spiega il numero: le sette caselle sono il PERCHÉ della serie, non un
   secondo dato. La frase sotto è l'unica cosa che cambia tono.
*/

function cartaCostanza(q) {
  const giorni = ultimiGiorni(7).reverse();
  const oggi = giornoCorrente();
  const attivi = giorni.filter(({ fatti }) => Object.keys(fatti).length).length;
  const n = q.serie;

  return carta({
    emoji: "🔥", nome: "Costanza", valore: `${attivi}/7`, tinta: "var(--arancio)",
    classe: "og-costanza",
    corpo: [
      el("div", { class: "og-serie-riga" }, [
        el("span", { class: "og-serie-cifra", testo: String(n) }),
        el("span", { class: "og-serie-eti",
          testo: n === 1 ? "giorno di fila" : "giorni di fila" }),
      ]),
      el("div", { class: "og-sett" }, giorni.map(({ giorno, fatti }) => {
        const quanti = Object.values(fatti).reduce((k, m) => k + Object.keys(m).length, 0);
        const d = new Date(`${giorno}T12:00:00`);
        return el("div", {
          class: "og-sett-g" + (quanti ? " pieno" : "") + (giorno === oggi ? " oggi" : ""),
          title: `${dataUmana(giorno)} · ${quanti ? plurale(quanti, "cosa segnata", "cose segnate") : "niente"}`,
        }, [
          el("span", { class: "og-sett-punto" }),
          el("span", { class: "og-sett-lettera", testo: GIORNI_INIZIALI[(d.getDay() + 6) % 7] }),
        ]);
      })),
      el("p", { class: "og-nota", testo: fraseSerie(n, q.resta.length === 0) }),
    ],
  });
}

/* ------------------------------------------------------------ 5. I MODULI */
/*
   Lo stato dei tre moduli, in una striscia sola sotto le carte. Non tessere
   grandi: qui non si decide niente, si controlla soltanto, e il controllo
   costa una riga. Sta in fondo e larga quanto la griglia perché è la
   chiusura del cruscotto, non uno dei suoi pannelli.
*/

function cartaModuli(q) {
  const righe = q.schede.filter((s) => s.mod.id !== "oggi" && s.mod.id !== "impostazioni");
  if (!righe.length) return null;

  return carta({
    emoji: "🧭", nome: "I moduli", tinta: "var(--indaco)", classe: "og-moduli",
    corpo: el("ul", { class: "og-modlista" }, righe.map((s) => {
      const d = s.dati;
      const a = el("a", { class: "og-modriga", href: d?.azione?.rotta || `#/${s.mod.id}` }, [
        el("span", { class: "og-modicona", html: icona(s.mod.icona, 18) }),
        el("span", { class: "og-modnome", testo: s.mod.nome }),
        el("span", { class: `og-modstato ${d?.fatto === true ? "ok" : d?.fatto === false ? "avviso" : ""}`.trim(),
          testo: d ? String(d.valore ?? "—") : "—" }),
        el("span", { class: "og-modfreccia", html: icona("freccia", 14) }),
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
