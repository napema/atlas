// moduli/mobilita/impostazioni.js — la sezione "Mobilità" di #/impostazioni.
//
// È l'unica parte di Mobilità che ATLAS ha scritto da sé: nell'app di
// partenza le impostazioni erano una scheda della barra in basso, qui sono
// una sezione della schermata comune insieme a quelle degli altri moduli.
//
// Tutto il resto del modulo arriva dal riferimento senza modifiche.

import { el, lista, riga, pillole, avviso, dataUmana, oggiISO } from "../../core/ui.js";
import { stato, sessioniVive, scriviMeta, segnaGiorno, TIPI_SESSIONE } from "./dati.js";
import { getState } from "./ponte.js";
import { settimanaEffettiva } from "./sessione.js";

export function vistaImpostazioni(ridisegna, apriOverlay) {
  const s = stato();
  const p = s.meta.programma;
  const a = s.meta.assessment;
  const sessioni = sessioniVive();

  const NOMI_GIORNI = ["lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato", "domenica"];

  return el("div", {}, [
    // --- il programma
    el("section", { class: "scheda" }, [
      el("div", { class: "scheda-titolo" }, [el("span", { testo: "Il programma" })]),
      el("div", { class: "riquadri" }, [
        el("div", { class: "riquadro" }, [
          el("div", { class: "micro", testo: "Settimana" }),
          el("div", { class: "cifra", testo: String(settimanaEffettiva(getState())) }),
          el("div", { class: "nota", testo: "effettiva" }),
        ]),
        el("div", { class: "riquadro" }, [
          el("div", { class: "micro", testo: "Sessioni" }),
          el("div", { class: "cifra", testo: String(sessioni.length) }),
          el("div", { class: "nota", testo: "in totale" }),
        ]),
      ]),
      el("p", { class: "nota", testo:
        "La settimana effettiva non è quella del calendario: sale solo se il blocco precedente è stato fatto almeno al 70% dei giorni. " +
        "È il controllo che impedisce di ritrovarsi venti minuti sullo schermo con la stessa sensazione del primo giorno." }),
      p.inizioProgramma
        ? el("p", { class: "nota", testo: `Iniziato il ${dataUmana(p.inizioProgramma)}.` })
        : el("button", {
            class: "btn tenue pieno", type: "button", testo: "Fai partire il programma da oggi",
            onClick: () => { scriviMeta((m) => { m.programma.inizioProgramma = oggiISO(); }); avviso("Programma avviato."); ridisegna(); },
          }),
    ]),

    // --- il giorno di palestra
    el("section", { class: "scheda" }, [
      el("div", { class: "scheda-titolo" }, [el("span", { testo: "Giorno di palestra" })]),
      pillole(NOMI_GIORNI.map((n, i) => [String(i), n.slice(0, 3)]), String(p.giornoPalestra ?? 2),
        (v) => { scriviMeta((m) => { m.programma.giornoPalestra = Number(v); }); avviso("Salvato."); ridisegna(); }),
      el("p", { class: "nota", testo:
        "In quel giorno l'app propone la sessione sotto carico invece del quotidiano. Non il giorno dopo le gambe: è allenamento vero, non mobilità." }),
    ]),

    // --- l'aggancio
    el("section", { class: "scheda" }, [
      el("div", { class: "scheda-titolo" }, [el("span", { testo: "L'aggancio" })]),
      el("input", { class: "campo", type: "text", value: p.aggancio || "",
        placeholder: "Subito dopo la doccia serale",
        onChange: (e) => { scriviMeta((m) => { m.programma.aggancio = e.target.value; }); avviso("Salvato."); } }),
      el("p", { class: "nota", testo:
        "Un'abitudine attaccata a una cosa che fai già regge molto più di una attaccata a un orario. Uno solo, e sempre lo stesso." }),
    ]),

    // --- l'assessment
    el("section", { class: "scheda" }, [
      el("div", { class: "scheda-titolo" }, [el("span", { testo: "Assessment" })]),
      lista([
        riga({ etichetta: "Completato", valore: a.completato ? "sì" : "no", tono: a.completato ? "positivo" : "" }),
        riga({ etichetta: "Lato lateralizzato", valore: a.esitoTest2?.latoLateralizzato?.toUpperCase() || "non rilevato" }),
        riga({ etichetta: "Baseline fotografica", valore: a.baselineTest3?.completatoIl ? dataUmana(a.baselineTest3.completatoIl) : "mai fatta" }),
      ]),
      el("p", { class: "nota", testo:
        "L'assessment risulta completato con la sola lateralizzazione: è uno stato reale, non un dato rotto. " +
        "Il programma parte lo stesso, e i test mancanti si possono fare dopo senza ricominciare." }),
      // Mancava del tutto: l'assessment c'era nei dati e non c'era modo di
      // aprirlo. Sono i tre test da cui il programma prende la
      // lateralizzazione e le foto di riferimento.
      el("button", {
        class: "btn tenue pieno", type: "button",
        testo: a.completato ? "Rifai l'assessment" : "Fai l'assessment",
        onClick: () => apriOverlay?.("assessment"),
      }),
    ]),

    // --- la sessione di oggi, forzata
    el("section", { class: "scheda" }, [
      el("div", { class: "scheda-titolo" }, [el("span", { testo: "Oggi" })]),
      el("p", { class: "nota", testo: "Di norma è l'app a decidere che sessione fare. Da qui puoi forzarla per oggi." }),
      pillole(
        Object.entries(TIPI_SESSIONE).map(([k, v]) => [k, v.nome]),
        s.giornoCorrente?.data === oggiISO() ? s.giornoCorrente.forza : null,
        (v) => { segnaGiorno({ data: oggiISO(), forza: v }); avviso(`Oggi: ${TIPI_SESSIONE[v].nome}.`); ridisegna(); },
        { unaRiga: true }
      ),
      el("button", {
        class: "btn nudo pieno", type: "button", testo: "Lascia decidere all'app",
        onClick: () => { segnaGiorno({ data: oggiISO(), forza: null }); avviso("Scelta automatica."); ridisegna(); },
      }),
    ]),
  ]);
}
