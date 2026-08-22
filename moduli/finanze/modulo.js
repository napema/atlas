// moduli/finanze — il registro di entrate e uscite.
//
// Portato da napema/budget-tracker-webpage. Il primo tentativo l'aveva
// riscritto e gli aveva tolto metà delle funzioni: Analisi ridotta a due
// pannelli su nove, niente import dell'estratto conto, niente drill-down
// sulle sottocategorie, niente giroconti. Questa versione è quella vera,
// funzione per funzione — cambiano solo lo stile e il font.
//
// Tre schermate: Riepilogo, Movimenti, Analisi. Il Setup è la sezione
// "Finanze" di Impostazioni — tutte le impostazioni in un posto solo.

import { el, aggiungi, intestazione, oggiISO, euro, plurale } from "../../core/ui.js";
import { icona } from "../../core/icone.js";
import { apriCanale, fondiRecord, potaLapidi } from "../../core/sync.js";
import { scriviFatto, leggiFatto, giornoCorrente } from "../../core/contesto.js";
import { annuncia, ascolta } from "../../core/bus.js";
import { casella, stato, movimentiVivi } from "./dati.js";
import {
  statistiche, budgetTotale, cassaSettimana, verdetto, meseDi, spostaMese,
  nomeMese, importoEffettivo, proiezione,
} from "./calcolo.js";
import {
  vistaHome, vistaMovimenti, vistaAnalisi, vistaSetup,
  apriMovimento, apriCategoria, apriSottocategoria, apriDettaglio,
} from "./viste.js";

let contenitore = null;
const staccatori = [];

// Come stai guardando i dati, non un dato: non va nella casella e non si
// sincronizza. Altrimenti cambiare scheda sull'iPhone la cambierebbe sul PC.
const vista = { scheda: "home", mese: meseDi(), grafico: "settimana", filtro: "tutti" };

// Il Setup non è più una scheda qui dentro: è la sezione "Finanze" della
// schermata Impostazioni, insieme a quelle degli altri moduli. Sparso nei
// moduli non lo trovava nessuno.
const SCHEDE = [["home", "Riepilogo"], ["movimenti", "Movimenti"], ["analisi", "Analisi"]];

/* --------------------------------------------------------------- vista -- */

function ridisegna(patch = {}) {
  Object.assign(vista, patch);
  disegna();
}

// I fogli hanno bisogno di riaprirsi a vicenda (categoria → sottocategoria →
// dettaglio) senza che le viste conoscano il modulo: si passano queste.
const aperture = {
  cat: (id) => apriCategoria(vista.mese, id, disegna, aperture.sub, aperture.dett),
  sub: (cid, s) => apriSottocategoria(vista.mese, cid, s, disegna, aperture.dett),
  dett: (id) => apriDettaglio(id, disegna, aperture.dett),
};

function disegna() {
  if (!contenitore) return;
  const scorrimento = globalThis.scrollY;
  contenitore.replaceChildren();

  aggiungi(contenitore, [
    // Il mese non va nel sottotitolo: lo dice già il navigatore qui sotto,
    // e scritto due volte a due centimetri di distanza sembra un errore.
    intestazione("Finanze"),

    navigatoreMese(),
    barraAzioni(),

    el("div", { class: "fi-schede" }, SCHEDE.map(([id, testo]) => el("button", {
      class: "fi-scheda" + (vista.scheda === id ? " attiva" : ""),
      type: "button", testo, "aria-pressed": String(vista.scheda === id),
      onClick: () => ridisegna({ scheda: id }),
    }))),

    vista.scheda === "home"      ? vistaHome(vista.mese, vista.grafico, ridisegna, aperture.cat)
    : vista.scheda === "movimenti" ? vistaMovimenti(vista.mese, vista.filtro, ridisegna, aperture.dett)
    : vistaAnalisi(vista.mese, aperture.cat, aperture.sub),
  ]);

  pubblicaSullaLavagna();
  globalThis.scrollTo(0, scorrimento);
}

/**
 * Uscita · Entrata · ⋯ — le tre azioni dell'app di partenza, e sono tornate
 * com'erano.
 *
 * Le avevo sostituite con un "+" tondo unico: un pulsante solo per due gesti
 * che non sono lo stesso gesto. Registrare un'uscita è la cosa che fai dieci
 * volte a settimana, registrare un'entrata due volte al mese: nasconderle
 * dietro lo stesso tondo, e per giunta senza dire quale delle due parte,
 * costa un tocco e un dubbio ogni volta.
 *
 * Il "⋯" apre lo stesso foglio sul tipo "ricarica extra", e da lì le pillole
 * dei tipi arrivano a giroconto, rimborso e reso: sono i movimenti rari, e
 * stare un livello sotto è giusto.
 */
function barraAzioni() {
  const apri = (tipo) => apriMovimento({ ridisegna: disegna, tipo });
  return el("div", { class: "fi-azioni" }, [
    el("button", { class: "btn fi-uscita", type: "button", testo: "Uscita", onClick: () => apri("out") }),
    el("button", { class: "btn fi-entrata", type: "button", testo: "Entrata", onClick: () => apri("in") }),
    el("button", {
      class: "btn morbido fi-altro", type: "button", testo: "⋯",
      "aria-label": "Altri movimenti", title: "Giroconto, rimborso, reso, ricarica extra",
      onClick: () => apri("extra"),
    }),
  ]);
}

function navigatoreMese() {
  const corrente = meseDi();
  return el("div", { class: "fi-mese" }, [
    el("button", {
      class: "btn-icona", type: "button", "aria-label": "Mese precedente",
      html: icona("indietro", 20),
      onClick: () => ridisegna({ mese: spostaMese(vista.mese, -1) }),
    }),
    el("button", {
      class: "fi-mese-nome", type: "button", testo: nomeMese(vista.mese),
      title: "Torna al mese corrente",
      onClick: () => ridisegna({ mese: corrente }),
    }),
    el("button", {
      class: "btn-icona", type: "button", "aria-label": "Mese successivo",
      html: icona("freccia", 20),
      disabled: vista.mese >= corrente,
      onClick: () => ridisegna({ mese: spostaMese(vista.mese, +1) }),
    }),
  ]);
}

/* ------------------------------------------------------------- lavagna -- */

function pubblicaSullaLavagna() {
  const oggi = giornoCorrente();
  const diOggi = movimentiVivi().filter((m) => m.data === oggi && m.tipo === "out");
  const speso = diOggi.reduce((s, m) => s + importoEffettivo(m), 0);
  if (leggiFatto("finanze", "movimenti") !== diOggi.length) scriviFatto("finanze", "movimenti", diOggi.length);
  if (leggiFatto("finanze", "speso") !== speso) scriviFatto("finanze", "speso", speso);
}

/* ---------------------------------------------------------------- sync -- */

export function avviaSync() {
  const canale = apriCanale({
    id: "finanze",
    file: "finanze.json",
    impacchetta: () => {
      const s = stato();
      return {
        v: 3,
        movs: s.movs,
        meta: { cats: s.cats, profili: s.profili, rules: s.rules, config: s.config, up: s.metaUp || 0 },
      };
    },
    applica: (remoto) => {
      casella.aggiorna((s) => {
        s.movs = potaLapidi(fondiRecord(s.movs, remoto.movs));
        const rm = remoto.meta;
        if (rm && (rm.up || 0) > (s.metaUp || 0)) {
          if (rm.cats?.length) s.cats = rm.cats;
          if (rm.profili) s.profili = rm.profili;
          // Il vocabolario appreso si SOMMA invece di essere sostituito:
          // quello che insegni su un dispositivo deve saperlo anche l'altro,
          // e vince chi ha scritto per ultimo solo sulle chiavi in comune.
          if (rm.rules) s.rules = { ...s.rules, ...rm.rules };
          if (rm.config) s.config = { ...s.config, ...rm.config };
          s.metaUp = rm.up;
        }
      }, { origine: "sync", tocca: false });
    },
    ridisegna: () => { pubblicaSullaLavagna(); if (contenitore) disegna(); },
  });

  // La lavagna si aggiorna anche a modulo chiuso: la home la legge, e se si
  // scrivesse solo al montaggio mostrerebbe i numeri dell'ultima volta che
  // sei passato di qui.
  pubblicaSullaLavagna();

  casella.osserva((_, origine) => {
    if (origine === "sync") return;
    canale.segnalaModifica();
    annuncia("finanze:movimento-registrato", {});
  });

  canale.avvia();
  return canale;
}

/* ------------------------------------------------------------ contratto -- */

export default {
  async monta(cont, posizione) {
    contenitore = cont;
    vista.mese = meseDi();

    const resto = posizione?.resto || [];
    if (SCHEDE.some(([id]) => id === resto[0])) vista.scheda = resto[0];
    else vista.scheda = "home";

    disegna();

    if (resto[0] === "nuovo") queueMicrotask(() => apriMovimento({ ridisegna: disegna }));
    staccatori.push(ascolta("giorno:cambiato", () => { vista.mese = meseDi(); disegna(); }));
  },

  smonta() {
    while (staccatori.length) staccatori.pop()();
    contenitore = null;
  },

  /** La sezione "Finanze" di Impostazioni: budget, cassa, casa, import. */
  impostazioni() {
    return vistaSetup(meseDi(), () => { if (contenitore) disegna(); });
  },

  oggi() {
    const mese = meseDi();
    const st = statistiche(mese);
    if (!st.nMovimenti && !budgetTotale(mese)) return null;

    const cassa = cassaSettimana(mese, oggiISO());
    const v = verdetto(mese);

    // In settimana il numero utile è quello che resta in cassa, non il
    // totale del mese: è la cifra su cui si decide se uscire a cena.
    if (cassa.attiva) {
      return {
        titolo: "Finanze",
        valore: euro(cassa.resta),
        dettaglio: cassa.resta < 0
          ? `Cassa sforata di ${euro(-cassa.resta)}`
          : `In cassa · ${plurale(cassa.giorniRimasti, "giorno", "giorni")} alla ricarica`,
        urgente: cassa.resta <= 0,
        avanzamento: cassa.tetto ? Math.min(1, cassa.speso / cassa.tetto) : 0,
        azione: { rotta: "#/finanze" },
      };
    }

    const bt = budgetTotale(mese);
    const proj = proiezione(mese);
    return {
      titolo: "Finanze",
      valore: euro(st.ordinaria, { tondo: true }),
      dettaglio: bt
        ? `${Math.round((st.ordinaria / bt) * 100)}% del budget${proj ? ` · proiezione ${euro(proj, { tondo: true })}` : ""}`
        : v.testo,
      urgente: v.livello === "rosso",
      avanzamento: bt ? Math.min(1, st.ordinaria / bt) : 0,
      azione: { rotta: "#/finanze" },
    };
  },

  avviaSync,
};
