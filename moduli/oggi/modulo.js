// moduli/oggi — la home. È la ragione per cui i tre tracker diventano uno.
//
// Non ha dati propri: interroga gli altri moduli con `oggi()` e impagina le
// risposte. Ma non è un elenco di schede — quella era la prima versione, e
// tre riquadri identici in fila non dicono niente più di tre app aperte in
// fila. Qui c'è una gerarchia:
//
//   1. il saluto, grande, con la data
//   2. la riga del giorno: tre micro-numeri, colti con la coda dell'occhio
//   3. quello che manca, grande e toccabile
//   4. quello che è a posto, compatto
//   5. la settimana: sette pallini che dicono la costanza, non il dettaglio
//
// Il criterio: quello che è già a posto si stringe, quello che manca si
// allarga. Una home che dà lo stesso spazio a tutto costringe a leggerla
// tutta ogni volta.

import { MODULI_DATI, prendiModulo } from "../../core/registro.js";
import { el, aggiungi, anello, plurale, euro, GIORNI_INIZIALI, dataUmana } from "../../core/ui.js";
import { icona } from "../../core/icone.js";
import { ascolta } from "../../core/bus.js";
import { fattiDelGiorno, ultimiGiorni, giornoCorrente } from "../../core/contesto.js";

let contenitore = null;
const staccatori = [];

/**
 * Il gettone del disegno in corso.
 *
 * `disegna()` è asincrona perché deve caricare i moduli, e fra lo svuotamento
 * del contenitore e l'append c'è un `await`. Due chiamate ravvicinate — e ne
 * arrivano, perché la home ascolta tre eventi e il sync ne spara più d'uno
 * all'avvio — si intrecciano e appendono tutte e due: la schermata compariva
 * in doppia copia. Solo l'ultimo disegno partito ha il diritto di scrivere.
 */
let gettone = 0;

const SALUTI = [[5, "Buonanotte"], [13, "Buongiorno"], [18, "Buon pomeriggio"], [22, "Buonasera"], [24, "Buonanotte"]];
const saluto = () => SALUTI.find(([h]) => new Date().getHours() < h)?.[1] || "Ciao";

const dataLunga = () =>
  new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });

/* --------------------------------------------------------------- vista -- */

async function disegna() {
  if (!contenitore) return;
  const mio = ++gettone;

  // Tollerante di proposito: un modulo rotto non deve portarsi via la home,
  // che è la schermata che si apre più spesso di tutte.
  const esiti = await Promise.allSettled(MODULI_DATI.map(async (voce) => {
    const mod = await prendiModulo(voce.id);
    return { mod, dati: mod?.oggi?.() ?? null };
  }));

  // Nel frattempo è partito un disegno più recente, o la home è stata
  // smontata: questo non deve toccare niente.
  if (mio !== gettone || !contenitore) return;
  contenitore.replaceChildren();

  const schede = esiti.filter((e) => e.status === "fulfilled").map((e) => e.value);
  const conDati = schede.filter((s) => s.dati);
  const urgenti = conDati.filter((s) => s.dati.urgente);
  const tranquille = conDati.filter((s) => !s.dati.urgente);

  aggiungi(contenitore, [testata(conDati), rigaDelGiorno()]);

  if (!conDati.length) {
    contenitore.append(nienteAncora(schede));
  } else if (urgenti.length) {
    // C'è qualcosa da chiudere: quello prende tutto lo spazio, e il resto
    // si stringe in una riga di numeri — è contesto, non un invito.
    aggiungi(contenitore, [
      ...urgenti.map((s) => schedaGrande(s.mod, s.dati)),
      tranquille.length > 0 && el("div", { class: "og-riga" }, tranquille.map((s) => schedaPiccola(s.mod, s.dati))),
    ]);
  } else {
    // Niente di urgente: le schede restano larghe col loro dettaglio. Tre
    // numeri nudi non dicono più di tre app aperte in fila, e il dettaglio
    // ("3 giorni alla ricarica") è metà dell'informazione.
    aggiungi(contenitore, conDati.map((s) => schedaMedia(s.mod, s.dati)));
  }

  contenitore.append(strisciaSettimana());
}

function testata(conDati) {
  const urgenti = conDati.filter((s) => s.dati.urgente).length;
  const chiusi = conDati.filter((s) => s.dati.fatto).length;

  const sottotitolo = urgenti > 0
    ? `${plurale(urgenti, "cosa", "cose")} da chiudere`
    : chiusi > 0 ? `${plurale(chiusi, "cosa", "cose")} già a posto`
    : "Giornata appena cominciata";

  return el("header", { class: "og-testata" }, [
    el("div", { class: "og-data", testo: dataLunga() }),
    el("h1", { class: "og-saluto", testo: saluto() }),
    el("p", { class: `og-sommario${urgenti ? " urgente" : ""}` }, [
      el("span", { class: "sync-pallino", "data-ruolo": "sync" }),
      el("span", { testo: sottotitolo }),
    ]),
  ]);
}

/**
 * La riga del giorno: tre micro-numeri presi dalla lavagna condivisa.
 *
 * Vengono da lì e non dai moduli di proposito: la lavagna è l'unico posto
 * dove si può leggere "cosa è successo oggi" senza caricare tre moduli e
 * senza sapere quali esistono. È anche il pezzo che rende visibile a colpo
 * d'occhio la cosa che ATLAS fa e le tre app separate non facevano.
 */
function rigaDelGiorno() {
  const f = fattiDelGiorno();
  const voci = [];

  if (f.mobilita?.["durata-min"] != null) {
    voci.push({ icona: "corpo", valore: `${f.mobilita["durata-min"]}′`, etichetta: "mobilità" });
  }
  if (f.abitudini?.attese != null) {
    voci.push({ icona: "spunta", valore: `${f.abitudini.spuntate ?? 0}/${f.abitudini.attese}`, etichetta: "abitudini" });
  }
  if (f.finanze?.speso != null) {
    voci.push({ icona: "portafoglio", valore: euro(f.finanze.speso, { tondo: true }), etichetta: "speso oggi" });
  }

  if (!voci.length) return el("div", { hidden: true });

  return el("div", { class: "og-giorno" }, voci.map((v) => el("div", { class: "og-giorno-voce" }, [
    el("span", { class: "og-giorno-icona", html: icona(v.icona, 16) }),
    el("span", { class: "og-giorno-valore num", testo: v.valore }),
    el("span", { class: "og-giorno-etichetta", testo: v.etichetta }),
  ])));
}

/**
 * Gli ultimi sette giorni: un pallino per giorno, pieno se qualcosa è
 * successo. Non dice cosa — per quello ci sono i moduli — dice se ci sei
 * stato, che è la domanda a cui un tracker deve rispondere per primo.
 */
function strisciaSettimana() {
  const giorni = ultimiGiorni(7).reverse();
  const oggi = giornoCorrente();

  const pallini = giorni.map(({ giorno, fatti }) => {
    const quanti = Object.values(fatti).reduce((n, m) => n + Object.keys(m).length, 0);
    const d = new Date(`${giorno}T12:00:00`);
    return el("div", {
      class: "og-sett-giorno" + (quanti ? " pieno" : "") + (giorno === oggi ? " oggi" : ""),
      title: `${dataUmana(giorno)} · ${quanti ? plurale(quanti, "cosa segnata", "cose segnate") : "niente"}`,
    }, [
      el("span", { class: "og-sett-lettera", testo: GIORNI_INIZIALI[(d.getDay() + 6) % 7] }),
      el("span", { class: "og-sett-punto" }),
    ]);
  });

  const attivi = giorni.filter(({ fatti }) => Object.keys(fatti).length).length;

  return el("section", { class: "og-settimana" }, [
    el("div", { class: "og-settimana-testa" }, [
      el("span", { class: "etichetta-riga", testo: "Ultimi sette giorni" }),
      el("span", { class: "nota num", testo: `${attivi} su 7` }),
    ]),
    el("div", { class: "og-sett-riga" }, pallini),
  ]);
}

/* --------------------------------------------------------- le tre forme -- */

/** Quello che manca: grande, con il numero in evidenza e la via d'uscita. */
function schedaGrande(mod, dati) {
  const s = el("a", { class: "og-grande", href: dati.azione?.rotta || `#/${mod.id}` }, [
    el("div", { class: "og-grande-testa" }, [
      el("span", { class: "og-icona", html: icona(mod.icona, 20) }),
      el("span", { class: "og-nome", testo: dati.titolo || mod.nome }),
      el("span", { class: "og-freccia", html: icona("freccia", 18) }),
    ]),
    dati.valore != null && el("div", { class: "og-valore cifra", testo: String(dati.valore) }),
    dati.dettaglio && el("div", { class: "og-dettaglio", testo: dati.dettaglio }),
    dati.azione?.etichetta && el("span", { class: "og-invito", testo: dati.azione.etichetta }),
  ]);
  s.style.setProperty("--accento", mod.accento);
  return s;
}

/**
 * La forma normale: nome e stato in alto, contesto sotto.
 * Se il modulo dichiara `fatto: true` compare la spunta — la differenza fra
 * fatto e da fare deve leggersi prima del numero, non dopo.
 */
function schedaMedia(mod, dati) {
  const s = el("a", { class: `og-media${dati.fatto ? " fatto" : ""}`, href: dati.azione?.rotta || `#/${mod.id}` }, [
    el("span", { class: "og-icona", html: icona(mod.icona, 20) }),
    el("div", { class: "og-media-testo" }, [
      el("div", { class: "og-media-alto" }, [
        el("span", { class: "og-nome", testo: dati.titolo || mod.nome }),
        el("span", { class: "og-media-valore cifra" }, [
          dati.fatto === true && el("span", { class: "og-spunta", html: icona("spunta", 15, 2.6) }),
          el("span", { testo: String(dati.valore ?? "—") }),
        ]),
      ]),
      dati.dettaglio && el("div", { class: "og-dettaglio", testo: dati.dettaglio }),
    ]),
    el("span", { class: "og-freccia", html: icona("freccia", 16) }),
  ]);
  s.style.setProperty("--accento", mod.accento);
  return s;
}

/** Quello che è a posto quando c'è altro di urgente: solo il numero. */
function schedaPiccola(mod, dati) {
  const s = el("a", { class: `og-piccola${dati.fatto ? " fatto" : ""}`, href: dati.azione?.rotta || `#/${mod.id}` }, [
    el("span", { class: "og-icona", html: icona(mod.icona, 18) }),
    el("span", { class: "og-piccola-valore cifra", testo: String(dati.valore ?? "—") }),
    el("span", { class: "og-piccola-nome", testo: dati.titolo || mod.nome }),
  ]);
  s.style.setProperty("--accento", mod.accento);
  return s;
}

/**
 * Il caso in cui nessun modulo ha niente da dire.
 *
 * Non è un errore ed è importante che non lo sembri: all'una di notte, con
 * tutto fatto, la home DEVE essere vuota. Quello che si mostra qui sono le
 * scorciatoie per cominciare, non un messaggio di errore.
 */
function nienteAncora(schede) {
  return el("div", { class: "og-vuoto" }, [
    el("div", { class: "og-vuoto-anello" }, [
      anello(1, { misura: 64, spessore: 5, colore: "var(--verde)" }),
      el("span", { class: "og-vuoto-spunta", html: icona("spunta", 26, 2.4) }),
    ]),
    el("p", { class: "og-vuoto-titolo", testo: "Tutto a posto" }),
    el("p", { class: "nota", testo: "Niente da segnalare per oggi." }),
    el("div", { class: "og-scorciatoie" }, schede.map(({ mod }) => {
      const b = el("a", { class: "og-scorciatoia", href: `#/${mod.id}` }, [
        el("span", { class: "og-icona", html: icona(mod.icona, 22) }),
        el("span", { testo: mod.nome }),
      ]);
      b.style.setProperty("--accento", mod.accento);
      return b;
    })),
  ]);
}

/* ------------------------------------------------------------ contratto -- */

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
