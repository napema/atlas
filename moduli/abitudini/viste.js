// moduli/abitudini/viste.js — dal risultato del calcolo agli elementi.
//
// Nessun calcolo qui dentro: tutto arriva da calcolo.js. Se in questo file
// compare un `for` che conta qualcosa, è nel posto sbagliato.

import {
  el, aggiungi, anello, apriFoglio, chiudiFoglio, avviso, tocco,
  campo, segmenti, pillole, lista, riga, vuoto, nuovoId,
  oggiISO, piuGiorni, daISO, GIORNI_INIZIALI, dataUmana, plurale,
} from "../../core/ui.js";
import { icona } from "../../core/icone.js";
import {
  abitudiniVive, abitudinePerId, eFatta, alterna, stato, scriviMeta,
  salvaAbitudine, eliminaAbitudine, coloreTinta, TINTE,
  FASCE, partiDi, parteFatta, alternaParte,
} from "./dati.js";
import {
  progressoGiorno, eAttesa, serie, serieMigliore, costanza, fattaIl, ePrevista,
  etichettaPiano, giorniSettimana, pianoDi, conteggioSettimana,
} from "./calcolo.js";

const EMOJI_PREDEFINITA = "⭐️";

/* ---------------------------------------------------- striscia settimana --
   Sette giorni con l'anello del completamento. Serve a rispondere con la
   coda dell'occhio a "come sta andando la settimana", che è una domanda
   diversa da "cosa devo fare oggi". */

export function strisciaSettimana(giornoScelto, alCambio) {
  const oggi = oggiISO();
  const barra = el("nav", { class: "ab-settimana", "aria-label": "Settimana" });

  for (const g of giorniSettimana(giornoScelto)) {
    const futuro = g > oggi;
    const p = progressoGiorno(g);
    const b = el("button", {
      class: "ab-giorno" + (g === giornoScelto ? " scelto" : "") + (g === oggi ? " oggi" : "") + (futuro ? " futuro" : ""),
      type: "button",
      "aria-pressed": String(g === giornoScelto),
      "aria-label": dataUmana(g),
      disabled: futuro,
      onClick: () => { tocco(6); alCambio(g); },
    }, [
      el("span", { class: "ab-giorno-lettera", testo: GIORNI_INIZIALI[(daISO(g).getDay() + 6) % 7] }),
      el("span", { class: "ab-giorno-anello" }, [
        anello(futuro ? 0 : p.frazione, { misura: 34, spessore: 3 }),
        el("span", { class: "ab-giorno-numero", testo: String(daISO(g).getDate()) }),
      ]),
    ]);
    barra.append(b);
  }
  return barra;
}

/* -------------------------------------------------------------- l'eroe -- */
/* «Quante ne restano» è la domanda, e la risposta è una cifra sola. L'anello
   c'era anche prima ma stava di fianco a un testo della stessa dimensione:
   due cose che pesano uguale non fanno gerarchia. */

export function riepilogo(giorno) {
  const p = progressoGiorno(giorno);
  const restano = Math.max(0, p.attese - p.fatte);
  const tutto = p.attese > 0 && restano === 0;

  const s = el("section", { class: "ab-eroe" + (tutto ? " completa" : "") }, [
    el("div", { class: `micro ${tutto ? "ok" : ""}`,
      testo: !p.attese ? "Giornata libera" : tutto ? "Tutto fatto" : "Ancora da fare" }),

    el("div", { class: "ab-eroe-corpo" }, [
      el("div", { class: "ab-eroe-numeri" }, [
        el("div", { class: "cifra cifra-xl", testo: !p.attese ? "—" : tutto ? String(p.fatte) : String(restano) }),
        el("p", { class: "ab-eroe-nota", testo: !p.attese
          ? "Nessuna abitudine prevista per questo giorno."
          : tutto ? plurale(p.fatte, "abitudine spuntata", "abitudini spuntate")
          : `${plurale(restano, "abitudine", "abitudini")} · ${p.fatte} di ${p.attese} già fatte` }),
      ]),
      el("div", { class: "ab-eroe-anello" }, [
        anello(p.frazione, { misura: 82, spessore: 7 }),
        el("span", { class: "ab-eroe-pct", testo: `${Math.round(p.frazione * 100)}%` }),
      ]),
    ]),
  ]);
  return s;
}

/* -------------------------------------------------------- elenco e righe -- */

export function elenco(giorno, ridisegna) {
  const tutte = abitudiniVive();
  if (!tutte.length) {
    return vuoto("Nessuna abitudine", "Toccando + ne aggiungi la prima.");
  }

  const attese = tutte.filter((h) => eAttesa(h, giorno));
  const altre = tutte.filter((h) => !eAttesa(h, giorno));

  const fuori = el("div", {});
  if (attese.length) {
    fuori.append(lista(attese.map((h) => rigaAbitudine(h, giorno, ridisegna))));
  }
  if (altre.length) {
    fuori.append(el("div", { class: "gruppo-titolo", testo: "Non previste oggi" }));
    fuori.append(lista(altre.map((h) => rigaAbitudine(h, giorno, ridisegna, { spenta: true }))));
  }
  return fuori;
}

function rigaAbitudine(h, giorno, ridisegna, { spenta = false } = {}) {
  const parti = partiDi(h);
  // Con le parti la spunta del genitore non si tocca a mano: è vera quando
  // sono vere tutte le parti. Spuntare «integratori» in blocco alle undici
  // di sera è esattamente quello che le parti servono a impedire.
  const fatta = fattaIl(h, giorno);
  const colore = coloreTinta(h.tint);
  const n = serie(h);

  // Il cerchio disegnato è da 30px, il bersaglio da 44: il pollice ha
  // bisogno del secondo, l'occhio del primo. Da qui il figlio.
  const spunta = el("button", {
    class: "ab-spunta" + (fatta ? " fatta" : ""),
    type: "button",
    "aria-pressed": String(fatta),
    "aria-label": fatta ? `Togli ${h.name}` : `Segna ${h.name}`,
    disabled: parti.length > 0,
    onClick: (e) => {
      e.stopPropagation();
      alterna(h.id, giorno);
      tocco(fatta ? 6 : 12);
      ridisegna();
    },
  }, [el("span", { class: "ab-spunta-cerchio", html: icona("spunta", 18, 2.6) })]);
  spunta.style.setProperty("--accento", colore);

  const corpo = el("button", {
    class: "riga ab-riga",
    type: "button",
    onClick: () => apriDettaglio(h.id, ridisegna),
  }, [
    el("span", { class: "ab-emoji", testo: h.emoji || EMOJI_PREDEFINITA }),
    el("span", { class: "ab-testo" }, [
      el("span", { class: "ab-nome" + (fatta ? " fatta" : ""), testo: h.name }),
      el("span", { class: "nota", testo: etichettaPiano(h) }),
    ]),
    n > 0 && el("span", { class: "ab-serie", title: `${n} di fila` }, [
      el("span", { html: icona("fiamma", 14) }),
      el("span", { testo: String(n) }),
    ]),
  ]);

  const li = el("li", { class: "ab-li" + (spenta ? " spenta" : "") }, [
    el("div", { class: "ab-riga-fuori" }, [spunta, corpo]),
    parti.length > 0 && el("ul", { class: "ab-parti" }, parti.map((p) => {
      const pf = parteFatta(h.id, p.id, giorno);
      const b = el("button", {
        class: "ab-parte" + (pf ? " fatta" : ""),
        type: "button", "aria-pressed": String(pf),
        onClick: () => { alternaParte(h.id, p.id, giorno); tocco(pf ? 6 : 12); ridisegna(); },
      }, [
        el("span", { class: "ab-parte-spunta", html: icona("spunta", 13, 3) }),
        el("span", { class: "ab-parte-nome", testo: p.nome }),
        el("span", { class: "ab-parte-fascia", testo: FASCE[p.fascia || "qualsiasi"]?.nome || "" }),
      ]);
      b.style.setProperty("--accento", colore);
      return el("li", {}, [b]);
    })),
  ]);
  return li;
}

/* ------------------------------------------------------------- dettaglio -- */

export function apriDettaglio(id, ridisegna) {
  const h = abitudinePerId(id);
  if (!h) return;
  const colore = coloreTinta(h.tint);

  const { corpo, chiudi } = apriFoglio({
    titolo: h.name,
    sinistra: el("button", { class: "btn nudo", type: "button", testo: "Fine", onClick: () => chiudiFoglio() }),
    destra: el("button", {
      class: "btn nudo", type: "button", testo: "Modifica",
      onClick: () => { chiudiFoglio(); apriModifica(id, ridisegna); },
    }),
    alChiudi: ridisegna,
  });
  corpo.style.setProperty("--accento", colore);

  const p = pianoDi(h);
  const attuale = serie(h);
  const migliore = serieMigliore(h);

  aggiungi(corpo, [
    el("div", { class: "ab-dett-testa" }, [
      el("span", { class: "ab-dett-emoji", testo: h.emoji || EMOJI_PREDEFINITA }),
      el("div", {}, [
        el("div", { class: "ab-dett-nome", testo: h.name }),
        el("div", { class: "nota", testo: etichettaPiano(h) }),
      ]),
    ]),

    el("div", { class: "riquadri" }, [
      el("div", { class: "riquadro" }, [
        el("div", { class: "micro", testo: "Serie attuale" }),
        el("div", { class: "cifra", testo: `${attuale}` }),
        el("div", { class: "nota", testo: p.type === "weekly" ? "settimane di fila" : "giorni di fila" }),
      ]),
      el("div", { class: "riquadro" }, [
        el("div", { class: "micro", testo: "Record" }),
        el("div", { class: "cifra", testo: `${migliore}` }),
        el("div", { class: "nota", testo: migliore > attuale ? "da battere" : "sei al massimo" }),
      ]),
    ]),

    el("section", { class: "scheda" }, [
      el("div", { class: "scheda-titolo" }, [el("span", { testo: "Ultimi 30 giorni" })]),
      grigliaTrenta(h),
      el("div", { class: "nota", testo: `${costanza(h, 30)}% dei giorni previsti.` }),
    ]),

    p.type === "weekly" && el("section", { class: "scheda" }, [
      el("div", { class: "scheda-titolo" }, [el("span", { testo: "Questa settimana" })]),
      el("div", { class: "cifra", testo: `${conteggioSettimana(h, oggiISO())} di ${p.times || 1}` }),
    ]),

    h.remind && el("section", { class: "scheda" }, [
      riga({ etichetta: "Promemoria", valore: h.remind, icona: "campanella" }),
    ]),
  ]);
}

/** La griglia dei trenta giorni: una casella per giorno, piena se fatta. */
function grigliaTrenta(h) {
  const g = el("div", { class: "ab-griglia30" });
  const oggi = oggiISO();
  for (let i = 29; i >= 0; i--) {
    const d = piuGiorni(oggi, -i);
    const cls = fattaIl(h, d) ? " piena" : "";
    g.append(el("span", { class: `ab-cella${cls}`, title: dataUmana(d) }));
  }
  return g;
}

/* -------------------------------------------------------------- modifica -- */

const EMOJI_SUGGERITE = ["⭐️", "🧠", "💧", "🏃", "📖", "🧘", "💊", "🦷", "🌙", "☀️", "🥗", "🚭", "💪", "✍️", "🎸", "🧴"];

export function apriModifica(id, ridisegna) {
  const esistente = id ? abitudinePerId(id) : null;
  const bozza = esistente
    ? { ...esistente, sched: { ...pianoDi(esistente) } }
    : { id: nuovoId("h"), name: "", emoji: "⭐️", tint: "blue",
        sched: { type: "daily", days: [1, 2, 3, 4, 5, 6, 0], times: 3 }, remind: "", archived: false };

  const { corpo } = apriFoglio({
    titolo: esistente ? "Modifica" : "Nuova abitudine",
    sinistra: el("button", { class: "btn nudo", type: "button", testo: "Annulla", onClick: () => chiudiFoglio() }),
    destra: el("button", {
      class: "btn nudo", type: "button", testo: "Salva",
      onClick: () => {
        if (!bozza.name.trim()) { avviso("Serve un nome.", { tono: "errore" }); return; }
        // Le parti senza nome si buttano: una riga vuota nell'editor è
        // qualcuno che ha toccato «aggiungi» e ci ha ripensato.
        const parti = (bozza.parti || []).filter((p) => p.nome.trim()).map((p) => ({ ...p, nome: p.nome.trim() }));
        salvaAbitudine({ ...bozza, name: bozza.name.trim(), parti });
        chiudiFoglio();
        avviso(esistente ? "Modificata." : "Aggiunta.");
        ridisegna();
      },
    }),
    alChiudi: ridisegna,
  });

  // I campi che dipendono dal tipo si ridisegnano da soli quando cambia.
  const zonaPiano = el("div", {});
  const disegnaPiano = () => {
    zonaPiano.replaceChildren();
    if (bozza.sched.type === "days") {
      // Le pillole si mostrano da lunedì, ma il VALORE resta alla JS
      // (0 = domenica): è ciò che sta nei dati, e convertirlo qui
      // significherebbe convertirlo anche in senso opposto al salvataggio.
      const ordine = [1, 2, 3, 4, 5, 6, 0];
      zonaPiano.append(el("label", { class: "campo-etichetta", testo: "Giorni" }));
      zonaPiano.append(pillole(
        ordine.map((d, i) => [String(d), GIORNI_INIZIALI[i]]),
        (bozza.sched.days || []).map(String),
        (scelti) => { bozza.sched.days = scelti.map(Number); },
        { multiplo: true }
      ));
    } else if (bozza.sched.type === "weekly") {
      zonaPiano.append(el("label", { class: "campo-etichetta", testo: "Volte a settimana" }));
      zonaPiano.append(pillole(
        [1, 2, 3, 4, 5, 6].map((n) => [String(n), `${n}×`]),
        String(bozza.sched.times || 3),
        (v) => { bozza.sched.times = Number(v); }
      ));
      zonaPiano.append(el("p", {
        class: "nota", style: "margin-top:var(--s2)",
        testo: "Il giorno lo scegli tu. L'app la chiede solo quando saltarla ti farebbe mancare la quota.",
      }));
    }
  };
  disegnaPiano();

  /* ------------------------------------------------------------- le parti --
     Un'abitudine può essere una cosa sola o un contenitore di cose. Gli
     integratori sono quattro pastiglie in tre momenti diversi: con una
     casella unica la spunti la sera per tutte e quattro, e il dato smette
     di dire qualcosa. Con le parti, la home sa dire «prendi il magnesio»
     alle dieci di sera invece di «ti mancano gli integratori». */

  bozza.parti = Array.isArray(bozza.parti) ? bozza.parti.map((p) => ({ ...p })) : [];
  const zonaParti = el("div", { class: "campo-gruppo ab-editor-parti" });

  const disegnaParti = () => {
    zonaParti.replaceChildren();
    aggiungi(zonaParti, [
      el("label", { class: "campo-etichetta", testo: "Parti" }),
      el("p", { class: "nota", stile: { margin: "0 0 var(--s3)" }, testo: bozza.parti.length
        ? "Ognuna si spunta da sé, e la home ricorda solo quella della fascia in corso."
        : "Facoltative. Servono quando una spunta sola nasconde più cose in momenti diversi della giornata." }),

      ...bozza.parti.map((p, i) => el("div", { class: "ab-editor-parte" }, [
        campo({
          valore: p.nome, segnaposto: "Magnesio",
          alCambio: (v) => { p.nome = v; },
        }),
        segmenti(
          Object.entries(FASCE).map(([k, f]) => [k, f.nome]),
          p.fascia || "qualsiasi",
          (v) => { p.fascia = v; }
        ),
        el("button", {
          class: "btn distruttivo nudo piccolo", type: "button", testo: "Togli",
          onClick: () => { bozza.parti.splice(i, 1); disegnaParti(); },
        }),
      ])),

      el("button", {
        class: "btn tenue pieno", type: "button", testo: "Aggiungi una parte",
        onClick: () => { bozza.parti.push({ id: nuovoId("pt"), nome: "", fascia: "qualsiasi" }); disegnaParti(); },
      }),
    ]);
  };
  disegnaParti();

  aggiungi(corpo, [
    campo({
      etichetta: "Nome", valore: bozza.name, segnaposto: "Meditazione",
      alCambio: (v) => { bozza.name = v; },
    }),

    sceglieEmoji(bozza),

    el("div", { class: "campo-gruppo" }, [
      el("label", { class: "campo-etichetta", testo: "Colore" }),
      el("div", { class: "ab-tinte" }, TINTE.map((t) => {
        const b = el("button", {
          class: "ab-tinta" + (t === bozza.tint ? " scelta" : ""),
          type: "button", "aria-label": t,
          onClick: () => {
            bozza.tint = t;
            for (const x of b.parentElement.children) x.classList.toggle("scelta", x === b);
          },
        });
        b.style.background = coloreTinta(t);
        return b;
      })),
    ]),

    el("div", { class: "campo-gruppo" }, [
      el("label", { class: "campo-etichetta", testo: "Quando" }),
      segmenti(
        [["daily", "Ogni giorno"], ["days", "Certi giorni"], ["weekly", "A settimana"]],
        bozza.sched.type,
        (v) => { bozza.sched.type = v; disegnaPiano(); }
      ),
    ]),
    zonaPiano,

    zonaParti,

    el("div", { class: "campo-gruppo", style: "margin-top:var(--s4)" }, [
      campo({
        etichetta: "Promemoria", tipo: "time", valore: bozza.remind || "",
        alCambio: (v) => { bozza.remind = v; },
      }),
      el("p", { class: "nota", testo: "Vuoto = nessuna notifica. Arriva solo se non l'hai ancora segnata." }),
    ]),

    esistente && el("button", {
      class: "btn distruttivo pieno", type: "button", testo: "Elimina abitudine",
      style: "margin-top:var(--s6)",
      onClick: (e) => {
        // Niente conferma nativa: `confirm()` in PWA su iOS blocca il thread
        // e a volte non si chiude. Doppio tocco sullo stesso pulsante.
        const b = e.currentTarget;
        if (b.dataset.sicuro !== "1") {
          b.dataset.sicuro = "1";
          b.textContent = "Tocca di nuovo per eliminare";
          setTimeout(() => { b.dataset.sicuro = ""; b.textContent = "Elimina abitudine"; }, 3000);
          return;
        }
        eliminaAbitudine(esistente.id);
        chiudiFoglio();
        avviso("Eliminata.");
        ridisegna();
      },
    }),
  ]);
}

/* =========================================================== IMPOSTAZIONI
   La sezione "Abitudini" della schermata Impostazioni: le abitudini in
   elenco (comprese le archiviate) e l'inizio settimana. */

export function vistaImpostazioni(ridisegna) {
  const s = stato();
  const vive = abitudiniVive();
  const archiviate = abitudiniVive({ conArchiviate: true }).filter((h) => h.archived);

  return el("div", {}, [
    el("section", { class: "scheda" }, [
      el("div", { class: "scheda-titolo" }, [el("span", { testo: "La settimana comincia" })]),
      segmenti([["1", "Lunedì"], ["0", "Domenica"]], String(s.meta.weekStart ?? 1), (v) => {
        scriviMeta({ weekStart: Number(v) });
        avviso("Salvato.");
        ridisegna();
      }),
      el("p", { class: "nota", testo:
        "Conta per le serie delle abitudini settimanali: cambia quando si azzera il conteggio delle volte." }),
    ]),

    el("div", { class: "gruppo-titolo", testo: `Le tue abitudini (${vive.length})` }),
    vive.length
      ? lista(vive.map((h) => riga({
          etichetta: `${h.emoji || "⭐️"}  ${h.name}`,
          valore: etichettaPiano(h),
          azione: () => apriModifica(h.id, ridisegna),
        })))
      : el("p", { class: "nota", testo: "Nessuna abitudine. Si aggiungono dal + nella schermata Abitudini." }),

    el("button", {
      class: "btn tenue pieno", type: "button", testo: "Aggiungi un'abitudine",
      onClick: () => apriModifica(null, ridisegna),
    }),

    archiviate.length > 0 && el("div", { class: "gruppo-titolo", testo: `Archiviate (${archiviate.length})` }),
    archiviate.length > 0 && lista(archiviate.map((h) => riga({
      etichetta: `${h.emoji || "⭐️"}  ${h.name}`,
      valore: "archiviata",
      azione: () => apriModifica(h.id, ridisegna),
    }))),

    el("p", { class: "nota", style: "margin-top:var(--s5)", testo:
      "Archiviare un'abitudine la toglie dal giorno senza cancellare lo storico: le serie passate restano, e riattivandola riparte da dove era." }),
  ]);
}

/* ================================================================= SERIE
   La vista dedicata alle strisce.

   Perché una vista e non un numero in più nell'elenco: una serie diventa
   una leva solo quando la vedi crescere e vedi cosa rischi di perdere. Nel
   listino di oggi il fuoco accanto al nome è un dettaglio; qui è il punto.

   Le tre cose che rendono una striscia motivante e non colpevolizzante,
   nell'ordine in cui contano:

     1. il numero corrente, grande;
     2. il RECORD, perché è l'unica cifra che dà un bersaglio;
     3. il rischio di oggi — «se salti stasera perdi 12 giorni» — che è
        l'informazione azionabile, e va detta solo quando è vera.

   Quello che NON c'è, deliberatamente: punteggi, livelli, medaglie. Una
   serie è già un punteggio, e sovrapporne un secondo lo svaluta. */

export function vistaSerie(ridisegna) {
  const oggi = oggiISO();
  const tutte = abitudiniVive();
  const fuori = el("div", {});

  if (!tutte.length) {
    fuori.append(vuoto("Nessuna abitudine", "Le serie compaiono appena ne aggiungi una."));
    return fuori;
  }

  const righe = tutte.map((h) => ({
    h,
    n: serie(h, oggi),
    record: serieMigliore(h, oggi),
    cost: costanza(h, 30, oggi),
    fatta: fattaIl(h, oggi),
    attesa: eAttesa(h, oggi),
  })).sort((a, b) => b.n - a.n || b.record - a.record);

  /* --- l'eroe: la serie che regge tutte le altre --------------------- */
  const migliore = righe[0];
  const aRischio = righe.filter((r) => r.n > 0 && r.attesa && !r.fatta);

  aggiungi(fuori, [el("section", { class: "ab-serie-eroe" }, [
    el("div", { class: "micro", testo: "La più lunga in corso" }),
    el("div", { class: "ab-serie-cifra" }, [
      el("span", { class: "cifra cifra-xl", testo: String(migliore.n) }),
      el("span", { class: "ab-serie-unita", testo: migliore.n === 1 ? "giorno" : "giorni" }),
    ]),
    el("p", { class: "ab-serie-chi", testo: migliore.n > 0
      ? migliore.h.name
      : "Nessuna serie aperta. Se spunti qualcosa oggi ne parte una." }),

    // Il rischio si dice una volta sola e in fondo, non su ogni riga: è la
    // frase che fa alzare dal divano, e ripetuta cinque volte non la fa più.
    aRischio.length > 0 && el("p", { class: "ab-serie-rischio", testo: aRischio.length === 1
      ? `Se stasera salti ${aRischio[0].h.name.toLowerCase()} perdi ${plurale(aRischio[0].n, "giorno", "giorni")}.`
      : `${plurale(aRischio.length, "serie aperta", "serie aperte")} da difendere oggi.` }),
  ])]);

  /* --- una riga per abitudine ---------------------------------------- */
  aggiungi(fuori, [
    el("div", { class: "sezione-titolo" }, [
      el("h3", { testo: "Tutte le serie" }),
      el("span", { class: "nota", testo: "corrente · record" }),
    ]),
    el("ul", { class: "ab-serie-lista" }, righe.map((r) => {
      // La barra confronta la serie in corso col RECORD, non con un numero
      // tondo: il bersaglio giusto è quello che hai già fatto una volta.
      const f = r.record > 0 ? Math.min(1, r.n / r.record) : 0;
      const li = el("li", {}, [el("button", {
        class: "ab-serie-riga" + (r.n > 0 && r.attesa && !r.fatta ? " rischio" : ""),
        type: "button",
        onClick: () => apriDettaglio(r.h.id, ridisegna),
      }, [
        el("span", { class: "ab-serie-emoji", testo: r.h.emoji || EMOJI_PREDEFINITA }),
        el("span", { class: "ab-serie-nome" }, [
          el("span", { testo: r.h.name }),
          el("span", { class: "nota-2", testo: `${r.cost}% negli ultimi 30 giorni` }),
        ]),
        el("span", { class: "ab-serie-numeri" }, [
          el("span", { class: "ab-serie-corrente" + (r.n > 0 ? " viva" : ""), testo: String(r.n) }),
          el("span", { class: "ab-serie-record", testo: `/ ${r.record}` }),
        ]),
        el("span", { class: "ab-serie-barra" }, [
          el("i", { stile: { width: `${Math.round(f * 100)}%` } }),
        ]),
      ])]);
      li.querySelector(".ab-serie-riga").style.setProperty("--accento", coloreTinta(r.h.tint));
      return li;
    })),
  ]);

  /* --- il calendario delle ultime quattro settimane ------------------ */
  aggiungi(fuori, [el("section", { class: "scheda" }, [
    el("div", { class: "scheda-titolo", testo: "Ultime quattro settimane" }),
    el("p", { class: "nota", testo:
      "Una riga per abitudine, una casella per giorno. Serve a vedere DOVE si rompono: quasi sempre è sempre lo stesso giorno della settimana." }),
    el("div", { class: "ab-mappa" }, righe.map((r) => el("div", { class: "ab-mappa-riga" }, [
      el("span", { class: "ab-mappa-emoji", testo: r.h.emoji || EMOJI_PREDEFINITA }),
      el("div", { class: "ab-mappa-celle" }, Array.from({ length: 28 }, (_, i) => {
        const d = piuGiorni(oggi, -(27 - i));
        const prevista = ePrevista(r.h, d);
        const c = el("span", {
          class: "ab-mappa-cella" + (!prevista ? " spenta" : fattaIl(r.h, d) ? " piena" : ""),
          title: `${dataUmana(d)} · ${r.h.name}`,
        });
        if (prevista && fattaIl(r.h, d)) c.style.background = coloreTinta(r.h.tint);
        return c;
      })),
    ]))),
  ])]);

  return fuori;
}

/* ============================================================== EMOJI ====
   Il selettore del simbolo.

   Sedici emoji in una riga non bastavano: sono le sedici che ho scelto io,
   e la diciassettesima abitudine finiva sempre con la stella. Qui ce ne sono
   un centinaio raggruppate per argomento, con una casella per scriverne una
   qualsiasi — su iPhone quella casella apre la tastiera emoji di sistema,
   che resta il modo migliore di sceglierne una.

   SUL DISEGNO DELLE EMOJI, e vale la pena essere chiari perché è stato
   chiesto esplicitamente: le emoji Apple non si possono avere su Windows.
   Non è una scelta, è che il disegno sta dentro `Apple Color Emoji`, un font
   proprietario che è installato solo su macOS e iOS e che non si può
   ridistribuire. Le alternative sarebbero due, e nessuna delle due va bene
   qui: imbarcare un font emoji libero (Noto Color Emoji pesa dodici mega, e
   la regola è niente dipendenze pesanti) oppure sostituire ogni emoji con
   un'immagine da un CDN, che offline non c'è.

   Quello che si può fare, ed è fatto: dichiarare la pila giusta, così su
   iPhone escono le Apple e su Windows le Segoe invece di un quadratino o di
   un disegno preso a caso da un font di testo. Le emoji sono comunque gli
   stessi caratteri: sincronizzate fra i due dispositivi restano identiche,
   cambia solo come le disegna il sistema. */

const EMOJI = {
  "Salute": ["💊", "🩺", "🦷", "🧘", "😴", "🛌", "💧", "🥤", "🧴", "🧼", "🌡️", "🫀", "🧠", "👁️", "🦴"],
  "Movimento": ["🏃", "🚴", "🏋️", "🤸", "🧗", "🏊", "⚽", "🎾", "🥊", "⛹️", "🚶", "🧎", "🤾", "🏸", "🛹"],
  "Cibo": ["🥗", "🍎", "🥦", "🍳", "🥑", "🐟", "🍚", "🥜", "☕", "🍵", "🚫", "🍺", "🍫", "🧂", "🥛"],
  "Mente": ["📖", "✍️", "📝", "🎧", "🎸", "🎹", "🎨", "🧩", "♟️", "🗣️", "🌍", "💭", "📚", "🔬", "💡"],
  "Lavoro": ["💻", "📊", "📅", "✅", "📈", "🧾", "📮", "🗂️", "⏰", "🎯", "🚀", "🛠️", "🔑", "📌", "💼"],
  "Casa": ["🧹", "🧺", "🪴", "🐕", "🐈", "🍽️", "🛒", "🔧", "🚗", "🗑️", "🛏️", "🚿", "🪟", "🧽", "📦"],
  "Umore": ["⭐️", "🔥", "❤️", "🙏", "😌", "🌙", "☀️", "🌱", "🏆", "💎", "🎉", "🤝", "🕯️", "🧿", "✨"],
};

function sceglieEmoji(bozza) {
  const anteprima = el("span", { class: "ab-emoji-scelta emoji", testo: bozza.emoji || EMOJI_PREDEFINITA });
  const griglia = el("div", { class: "ab-emoji-griglia" });

  const scegli = (e) => {
    bozza.emoji = e;
    anteprima.textContent = e;
    for (const b of griglia.querySelectorAll(".ab-emoji-tasto")) {
      b.classList.toggle("scelta", b.textContent === e);
    }
    libero.value = "";
  };

  for (const [gruppo, elenco] of Object.entries(EMOJI)) {
    griglia.append(el("div", { class: "ab-emoji-gruppo", testo: gruppo }));
    griglia.append(el("div", { class: "ab-emoji-riga" }, elenco.map((e) => el("button", {
      class: "ab-emoji-tasto emoji" + (e === bozza.emoji ? " scelta" : ""),
      type: "button", testo: e, "aria-label": e,
      onClick: () => { scegli(e); tocco(6); },
    }))));
  }

  // La casella libera: su iPhone apre la tastiera emoji di sistema, che è il
  // selettore migliore che esista e che non ha senso reimplementare.
  const libero = el("input", {
    class: "campo ab-emoji-libera emoji",
    type: "text", maxlength: "4",
    placeholder: "o incollane una",
    "aria-label": "Emoji personalizzata",
  });
  libero.addEventListener("input", () => {
    const v = [...libero.value].slice(0, 2).join("");
    if (!v) return;
    bozza.emoji = v;
    anteprima.textContent = v;
    for (const b of griglia.querySelectorAll(".ab-emoji-tasto")) b.classList.remove("scelta");
  });

  return el("div", { class: "campo-gruppo" }, [
    el("div", { class: "ab-emoji-testa" }, [
      el("label", { class: "campo-etichetta", testo: "Simbolo" }),
      anteprima,
    ]),
    griglia,
    libero,
  ]);
}
