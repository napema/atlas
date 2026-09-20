// moduli/pasti/viste.js — le schermate.
//
// IL TONO DI TUTTO IL MODULO, e vale più di qualunque dettaglio tecnico:
// «non voglio essere fissato, voglio un'app che mi aiuta».
//
// Quindi niente semafori rossi sulla giornata, niente percentuali di
// fallimento, niente celebrazioni per aver mangiato. La schermata dice cosa
// c'è da mangiare e quanto manca; il giudizio non lo dà. Una home che ogni
// mattina apre con quanto hai sgarrato ieri è l'app che si disinstalla a
// gennaio, e a quel punto tutto il resto non serve a niente.

import {
  el, aggiungi, scheda, riga, lista, avviso, campo, segmenti, pillole,
  anello, traccia, apriFoglio, chiudiFoglio, vuoto, plurale,
  dataUmana, dataBreve, oggiISO, GIORNI, GIORNI_INIZIALI, numero,
} from "../../core/ui.js";
import { icona } from "../../core/icone.js";
import {
  FASCE, ID_FASCE, REGIMI, ATTIVITA, OBIETTIVI, SCOSTAMENTI,
  profilo, scriviProfilo, pesoAttuale, serieePesi, registraPeso,
  pastiVivi, pastiPerFascia, pasto, salvaPasti, eliminaPasto, alternaAttivo,
  pianoSettimana, scegliPasto, registraScostamento, eliminaScostamento,
  lunediDi, giorniSettimana, indiceGiorno, regimeDi, nomeFascia,
} from "./dati.js";
import {
  bersagli, giornata, settimana as settimanaCalcolo, resta,
  mantenimento, metabolismoBasale, eta, tendenze, daPromuovere, copertura,
} from "./calcolo.js";
import { assicuraPiano, rigenera } from "./piano.js";
import { importaPasti, pastiDaJSON, propostePerFascia, scostamentoDaTesto, PROMPT_CHAT } from "./importa.js";

/* I tre macro hanno un colore fisso in tutto il modulo. Non verde e non
   rosso: in ATLAS quei due vogliono dire «fatto» e «male», e una tinta che
   significa due cose non ne significa nessuna. */
const TINTE = {
  p: "var(--blu)",
  c: "var(--giallo)",
  g: "var(--indaco)",
};
const NOMI_MACRO = { p: "Proteine", c: "Carboidrati", g: "Grassi" };

const kcal = (n) => `${numero(Math.round(n))}`;
const gr = (n) => `${Math.round(n)} g`;

/* =========================================================================
   LA GIORNATA
   ========================================================================= */

/**
 * Il cuore della schermata: l'anello delle calorie e le tre barre.
 *
 * L'anello non passa mai il giro anche quando hai sforato — `frazione` è
 * tagliata a 1 — ma il numero sotto dice la verità. Un anello che si
 * riavvolge farebbe sembrare che sei di nuovo all'inizio.
 */
export function testataGiorno(iso) {
  const b = bersagli();
  const g = giornata(iso);
  const t = g.totale;
  const manca = b.kcal - t.kcal;

  return scheda(null, [
    el("div", { class: "pa-testata" }, [
      el("div", { class: "pa-anello" }, [
        /* L'anello risponde a «quanto va bene», non a «quale modulo»:
           quindi porta uno STATO, non la tinta di Pasti.

           Prima era sempre corallo — l'accento del modulo — e a 3510 kcal
           su 2975 mostrava un anello rosa pieno identico a quello di una
           giornata perfetta. Il numero diceva «hai sforato», il colore
           diceva «Pasti», e l'unica cosa che si vedeva da lontano era il
           secondo.

           Lo spessore e' sceso da 10 a 7: a 116px di diametro un tratto da
           10 e' una ciambella, e la cifra dentro ci sta stretta. */
        anello(b.kcal ? t.kcal / b.kcal : 0, {
          misura: 116,
          spessore: 7,
          colore: t.kcal > b.kcal ? "var(--male)"
            : t.kcal >= b.kcal * 0.9 ? "var(--avviso)"
            : "var(--ok)",
        }),
        el("div", { class: "pa-anello-testo" }, [
          el("div", { class: "pa-kcal", testo: kcal(t.kcal) }),
          el("div", { class: "micro", testo: `su ${kcal(b.kcal)}` }),
        ]),
      ]),
      el("div", { class: "pa-manca" }, [
        el("div", { class: "micro", testo: manca >= 0 ? "Mancano" : "Oltre di" }),
        el("div", { class: "pa-manca-cifra", testo: kcal(Math.abs(manca)) }),
        el("div", { class: "micro", testo: "kcal" }),
      ]),
    ]),

    el("div", { class: "pa-macro" }, ["p", "c", "g"].map((k) => {
      const f = b[k] ? t[k] / b[k] : 0;
      return el("div", { class: "pa-macro-voce" }, [
        el("div", { class: "pa-macro-riga" }, [
          el("span", { class: "pa-macro-nome", testo: NOMI_MACRO[k] }),
          el("span", { class: "pa-macro-cifra", testo: `${Math.round(t[k])} / ${b[k]} g` }),
        ]),
        traccia(f, "", { sottile: true, colore: TINTE[k] }),
      ]);
    })),

    g.incerte.length ? el("p", { class: "nota", testo:
      `${plurale(g.incerte.length, "fascia ancora da decidere", "fasce ancora da decidere")}: il totale è parziale.` }) : null,
  ].filter(Boolean));
}

/** Le cinque fasce del giorno. Toccarne una apre cosa si può farci. */
export function elencoFasce(iso, ridisegna) {
  const g = giornata(iso);

  return scheda("La giornata", [
    lista(g.fasce.map((f) => {
      const sost = g.scostamenti.find((s) => s.fascia === f.fascia && (s.tipo === "cambio" || s.tipo === "salto"));
      const saltato = sost?.tipo === "salto";

      // `f.nome` qui è il nome del PASTO previsto, non della fascia: la
      // fascia si ripesca da FASCE. Due campi diversi con lo stesso nome
      // nel giro dei dati, e confonderli è il baco che si scrive da solo.
      const nome = FASCE.find((x) => x.id === f.fascia)?.nome || f.fascia;
      const macro = sost && !saltato ? sost : f.contato;

      const cosa = saltato ? "saltato"
        : sost ? sost.nome
        : f.nome || (f.regime === "salto" ? "non la fai" : "da scegliere");

      // Tutto in una riga sola sotto il nome della fascia, invece che in una
      // colonna a destra: i nomi dei piatti sono lunghi, e spezzati su tre
      // righe dentro un terzo di schermo non si leggono.
      const conti = saltato || (f.regime === "salto" && !sost)
        ? null
        : `${kcal(macro.kcal || 0)} kcal · ${Math.round(macro.p || 0)} g prot.`;

      return riga({
        etichetta: nome,
        dettaglio: [cosa, conti].filter(Boolean).join("  ·  "),
        azione: () => foglioFascia(iso, f.fascia, ridisegna),
      });
    })),

    el("button", {
      class: "btn primario pieno", type: "button", testo: "Ho mangiato qualcos'altro",
      onClick: () => foglioAggiungi(iso, null, ridisegna),
    }),
  ]);
}

/** Gli scostamenti già registrati oggi, con la via per toglierli. */
export function elencoScostamenti(iso, ridisegna) {
  const g = giornata(iso);
  const extra = g.scostamenti.filter((s) => s.tipo === "aggiunta");
  if (!extra.length) return null;

  return scheda("In più, oggi", [
    lista(extra.map((s) => riga({
      etichetta: s.nome,
      dettaglio: [s.ora, SCOSTAMENTI[s.tipo]].filter(Boolean).join(" · "),
      valore: `${kcal(s.kcal)} kcal`,
      azione: () => {
        eliminaScostamento(s.id);
        avviso("Tolto.");
        ridisegna();
      },
    }))),
    el("p", { class: "nota", testo: "Tocca una riga per toglierla." }),
  ]);
}

/* ------------------------------------------------------------- i fogli -- */

function foglioFascia(iso, fascia, ridisegna) {
  const regime = regimeDi(iso, fascia);
  const nome = nomeFascia(fascia);
  const f = apriFoglio({ titolo: nome, mezzo: true });

  const voci = [];

  if (regime === "casa") {
    voci.push(el("button", {
      class: "btn tenue pieno", type: "button", testo: "Cambia il pasto pianificato",
      onClick: () => { f.chiudi(); foglioScegliPasto(iso, fascia, ridisegna); },
    }));
  }
  voci.push(
    el("button", {
      class: "btn tenue pieno", type: "button", testo: "Ho mangiato altro, al posto di questo",
      onClick: () => { f.chiudi(); foglioAggiungi(iso, fascia, ridisegna, "cambio"); },
    }),
    el("button", {
      class: "btn tenue pieno", type: "button", testo: "L'ho saltato",
      onClick: () => {
        registraScostamento({ tipo: "salto", data: iso, fascia });
        f.chiudi(); avviso(`${nome} saltato.`); ridisegna();
      },
    }),
    el("p", { class: "nota", testo:
      `Questa fascia è «${REGIMI[regime]}» nella tua settimana tipo. Si cambia in Impostazioni.` }),
  );

  aggiungi(f.corpo, voci);
  return f;
}

function foglioScegliPasto(iso, fascia, ridisegna) {
  const f = apriFoglio({ titolo: `${nomeFascia(fascia)} · scegli` });
  const candidati = pastiPerFascia(fascia);
  const lunedi = lunediDi(iso);
  const attuale = pianoSettimana(lunedi)?.giorni?.[iso]?.[fascia] || null;

  aggiungi(f.corpo, candidati.length ? [
    lista(candidati.map((p) => riga({
      etichetta: p.nome,
      dettaglio: `${kcal(p.kcal)} kcal · ${p.p} P · ${p.c} C · ${p.g} G`,
      valore: p.id === attuale ? "in piano" : "",
      azione: () => {
        scegliPasto(lunedi, iso, fascia, p.id);
        f.chiudi();
        avviso("Piano aggiornato.");
        ridisegna();
      },
    }))),
    el("p", { class: "nota", testo:
      "Cambiando un pasto a mano questa settimana diventa tua: il generatore non ci torna più sopra." }),
  ] : [vuoto(`Nessun pasto per ${nomeFascia(fascia).toLowerCase()}.`, "Aggiungine dall'import.")]);
  return f;
}

/**
 * Registrare qualcosa mangiato: il percorso che deve costare un tocco.
 *
 * In cima le tendenze, cioè le cose che ha già registrato più volte: è di
 * gran lunga il caso più probabile, e metterci sopra sedici voci generiche
 * vorrebbe dire far scorrere tutto per arrivare al panino di ogni martedì.
 */
function foglioAggiungi(iso, fascia, ridisegna, tipo = "aggiunta") {
  const f = apriFoglio({ titolo: tipo === "cambio" ? "Al posto di…" : "Ho mangiato" });
  const zona = el("div", {});

  const disegna = () => {
    zona.replaceChildren();
    const scelta = fascia || fasciaDallOra();
    const proposte = propostePerFascia(scelta, { tendenze: tendenze(), pasti: pastiVivi() });

    const salva = (v) => {
      registraScostamento({
        tipo, data: iso, ora: oraAdesso(), fascia: scelta,
        nome: v.nome, kcal: v.kcal, p: v.p, c: v.c, g: v.g, pastoId: v.pastoId || null,
      });
      f.chiudi();
      avviso("Segnato.");
      ridisegna();
    };

    aggiungi(zona, [
      !fascia && el("div", { class: "pa-fascia-scelta" }, [
        el("div", { class: "micro", testo: "Quando" }),
        pillole(FASCE.map((x) => [x.id, x.nome]), scelta, (v) => { fascia = v; disegna(); }, { unaRiga: true }),
      ]),

      proposte.length ? lista(proposte.slice(0, 14).map((v) => riga({
        etichetta: v.nome,
        dettaglio: v.origine === "tendenza"
          ? `lo fai spesso · ${plurale(v.volte, "volta", "volte")}`
          : `${kcal(v.kcal)} kcal · ${v.p} P`,
        valore: v.origine === "tendenza" ? `${kcal(v.kcal)} kcal` : "",
        azione: () => salva(v),
      }))) : null,

      el("details", { class: "pa-altro" }, [
        el("summary", { testo: "Non è in lista" }),
        campoLibero(salva),
      ]),
    ].filter(Boolean));
  };

  disegna();
  aggiungi(f.corpo, [zona]);
  return f;
}

function campoLibero(salva) {
  let bozza = { nome: "", kcal: 0, p: 0, c: 0, g: 0 };
  const zona = el("div", { class: "pa-libero" });
  const avvisoNodo = el("p", { class: "nota" });

  const campi = el("div", { class: "pa-griglia-macro" }, [
    campo({ etichetta: "kcal", tipo: "number", valore: "", alCambio: (v) => { bozza.kcal = Number(v) || 0; } }),
    campo({ etichetta: "Prot.", tipo: "number", valore: "", alCambio: (v) => { bozza.p = Number(v) || 0; } }),
    campo({ etichetta: "Carb.", tipo: "number", valore: "", alCambio: (v) => { bozza.c = Number(v) || 0; } }),
    campo({ etichetta: "Grassi", tipo: "number", valore: "", alCambio: (v) => { bozza.g = Number(v) || 0; } }),
  ]);

  aggiungi(zona, [
    campo({
      etichetta: "Cosa", segnaposto: "pizzetta, panino col prosciutto…",
      alCambio: (v) => {
        const letto = scostamentoDaTesto(v);
        bozza.nome = letto?.nome || v;
        // Se ha scritto anche i numeri nella riga, si prendono da lì — ma
        // senza sovrascrivere quello che ha già messo nei campi.
        if (letto?.completo && !bozza.kcal) {
          bozza = { ...bozza, kcal: letto.kcal, p: letto.p, c: letto.c, g: letto.g };
          const n = campi.querySelectorAll("input");
          [letto.kcal, letto.p, letto.c, letto.g].forEach((x, i) => { if (x) n[i].value = x; });
        }
      },
    }),
    campi,
    el("button", {
      class: "btn primario pieno", type: "button", testo: "Segna",
      onClick: () => {
        if (!bozza.nome.trim()) { avvisoNodo.className = "nota negativo"; avvisoNodo.textContent = "Manca il nome."; return; }
        // Le calorie NON si inventano: un bilancio che sembra preciso e non
        // lo è è peggio di uno che dichiara di non sapere.
        if (!bozza.kcal) { avvisoNodo.className = "nota negativo"; avvisoNodo.textContent = "Mancano le calorie: senza, il conto della giornata direbbe una bugia."; return; }
        salva(bozza);
      },
    }),
    avvisoNodo,
  ]);
  return zona;
}

const oraAdesso = () => new Date().toTimeString().slice(0, 5);

/** La fascia più probabile a quest'ora: quella il cui orario è più vicino. */
function fasciaDallOra(ora = oraAdesso()) {
  const min = (s) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));
  const adesso = min(ora);
  return FASCE.reduce((migliore, f) =>
    Math.abs(min(f.ora) - adesso) < Math.abs(min(migliore.ora) - adesso) ? f : migliore, FASCE[0]).id;
}

/* =========================================================================
   LA SETTIMANA
   ========================================================================= */

export function vistaSettimana(lunedi, ridisegna) {
  const b = bersagli();
  const s = settimanaCalcolo(lunedi);
  const piano = pianoSettimana(lunedi);
  const oggi = oggiISO();

  return el("div", {}, [
    scheda("Media della settimana", [
      el("div", { class: "pa-macro" }, [
        rigaConfronto("Calorie", s.media.kcal, b.kcal, "kcal", "var(--accento)"),
        rigaConfronto(NOMI_MACRO.p, s.media.p, b.p, "g", TINTE.p),
        rigaConfronto(NOMI_MACRO.c, s.media.c, b.c, "g", TINTE.c),
        rigaConfronto(NOMI_MACRO.g, s.media.g, b.g, "g", TINTE.g),
      ]),
      el("p", { class: "nota", testo:
        "La media conta più del singolo giorno: una cena saltata il martedì non è un problema se la settimana torna." }),
    ]),

    scheda("I sette giorni", [
      lista(s.giorni.map((g, i) => {
        const pianoG = piano?.giorni?.[g.iso] || {};
        const principali = ["pranzo", "cena"]
          .map((f) => (regimeDi(g.iso, f) === "fuori" ? "fuori" : pasto(pianoG[f])?.nome))
          .filter(Boolean);
        return riga({
          etichetta: `${GIORNI[i][0].toUpperCase()}${GIORNI[i].slice(1)} ${dataBreve(g.iso)}`,
          dettaglio: principali.join(" · ") || "da pianificare",
          valore: `${kcal(g.totale.kcal)} kcal`,
          tono: g.iso === oggi ? "positivo" : "",
        });
      })),
    ]),

    scheda(null, [
      el("button", {
        class: "btn tenue pieno", type: "button",
        testo: piano ? "Rigenera la settimana" : "Genera la settimana",
        onClick: () => {
          const esito = piano ? rigenera(lunedi) : assicuraPiano(lunedi);
          avviso(esito.creato ? "Settimana rifatta." : `Non fatto: ${esito.motivo}.`,
            { tono: esito.creato ? "" : "errore" });
          ridisegna();
        },
      }),
      piano?.bloccato ? el("p", { class: "nota", testo:
        "Questa settimana l'hai modificata a mano, quindi il generatore la lascia stare. Rigenerandola perdi le modifiche." }) : null,
    ].filter(Boolean)),
  ]);
}

function rigaConfronto(nome, valore, bersaglio, unita, tinta) {
  const f = bersaglio ? valore / bersaglio : 0;
  return el("div", { class: "pa-macro-voce" }, [
    el("div", { class: "pa-macro-riga" }, [
      el("span", { class: "pa-macro-nome", testo: nome }),
      el("span", { class: "pa-macro-cifra", testo: `${numero(Math.round(valore))} / ${numero(bersaglio)} ${unita}` }),
    ]),
    traccia(f, "", { sottile: true, colore: tinta }),
  ]);
}

/* =========================================================================
   L'IMPORT
   ========================================================================= */

export function apriImport(ridisegna) {
  const f = apriFoglio({ titolo: "Importa pasti" });
  const area = el("textarea", { class: "campo pa-area", rows: 9, placeholder: '{ "pasti": [ … ] }' });
  const esito = el("p", { class: "nota" });

  aggiungi(f.corpo, [
    el("p", { class: "nota", testo:
      "Incolla qui il JSON che ti dà la chat. Le staccionate ``` vanno bene: le tolgo io." }),
    el("button", {
      class: "btn tenue pieno", type: "button", testo: "Copia il prompt per la chat",
      onClick: async (e) => {
        try {
          await navigator.clipboard.writeText(PROMPT_CHAT);
          avviso("Prompt copiato.");
        } catch {
          // Safari lo blocca fuori da un gesto diretto: si mostra e basta.
          e.currentTarget.after(el("pre", { class: "pa-prompt", testo: PROMPT_CHAT }));
        }
      },
    }),
    area,
    el("button", {
      class: "btn primario pieno", type: "button", testo: "Importa",
      onClick: () => {
        const letto = pastiDaJSON(area.value);
        if (!letto.voci.length) {
          esito.className = "nota negativo";
          esito.textContent = letto.motivo;
          return;
        }
        const r = importaPasti(area.value);
        esito.className = "nota positivo";
        esito.textContent = `${plurale(r.salvati, "pasto importato", "pasti importati")}${r.scartate ? `, ${r.scartate} scartati` : ""}.`;
        avviso(`${r.salvati} nel database.`);
        ridisegna();
      },
    }),
    esito,
  ]);
  return f;
}

/* =========================================================================
   LE IMPOSTAZIONI
   ========================================================================= */

export function vistaImpostazioni(ridisegna = () => {}) {
  const zona = el("div", {});

  const disegna = () => {
    zona.replaceChildren();
    const p = profilo();
    const b = bersagli();
    const cop = copertura();

    aggiungi(zona, [
      scheda("Te", [
        el("div", { class: "pa-griglia-macro" }, [
          campo({ etichetta: "Peso (kg)", tipo: "number", valore: pesoAttuale() || "",
            alCambio: (v) => { if (Number(v) > 0) registraPeso(Number(v)); } }),
          campo({ etichetta: "Altezza (cm)", tipo: "number", valore: p.altezzaCm || "",
            alCambio: (v) => scriviProfilo({ altezzaCm: Number(v) || 0 }) }),
          campo({ etichetta: "Età", tipo: "number", valore: eta(p) || "",
            alCambio: (v) => scriviProfilo({ etaDichiarata: Number(v) || 0, etaDichiarataIl: oggiISO(), nascita: "" }) }),
        ]),
        el("p", { class: "nota", testo:
          `Il peso è una serie, non un numero: ne hai ${plurale(serieePesi().length, "pesata", "pesate")}. Il fabbisogno cresce insieme a te.` }),
      ]),

      scheda("Obiettivo", [
        segmenti(Object.entries(OBIETTIVI).map(([k, v]) => [k, v.nome]), p.obiettivo,
          (v) => { scriviProfilo({ obiettivo: v }); disegna(); ridisegna(); }),
        el("div", { class: "micro pa-spazio", testo: "Attività" }),
        segmenti(Object.entries(ATTIVITA).map(([k, v]) => [k, v.nome]), p.attivita,
          (v) => { scriviProfilo({ attivita: v }); disegna(); ridisegna(); }),
        el("div", { class: "pa-griglia-macro pa-spazio" }, [
          campo({ etichetta: "Surplus (kcal)", tipo: "number", valore: p.surplusKcal,
            alCambio: (v) => { scriviProfilo({ surplusKcal: Number(v) || 0 }); } }),
          campo({ etichetta: "Prot. g/kg", tipo: "number", valore: p.proteineGkg,
            alCambio: (v) => { scriviProfilo({ proteineGkg: Number(v) || 0 }); } }),
          campo({ etichetta: "Grassi g/kg", tipo: "number", valore: p.grassiGkg,
            alCambio: (v) => { scriviProfilo({ grassiGkg: Number(v) || 0 }); } }),
        ]),
      ]),

      scheda("Il tuo fabbisogno", [
        lista([
          riga({ etichetta: "Metabolismo basale", valore: `${kcal(metabolismoBasale())} kcal` }),
          riga({ etichetta: "Mantenimento", valore: `${kcal(mantenimento())} kcal` }),
          riga({ etichetta: "Bersaglio", valore: `${kcal(b.kcal)} kcal`, tono: "positivo" }),
          riga({ etichetta: NOMI_MACRO.p, valore: gr(b.p) }),
          riga({ etichetta: NOMI_MACRO.c, valore: gr(b.c) }),
          riga({ etichetta: NOMI_MACRO.g, valore: gr(b.g) }),
        ]),
        el("p", { class: "nota", testo:
          "Proteine e grassi si fissano sul peso perché sono fabbisogni; i carboidrati prendono quello che resta, perché sono il carburante." }),
      ]),

      scheda("La settimana tipo", [
        el("div", { class: "pa-tipo" }, [
          el("div", { class: "pa-tipo-riga pa-tipo-capo" }, [
            el("span", {}),
            ...GIORNI_INIZIALI.map((g, i) => el("span", { class: "micro", testo: g, key: i })),
          ]),
          ...FASCE.map((f) => el("div", { class: "pa-tipo-riga" }, [
            el("span", { class: "pa-tipo-nome", testo: f.nome }),
            ...Array.from({ length: 7 }, (_, i) => {
              const attuale = p.settimanaTipo?.[i]?.[f.id] || "salto";
              return el("button", {
                class: `pa-cella is-${attuale}`, type: "button",
                title: `${GIORNI[i]} · ${f.nome}: ${REGIMI[attuale]}`,
                "aria-label": `${GIORNI[i]} ${f.nome}: ${REGIMI[attuale]}`,
                onClick: () => {
                  const ordine = ["casa", "fuori", "salto"];
                  const prossimo = ordine[(ordine.indexOf(attuale) + 1) % 3];
                  const tipo = (p.settimanaTipo || []).map((g, j) => (j === i ? { ...g, [f.id]: prossimo } : g));
                  scriviProfilo({ settimanaTipo: tipo });
                  disegna(); ridisegna();
                },
              });
            }),
          ])),
        ]),
        el("p", { class: "nota", testo: "Tocca una casella per girare fra casa, fuori e saltato." }),
      ]),

      scheda("Quando mangi fuori", [
        el("p", { class: "nota", testo:
          "Una stima, non una misura. Ma uno zero al posto del pranzo renderebbe bugiardo il bilancio di quattro giorni su sette." }),
        ...ID_FASCE.filter((f) => (p.settimanaTipo || []).some((g) => g?.[f] === "fuori")).map((f) => {
          const s = p.stimeFuori?.[f] || { kcal: 0, p: 0, c: 0, g: 0 };
          const scrivi = (campo2, v) => scriviProfilo({
            stimeFuori: { ...p.stimeFuori, [f]: { ...s, [campo2]: Number(v) || 0 } },
          });
          return el("div", {}, [
            el("div", { class: "micro pa-spazio", testo: nomeFascia(f) }),
            el("div", { class: "pa-griglia-macro" }, [
              campo({ etichetta: "kcal", tipo: "number", valore: s.kcal, alCambio: (v) => scrivi("kcal", v) }),
              campo({ etichetta: "Prot.", tipo: "number", valore: s.p, alCambio: (v) => scrivi("p", v) }),
              campo({ etichetta: "Carb.", tipo: "number", valore: s.c, alCambio: (v) => scrivi("c", v) }),
              campo({ etichetta: "Grassi", tipo: "number", valore: s.g, alCambio: (v) => scrivi("g", v) }),
            ]),
          ]);
        }),
      ]),

      scheda("Il database", [
        ...cop.avvisi.map((a) => el("p", { class: "nota attenzione", testo: a.testo })),
        lista(FASCE.map((f) => riga({
          etichetta: f.nome,
          valore: plurale(pastiPerFascia(f.id).length, "pasto", "pasti"),
          azione: () => foglioDatabase(f.id, () => { disegna(); ridisegna(); }),
        }))),
        el("button", {
          class: "btn tenue pieno", type: "button", testo: "Importa dalla chat",
          onClick: () => apriImport(() => { disegna(); ridisegna(); }),
        }),
      ]),

      ...(daPromuovere().length ? [scheda("Lo mangi spesso", [
        el("p", { class: "nota", testo: "Queste cose tornano da sole. Vuoi che entrino nel database, così il generatore può usarle?" }),
        lista(daPromuovere().map((t) => riga({
          etichetta: t.nome,
          dettaglio: `${plurale(t.volte, "volta", "volte")}${t.ora ? ` · verso le ${t.ora}` : ""}`,
          valore: "aggiungi",
          azione: () => {
            salvaPasti([{ nome: t.nome, fasce: [t.fascia].filter(Boolean), ...t.macro, fonte: "appreso" }]);
            avviso("Nel database.");
            disegna(); ridisegna();
          },
        }))),
      ])] : []),
    ]);
  };

  disegna();
  return zona;
}

function foglioDatabase(fascia, ridisegna) {
  const f = apriFoglio({ titolo: nomeFascia(fascia) });
  const zona = el("div", {});

  const disegna = () => {
    zona.replaceChildren();
    const tutti = pastiVivi().filter((p) => (p.fasce || []).includes(fascia));
    aggiungi(zona, tutti.length ? [
      lista(tutti.map((p) => riga({
        etichetta: p.nome,
        dettaglio: `${kcal(p.kcal)} kcal · ${p.p} P · ${p.c} C · ${p.g} G`,
        valore: p.attivo === false ? "spento" : "",
        azione: () => {
          const g = apriFoglio({ titolo: p.nome, mezzo: true });
          aggiungi(g.corpo, [
            el("button", {
              class: "btn tenue pieno", type: "button",
              testo: p.attivo === false ? "Rimettilo in rotazione" : "Toglilo dalla rotazione",
              onClick: () => { alternaAttivo(p.id); g.chiudi(); disegna(); ridisegna(); },
            }),
            el("button", {
              class: "btn tenue pieno pa-elimina", type: "button", testo: "Elimina",
              onClick: () => { eliminaPasto(p.id); g.chiudi(); avviso("Eliminato."); disegna(); ridisegna(); },
            }),
            el("p", { class: "nota", testo:
              "«Toglilo dalla rotazione» lo lascia nello storico ma il generatore non lo usa più. «Elimina» lo toglie e basta." }),
          ]);
        },
      }))),
    ] : [vuoto("Niente qui dentro.", "Importane dalla chat.")]);
  };

  disegna();
  aggiungi(f.corpo, [zona]);
  return f;
}
