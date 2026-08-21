// moduli/oggi — la home. È la ragione per cui i tre tracker diventano uno.
//
// Non ha dati propri: interroga gli altri moduli con `oggi()` e impagina le
// risposte. Ma non è un elenco di schede — quella era la prima versione, e
// tre riquadri identici in fila non dicono niente più di tre app aperte in
// fila. Qui c'è una gerarchia:
//
//   1. il saluto, grande, con la data. Dice che l'app ti ha riconosciuto
//   2. LA COSA, se ce n'è una: il numero singolo che decide la giornata
//   3. quello che manca, in chiaro e toccabile
//   4. tutto il resto, compatto, per chi vuole guardarlo
//
// Il criterio: quello che è già a posto si stringe, quello che manca si
// allarga. Una home che dà lo stesso spazio a tutto costringe a leggerla
// tutta ogni volta.

import { MODULI_DATI, prendiModulo } from "../../core/registro.js";
import { el, aggiungi, anello, plurale } from "../../core/ui.js";
import { icona } from "../../core/icone.js";
import { ascolta } from "../../core/bus.js";
import { fattiDelGiorno } from "../../core/contesto.js";

let contenitore = null;
const staccatori = [];

const SALUTI = [[5, "Buonanotte"], [13, "Buongiorno"], [18, "Buon pomeriggio"], [22, "Buonasera"], [24, "Buonanotte"]];
const saluto = () => SALUTI.find(([h]) => new Date().getHours() < h)?.[1] || "Ciao";

const dataLunga = () =>
  new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });

/* --------------------------------------------------------------- vista -- */

async function disegna() {
  if (!contenitore) return;
  contenitore.replaceChildren();

  // Tollerante di proposito: un modulo rotto non deve portarsi via la home,
  // che è la schermata che si apre più spesso di tutte.
  const esiti = await Promise.allSettled(MODULI_DATI.map(async (voce) => {
    const mod = await prendiModulo(voce.id);
    return { mod, dati: mod?.oggi?.() ?? null, definita: typeof mod?.oggi === "function" };
  }));

  const schede = esiti.filter((e) => e.status === "fulfilled").map((e) => e.value);
  const conDati = schede.filter((s) => s.dati);
  const urgenti = conDati.filter((s) => s.dati.urgente);
  const tranquille = conDati.filter((s) => !s.dati.urgente);

  aggiungi(contenitore, [testata(conDati)]);

  if (!conDati.length) {
    contenitore.append(nienteAncora(schede));
    return;
  }

  if (urgenti.length) {
    // C'è qualcosa da chiudere: quello prende tutto lo spazio, e il resto
    // si stringe in una riga di numeri — è contesto, non un invito.
    aggiungi(contenitore, [
      ...urgenti.map((s) => schedaGrande(s.mod, s.dati)),
      tranquille.length > 0 && el("div", { class: "og-riga" }, tranquille.map((s) => schedaPiccola(s.mod, s.dati))),
    ]);
    return;
  }

  // Niente di urgente. Le schede restano larghe con il loro dettaglio: una
  // home fatta di tre numeri nudi non dice più di tre app aperte in fila, e
  // il dettaglio ("3 giorni alla ricarica") è metà dell'informazione.
  aggiungi(contenitore, conDati.map((s) => schedaMedia(s.mod, s.dati)));
}

/**
 * La testata: saluto grande, data, e una riga che riassume la giornata.
 *
 * Il riassunto viene dalla lavagna condivisa, non dai moduli: è l'unico
 * posto dove si può dire "tre cose fatte, una manca" senza sapere quali
 * moduli esistono.
 */
function testata(conDati) {
  const urgenti = conDati.filter((s) => s.dati.urgente).length;
  const fatti = fattiDelGiorno();
  const quanti = Object.values(fatti).reduce((n, m) => n + Object.keys(m).length, 0);

  const sottotitolo = urgenti > 0
    ? `${plurale(urgenti, "cosa", "cose")} da chiudere`
    : quanti > 0 ? "Giornata in ordine"
    : "Non c'è ancora niente segnato";

  return el("header", { class: "og-testata" }, [
    el("div", { class: "og-data", testo: dataLunga() }),
    el("h1", { class: "og-saluto", testo: saluto() }),
    el("p", { class: `og-sommario${urgenti ? " urgente" : ""}` }, [
      el("span", { class: "sync-pallino", "data-ruolo": "sync" }),
      el("span", { testo: sottotitolo }),
    ]),
  ]);
}

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
  ]);
  s.style.setProperty("--accento", mod.accento);
  return s;
}

/**
 * La forma normale: numero a sinistra, contesto a destra, tutta la riga.
 * Il numero è grande abbastanza da leggersi con la coda dell'occhio, il
 * dettaglio abbastanza piccolo da non competerci.
 */
function schedaMedia(mod, dati) {
  const s = el("a", { class: "og-media", href: dati.azione?.rotta || `#/${mod.id}` }, [
    el("span", { class: "og-icona", html: icona(mod.icona, 20) }),
    el("div", { class: "og-media-testo" }, [
      el("div", { class: "og-media-alto" }, [
        el("span", { class: "og-nome", testo: dati.titolo || mod.nome }),
        el("span", { class: "og-media-valore cifra", testo: String(dati.valore ?? "—") }),
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
  const s = el("a", { class: "og-piccola", href: dati.azione?.rotta || `#/${mod.id}` }, [
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
