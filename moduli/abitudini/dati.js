// moduli/abitudini/dati.js — lo schema e l'accesso all'archivio.
//
// Lo schema è quello di habit-tracker-webapp, conservato com'era: i record
// hanno già `id`, `up` e le lapidi `del`, che è esattamente il modello di
// core/sync.js. Non c'è niente da migrare, solo da innestare.
//
// ATTENZIONE ALLA CONVENZIONE DEI GIORNI. `sched.days` contiene numeri
// JavaScript: 0 = domenica, 1 = lunedì … 6 = sabato. core/contesto.js usa
// invece 0 = lunedì, perché è così che si conta in italiano. I dati NON
// vengono convertiti — sarebbe una migrazione rischiosa per un guadagno
// nullo — la conversione avviene ai bordi, in calcolo.js. È lo scambio che
// produce il bug più insidioso di tutti, perché funziona sei giorni su sette.

import { apriCasella } from "../../core/storage.js";

export const TINTE = ["blue", "green", "red", "orange", "purple", "pink", "yellow", "mint", "indigo"];

/** Dalla tinta al token. Una tinta sconosciuta cade sul blu, non esplode. */
export const coloreTinta = (t) => `var(--${
  { blue: "blu", green: "verde", red: "rosso", orange: "arancio", purple: "viola",
    pink: "rosa", yellow: "giallo", mint: "menta", indigo: "indaco" }[t] || "blu"
})`;

export const PREDEFINITO = {
  v: 1,
  habits: [],   // { id, name, emoji, tint, sched, remind, archived, created, order, up, del? }
  logs: [],     // { id: "<habitId>|<data>", h, d, up, del? }
  // Nello schema di partenza qui c'era anche `subs`, le iscrizioni push.
  // In ATLAS non ci sono più: le notifiche sono di core, una coppia VAPID
  // per tutti i moduli, e le iscrizioni stanno in notifiche.json. Un modulo
  // che tenesse le sue riporterebbe la duplicazione che ATLAS elimina.
  meta: { theme: "auto", weekStart: 1 },
  metaUp: 0,
};

export const casella = apriCasella("abitudini", PREDEFINITO);

export const stato = () => casella.leggi();

/** Le abitudini vive, in ordine. Le viste leggono sempre questo. */
export function abitudiniVive({ conArchiviate = false } = {}) {
  return stato().habits
    .filter((h) => h && !h.del && (conArchiviate || !h.archived))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || String(a.name).localeCompare(String(b.name)));
}

export const abitudinePerId = (id) => stato().habits.find((h) => h.id === id && !h.del) || null;

/**
 * L'indice delle spunte, ricostruito a ogni lettura dello stato.
 *
 * È una Set di `<habitId>|<data>`: senza, ogni controllo "è fatta?" sarebbe
 * una scansione dell'intero array dei log, e una griglia di 7 giorni × 10
 * abitudini ne fa settanta. Con trecento log a testa si sente.
 */
let indice = null;
let indiceDi = null;

export function indiceSpunte() {
  const s = stato();
  if (indice && indiceDi === s.logs) return indice;
  indice = new Set();
  for (const l of s.logs) if (l && !l.del) indice.add(l.id);
  indiceDi = s.logs;
  return indice;
}

export const idLog = (habitId, data) => `${habitId}|${data}`;
export const eFatta = (habitId, data) => indiceSpunte().has(idLog(habitId, data));

// ------------------------------------------------------------- scritture --

/**
 * Spunta o de-spunta. Restituisce il nuovo stato (true = fatta).
 *
 * L'id del log è deterministico (`habitId|data`), quindi due dispositivi
 * che spuntano la stessa abitudine lo stesso giorno producono lo STESSO
 * record e la fusione li unisce invece di duplicarli. È fatto bene
 * nell'app di partenza: conservato tale e quale.
 */
export function alterna(habitId, data) {
  const id = idLog(habitId, data);
  const eraFatta = eFatta(habitId, data);
  casella.aggiorna((s) => {
    const i = s.logs.findIndex((l) => l.id === id);
    const rec = { id, h: habitId, d: data, up: Date.now() };
    // De-spuntare non toglie il record: mette la lapide. Senza, l'altro
    // dispositivo rimanderebbe indietro la spunta e la toglierebbe di nuovo.
    if (eraFatta) rec.del = true;
    if (i >= 0) s.logs[i] = rec; else s.logs.push(rec);
  });
  indice = null;
  return !eraFatta;
}

export function salvaAbitudine(dati) {
  const ora = Date.now();
  casella.aggiorna((s) => {
    const i = s.habits.findIndex((h) => h.id === dati.id);
    if (i >= 0) {
      s.habits[i] = { ...s.habits[i], ...dati, up: ora };
    } else {
      const massimo = s.habits.reduce((m, h) => Math.max(m, h.order ?? 0), 0);
      // Gli `order` vanno a passi di 10: così infilare un'abitudine fra due
      // esistenti non obbliga a rinumerare tutte le altre.
      s.habits.push({ archived: false, created: ora, order: massimo + 10, ...dati, up: ora });
    }
  });
}

export function eliminaAbitudine(id) {
  casella.aggiorna((s) => {
    const i = s.habits.findIndex((h) => h.id === id);
    if (i >= 0) s.habits[i] = { id, del: true, up: Date.now() };
  });
}

export function riordina(idOrdinati) {
  casella.aggiorna((s) => {
    idOrdinati.forEach((id, n) => {
      const h = s.habits.find((x) => x.id === id);
      if (h) { h.order = (n + 1) * 10; h.up = Date.now(); }
    });
  });
}

export function scriviMeta(patch) {
  casella.aggiorna((s) => { Object.assign(s.meta, patch); s.metaUp = Date.now(); });
}
