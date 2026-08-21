// moduli/mobilita/dati.js — lo schema e l'accesso all'archivio.
//
// Portato da napema/mobility-blueprint. Lo schema resta identico: i record
// avevano già `id` deterministico (`data|tipo`), `up` e le lapidi.
//
// Un solo campo è stato tolto: `programma.oraPromemoria`, che duplicava
// `programma.notifiche.principale` con un valore diverso (21:15 contro
// 21:00). Era il residuo di una versione precedente; se lo si trova in un
// file vecchio, viene ignorato.

import { apriCasella } from "../../core/storage.js";

export const TIPI_SESSIONE = {
  "post-corsa": { nome: "Post-corsa", perche: "Hai corso: questa sostituisce il quotidiano, non si somma." },
  quotidiano:   { nome: "Quotidiano", perche: "Sul tappeto, la sera. Non deve farti sudare." },
  loaded:       { nome: "Loaded mobility", perche: "È il giorno di palestra. È allenamento vero: mai il giorno dopo le gambe." },
  minima:       { nome: "Dose minima", perche: "Per i giorni storti. Meglio due minuti che zero." },
};

export const PREDEFINITO = {
  // Le sessioni fatte. `id` è "<data>|<tipo>": deterministico, quindi due
  // dispositivi che registrano la stessa sessione non la duplicano.
  records: [],
  // I riferimenti alle foto dei progressi. I file veri stanno in
  // core/blobs.js e nel repo dati: qui c'è solo l'anagrafica.
  foto: [],

  meta: {
    assessment: {
      completato: false,
      esitoTest1: { variante1Cm: null, variante2Cm: null, variante3Cm: null, esito: null },
      esitoTest2: {
        risposte: [null, null, null, null, null, null, null],
        latoLateralizzato: null, punteggio: null,
        doppioTwist: false, latoSopra: null, latoSotto: null,
      },
      baselineTest3: {
        bersagli: {
          "deep-squat":       { misure: { profonditaLivello: null, talloniATerra: null }, fotoData: null },
          pike:               { misure: { distanzaDitaPavimentoCm: null }, fotoData: null },
          "overhead-shoulder": { misure: { distanzaPolsoMuroCm: null, lombarePiatta: null }, fotoData: null },
          farfalla:           { misure: { altezzaGinocchioSxCm: null, altezzaGinocchioDxCm: null }, fotoData: null },
          collo:              { misure: { angoloDxGradi: null, angoloSxGradi: null }, fotoData: null },
        },
        completatoIl: null,
      },
    },
    programma: {
      blocco: 0,
      settimana: 0,
      settimanaIniziataIl: null,
      inizioProgramma: null,
      videoVistiObbligatori: [],
      avvisoColloMostrato: false,
      aggancio: "Subito dopo la doccia serale",
      notificheAttive: false,
      giornoPalestra: 2,          // 0 = lunedì … 6 = domenica
      notifiche: {
        principale: "21:00", recupero: "22:15", palestra: "17:15", settimanale: "19:00",
        attivaRecupero: true, attivaPalestra: true, attivaSettimanale: true,
      },
    },
    streak: { giorniConsecutivi: 0, ultimaDataCompletata: null },
  },
  metaUp: 0,

  // Roba del giorno, non sincronizzata: che si sta facendo adesso.
  giornoCorrente: { data: null, haCorso: false, forza: null },
  sessioneInCorso: null,
};

export const casella = apriCasella("mobilita", PREDEFINITO);
export const stato = () => casella.leggi();

export const sessioniVive = () => stato().records.filter((r) => r && !r.del);
export const fotoVive = () => stato().foto.filter((f) => f && !f.del);

export const idSessione = (data, tipo) => `${data}|${tipo}`;

// ------------------------------------------------------------- scritture --

export function registraSessione({ data, tipo, durataSec, esercizi, volumePerGruppo }) {
  const id = idSessione(data, tipo);
  casella.aggiorna((s) => {
    const rec = { id, up: Date.now(), data, tipo, durataSec, esercizi, volumePerGruppo };
    const i = s.records.findIndex((r) => r.id === id);
    if (i >= 0) s.records[i] = rec; else s.records.push(rec);
    s.sessioneInCorso = null;
  });
  return id;
}

export function eliminaSessione(id) {
  casella.aggiorna((s) => {
    const i = s.records.findIndex((r) => r.id === id);
    if (i >= 0) s.records[i] = { id, del: true, up: Date.now() };
  });
}

/** Il meta (assessment, programma, streak) ha un solo timestamp. */
export function scriviMeta(fn) {
  casella.aggiorna((s) => { fn(s.meta); s.metaUp = Date.now(); });
}

/** La risposta a "hai corso oggi?". Non si sincronizza: vale per la giornata. */
export function segnaGiorno(patch) {
  casella.aggiorna((s) => { s.giornoCorrente = { ...s.giornoCorrente, ...patch }; }, { tocca: false });
}

export function salvaAvanzamento(p) {
  casella.aggiorna((s) => { s.sessioneInCorso = p; }, { tocca: false });
}
