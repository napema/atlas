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
  el, aggiungi, plurale, euroGrande, tessera, gettone,
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
    frase = ora >= 21
      ? `Ti manca ${elenco}. Si sta facendo tardi.`
      : `Ti ${nomi.length === 1 ? "manca" : "mancano"} ${elenco}.`;
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
      el("span", { class: "micro", testo: "Ultimi sette giorni" }),
      el("span", { class: "nota num", testo: `${attivi} su 7` }),
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

  // Nessun tasto tondo: dalla home l'azione dipende da cosa manca, e ce
  // l'hanno già le carte. Un pulsante generico qui non saprebbe cosa fare.
  azionePrincipale: () => null,
};
