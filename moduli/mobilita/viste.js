// moduli/mobilita/viste.js — la schermata del giorno, il player, i progressi.

import {
  el, aggiungi, apriFoglio, chiudiFoglio, avviso, tocco, anello, traccia,
  lista, riga, vuoto, segmenti, pillole, durata as fmtDurata, dataUmana, oggiISO,
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
  const n = serie(sessioni);

  /* --- 1. l'eroe: cosa devi fare oggi, e per quanto ---------------------- */
  const eroe = el("section", { class: "mo-eroe" + (fattaOggi ? " fatta" : "") }, [
    el("div", { class: "mo-eroe-testa" }, [
      el("div", { class: `micro ${fattaOggi ? "ok" : ""}`,
        testo: fattaOggi ? "Fatta oggi" : "Oggi tocca a" }),
      n > 1 && el("span", { class: "mo-serie" }, [
        el("span", { html: icona("fiamma", 14) }),
        el("span", { testo: `${n} di fila` }),
      ]),
    ]),
    el("h2", { class: "mo-eroe-nome", testo: TIPI_SESSIONE[tipo].nome }),
    el("div", { class: "mo-eroe-durata" }, [
      el("span", { class: "cifra cifra-xl", testo: String(minuti(totale)) }),
      el("span", { class: "mo-eroe-unita", testo: "min" }),
    ]),
    el("p", { class: "mo-eroe-perche", testo: TIPI_SESSIONE[tipo].perche }),

    // La striscia: sette caselle, quelle passate piene, oggi cerchiato.
    el("nav", { class: "mo-settimana", "aria-label": "Settimana" },
      sett.giorni.map((g, i) => el("div", {
        class: "mo-giorno" + (sett.fatti[i] ? " fatto" : "") + (g === oggi ? " oggi" : "") + (g > oggi ? " futuro" : ""),
        title: dataUmana(g),
      }, [
        el("span", { class: "mo-giorno-punto", html: sett.fatti[i] ? icona("spunta", 14) : "" }),
        el("span", { class: "mo-giorno-lettera", testo: GIORNI_INIZIALI[i] }),
      ]))),

    el("button", {
      class: "btn pieno grande", type: "button",
      onClick: () => avviaSessione(tipo),
    }, [
      el("span", { html: icona("riproduci", 19) }),
      el("span", { testo: fattaOggi ? "Rifai la sessione" : "Inizia" }),
    ]),
  ]);
  aggiungi(fuori, [eroe]);

  /* --- 2. l'unica domanda che l'app non può risolvere da sola ------------ */
  aggiungi(fuori, [el("section", { class: "scheda mo-corso" }, [
    el("div", {}, [
      el("div", { class: "mo-corso-dom", testo: "Hai corso oggi?" }),
      el("p", { class: "nota", testo: "È l'unica cosa che devi dirmi: il resto lo decide l'app." }),
    ]),
    segmenti([["no", "No"], ["si", "Sì"]], haCorso ? "si" : "no", (v) => {
      segnaGiorno({ data: oggi, haCorso: v === "si", forza: null });
      ridisegna();
    }),
  ])]);

  /* --- 3. da cosa è fatta ------------------------------------------------ */
  aggiungi(fuori, [
    el("div", { class: "sezione-titolo" }, [
      el("h3", { testo: "Come è fatta" }),
      el("span", { class: "nota", testo: `${moduli.length} blocchi · settimana ${settimana}` }),
    ]),
    el("ul", { class: "mo-moduli" }, moduli.map((m, i) => el("li", {}, [
      el("span", { class: "mo-modulo-num", testo: String(i + 1) }),
      el("div", { class: "mo-modulo-testo" }, [
        el("div", { class: "mo-modulo-nome", testo: m.nome }),
        el("div", { class: "nota", testo: m.muscoli.slice(0, 4).join(" · ") }),
      ]),
      el("span", { class: "mo-modulo-min", testo: `${minuti(m.durataSec)}′` }),
    ]))),
  ]);

  /* --- 4. le valvole ----------------------------------------------------- */
  // La dose minima è sempre a un tocco: è ciò che evita lo zero nei giorni
  // storti, ed è il motivo per cui la serie non si spezza quasi mai.
  const valvole = [];
  if (tipo !== "minima") valvole.push(el("button", {
    class: "btn nudo pieno", type: "button", testo: "Non ho tempo · dose minima",
    onClick: () => { segnaGiorno({ data: oggi, forza: "minima" }); ridisegna(); },
  }));
  if (forzata) valvole.push(el("button", {
    class: "btn nudo pieno", type: "button", testo: "Torna alla sessione completa",
    onClick: () => { segnaGiorno({ data: oggi, forza: null }); ridisegna(); },
  }));
  if (valvole.length) aggiungi(fuori, [el("div", { class: "mo-valvole" }, valvole)]);

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
    el("div", { class: "riquadri" }, [
      el("div", { class: "riquadro" }, [
        el("div", { class: "micro", testo: "Sessioni" }),
        el("div", { class: "cifra", testo: String(sessioni.length) }),
        el("div", { class: "nota", testo: "in totale" }),
      ]),
      el("div", { class: "riquadro" }, [
        el("div", { class: "micro", testo: "Tempo" }),
        el("div", { class: "cifra", testo: fmtDurata(totaleSec) }),
        el("div", { class: "nota", testo: "sul tappeto" }),
      ]),
    ]),

    el("section", { class: "scheda" }, [
      el("div", { class: "scheda-titolo" }, [el("span", { testo: "Volume per gruppo · 28 giorni" })]),
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

/* =========================================================== IMPOSTAZIONI
   Nell'app di partenza il setup era sparso fra la schermata Oggi e i
   sottomenu; nel primo porting era sparito del tutto. Qui è la sezione
   "Mobilità" di Impostazioni. */

export function vistaImpostazioni(ridisegna) {
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
          el("div", { class: "cifra", testo: String(settimanaEffettiva(s.meta, sessioni)) }),
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
