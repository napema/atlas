// moduli/oggi — la home. È la ragione per cui i tre tracker diventano uno.
//
// Non ha dati propri: chiede agli altri moduli `oggi()` e impagina le
// risposte.
//
// SCELTA DI FONDO: i tre riquadri ci sono SEMPRE, anche vuoti, anche di un
// modulo ancora da portare. Una home che nasconde ciò che non ha dati
// cambia forma ogni giorno, e una cosa che cambia forma non si impara a
// leggere con la coda dell'occhio — che è l'unico modo in cui una home
// viene davvero letta. Meglio tre caselle sempre nello stesso posto, una
// delle quali oggi dice "niente".

import { MODULI_DATI, prendiModulo } from "../../core/registro.js";
import { el, intestazione } from "../../core/ui.js";
import { icona } from "../../core/icone.js";
import { ascolta, EVENTI } from "../../core/bus.js";
import { ridisegna as rimonta } from "../../core/router.js";
import { giornoDellaSettimana, NOMI_GIORNI, fattiDelGiorno } from "../../core/contesto.js";

const SALUTI = [[5, "Buonanotte"], [13, "Buongiorno"], [18, "Buon pomeriggio"], [24, "Buonasera"]];
const saluto = () => SALUTI.find(([h]) => new Date().getHours() < h)?.[1] || "Ciao";

const dataLunga = () =>
  new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });

/**
 * Un riquadro. Tre stati, e si distinguono a colpo d'occhio:
 *   pieno    — il modulo ha risposto: c'è un numero
 *   in pace  — il modulo funziona e oggi non ha niente da dire
 *   assente  — il modulo non è ancora stato portato
 */
function riquadro(voce, mod, dati) {
  const stato = !mod?.oggi ? "assente" : dati ? "pieno" : "in-pace";
  const rotta = dati?.azione?.rotta || `#/${voce.id}`;

  const q = el("a", { class: `riquadro stato-${stato}`, href: rotta }, [
    el("div", { class: "riquadro-testa" }, [
      el("span", { class: "riquadro-icona", html: icona(voce.icona, 20) }),
      el("span", { class: "riquadro-nome", testo: dati?.titolo || voce.nome }),
      dati?.urgente && el("span", { class: "bollo", "aria-label": "richiede attenzione" }),
    ]),
    el("div", { class: "riquadro-corpo" }, [
      stato === "pieno"
        ? el("div", { class: "riquadro-valore cifra", testo: String(dati.valore ?? "") })
        : el("div", { class: "riquadro-quieto", testo: stato === "assente" ? "in migrazione" : "tutto a posto" }),
      dati?.dettaglio && el("div", { class: "riquadro-nota", testo: dati.dettaglio }),
    ]),
  ]);
  q.style.setProperty("--accento", voce.accento);
  return q;
}

/** La riga sotto il saluto: cosa è già successo oggi, secondo la lavagna. */
function strisciaDelGiorno() {
  const fatti = fattiDelGiorno();
  const quanti = Object.values(fatti).reduce((n, m) => n + Object.keys(m).length, 0);
  const giorno = NOMI_GIORNI[giornoDellaSettimana()];
  return el("p", {
    class: "nota striscia",
    testo: quanti
      ? `${giorno} · ${quanti} ${quanti === 1 ? "cosa segnata" : "cose segnate"} finora`
      : `${giorno} · niente segnato, per ora`,
  });
}

let staccaAscoltatori = [];

export default {
  async monta(contenitore, posizione) {
    const testa = intestazione(saluto(), dataLunga());
    // L'ingranaggio non sta nella barra: le Impostazioni si aprono poche
    // volte all'anno e non meritano un quinto della barra per sempre.
    testa.append(el("a", {
      class: "bottone-icona",
      href: posizione.linkA("impostazioni"),
      "aria-label": "Impostazioni",
      html: icona("ingranaggio", 22),
    }));
    contenitore.append(testa);
    contenitore.append(strisciaDelGiorno());

    const griglia = el("div", { class: "riquadri" });
    contenitore.append(griglia);

    // In parallelo e tollerante: un modulo rotto non deve portarsi via la
    // home, che è la schermata che si apre più spesso di tutte.
    const esiti = await Promise.allSettled(MODULI_DATI.map(async (voce) => {
      const mod = await prendiModulo(voce.id);
      let dati = null;
      try { dati = mod?.oggi?.() || null; }
      catch (e) { console.error(`[oggi] "${voce.id}" non ha saputo rispondere`, e); }
      return { voce, mod, dati };
    }));

    // L'ordine è quello del registro, sempre. Nessun riordino per urgenza:
    // un riquadro che cambia posto è un riquadro che va riletto ogni volta.
    for (const e of esiti) {
      if (e.status !== "fulfilled") continue;
      griglia.append(riquadro(e.value.voce, e.value.mod, e.value.dati));
    }

    const urgenti = esiti.filter((e) => e.status === "fulfilled" && e.value.dati?.urgente);
    if (urgenti.length) {
      contenitore.append(el("p", {
        class: "nota",
        testo: urgenti.length === 1
          ? "Una cosa aspetta te, oggi."
          : `${urgenti.length} cose aspettano te, oggi.`,
      }));
    }

    // La home si ridisegna quando cambia il giorno, quando un modulo scrive
    // sulla lavagna, o quando il sync porta roba nuova.
    //
    // Il ridisegno passa dal router e non si richiama `monta` da sé: solo il
    // router sa chiamare `smonta` prima, ed è lì che questi ascoltatori si
    // staccano. Rimontarsi da soli li lascerebbe attaccati, e a ogni giro
    // ce ne sarebbe uno in più — un ridisegno, poi due, poi quattro.
    let attesa = null;
    const suEvento = () => {
      if (!location.hash.startsWith("#/oggi")) return;   // non siamo più qui
      clearTimeout(attesa);
      attesa = setTimeout(rimonta, 120);                 // gli eventi arrivano a raffiche
    };
    staccaAscoltatori = [
      () => clearTimeout(attesa),
      ascolta(EVENTI.GIORNO_CAMBIATO, suEvento),
      ascolta(EVENTI.FATTO_SCRITTO, suEvento),
      ascolta(EVENTI.DATI_ARRIVATI, suEvento),
    ];
  },

  smonta() {
    for (const stacca of staccaAscoltatori) stacca();
    staccaAscoltatori = [];
  },
};
