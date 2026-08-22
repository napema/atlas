// moduli/oggi — la home.
//
// Non è un cruscotto. È quello che ti direbbe qualcuno che ha già guardato
// i numeri al posto tuo: una frase che riassume la giornata, la cosa da fare
// adesso, e sotto i tre numeri per chi vuole controllare.
//
// La differenza pratica: un cruscotto ti dà sei dati e ti lascia il lavoro
// di capire quale conta. Qui il lavoro è già fatto — la frase in cima dice
// se puoi stare tranquillo, e se non puoi dice esattamente cosa manca.
//
// Non ha dati propri: interroga gli altri moduli con `oggi()`.

import { MODULI_DATI, prendiModulo } from "../../core/registro.js";
import {
  el, aggiungi, plurale, euroGrande, tessera, gettone, tocco,
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

const SALUTI = [[5, "buonanotte"], [13, "buongiorno"], [18, "buon pomeriggio"], [22, "buonasera"], [24, "buonanotte"]];
const saluto = () => SALUTI.find(([h]) => new Date().getHours() < h)?.[1] || "ciao";

const dataLunga = () =>
  new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });

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

  const schede = esiti.filter((e) => e.status === "fulfilled").map((e) => e.value);
  const conDati = schede.filter((s) => s.dati);
  const daFare = conDati.filter((s) => s.dati.urgente || s.dati.fatto === false);
  const fatti = conDati.filter((s) => s.dati.fatto === true);

  // Una cosa da fare alla volta, e la più urgente. Prima la carta larga
  // mostrava TUTTE le cose da fare e sotto la griglia le rimostrava una per
  // una: la stessa frase due volte nella stessa schermata, che è il modo più
  // veloce per far smettere di leggere.
  const principale = daFare
    .slice()
    .sort((a, b) => Number(Boolean(b.dati.urgente)) - Number(Boolean(a.dati.urgente)))[0] || null;
  // I tre riquadri ci sono sempre, anche vuoti: quello promosso a carta
  // larga esce dalla griglia, gli altri restano. Una home che cambia forma
  // ogni giorno non si impara a leggere con la coda dell'occhio.
  const resto = schede.filter((s) => s !== principale);

  contenitore.replaceChildren();

  aggiungi(contenitore, [
    saluto_(),
    briefing(conDati, daFare, fatti),
    // I promemoria stanno SOPRA la carta: sono cose che scadono adesso e si
    // spuntano in un tocco, mentre la carta è un posto dove andare.
    cartaPromemoria(conDati, () => { disegna(); }),
    principale && cartaDaFare(principale.mod, principale.dati),
    resto.length > 0 && el("div", { class: "griglia-tessere" }, resto.map((s) => tesseraModulo(s.mod, s.dati))),
    strisciaSettimana(),
  ]);
}

/** Il saluto. Minuscolo e grande: è una persona che parla, non un'insegna. */
function saluto_() {
  return el("header", { class: "og-saluto-blocco" }, [
    el("h1", { class: "og-saluto" }, [
      el("span", { testo: saluto() }),
      el("span", { class: "og-punto", testo: "." }),
    ]),
    el("p", { class: "og-data" }, [
      el("span", { class: "sync-pallino", "data-ruolo": "sync" }),
      el("span", { testo: dataLunga() }),
    ]),
  ]);
}

/**
 * La frase che riassume la giornata.
 *
 * È la parte che fa la differenza fra un cruscotto e un'assistente: invece
 * di tre numeri messi in fila, una riga che dice cosa vuol dire averli.
 */
function briefing(conDati, daFare, fatti) {
  const f = fattiDelGiorno();
  let frase;
  let tono = "";

  if (!conDati.length) {
    frase = "Non c'è ancora niente da segnalare. Buona giornata.";
  } else if (!daFare.length) {
    frase = fatti.length
      ? `Tutto chiuso per oggi — ${plurale(fatti.length, "cosa fatta", "cose fatte")}. Puoi staccare.`
      : "Niente di urgente in programma.";
    tono = "sereno";
  } else {
    const nomi = daFare.map((s) => (s.dati.titolo || s.mod.nome).toLowerCase());
    const elenco = nomi.length === 1 ? nomi[0]
      : `${nomi.slice(0, -1).join(", ")} e ${nomi[nomi.length - 1]}`;
    const ora = new Date().getHours();
    // Il verbo concorda in tutti e due i rami: quello serale diceva "Ti manca
    // mobilità e abitudini".
    const verbo = nomi.length === 1 ? "manca" : "mancano";
    frase = ora >= 21
      ? `Ti ${verbo} ${elenco}. Si sta facendo tardi.`
      : `Ti ${verbo} ${elenco}.`;
    tono = ora >= 21 ? "sveglia" : "";
  }

  // Sotto la frase, i pochi numeri del giorno presi dalla lavagna: vengono
  // da lì e non dai moduli perché la lavagna è l'unico posto dove si legge
  // "cosa è successo oggi" senza sapere quali moduli esistono.
  const numeri = [];
  if (f.mobilita?.["durata-min"] != null) numeri.push([`${f.mobilita["durata-min"]}′`, "di mobilità"]);
  if (f.abitudini?.attese != null) numeri.push([`${f.abitudini.spuntate ?? 0}/${f.abitudini.attese}`, "abitudini"]);
  if (f.finanze?.speso != null) numeri.push([euroGrande(f.finanze.speso, { centesimi: false }), "spesi"]);

  return el("section", { class: `og-briefing ${tono}`.trim() }, [
    el("p", { class: "og-frase", testo: frase }),
    numeri.length > 0 && el("div", { class: "og-numeri" }, numeri.map(([v, e]) => el("div", { class: "og-numero" }, [
      el("span", { class: "cifra og-numero-cifra", html: v }),
      el("span", { class: "nota-2", testo: e }),
    ]))),
  ]);
}

/**
 * La carta di una cosa da fare: larga, con l'invito esplicito.
 * È l'unico elemento della home su cui si tocca per AGIRE invece che per
 * andare a guardare, e per questo è l'unico con un pulsante dentro.
 */
function cartaDaFare(mod, dati) {
  const c = el("a", { class: "og-carta", href: dati.azione?.rotta || `#/${mod.id}` }, [
    el("div", { class: "og-carta-testa" }, [
      el("span", { class: "og-carta-icona", html: icona(mod.icona, 18) }),
      el("span", { class: "og-carta-nome", testo: dati.titolo || mod.nome }),
    ]),
    el("div", { class: "og-carta-valore cifra", html: String(dati.valore ?? "") }),
    dati.dettaglio && el("p", { class: "og-carta-nota", testo: dati.dettaglio }),
    el("span", { class: "og-carta-invito" }, [
      el("span", { testo: dati.azione?.etichetta || "Apri" }),
      el("span", { html: icona("freccia", 15) }),
    ]),
  ]);
  c.style.setProperty("--tinta", mod.accento);
  return c;
}

/**
 * La tessera compatta di un modulo, nella griglia in basso.
 *
 * Regge i tre stati che la home deve saper distinguere: il modulo che non
 * c'è ancora (niente `oggi()`), quello che c'è e oggi non ha niente da dire
 * (`oggi()` torna null), e quello che ha un numero.
 */
function tesseraModulo(mod, dati) {
  if (!dati) {
    const inMigrazione = typeof mod.oggi !== "function";
    return tessera({
      nome: mod.nome,
      icona: mod.icona,
      micro: inMigrazione ? "in migrazione" : "a posto",
      tonoMicro: inMigrazione ? "" : "ok",
      cifra: inMigrazione ? "—" : "✓",
      coda: inMigrazione ? "non ancora dentro ATLAS" : "niente da segnalare oggi",
      frazione: inMigrazione ? 0 : 1,
      tinta: inMigrazione ? "var(--testo-4)" : mod.accento,
      azione: inMigrazione ? null : () => { location.hash = `#/`; },
    });
  }

  return tessera({
    nome: dati.titolo || mod.nome,
    icona: mod.icona,
    micro: dati.fatto === true ? "fatto" : dati.fatto === false ? "da fare" : null,
    tonoMicro: dati.fatto === true ? "ok" : dati.fatto === false ? "avviso" : "",
    cifra: String(dati.valore ?? "—"),
    coda: dati.dettaglio,
    // Niente riempimento finto: se il modulo non sa dire a che punto sei, la
    // barra resta vuota. Un 8% messo lì per "far vedere qualcosa" è un dato
    // inventato, e su una barra non si distingue da uno vero.
    frazione: typeof dati.avanzamento === "number" ? dati.avanzamento : (dati.fatto === true ? 1 : 0),
    tinta: mod.accento,
    azione: () => { location.hash = dati.azione?.rotta || `#/`; },
  });
}

/**
 * Gli ultimi sette giorni. Non dice COSA hai fatto — per quello ci sono i
 * moduli — dice se ci sei stato, che è la domanda a cui un tracker deve
 * rispondere per prima.
 */
function strisciaSettimana() {
  const giorni = ultimiGiorni(7).reverse();
  const oggi = giornoCorrente();
  const attivi = giorni.filter(({ fatti }) => Object.keys(fatti).length).length;

  return el("section", { class: "scheda og-settimana" }, [
    el("div", { class: "og-settimana-testa" }, [
      el("div", {}, [
        el("span", { class: "micro", testo: "Costanza" }),
        // «Ultimi sette giorni · 2 su 7» non diceva 2 su 7 DI COSA. Sette
        // barrette senza legenda si guardano e si lasciano perdere.
        el("p", { class: "nota og-settimana-nota", testo: attivi === 0
          ? "Negli ultimi sette giorni non hai segnato niente."
          : `Hai segnato qualcosa in ${plurale(attivi, "giorno", "giorni")} su 7.` }),
      ]),
      el("span", { class: "cifra cifra-s", testo: `${attivi}/7` }),
    ]),
    el("div", { class: "og-sett-riga" }, giorni.map(({ giorno, fatti }) => {
      const quanti = Object.values(fatti).reduce((n, m) => n + Object.keys(m).length, 0);
      const d = new Date(`${giorno}T12:00:00`);
      return el("div", {
        class: "og-sett-giorno" + (quanti ? " pieno" : "") + (giorno === oggi ? " oggi" : ""),
        title: `${dataUmana(giorno)} · ${quanti ? plurale(quanti, "cosa segnata", "cose segnate") : "niente"}`,
      }, [
        el("span", { class: "og-sett-lettera", testo: GIORNI_INIZIALI[(d.getDay() + 6) % 7] }),
        el("span", { class: "og-sett-punto" }),
      ]);
    })),
  ]);
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

/* ------------------------------------------------------- i promemoria ---
   Le cose piccole che scadono ADESSO, non oggi.

   Nasce dagli integratori: quattro pastiglie in tre momenti diversi della
   giornata. «Ti mancano 4 integratori» alle dieci di sera è inutile — tre
   di quelle quattro erano da prendere stamattina e ormai è andata. Quello
   che serve è «prendi il magnesio», e solo quello.

   La card compare solo se c'è qualcosa da prendere adesso, e sparisce
   appena è spuntato: è l'unico elemento della home che ha il permesso di
   apparire e sparire, perché non è un dato, è una sveglia.
*/

function cartaPromemoria(schede, ridisegna) {
  const voci = [];
  for (const s of schede) {
    for (const p of s.dati?.promemoria || []) voci.push({ ...p, mod: s.mod });
  }
  if (!voci.length) return null;

  // Le fasce si nominano una volta sola anche quando ne contengono tre: la
  // riga «Sera» sopra tre pastiglie si legge, ripetuta tre volte no.
  const perFascia = new Map();
  for (const v of voci) {
    if (!perFascia.has(v.nomeFascia)) perFascia.set(v.nomeFascia, []);
    perFascia.get(v.nomeFascia).push(v);
  }

  const c = el("section", { class: "og-promemoria" }, [
    el("div", { class: "og-prom-testa" }, [
      el("span", { class: "og-prom-icona", html: icona("campanella", 16) }),
      el("span", { class: "micro", testo: voci.length === 1 ? "Adesso" : `Adesso · ${voci.length}` }),
    ]),

    ...[...perFascia].map(([fascia, elenco]) => el("div", { class: "og-prom-gruppo" }, [
      el("div", { class: "og-prom-fascia", testo: fascia }),
      el("ul", { class: "og-prom-lista" }, elenco.map((v) => {
        const b = el("button", {
          class: "og-prom-voce", type: "button",
          "aria-label": `Segna ${v.nome}`,
          onClick: () => {
            alternaParteDiAbitudine(v.habitId, v.parteId);
            tocco(12);
            ridisegna();
          },
        }, [
          el("span", { class: "og-prom-cerchio", html: icona("spunta", 13, 3) }),
          el("span", { class: "og-prom-nome", testo: v.nome }),
          el("span", { class: "og-prom-da", testo: v.abitudine }),
        ]);
        b.style.setProperty("--tinta", v.tint ? `var(--${TINTA_CSS[v.tint] || "blu"})` : "var(--accento)");
        return el("li", {}, [b]);
      })),
    ])),
  ]);
  return c;
}

// Le tinte delle abitudini hanno nomi inglesi nei dati di partenza. La
// tabella sta qui e non in Abitudini perché la home non importa i moduli:
// legge `oggi()` e nient'altro.
const TINTA_CSS = {
  blue: "blu", green: "verde", red: "rosso", orange: "arancio", purple: "viola",
  pink: "rosa", yellow: "giallo", mint: "menta", indigo: "indaco",
};

/**
 * Spuntare una parte dalla home.
 *
 * È l'unico punto in cui la home SCRIVE in un modulo, e passa comunque dal
 * registro invece che da un import: `moduli/oggi` non conosce Abitudini, e
 * saldarli renderebbe impossibile caricarli pigramente.
 */
async function alternaParteDiAbitudine(habitId, parteId) {
  const mod = await prendiModulo("abitudini");
  mod?.spuntaParte?.(habitId, parteId);
}
