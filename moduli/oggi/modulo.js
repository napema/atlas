// moduli/oggi — la home.
//
// NON È UN CRUSCOTTO, ed è la terza volta che viene rifatta per non esserlo.
//
// Le due versioni precedenti mettevano in fila i moduli e lasciavano a chi
// guarda il lavoro di capire cosa volessero dire. «Ti mancano finanze,
// mobilità e abitudini» è il punto più basso: tre nomi di schermate messi in
// un elenco non dicono niente su come sta andando la giornata, e non
// suggeriscono niente da fare.
//
// La domanda a cui questa schermata deve rispondere, in tre secondi, è una
// sola: SONO IN CARREGGIATA O NO. E se non lo sono, qual è la prima cosa da
// fare adesso.
//
// Da qui la gerarchia, che è di quattro livelli e non di più:
//
//   1. IL VERDETTO   una frase sola. Grande. Dice come sta andando.
//   2. ADESSO        le cose che si spuntano in un tocco, senza cambiare
//                    schermata. Solo quelle che scadono ora.
//   3. LA PROSSIMA   una cosa da fare, quella che conta di più, con il posto
//                    dove farla.
//   4. IL FONDO      i tre moduli a colpo d'occhio e la costanza. Si guarda
//                    solo se si vuole.
//
// Niente di quello che sta sotto il primo livello ha il diritto di essere
// letto per capire se la giornata è a posto.

import { MODULI_DATI, prendiModulo } from "../../core/registro.js";
import {
  el, aggiungi, plurale, euroGrande, euro, tessera, tocco,
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
  const q = quadro(schede);

  contenitore.replaceChildren();
  aggiungi(contenitore, [
    saluto_(),
    verdetto(q),
    adesso(q, () => disegna()),
    prossima(q),
    // Il modulo promosso a carta esce dalla griglia: mostrarlo due volte
    // nella stessa schermata, con le stesse parole, è il difetto che
    // rendeva la home un elenco.
    el("div", { class: "griglia-tessere og-glance" },
      schede.filter((s) => s !== q.principale).map((s) => tesseraModulo(s.mod, s.dati))),
    strisciaSettimana(),
  ]);
}

/**
 * Tutto quello che serve a decidere cosa dire, calcolato una volta sola.
 *
 * Sta qui e non sparso nelle funzioni di disegno perché il verdetto e la
 * carta della prossima cosa devono per forza essere d'accordo fra loro: se
 * il titolo dice «tutto a posto» e sotto c'è una carta rossa, la schermata
 * ha appena perso la fiducia di chi la legge.
 */
function quadro(schede) {
  const conDati = schede.filter((s) => s.dati);
  const daFare = conDati.filter((s) => s.dati.fatto === false || s.dati.urgente);
  const fatti = conDati.filter((s) => s.dati.fatto === true);

  // I promemoria delle parti — integratori e simili — sono la cosa più
  // azionabile che la home abbia: si spuntano senza cambiare schermata.
  const promemoria = [];
  for (const s of conDati) for (const p of s.dati.promemoria || []) promemoria.push({ ...p, mod: s.mod });
  const inRitardo = promemoria.filter((p) => p.quando === "tardi");

  // La cosa più urgente: prima chi ha un allarme vero, poi chi è urgente,
  // poi chi è semplicemente da fare.
  const ordinate = daFare.slice().sort((a, b) =>
    (b.dati.allarme ? 2 : 0) + (b.dati.urgente ? 1 : 0) -
    ((a.dati.allarme ? 2 : 0) + (a.dati.urgente ? 1 : 0)));

  return {
    schede, conDati, daFare, fatti, promemoria, inRitardo,
    principale: ordinate[0] || null,
    allarme: conDati.map((s) => s.dati.allarme).find(Boolean) || null,
    serie: Math.max(0, ...conDati.map((s) => s.dati.serie || 0)),
    ora: new Date().getHours(),
  };
}

/* --------------------------------------------------------- 0. il saluto -- */

function saluto_() {
  return el("header", { class: "og-saluto-blocco" }, [
    el("h1", { class: "og-saluto" }, [
      // Il minuscolo vale per il saluto, non per il nome: `text-transform`
      // sull'intera riga trasformava «Ema» in «ema».
      el("span", { class: "og-saluto-parola", testo: `${saluto()}, ` }),
      el("span", { testo: NOME }),
      el("span", { class: "og-punto", testo: "." }),
    ]),
    el("p", { class: "og-data", testo: dataLunga() }),
  ]);
}

/* ------------------------------------------------------- 1. IL VERDETTO -- */
/*
   Una frase sola, e deve bastare. È l'unica cosa della schermata che si
   legge sempre, quindi è l'unica che ha il diritto di essere grande.

   Le regole, in ordine — vince la prima che si applica:

     · c'è un allarme vero (le Spese fisse non coprono un addebito) → quello,
       perché è l'unica cosa che può costare soldi oggi;
     · sei in ritardo su qualcosa che andava fatto in una fascia già passata;
     · non hai ancora finito, e si sta facendo tardi;
     · non hai ancora finito, ma c'è tempo;
     · hai finito tutto.

   Il tono non colpevolizza mai. «Ti mancano due cose» è un fatto, «non hai
   fatto niente» è un giudizio, e un'app che giudica si smette di aprirla.
*/

function verdetto(q) {
  const { daFare, fatti, conDati, inRitardo, allarme, ora, serie } = q;
  let titolo;
  let sotto = "";
  let tono = "";

  if (!conDati.length) {
    titolo = "Non c'è ancora niente da guardare.";
    sotto = "I moduli iniziano a parlare appena ci metti dentro qualcosa.";
  } else if (allarme) {
    titolo = "Serve la tua attenzione.";
    sotto = allarme;
    tono = "male";
  } else if (inRitardo.length) {
    const nomi = elencoNomi(inRitardo.map((p) => p.nome.toLowerCase()));
    titolo = inRitardo.length === 1 ? `Ti è sfuggito ${nomi}.` : `Ti sono sfuggiti ${nomi}.`;
    sotto = "Se lo prendi adesso la giornata resta intera.";
    tono = "avviso";
  } else if (!daFare.length) {
    titolo = "Sei a posto per oggi.";
    sotto = fatti.length
      ? `${plurale(fatti.length, "cosa chiusa", "cose chiuse")}${serie > 1 ? ` · ${plurale(serie, "giorno", "giorni")} di fila` : ""}. Puoi staccare.`
      : "Niente in scadenza.";
    tono = "ok";
  } else if (ora >= 21) {
    titolo = `Manca poco alla fine della giornata.`;
    sotto = `${cosaManca(daFare)} — dieci minuti e chiudi.`;
    tono = "avviso";
  } else {
    titolo = "Sei in carreggiata.";
    sotto = `${cosaManca(daFare)}, e hai tutto il tempo.`;
  }

  return el("section", { class: `og-verdetto ${tono}`.trim() }, [
    el("h2", { class: "og-verdetto-titolo", testo: titolo }),
    sotto && el("p", { class: "og-verdetto-sotto", testo: sotto }),
    // La riga della serie è l'unica concessione motivazionale, e compare
    // solo quando c'è davvero qualcosa da difendere. Sotto i tre giorni non
    // è una serie, è un caso.
    serie >= 3 && el("p", { class: "og-serie", testo: fraseSerie(serie, daFare.length === 0) }),
  ]);
}

const elencoNomi = (n) => n.length === 1 ? n[0]
  : `${n.slice(0, -1).join(", ")} e ${n[n.length - 1]}`;

/** Cosa manca, detto in cose e non in nomi di schermate. */
function cosaManca(daFare) {
  const pezzi = daFare.map((s) => s.dati.mancaTesto || (s.dati.titolo || s.mod.nome).toLowerCase());
  return `Ti ${pezzi.length === 1 ? "manca" : "mancano"} ${elencoNomi(pezzi)}`;
}

/**
 * La frase sulla serie.
 *
 * Cambia con la lunghezza perché una formula ripetuta identica ogni giorno
 * smette di significare qualcosa dopo tre giorni: è il difetto di tutte le
 * app che gamificano con una stringa sola.
 */
function fraseSerie(n, chiusa) {
  if (chiusa) return `${n} giorni di fila. Continua così.`;
  if (n >= 30) return `${n} giorni di fila. Non è più una prova, è come vivi.`;
  if (n >= 14) return `${n} giorni di fila. Sarebbe un peccato spezzarla stasera.`;
  if (n >= 7) return `${n} giorni di fila: una settimana piena. Tienila.`;
  return `${n} giorni di fila. Non mollare adesso.`;
}

/* ---------------------------------------------------------- 2. ADESSO --- */
/*
   Le cose che si spuntano da qui, senza cambiare schermata. È l'unica parte
   della home su cui si TOCCA per fare, non per andare.

   Compare solo se c'è qualcosa, e sparisce appena è vuota: non è un dato, è
   una sveglia, e una sveglia che suona a vuoto si impara a ignorare.
*/

function adesso(q, ridisegna) {
  if (!q.promemoria.length) return null;

  // Il ritardo si dice una volta sola, in cima, e non su ogni riga: ripetuto
  // quattro volte diventa un colore, non un'informazione.
  const gruppi = [
    ["In ritardo", q.promemoria.filter((p) => p.quando === "tardi"), true],
    ["Adesso", q.promemoria.filter((p) => p.quando !== "tardi"), false],
  ].filter(([, v]) => v.length);

  return el("section", { class: "og-adesso" }, gruppi.map(([nome, voci, tardi]) =>
    el("div", { class: "og-adesso-gruppo" + (tardi ? " tardi" : "") }, [
      el("div", { class: "og-adesso-testa" }, [
        el("span", { class: `micro ${tardi ? "avviso" : ""}`.trim(), testo: nome }),
        el("span", { class: "og-adesso-conta", testo: String(voci.length) }),
      ]),
      el("ul", { class: "og-adesso-lista" }, voci.map((v) => {
        const b = el("button", {
          class: "og-adesso-voce", type: "button",
          "aria-label": `Segna ${v.nome}`,
          onClick: async () => {
            const mod = await prendiModulo(v.mod.id);
            mod?.spuntaParte?.(v.habitId, v.parteId);
            tocco(12);
            ridisegna();
          },
        }, [
          el("span", { class: "og-adesso-cerchio", html: icona("spunta", 13, 3) }),
          el("span", { class: "og-adesso-nome", testo: v.nome }),
          el("span", { class: "og-adesso-quando", testo: v.nomeFascia }),
        ]);
        b.style.setProperty("--tinta", tintaDi(v.tint));
        return el("li", {}, [b]);
      })),
    ])));
}

// Le tinte delle abitudini hanno nomi inglesi nei dati di partenza. La
// tabella sta qui perché la home non importa Abitudini: legge `oggi()`.
const TINTA_CSS = {
  blue: "blu", green: "verde", red: "rosso", orange: "arancio", purple: "viola",
  pink: "rosa", yellow: "giallo", mint: "menta", indigo: "indaco",
};
const tintaDi = (t) => `var(--${TINTA_CSS[t] || "blu"})`;

/* ------------------------------------------------------ 3. LA PROSSIMA -- */
/*
   Una cosa da fare, non tre. Se ce ne sono tre, le altre due stanno nelle
   tessere in fondo: mostrarle tutte e tre con lo stesso peso è quello che
   rendeva la schermata un elenco.
*/

function prossima(q) {
  if (!q.principale) return null;
  const { mod, dati } = q.principale;

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

/* ---------------------------------------------------------- 4. IL FONDO - */

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
      azione: inMigrazione ? null : () => { location.hash = `#/${mod.id}`; },
    });
  }

  return tessera({
    nome: dati.titolo || mod.nome,
    icona: mod.icona,
    micro: dati.fatto === true ? "fatto" : dati.fatto === false ? "da fare" : null,
    tonoMicro: dati.fatto === true ? "ok" : dati.fatto === false ? "avviso" : "",
    cifra: String(dati.valore ?? "—"),
    coda: dati.dettaglio,
    frazione: typeof dati.avanzamento === "number" ? dati.avanzamento : (dati.fatto === true ? 1 : 0),
    tinta: mod.accento,
    azione: () => { location.hash = dati.azione?.rotta || `#/${mod.id}`; },
  });
}

/**
 * Gli ultimi sette giorni. Non dice COSA hai fatto — per quello ci sono i
 * moduli — dice se ci sei stato.
 */
function strisciaSettimana() {
  const giorni = ultimiGiorni(7).reverse();
  const oggi = giornoCorrente();
  const attivi = giorni.filter(({ fatti }) => Object.keys(fatti).length).length;

  return el("section", { class: "scheda og-settimana" }, [
    el("div", { class: "og-settimana-testa" }, [
      el("div", {}, [
        el("span", { class: "micro", testo: "Costanza" }),
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
