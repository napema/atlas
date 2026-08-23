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
import { casella, stato, movimentiVivi, migra } from "./dati.js";
import {
  statistiche, budgetTotale, cassaSettimana, verdetto, meseDi, spostaMese,
  nomeMese, importoEffettivo, proiezione,
  cicloDi, settimana, inArrivo, spesoOggi, ricorrentiDiOggi, alert,
} from "./calcolo.js";
import {
  vistaHome, vistaMovimenti, vistaAnalisi, vistaSetup,
  apriMovimento, apriCategoria, apriSottocategoria, apriDettaglio,
  apriRicarica, apriSaldoING, apriSetupPocket,
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
// Le azioni che la home può far partire ma non sa costruire: il flusso di
// ricarica e il saldo di ING, che vivono nei fogli.
const azioniHome = {
  ricarica: () => apriRicarica(disegna),
  saldoING: () => apriSaldoING(disegna),
  pocketSetup: () => apriSetupPocket(disegna),
};

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

    vista.scheda === "home"      ? vistaHome(vista.mese, vista.grafico, ridisegna, aperture.cat, azioniHome)
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

/**
 * La prima uscita ricorrente in arrivo, pronta da mostrare.
 *
 * Serve alla home, che di «in arrivo» vuole sapere una cosa sola: la
 * prossima. L'elenco intero sta in Finanze, dove c'è lo spazio per leggerlo.
 */
function prossimaUscita(iso) {
  const v = inArrivo(30, iso).voci[0];
  if (!v) return null;
  const quando = v.fra === 0 ? "oggi" : v.fra === 1 ? "domani" : `fra ${v.fra} gg`;
  return {
    quando,
    nome: v.nome,
    importo: v.stimato
      ? `${euro(v.stimaMin, { tondo: true })}–${euro(v.stimaMax, { tondo: true })}`
      : euro(v.importo, { tondo: true }),
  };
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
  // La migrazione gira all'apertura del canale, cioè all'avvio dell'app e
  // non al montaggio del modulo: la home legge `oggi()` senza montare
  // Finanze, e leggerebbe uno stato senza pocket.
  migra();

  const canale = apriCanale({
    id: "finanze",
    file: "finanze.json",
    impacchetta: () => {
      const s = stato();
      return {
        v: 4,
        movs: s.movs,
        // pockets, ricorrenti e soglie viaggiano dentro `meta` come tutto il
        // resto della configurazione: un campo nuovo che resta fuori dal
        // pacchetto è un campo che esiste su un dispositivo solo.
        meta: {
          cats: s.cats, profili: s.profili, rules: s.rules, config: s.config,
          pockets: s.pockets, ricorrenti: s.ricorrenti, soglie: s.soglie,
          up: s.metaUp || 0,
        },
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
          if (Array.isArray(rm.pockets)) s.pockets = rm.pockets;
          if (Array.isArray(rm.ricorrenti)) s.ricorrenti = rm.ricorrenti;
          if (rm.soglie) s.soglie = { ...s.soglie, ...rm.soglie };
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

  /**
   * Quello che la home di ATLAS mostra di Finanze.
   *
   * Il numero è il saldo del Principale — «quanto posso spendere» — e non
   * più il totale speso nel mese: speso 1.034 € non dice se stasera posso
   * uscire a cena, restano 67 € sì.
   *
   * `dettaglio` porta la cosa che ribalta la risposta al numero, in ordine
   * di quanto la ribalta: prima cosa esce OGGI, poi quanto è già uscito
   * oggi, poi quanti giorni mancano a lunedì.
   */
  oggi() {
    migra();
    const iso = oggiISO();
    const st = statistiche(meseDi());
    if (!st.nMovimenti && !budgetTotale(meseDi())) return null;

    const s = settimana(iso);
    const oggiRic = ricorrentiDiOggi(iso);
    const speso = spesoOggi(iso);
    const av = alert(iso);

    const pezzi = [];
    if (oggiRic.length) {
      // Un addebito che esce oggi viene prima di tutto: è l'unica cosa che
      // può rendere sbagliato il numero grande nel giro di poche ore.
      pezzi.push(oggiRic.length === 1
        ? `Oggi esce ${oggiRic[0].nome.toLowerCase()} · ${euro(oggiRic[0].importo, { tondo: true })}`
        : `Oggi escono ${oggiRic.length} addebiti · ${euro(oggiRic.reduce((t, r) => t + r.importo, 0), { tondo: true })}`);
    }
    if (speso > 0) pezzi.push(`Oggi ${euro(speso, { tondo: true })}`);
    pezzi.push(s.finita
      ? `settimana finita · ${plurale(s.giorniRimasti, "giorno", "giorni")} a lunedì`
      : `${euro(s.alGiorno, { tondo: true })} al giorno fino a domenica`);

    return {
      titolo: "Finanze",
      valore: euro(s.resta),
      dettaglio: pezzi.join(" · "),
      // La home lo mette in una frase: «ti manca segnare le spese» non ha
      // senso — Finanze non è una cosa da fare, è una cosa da guardare. Solo
      // quando la settimana è finita c'è davvero qualcosa da decidere.
      mancaTesto: s.finita ? "una decisione sui soldi" : null,
      urgente: s.finita || av.some((a) => a.livello === "critico"),
      avanzamento: s.frazione,
      // Il testo per la carta larga della home, quando Finanze è la cosa
      // più urgente: è l'alert vero, non un riassunto.
      allarme: av[0]?.testo || null,

      // I tre numeri della carta in home, già formattati. Li formatta il
      // modulo e non la home perché è il modulo a sapere che gli importi
      // sono centesimi: passarli grezzi vorrebbe dire insegnarlo alla home.
      spesoOggi: euro(speso, { tondo: true }),
      alGiorno: s.finita ? "—" : euro(s.alGiorno, { tondo: true }),
      prossima: prossimaUscita(iso),

      azione: { rotta: "#/finanze" },
    };
  },

  avviaSync,
};
