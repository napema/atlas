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
} from "./dati.js";
import {
  progressoGiorno, eAttesa, serie, serieMigliore, costanza,
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
  const fatta = eFatta(h.id, giorno);
  const colore = coloreTinta(h.tint);
  const n = serie(h);

  // Il cerchio disegnato è da 30px, il bersaglio da 44: il pollice ha
  // bisogno del secondo, l'occhio del primo. Da qui il figlio.
  const spunta = el("button", {
    class: "ab-spunta" + (fatta ? " fatta" : ""),
    type: "button",
    "aria-pressed": String(fatta),
    "aria-label": fatta ? `Togli ${h.name}` : `Segna ${h.name}`,
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
    const cls = eFatta(h.id, d) ? " piena" : "";
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
        salvaAbitudine({ ...bozza, name: bozza.name.trim() });
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

  aggiungi(corpo, [
    campo({
      etichetta: "Nome", valore: bozza.name, segnaposto: "Meditazione",
      alCambio: (v) => { bozza.name = v; },
    }),

    el("div", { class: "campo-gruppo" }, [
      el("label", { class: "campo-etichetta", testo: "Simbolo" }),
      pillole(EMOJI_SUGGERITE.map((e) => [e, e]), bozza.emoji, (v) => { bozza.emoji = v; }),
    ]),

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
