// oggi.js — la home di Mobilità. Non chiede quale programma seguire: lo
// decide. L'unica domanda è "hai corso oggi?", perché è l'unica cosa che
// l'app non può sapere da sola.
//
// RISCRITTA COL REDESIGN, e il cambio non è estetico: questa vista aveva un
// vocabolario CSS tutto suo — `vetro`, `scheda__testa`, `occhiello`,
// `chip-scelta`, `mo-chip`, `btn-primary`, `elenco-moduli` — che disegnava
// gli stessi oggetti che base.css disegna già per tutti gli altri moduli,
// solo diversi. Era la ragione per cui Corpo non sembrava la stessa app:
// non i colori, il vocabolario.
//
// Ora usa i componenti condivisi e basta: `.scheda`, `.scheda-titolo`,
// `.chip`, `.segmenti`, `.lista`/`.riga`, `.btn`, `.sett`. Quello che resta
// di locale è solo ciò che qui esiste e altrove no.

import { getState, updateState } from "./ponte.js";
import { icona } from "../../core/icone.js";
import {
  oggiISO, addGiorni, costruisciSessione, riepilogoModuli,
  settimanaEffettiva, tipoDelGiorno, streakAncoraValida, giornoSettimana,
} from "./sessione.js";
import { fasePerSettimana, rotazionePerSettimana, GRUPPI, PROGRESSIONE } from "./esercizi.js";

const LETTERE = ["L", "M", "M", "G", "V", "S", "D"];
const NOMI_TIPO = {
  "post-corsa": { nome: "Post-corsa", perche: "Hai corso: questa sostituisce il quotidiano, non si somma." },
  quotidiano: { nome: "Quotidiano", perche: "Sul tappeto, la sera. Non deve farti sudare." },
  loaded: { nome: "Loaded mobility", perche: "È il giorno di palestra. È allenamento vero: mai il giorno dopo le gambe." },
  minima: { nome: "Dose minima", perche: "Per i giorni storti. Meglio due minuti che zero." },
};

const dataLunga = () => new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });
const minuti = (sec) => Math.max(1, Math.round(sec / 60));
const inizioSettimana = (iso) => addGiorni(iso, -giornoSettimana(iso));

/* Una testata di scheda: chip con l'icona + etichetta maiuscoletta.
   È la stessa forma in tutte e quattro le schede di questa vista, e la
   stessa che usano le carte della home. */
const testa = (ico, etichetta) => `
  <div class="scheda-titolo">
    <span class="chip piccolo">${icona(ico, 17, 1.8)}</span>
    <span>${etichetta}</span>
  </div>`;

function renderOggi(container) {
  const state = getState();
  const oggi = oggiISO();
  const haCorso = state.giornoCorrente?.data === oggi ? !!state.giornoCorrente.haCorso : false;
  const forzata = state.giornoCorrente?.data === oggi ? state.giornoCorrente.forza : null;

  const tipo = forzata || tipoDelGiorno(state, haCorso);
  const { passi } = costruisciSessione(state, tipo);
  const moduli = riepilogoModuli(passi);
  const durata = passi.reduce((t, p) => t + p.durataSec, 0);
  const fattoOggi = state.storicoSessioni.some((s) => s.data === oggi);
  const settimana = settimanaEffettiva(state);
  const fase = fasePerSettimana(settimana);

  /* NIENTE <h1>Oggi</h1>.
     Sopra questa vista ci sono già due controlli a segmenti — il gruppo
     (Mobilità | Training) e la sezione (Oggi | Progressi) — e il titolo
     ripeteva la parola che stava scritta nel secondo, acceso, due
     centimetri più su. Tre righe di navigazione prima del primo dato.
     Resta la riga che dice qualcosa che gli altri due non dicono: che
     giorno è e a che settimana del programma sei. */
  container.innerHTML = `
    <p class="mo-data">${dataLunga()} · settimana ${settimana}</p>

    ${renderSettimana(state, oggi)}

    <section class="scheda">
      ${testa("corpo", "Hai corso oggi?")}
      <div class="segmenti" role="group" id="mo-corso">
        <button class="segmento" type="button" data-corso="no"
          aria-pressed="${!haCorso}">No</button>
        <button class="segmento" type="button" data-corso="si"
          aria-pressed="${haCorso}">Sì, ho corso</button>
      </div>
      <p class="nota" style="margin:12px 0 0">È l'unica cosa che devi dirmi: il resto lo decido io.</p>
    </section>

    <section class="scheda">
      ${testa("orologio", NOMI_TIPO[tipo].nome)}

      <div class="mo-eroe">
        <div class="cifra mo-durata">${minuti(durata)}<span class="mo-unita">min</span></div>
        <div class="mo-conta">${passi.length} esercizi${fattoOggi ? " · già fatta oggi" : ""}</div>
      </div>

      <p class="nota mo-perche">${NOMI_TIPO[tipo].perche}</p>

      <ul class="lista">
        ${moduli.map((m) => `
          <li><div class="riga due-righe">
            <div>
              <div class="mo-modulo-nome">${m.nome}</div>
              <div class="nota">${m.muscoli.slice(0, 4).join(" · ")}</div>
            </div>
            <span class="valore">${minuti(m.durataSec)}<span class="mo-min"> min</span></span>
          </div></li>`).join("")}
      </ul>

      <button class="btn pieno" id="btn-inizia-sessione" data-tipo="${tipo}">
        ${icona("play", 18, true)} ${fattoOggi ? "Rifai" : "Inizia"}
      </button>
      ${tipo !== "minima" ? `
        <button class="btn morbido pieno" id="btn-dose-minima" style="margin-top:8px">Non ce la faccio — 2 minuti</button>` : ""}
    </section>

    ${renderPiano(settimana, fase)}
  `;

  container.querySelector("#mo-corso").addEventListener("click", (e) => {
    const b = e.target.closest("[data-corso]");
    if (!b) return;
    updateState((s) => {
      s.giornoCorrente = { data: oggi, haCorso: b.dataset.corso === "si", forza: null };
    });
    renderOggi(container);
  });

  const minima = container.querySelector("#btn-dose-minima");
  if (minima) minima.addEventListener("click", () => {
    updateState((s) => { s.giornoCorrente = { data: oggi, haCorso, forza: "minima" }; });
    renderOggi(container);
  });
}

/* La striscia della settimana usa `.sett` di base.css, la stessa che
   disegna la settimana della home e di Abitudini. Prima erano tre strisce
   diverse per la stessa cosa: cerchi qui, caselle là, pastiglie nella
   terza, e tre modi diversi di segnare «oggi». */
function renderSettimana(state, oggi) {
  const inizio = inizioSettimana(oggi);
  const fatte = new Map(state.storicoSessioni.map((s) => [s.data, s.tipo]));
  const giornoPalestra = state.programma.giornoPalestra ?? 2;

  const giorni = LETTERE.map((L, i) => {
    const iso = addGiorni(inizio, i);
    const stato = fatte.has(iso) ? "pieno" : iso > oggi ? "futuro" : "vuoto";
    return `
      <div class="sett-g ${iso === oggi ? "oggi" : ""}" data-stato="${stato}">
        <span class="sett-cella">${fatte.has(iso) ? icona("spunta", 15, 2.6) : Number(iso.split("-")[2])}</span>
        <span class="sett-lettera">${L}</span>
        ${i === giornoPalestra ? '<span class="sett-segno"></span>' : ""}
      </div>`;
  }).join("");

  const n = LETTERE.filter((_, i) => fatte.has(addGiorni(inizio, i))).length;

  return `
    <section class="scheda">
      ${testa("calendario", `Questa settimana · ${n} di 7`)}
      <div class="sett">${giorni}</div>
      <p class="nota" style="margin:14px 0 0">Il puntino segna il giorno di palestra.${
        !streakAncoraValida(state) ? " Più di 3 giorni fermi: lo streak riparte, il programma no." : ""
      }</p>
    </section>`;
}

/* Il programma nel tempo era un muro: un paragrafo di tre righe in
   grassetto misto, e sotto una lista puntata dove ogni voce mandava a capo
   due volte. Ora è una tabella di due colonne — quando, cosa — con la fase
   corrente marcata da una pillola. Si scorre con l'occhio invece di
   leggerla. */
function renderPiano(settimana, faseCorrente) {
  const rot = rotazionePerSettimana(settimana);
  const nomi = rot.gruppi.map((g) => GRUPPI[g]?.nome).filter(Boolean).join(" · ");

  const righe = PROGRESSIONE.map((f) => {
    const ora = f === faseCorrente;
    const passata = settimana > f.settimane[1];
    const et = f.settimane[1] === 99 ? `${f.settimane[0]}+` : `${f.settimane[0]}–${f.settimane[1]}`;
    return `
      <li class="mo-fase ${ora ? "ora" : ""} ${passata ? "passata" : ""}">
        <span class="mo-fase-sett">${et}</span>
        <span class="mo-fase-min">${f.minuti}<span class="mo-min"> min</span></span>
        <span class="mo-fase-cosa">${f.note}</span>
      </li>`;
  }).join("");

  return `
    <section class="scheda">
      ${testa("grafico", "Il programma nel tempo")}
      <p class="nota mo-perche">
        Il tempo sale solo se la settimana precedente è stata fatta almeno al 70%.
        Adesso: <b>${faseCorrente.minuti} minuti</b>, gruppi sopra soglia <b>collo · ${nomi}</b>.
      </p>
      <ol class="mo-piano">${righe}</ol>
    </section>`;
}

export { renderOggi };
