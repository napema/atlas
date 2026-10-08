// moduli/finanze/analisi.js — l'Analisi, un ciclo per volta.
//
// v3 aveva tolto l'Analisi per mese e messo al suo posto «Cicli»: una pila
// di carte, una per ciclo, quattro numeri ciascuna. Il giudizio di chi la
// usa è stato netto: la vecchia Analisi andava più o meno bene, il guaio
// era che NON LA GUARDAVO — e non la guardavo perché nove sezioni in fila,
// tutte della stessa taglia, non dicono quale delle nove conta oggi.
//
// Quindi le domande tornano, sul CICLO (da stipendio a stipendio, la
// finestra di tutta l'app), e in cima ci va una cosa che prima non c'era:
// i SEGNALI, cioè le tre o quattro cose da tenere d'occhio, già ordinate
// dalla peggiore. Il resto sotto, per chi vuole capire il perché.
//
// Come `calcolo.js` e `piano.js`: niente DOM, niente scritture.

import { stato, movimentiVivi, profiloDi, CATEGORIE_CASSA } from "./dati.js";
import {
  cicloDi, spostaCiclo, giornoDelCiclo, nomeCiclo, movimentiDelCiclo,
  statisticheDelCiclo, categorieDelCiclo, importoEffettivo,
} from "./calcolo.js";
import {
  budgetVita, vitaDelCiclo, fuoriPianoDelCiclo, versatoAlFondo, obiettivo,
} from "./piano.js";
import { oggiISO, daISO, piuGiorni, MESI_BREVI } from "../../core/ui.js";

/** Il ciclo con chiave `indice` («2026-09»), o quello di oggi. */
export const cicloPerIndice = (indice, iso = oggiISO()) =>
  indice ? spostaCiclo(indice, 0) : cicloDi(iso);

/**
 * Il primo ciclo che ha dei dati. Serve a non far sfogliare all'indietro
 * all'infinito, e a non mostrare cicli vuoti come se fossero cicli perfetti:
 * la tabella di v3 metteva uno zero verde a sei cicli in cui l'app non
 * esisteva ancora.
 */
export function primoCiclo() {
  const prima = movimentiVivi().reduce((min, m) => (m.data && (!min || m.data < min) ? m.data : min), null);
  return cicloDi(prima || oggiISO());
}

/** La spesa «Vita» giorno per giorno del ciclo, cumulata. */
function cumulataVita(ciclo) {
  const p = profiloDi();
  // Le stesse categorie di `vitaDelCiclo()`: la curva e il numero sopra la
  // curva devono essere lo stesso conto.
  const quali = new Set(Array.isArray(p.cassaCats) ? p.cassaCats : CATEGORIE_CASSA);
  const giorni = Array(ciclo.giorni).fill(0);
  for (const m of movimentiDelCiclo(ciclo)) {
    if (m.tipo !== "out" || m.pian || !quali.has(m.cat)) continue;
    const i = giornoDelCiclo(ciclo, m.data) - 1;
    if (i >= 0 && i < giorni.length) giorni[i] += importoEffettivo(m);
  }
  let t = 0;
  return giorni.map((v) => (t += v));
}

/** Lo speso ordinario (non eccezionale) del ciclo entro il giorno `n`. */
function ordinariaEntro(ciclo, n) {
  const fino = piuGiorni(ciclo.da, n - 1);
  return movimentiDelCiclo(ciclo)
    .filter((m) => m.tipo === "out" && !m.ecc && m.data <= fino)
    .reduce((t, m) => t + importoEffettivo(m), 0);
}

/**
 * Tutto quello che serve alla schermata Analisi per un ciclo.
 *
 * `giorno` è il giorno a cui si guarda: oggi se il ciclo è in corso, il suo
 * ultimo se è chiuso. Ogni confronto «a ritmo» si fa lì — al giorno 15 un
 * ciclo chiuso ha sempre speso di più, e dirlo non serve a niente.
 */
export function analisiCiclo(ciclo, iso = oggiISO()) {
  const corrente = iso >= ciclo.da && iso <= ciclo.a;
  const futuro = iso < ciclo.da;
  const giorno = futuro ? 0 : giornoDelCiclo(ciclo, iso);
  const frazioneTempo = ciclo.giorni ? giorno / ciclo.giorni : 1;

  const st = statisticheDelCiclo(ciclo);
  const budget = budgetVita();
  const vita = vitaDelCiclo(ciclo);
  const ideale = Math.round(budget * frazioneTempo);
  // La proiezione a fine ciclo ha senso solo da qualche giorno in poi: al
  // giorno 1 una pizza proietta trenta pizze.
  const proiezione = corrente && giorno >= 4 ? Math.round((vita / giorno) * ciclo.giorni) : null;

  const fp = fuoriPianoDelCiclo(ciclo, corrente ? iso : ciclo.a);

  const categorie = categorieDelCiclo(ciclo)
    .filter((c) => c.speso > 0 || c.budget > 0)
    .map((c) => {
      const frazione = c.budget > 0 ? c.speso / c.budget : c.speso > 0 ? Infinity : 0;
      // «Vicina» vuol dire: a questo ritmo sfora. Un 80% al giorno 28 va
      // bene, un 80% al giorno 10 no.
      const esito = c.budget <= 0
        ? (c.speso > 0 ? "fuori" : "ok")
        : frazione >= 1 ? "male"
        : corrente && frazione > Math.min(0.9, frazioneTempo + 0.2) ? "attenzione"
        : "ok";
      return { ...c, frazione, esito, quota: st.usciteNette > 0 ? c.speso / st.usciteNette : 0 };
    })
    .sort((a, b) => (b.frazione === a.frazione ? b.speso - a.speso : (Number.isFinite(b.frazione) ? b.frazione : 9) - (Number.isFinite(a.frazione) ? a.frazione : 9)));

  // Lo stesso giorno del ciclo prima: l'unico paragone onesto a metà ciclo.
  const prima = spostaCiclo(ciclo.indice, -1);
  const nPrima = Math.min(giorno || ciclo.giorni, prima.giorni);
  const adesso = ordinariaEntro(ciclo, giorno || ciclo.giorni);
  const allora = prima.da >= primoCiclo().da ? ordinariaEntro(prima, nPrima) : null;

  // Le statistiche minute.
  const uscite = movimentiDelCiclo(ciclo).filter((m) => m.tipo === "out");
  const perGiorno = Array(ciclo.giorni).fill(0);
  for (const m of uscite) {
    if (m.ecc) continue;
    const i = giornoDelCiclo(ciclo, m.data) - 1;
    if (i >= 0) perGiorno[i] += importoEffettivo(m);
  }
  let piuCaro = null;
  perGiorno.forEach((v, i) => { if (v > 0 && (!piuCaro || v > piuCaro.valore)) piuCaro = { data: piuGiorni(ciclo.da, i), valore: v }; });

  const settimana = Array(7).fill(0), quanti = Array(7).fill(0);
  for (let i = 0; i < (giorno || ciclo.giorni); i++) {
    const w = (daISO(piuGiorni(ciclo.da, i)).getDay() + 6) % 7;
    settimana[w] += perGiorno[i];
    quanti[w]++;
  }

  const sub = [];
  for (const c of stato().cats) {
    for (const [nome, v] of Object.entries(st.perCat[c.id]?.sub || {})) {
      sub.push({ categoria: c.nome, catId: c.id, sub: nome, totale: v.tot, volte: v.n });
    }
  }
  sub.sort((a, b) => b.totale - a.totale);

  const vers = Number(obiettivo()?.versamento) || 0;
  const alFondo = versatoAlFondo(ciclo);
  // Il versamento è dovuto se lo stipendio che apre il ciclo è venuto dopo
  // la nascita dell'obiettivo: prima non c'era niente da versare.
  const dal = obiettivo()?.dal || null;
  const fondoDovuto = Boolean(vers && dal && ciclo.da > dal && !futuro);

  return {
    ciclo, corrente, giorno, frazioneTempo, nome: nomeCiclo(ciclo),
    vita, budget, ideale, scarto: vita - ideale, proiezione,
    cumulata: cumulataVita(ciclo),
    fp, categorie, st,
    confronto: { adesso, allora, giorno: nPrima, nomePrima: nomeCiclo(prima) },
    numeri: {
      mediaGiorno: giorno ? Math.round(st.ordinaria / giorno) : 0,
      scontrinoMedio: uscite.length ? Math.round(uscite.reduce((t, m) => t + importoEffettivo(m), 0) / uscite.length) : 0,
      piuCaro,
      nUscite: uscite.length,
      recuperato: uscite.reduce((t, m) => t + (m.imp - importoEffettivo(m)), 0) + st.orfani,
    },
    settimana: settimana.map((v, i) => (quanti[i] ? Math.round(v / quanti[i]) : 0)),
    sottocategorie: sub,
    fondo: { versato: alFondo, atteso: vers, dovuto: fondoDovuto },
  };
}

/**
 * LE COSE DA TENERE D'OCCHIO, dalla peggiore.
 *
 * È il pezzo che mancava alla vecchia Analisi. Cinque domande, ognuna con un
 * esito — `male`, `attenzione`, `ok` — e l'ordine lo dà l'esito, non la
 * posizione fissa: quello che va storto sale in cima da solo, e quello che
 * va bene scende e si fa piccolo. Una schermata che mette tutto alla stessa
 * altezza chiede a te di trovare il problema, e la sera non lo cerchi.
 *
 * La frase la scrive il calcolo e non la vista: la soglia e le parole
 * devono cambiare insieme (la stessa lezione del check giornaliero).
 */
export function segnaliCiclo(a) {
  const eu = (c) => `${Math.round((c || 0) / 100).toLocaleString("it-IT")} €`;
  const fuori = [];

  // 1. IL RITMO della Vita: lo speso contro la retta del budget.
  if (a.budget > 0) {
    if (a.corrente) {
      const margine = a.budget * 0.05;
      fuori.push({
        id: "ritmo", titolo: "Ritmo della spesa",
        esito: a.scarto > margine ? "male" : a.scarto > 0 ? "attenzione" : "ok",
        valore: a.scarto > 0 ? `+${eu(a.scarto)}` : `−${eu(-a.scarto)}`,
        dettaglio: a.scarto > 0
          ? `sopra il ritmo${a.proiezione != null ? ` · a fine ciclo ${eu(a.proiezione)} su ${eu(a.budget)}` : ""}`
          : `sotto il ritmo · ${eu(a.vita)} di ${eu(a.budget)} al giorno ${a.giorno}`,
      });
    } else {
      const sforo = a.vita - a.budget;
      fuori.push({
        id: "ritmo", titolo: "Vita del ciclo",
        esito: sforo > 0 ? "male" : "ok",
        valore: `${eu(a.vita)}`,
        dettaglio: sforo > 0 ? `sforato di ${eu(sforo)} su ${eu(a.budget)}` : `avanzati ${eu(-sforo)} su ${eu(a.budget)}`,
      });
    }
  }

  // 2. FUORI PIANO: le decisioni prese sul momento.
  fuori.push({
    id: "fuoriPiano", titolo: "Fuori piano",
    esito: a.fp.n === 0 ? "ok" : a.fp.pct != null && a.fp.pct >= 1 ? "male" : "attenzione",
    valore: a.fp.n ? `${a.fp.n} · ${eu(a.fp.totale)}` : "0",
    dettaglio: a.fp.n
      ? (a.fp.pct != null ? `${Math.round(a.fp.pct * 100)}% di un versamento al fondo` : "spese decise sul momento")
      : a.corrente ? `${a.fp.giorniSenza} ${a.fp.giorniSenza === 1 ? "giorno" : "giorni"} senza` : "nessuna spesa fuori piano",
  });

  // 3. LE CATEGORIE sforate o in corsa per sforare.
  const male = a.categorie.filter((c) => c.esito === "male");
  const att = a.categorie.filter((c) => c.esito === "attenzione");
  fuori.push({
    id: "categorie", titolo: "Categorie",
    esito: male.length ? "male" : att.length ? "attenzione" : "ok",
    valore: male.length ? `${male.length} sforate` : att.length ? `${att.length} in corsa` : "nei budget",
    dettaglio: male.length || att.length
      ? [...male, ...att].slice(0, 3).map((c) => `${c.nome} ${Math.round(c.frazione * 100)}%`).join(" · ")
      : "tutte sotto il loro budget",
  });

  // 4. LE RICARICHE DA ING: attingere alla riserva non è una questione di
  //    quanto, è un fatto.
  fuori.push({
    id: "ricariche", titolo: "Prelievi da ING",
    esito: a.fp.ricariche.n ? "male" : "ok",
    valore: String(a.fp.ricariche.n),
    dettaglio: a.fp.ricariche.n ? `${eu(a.fp.ricariche.totale)} presi dalla riserva` : "riserva non toccata",
  });

  // 5. IL VERSAMENTO al fondo dell'obiettivo, se in questo ciclo era dovuto.
  if (a.fondo.dovuto) {
    const fatto = a.fondo.versato >= a.fondo.atteso;
    // I primi due giorni del ciclo è «da fare», non «saltato»: lo stipendio
    // è appena arrivato, e un rosso la mattina della paga è un rimprovero
    // per una cosa che non hai ancora avuto il tempo di fare.
    const appena = a.corrente && a.giorno <= 2;
    const manca = a.fondo.atteso - a.fondo.versato;
    fuori.push({
      id: "fondo", titolo: `Versamento ${obiettivo()?.nome || "al fondo"}`,
      esito: fatto ? "ok" : appena ? "attenzione" : "male",
      valore: fatto ? eu(a.fondo.versato) : `${eu(manca)}`,
      dettaglio: fatto
        ? `fatto · ${eu(a.fondo.versato)} spostati sul fondo`
        : a.fondo.versato > 0
          ? `da spostare ancora · ${eu(a.fondo.versato)} di ${eu(a.fondo.atteso)} fatti`
          : appena ? "da spostare sul fondo: lo stipendio è arrivato" : "non fatto in questo ciclo",
    });
  }

  const PESO = { male: 0, attenzione: 1, ok: 2 };
  return fuori.sort((x, y) => PESO[x.esito] - PESO[y.esito]);
}

/**
 * Gli ultimi cicli, solo quelli con dati, dal più vecchio: per le barre e la
 * tabellina di confronto. Al massimo `quanti`.
 */
export function storicoCicli(ciclo, quanti = 6) {
  const primo = primoCiclo();
  const fuori = [];
  let c = ciclo;
  for (let k = 0; k < quanti && c.da >= primo.da; k++) {
    const fp = fuoriPianoDelCiclo(c, c.a);
    fuori.unshift({
      ciclo: c,
      etichetta: MESI_BREVI[Number(c.indice.split("-")[1]) - 1],
      nome: nomeCiclo(c),
      vita: vitaDelCiclo(c),
      fuoriPiano: fp.totale, nFuoriPiano: fp.n,
      ricariche: fp.ricariche.n,
      alFondo: versatoAlFondo(c),
    });
    c = spostaCiclo(c.indice, -1);
  }
  return fuori;
}
