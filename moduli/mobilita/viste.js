// moduli/mobilita/viste.js — la schermata del giorno, il player, i progressi.

import {
  el, aggiungi, apriFoglio, chiudiFoglio, avviso, tocco, anello, traccia,
  lista, riga, vuoto, segmenti, durata as fmtDurata, dataUmana, oggiISO,
  GIORNI_INIZIALI, piuGiorni,
} from "../../core/ui.js";
import { icona } from "../../core/icone.js";
import { FollowAlongEngine } from "./engine.js";
import { stato, sessioniVive, TIPI_SESSIONE, segnaGiorno, registraSessione, scriviMeta, salvaAvanzamento } from "./dati.js";
import {
  costruisciSessione, riepilogoModuli, conPreparazione, volumePerGruppo,
  tipoDelGiorno, settimanaEffettiva, serie, settimanaFatta, volumeRecente,
} from "./calcolo.js";

const minuti = (sec) => Math.max(1, Math.round(sec / 60));

/* ============================================================== IL GIORNO */

export function vistaOggi(ridisegna, avviaSessione) {
  const s = stato();
  const oggi = oggiISO();
  const sessioni = sessioniVive();
  const haCorso = s.giornoCorrente?.data === oggi ? Boolean(s.giornoCorrente.haCorso) : false;
  const forzata = s.giornoCorrente?.data === oggi ? s.giornoCorrente.forza : null;

  const tipo = forzata || tipoDelGiorno(s.meta, sessioni, haCorso);
  const { passi, settimana } = costruisciSessione(s.meta, sessioni, tipo);
  const moduli = riepilogoModuli(passi);
  const totale = passi.reduce((t, p) => t + p.durataSec, 0);
  const fattaOggi = sessioni.some((x) => x.data === oggi);
  const sett = settimanaFatta(sessioni);

  const fuori = el("div", {});

  // La striscia della settimana: sette pallini, non un grafico.
  aggiungi(fuori, [el("nav", { class: "mo-settimana", "aria-label": "Settimana" },
    sett.giorni.map((g, i) => el("div", {
      class: "mo-giorno" + (sett.fatti[i] ? " fatto" : "") + (g === oggi ? " oggi" : "") + (g > oggi ? " futuro" : ""),
      title: dataUmana(g),
    }, [
      el("span", { class: "mo-giorno-lettera", testo: GIORNI_INIZIALI[i] }),
      el("span", { class: "mo-giorno-punto" }),
    ]))
  )]);

  // L'unica domanda che l'app non può risolvere da sola.
  aggiungi(fuori, [el("section", { class: "scheda" }, [
    el("div", { class: "scheda-titolo" }, [el("span", { class: "pallino" }), el("span", { testo: "Hai corso oggi?" })]),
    segmenti([["no", "No"], ["si", "Sì, ho corso"]], haCorso ? "si" : "no", (v) => {
      segnaGiorno({ data: oggi, haCorso: v === "si", forza: null });
      ridisegna();
    }),
    el("p", { class: "nota", style: "margin-top:var(--s3)", testo: "È l'unica cosa che devi dirmi: il resto lo decide l'app." }),
  ])]);

  // La sessione di oggi.
  aggiungi(fuori, [el("section", { class: "scheda mo-sessione" }, [
    el("div", { class: "mo-sessione-testa" }, [
      el("div", {}, [
        el("div", { class: "etichetta-riga", testo: TIPI_SESSIONE[tipo].nome }),
        el("div", { class: "cifra mo-durata", testo: `${minuti(totale)} min` }),
      ]),
      fattaOggi && el("span", { class: "mo-badge", testo: "già fatta" }),
    ]),
    el("p", { class: "nota", testo: TIPI_SESSIONE[tipo].perche }),

    el("ul", { class: "mo-moduli" }, moduli.map((m) => el("li", {}, [
      el("div", { class: "mo-modulo-testo" }, [
        el("div", { class: "mo-modulo-nome", testo: m.nome }),
        el("div", { class: "nota", testo: m.muscoli.slice(0, 4).join(" · ") }),
      ]),
      el("span", { class: "nota mono", testo: `${minuti(m.durataSec)}′` }),
    ]))),

    el("button", {
      class: "btn pieno", type: "button", style: "margin-top:var(--s4)",
      onClick: () => avviaSessione(tipo),
    }, [
      el("span", { html: icona("riproduci", 18) }),
      el("span", { testo: fattaOggi ? "Rifai la sessione" : "Inizia" }),
    ]),

    // La dose minima è sempre a un tocco: è la valvola che evita lo zero.
    tipo !== "minima" && el("button", {
      class: "btn nudo pieno", type: "button", testo: "Non ho tempo · dose minima",
      onClick: () => { segnaGiorno({ data: oggi, forza: "minima" }); ridisegna(); },
    }),
    forzata && el("button", {
      class: "btn nudo pieno", type: "button", testo: "Torna alla sessione completa",
      onClick: () => { segnaGiorno({ data: oggi, forza: null }); ridisegna(); },
    }),
  ])]);

  // Serie e settimana di programma.
  const n = serie(sessioni);
  aggiungi(fuori, [el("div", { class: "griglia-2" }, [
    el("div", { class: "riquadro" }, [
      el("div", { class: "etichetta-riga", testo: "Serie" }),
      el("div", { class: "cifra", testo: String(n) }),
      el("div", { class: "nota", testo: n === 1 ? "giorno di fila" : "giorni di fila" }),
    ]),
    el("div", { class: "riquadro" }, [
      el("div", { class: "etichetta-riga", testo: "Settimana" }),
      el("div", { class: "cifra", testo: String(settimana) }),
      el("div", { class: "nota", testo: "del programma" }),
    ]),
  ])]);

  return fuori;
}

/* ================================================================ PLAYER
   A schermo intero, in un foglio: durante una sessione non deve esserci
   nient'altro sullo schermo, e la barra dei moduli è una via d'uscita
   accidentale a portata di pollice. */

export function apriPlayer(tipo, alTermine) {
  const s = stato();
  const sessioni = sessioniVive();
  const { passi } = costruisciSessione(s.meta, sessioni, tipo);
  if (!passi.length) { avviso("Nessun esercizio per questa sessione.", { tono: "errore" }); return; }

  const visti = s.meta.programma.videoVistiObbligatori || [];
  const sequenza = conPreparazione(passi, visti);

  const { corpo, elemento } = apriFoglio({
    titolo: TIPI_SESSIONE[tipo].nome,
    sinistra: el("button", { class: "btn nudo", type: "button", testo: "Chiudi", onClick: () => fine(false) }),
  });
  elemento.classList.add("mo-player");

  const nome = el("div", { class: "mo-p-nome" });
  const lato = el("div", { class: "mo-p-lato" });
  const conto = el("div", { class: "mo-p-conto cifra" });
  const passo = el("ol", { class: "mo-p-passi" });
  const nota = el("p", { class: "nota" });
  const barra = el("div", { class: "traccia" }, [el("div", { class: "barra" })]);
  const posizione = el("div", { class: "nota mo-p-posizione" });
  const anelloBox = el("div", { class: "mo-p-anello" });

  let indice = 0;
  let durataPasso = 1;

  const motore = new FollowAlongEngine({
    onTick: (residui) => {
      conto.textContent = String(Math.max(0, residui));
      anelloBox.replaceChildren(anello(1 - residui / durataPasso, { misura: 168, spessore: 7 }));
    },
    onStepChange: (p, i, n) => {
      indice = i;
      durataPasso = Math.max(1, p.durataSec);
      const rif = p.tipo === "prep" ? p.rif : p;
      nome.textContent = rif.nome;
      lato.textContent = p.tipo === "prep"
        ? (p.cambioLato ? "Cambia lato" : "Preparati")
        : (rif.lato ? (rif.lato === "dx" ? "DESTRO" : "SINISTRO") : "");
      lato.className = "mo-p-lato" + (p.tipo === "prep" ? " prep" : "");
      passo.replaceChildren(...(rif.passi || []).map((t) => el("li", { testo: t })));
      nota.textContent = rif.nota || rif.serve || "";
      posizione.textContent = `${rif.numero || i + 1} di ${passi.length}`;
      barra.firstChild.style.width = `${((i + 1) / n) * 100}%`;
      conto.textContent = String(p.durataSec);
      anelloBox.replaceChildren(anello(0, { misura: 168, spessore: 7 }));
      salvaAvanzamento({ tipo, data: oggiISO(), indice: i });
    },
    onFine: () => fine(true),
  });

  function fine(completata) {
    motore.ferma();
    chiudiFoglio();
    if (!completata) { salvaAvanzamento(null); alTermine(false); return; }

    const totale = passi.reduce((t, p) => t + p.durataSec, 0);
    registraSessione({
      data: oggiISO(), tipo, durataSec: totale,
      esercizi: [...new Set(passi.map((p) => p.idEsercizio))],
      volumePerGruppo: volumePerGruppo(passi),
    });
    // Gli esercizi visti non mostrano più la preparazione lunga.
    scriviMeta((m) => {
      const set = new Set(m.programma.videoVistiObbligatori || []);
      for (const p of passi) set.add(p.idEsercizio);
      m.programma.videoVistiObbligatori = [...set];
    });
    tocco(20);
    alTermine(true, { tipo, durataSec: totale });
  }

  const btnPausa = el("button", { class: "btn tenue", type: "button", html: icona("pausa", 22), "aria-label": "Pausa" });
  let inPausa = false;
  btnPausa.addEventListener("click", () => {
    inPausa = !inPausa;
    if (inPausa) motore.pausa(); else motore.avvia();
    btnPausa.innerHTML = icona(inPausa ? "riproduci" : "pausa", 22);
  });

  aggiungi(corpo, [
    posizione,
    barra,
    anelloBox,
    conto,
    nome,
    lato,
    passo,
    nota,
    el("div", { class: "mo-p-comandi" }, [
      btnPausa,
      el("button", {
        class: "btn pieno", type: "button", onClick: () => motore.avanti(),
      }, [el("span", { testo: "Avanti" }), el("span", { html: icona("salta", 18) })]),
    ]),
  ]);

  motore.carica(sequenza);
  motore.avvia();
}

/* ============================================================= PROGRESSI */

export function vistaProgressi() {
  const sessioni = sessioniVive();
  if (!sessioni.length) {
    return vuoto("Ancora nessuna sessione", "Il primo grafico compare dopo la prima.");
  }

  const perTipo = {};
  for (const s of sessioni) perTipo[s.tipo] = (perTipo[s.tipo] || 0) + 1;
  const volume = volumeRecente(sessioni, 28);
  const massimo = volume[0]?.[1] || 1;
  const totaleSec = sessioni.reduce((t, s) => t + (s.durataSec || 0), 0);

  return el("div", {}, [
    el("div", { class: "griglia-2" }, [
      el("div", { class: "riquadro" }, [
        el("div", { class: "etichetta-riga", testo: "Sessioni" }),
        el("div", { class: "cifra", testo: String(sessioni.length) }),
        el("div", { class: "nota", testo: "in totale" }),
      ]),
      el("div", { class: "riquadro" }, [
        el("div", { class: "etichetta-riga", testo: "Tempo" }),
        el("div", { class: "cifra", testo: fmtDurata(totaleSec) }),
        el("div", { class: "nota", testo: "sul tappeto" }),
      ]),
    ]),

    el("section", { class: "scheda" }, [
      el("div", { class: "scheda-titolo" }, [el("span", { class: "pallino" }), el("span", { testo: "Volume per gruppo · 28 giorni" })]),
      el("div", { class: "mo-volume" }, volume.slice(0, 10).map(([nome, sec]) => el("div", { class: "mo-vol-riga" }, [
        el("div", { class: "mo-vol-testa" }, [
          el("span", { testo: nome }),
          el("span", { class: "nota mono", testo: `${Math.round(sec / 60)}′` }),
        ]),
        traccia(sec / massimo, "", { sottile: true }),
      ]))),
    ]),

    el("div", { class: "gruppo-titolo", testo: "Ultime sessioni" }),
    lista(sessioni
      .slice()
      .sort((a, b) => b.data.localeCompare(a.data))
      .slice(0, 20)
      .map((s) => riga({
        etichetta: TIPI_SESSIONE[s.tipo]?.nome || s.tipo,
        valore: fmtDurata(s.durataSec),
        dettaglio: `${dataUmana(s.data)} · ${(s.esercizi || []).length} esercizi`,
      }))),
  ]);
}
