// moduli/mobilita/calcolo.js — funzioni pure: stato → sessione, settimana, serie.
//
// Portato da js/sessione.js dell'app di partenza, tolta la parte di disegno.
// Le regole del programma sono rimaste identiche: sono state pensate una
// volta e discusse in PROGRAMMA-v3.md, e questo non è il momento di
// rimetterle in discussione. Migliorare mentre si porta rende impossibile
// capire cosa ha rotto cosa.

import {
  GRUPPI, G1, BACINO, LOADED, POST_CORSA, BLOCCO_ATTIVO, SOGLIA_COMPLETAMENTO,
  fasePerSettimana, rotazionePerSettimana, trovaEsercizio, caricoSuggerito,
} from "./esercizi.js";
import { isoDi, daISO, piuGiorni, oggiISO } from "../../core/ui.js";

const PREP_PRIMA_VOLTA_SEC = 12;
const PREP_RIPETIZIONE_SEC = 5;

export const giorniTra = (a, b) => Math.round((daISO(b) - daISO(a)) / 86400000);
/** 0 = lunedì. L'italiano conta da lunedì, JavaScript no. */
export const giornoSettimana = (iso) => (daISO(iso).getDay() + 6) % 7;
export const inizioSettimana = (iso) => piuGiorni(iso, -giornoSettimana(iso));

const altroLato = (l) => (l === "sx" ? "dx" : "sx");

/* ------------------------------------------------- stato del programma -- */

export function settimanaCorrente(meta) {
  const p = meta.programma;
  if (!p.inizioProgramma) return 1;
  return Math.max(1, Math.floor(giorniTra(p.inizioProgramma, oggiISO()) / 7) + 1);
}

/**
 * La settimana EFFETTIVA, che non è quella del calendario.
 *
 * Il tempo del quotidiano sale solo se il blocco precedente è stato fatto
 * almeno al 70% dei giorni. Se no la settimana resta ferma e si ripete.
 * È il controllo che impedisce di ritrovarsi con venti minuti sullo schermo
 * e la stessa sensazione di fallimento del primo giorno.
 */
export function settimanaEffettiva(meta, sessioni) {
  const calendario = settimanaCorrente(meta);
  const fatte = new Set(sessioni.map((s) => s.data));
  let effettiva = 1;
  for (let s = 1; s < calendario; s++) {
    const inizio = piuGiorni(meta.programma.inizioProgramma, (s - 1) * 7);
    let completati = 0;
    for (let i = 0; i < 7; i++) if (fatte.has(piuGiorni(inizio, i))) completati++;
    if (completati / 7 >= SOGLIA_COMPLETAMENTO) effettiva++;
  }
  return effettiva;
}

/** Il lato più stretto, dalla farfalla della baseline. Null se non misurata. */
export function latoStretto(meta) {
  const m = meta.assessment?.baselineTest3?.bersagli?.farfalla?.misure;
  if (!m || m.altezzaGinocchioSxCm == null || m.altezzaGinocchioDxCm == null) return "dx";
  if (m.altezzaGinocchioSxCm === m.altezzaGinocchioDxCm) return null;
  return m.altezzaGinocchioSxCm > m.altezzaGinocchioDxCm ? "sx" : "dx";
}

/**
 * Che sessione è oggi. **Non lo sceglie l'utente**: l'unica cosa che l'app
 * non può sapere da sola è se hai corso, e quella è l'unica domanda.
 */
export function tipoDelGiorno(meta, sessioni, haCorso) {
  const oggi = oggiISO();
  const loadedRecente = sessioni.some((s) => s.tipo === "loaded" && giorniTra(s.data, oggi) < 7);
  if (giornoSettimana(oggi) === (meta.programma.giornoPalestra ?? 2) && !loadedRecente) return "loaded";
  return haCorso ? "post-corsa" : "quotidiano";
}

/* -------------------------------------------------------- espansione --- */

function espandi(ex, gruppo, stretto, settimana) {
  const base = {
    idEsercizio: ex.id, sigla: ex.sigla || null, nome: ex.nome, tag: ex.tag,
    gruppo: gruppo.id, gruppoNome: gruppo.nome,
    muscoli: ex.muscoli || [], serve: ex.serve, video: ex.video || null,
    fonte: ex.fonte || null, passi: ex.passi || [], nota: ex.nota || null,
    ripetizioni: ex.ripetizioni || null,
    gruppoMuscolare: (ex.muscoli && ex.muscoli[0]) || gruppo.nome,
    carico: caricoSuggerito(ex, settimana),
  };
  // In palestra un esercizio è più serie: senza moltiplicare, la sessione
  // sembra durare un terzo di quanto dura davvero.
  const durata = (ex.durataSec || 30) * (ex.serie || 1);

  // Esercizi a ripetizioni cronometrate (spinta / rilascio / spinta…):
  // servono passi separati, altrimenti è un blocco unico e non sai quando
  // spingere e quando mollare.
  if (ex.ripetuto) {
    const out = [];
    for (let i = 1; i <= ex.ripetuto.volte; i++) {
      out.push({ ...base, lato: ex.lato || null, durataSec: ex.ripetuto.lavoroSec,
        badgeExtra: `spinta ${i} di ${ex.ripetuto.volte}`, faseRipetuta: "lavoro" });
      if (i < ex.ripetuto.volte) {
        out.push({ ...base, lato: ex.lato || null, durataSec: ex.ripetuto.pausaSec,
          badgeExtra: "rilascia", faseRipetuta: "pausa",
          passi: ["Molla completamente.", "Senti il collo scendere di qualche grado.", "Non ricominciare prima del segnale."] });
      }
    }
    return out;
  }

  if (ex.lato) {
    return Array.from({ length: ex.volte || 1 }, () => ({ ...base, lato: ex.lato, durataSec: durata }));
  }
  if (!ex.perLato) return [{ ...base, lato: null, durataSec: durata }];

  const out = [
    { ...base, lato: "sx", durataSec: durata },
    { ...base, lato: "dx", durataSec: durata },
  ];
  if (ex.doppioADestra) out.push({ ...base, lato: "dx", durataSec: durata, extra: true });
  if (ex.extraLatoStretto && stretto) out.push({ ...base, lato: stretto, durataSec: durata, extra: true });
  return out;
}

function espandiPerId(id, stretto, settimana) {
  const t = trovaEsercizio(id);
  return t ? espandi(t.esercizio, t.gruppo, stretto, settimana) : [];
}

/* ------------------------------------------------------ le sessioni --- */

function postCorsa(meta, settimana) {
  const stretto = latoStretto(meta);
  const passi = [];
  for (const blocco of POST_CORSA.blocchi) {
    for (const id of blocco.esercizi) passi.push(...espandiPerId(id, stretto, settimana));
  }
  return passi;
}

function quotidiano(meta, settimana) {
  const fase = fasePerSettimana(settimana);
  const rot = rotazionePerSettimana(settimana);
  const stretto = latoStretto(meta);
  const passi = [];

  // 1. BLOCCO ATTIVO — tre al giorno, a rotazione. Apre la sessione perché
  // è il lavoro che alza il pavimento, e va fatto da freschi.
  const giorno = giorniTra(meta.programma.inizioProgramma || oggiISO(), oggiISO());
  for (let i = 0; i < 3; i++) {
    passi.push(...espandiPerId(BLOCCO_ATTIVO[(giorno * 3 + i) % BLOCCO_ATTIVO.length], stretto, settimana));
  }

  // 2. STRETCHING dei gruppi attivi del blocco corrente
  for (const idG of rot.gruppi.slice(0, fase.gruppiStretch)) {
    const gruppo = GRUPPI[idG];
    if (!gruppo) continue;
    for (const ex of gruppo.esercizi.filter((e) => e.tag === "S")) {
      passi.push(...espandi(ex, gruppo, stretto, settimana));
    }
  }

  // 3. BACINO — dalla settimana 3
  if (fase.bacino) {
    const lat = meta.assessment.esitoTest2.latoLateralizzato || "dx";
    const away = altroLato(lat);
    const lista = fase.bacino === "ridotto" ? BACINO.esercizi.filter((e) => e.ridotto) : BACINO.esercizi;
    for (const ex of lista) {
      passi.push({
        idEsercizio: ex.id, sigla: ex.sigla, nome: ex.nome, tag: ex.tag,
        gruppo: "BACINO", gruppoNome: BACINO.nome, gruppoMuscolare: ex.muscoli[0],
        muscoli: ex.muscoli, serve: ex.serve, video: ex.video, passi: ex.passi,
        nota: BACINO.nota, lato: ex.ruoloLato === "lat" ? lat : away,
        durataSec: ex.durataSec || 40, ripetizioni: null, carico: null,
      });
    }
  }

  // 4. COLLO — in coda, non in testa. Al 30-40% non serve farlo da freschi,
  // e lo statico va DOPO il riscaldamento. Nelle settimane corte se ne fanno
  // quattro su sei, per stare nei tre minuti che il programma gli assegna.
  const quanti = fase.minuti <= 14 ? 4 : G1.esercizi.length;
  for (const ex of G1.esercizi.slice(0, quanti)) passi.push(...espandi(ex, G1, stretto, settimana));

  return passi;
}

function loaded(meta, settimana) {
  const stretto = latoStretto(meta);
  return LOADED.esercizi.flatMap((ex) => espandi(ex, LOADED, stretto, settimana));
}

/** Dose minima: collo più un allungamento. Mai zero. */
function minima(meta, settimana) {
  const stretto = latoStretto(meta);
  return [
    ...espandi(G1.esercizi[0], G1, stretto, settimana),
    ...espandi(G1.esercizi[3], G1, stretto, settimana),
    ...espandiPerId("g5-farfalla", stretto, settimana),
  ];
}

const COSTRUTTORI = { "post-corsa": postCorsa, quotidiano, loaded, minima };

export function costruisciSessione(meta, sessioni, tipo) {
  const settimana = settimanaEffettiva(meta, sessioni);
  const fn = COSTRUTTORI[tipo] || quotidiano;
  return { passi: fn(meta, settimana), settimana };
}

/** I gruppi toccati dalla sessione, con i minuti. Per il riepilogo. */
export function riepilogoModuli(passi) {
  const mappa = new Map();
  for (const p of passi) {
    if (!mappa.has(p.gruppo)) mappa.set(p.gruppo, { nome: p.gruppoNome, muscoli: new Set(), durataSec: 0 });
    const v = mappa.get(p.gruppo);
    v.durataSec += p.durataSec;
    for (const m of p.muscoli || []) v.muscoli.add(m);
  }
  return [...mappa.values()].map((v) => ({ ...v, muscoli: [...v.muscoli] }));
}

/**
 * Inserisce i passi di preparazione fra un esercizio e l'altro, e marca i
 * cambi di lato: senza, due serie identiche di fila sembrano una ripetizione
 * inutile invece che "ora l'altra gamba".
 */
export function conPreparazione(passiLavoro, giaVisti = []) {
  const out = [];
  let n = 0;
  passiLavoro.forEach((p, i) => {
    const prec = passiLavoro[i - 1];
    const cambioLato = Boolean(prec && prec.idEsercizio === p.idEsercizio && prec.lato !== p.lato && p.lato);
    const primaVolta = !giaVisti.includes(p.idEsercizio)
      && !passiLavoro.slice(0, i).some((q) => q.idEsercizio === p.idEsercizio);
    n += 1;
    out.push({
      tipo: "prep", rif: { ...p, numero: n }, chiave: p.idEsercizio,
      cambioLato, mai: !giaVisti.includes(p.idEsercizio), beep: "inizio",
      durataSec: primaVolta ? PREP_PRIMA_VOLTA_SEC : PREP_RIPETIZIONE_SEC,
      titolo: p.nome,
    });
    out.push({ ...p, tipo: "lavoro", numero: n, beep: "fine", cambioLato, titolo: p.nome });
  });
  return out;
}

/** Il volume per gruppo muscolare, in secondi. È quello che finisce nel record. */
export function volumePerGruppo(passi) {
  const out = {};
  for (const p of passi) {
    if (p.tipo === "prep") continue;
    const k = p.gruppoMuscolare || p.gruppoNome;
    out[k] = (out[k] || 0) + p.durataSec;
  }
  return out;
}

/* --------------------------------------------------------------- serie -- */

/**
 * I giorni consecutivi con almeno una sessione.
 *
 * Come per le abitudini: se oggi non è ancora stata fatta la serie non è
 * spezzata, è solo "non ancora". Azzerarla ogni mattina renderebbe l'app
 * scoraggiante invece che motivante.
 */
export function serie(sessioni, oggi = oggiISO()) {
  const fatte = new Set(sessioni.map((s) => s.data));
  let d = oggi, n = 0;
  if (!fatte.has(d)) d = piuGiorni(d, -1);
  for (let i = 0; i < 730; i++) {
    if (!fatte.has(d)) break;
    n++;
    d = piuGiorni(d, -1);
  }
  return n;
}

/** Quanti dei sette giorni della settimana corrente hanno una sessione. */
export function settimanaFatta(sessioni, oggi = oggiISO()) {
  const fatte = new Set(sessioni.map((s) => s.data));
  const inizio = inizioSettimana(oggi);
  const giorni = Array.from({ length: 7 }, (_, i) => piuGiorni(inizio, i));
  return { giorni, fatti: giorni.map((g) => fatte.has(g)), quanti: giorni.filter((g) => fatte.has(g)).length };
}

/** Il volume degli ultimi N giorni, sommato per gruppo. Per i progressi. */
export function volumeRecente(sessioni, giorni = 28, oggi = oggiISO()) {
  const dal = piuGiorni(oggi, -giorni);
  const out = {};
  for (const s of sessioni) {
    if (s.data < dal) continue;
    for (const [k, v] of Object.entries(s.volumePerGruppo || {})) out[k] = (out[k] || 0) + v;
  }
  return Object.entries(out).sort((a, b) => b[1] - a[1]);
}
