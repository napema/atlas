// moduli/mobilita — la pratica quotidiana: RESET, MICRO, CARICO.
//
// Parte da napema/mobility-blueprint, che è già modulare: js/engine.js,
// js/esercizi.js, js/assessment.js, js/progressi.js. Qui il lavoro non è
// spezzare, è innestare — togliere il suo storage.js e il suo sync.js e
// attaccarlo a core/. Il resto passa quasi intatto.
//
// Attenzione al pezzo delicato: la salvaguardia dell'assessment. Un
// assessment completato non deve MAI perdere contro uno vuoto, qualunque
// cosa dicano i timestamp. Sta in js/sync.js dell'app di partenza ed è
// nata da una perdita di dati vera.
//
// Dati oggi: napema/mobilita-dati → dati.json
// Dati dopo: napema/atlas-dati    → mobilita.json (+ foto/<id>.jpg)

import { cantiere } from "../cantiere.js";

export default {
  monta: cantiere({
    titolo: "Mobilità",
    origine: "https://napema.github.io/mobility-blueprint/",
    repoDati: "napema/mobilita-dati · dati.json",
    daFare: [
      "Portare il catalogo esercizi e il motore del follow-along così come sono.",
      "Sostituire js/storage.js con una casella di core/storage.js.",
      "Sostituire js/sync.js con un canale, conservando la salvaguardia dell'assessment.",
      "Spostare le foto dei progressi su core/blobs.js, riferimenti nel JSON e file nel repo.",
      "Riconciliare il tema: l'app di partenza è chiara, le altre due scure. I token reggono entrambi.",
    ],
  }),

  // `oggi()` volutamente non c'è ancora: vedi la nota in moduli/finanze.
  // Quando ci sarà: la sessione del giorno, la serie in corso, e l'urgenza
  // quando la serale manca. E scriverà "mobilita:sessione-completata" sulla
  // lavagna, perché Abitudini possa spuntarla senza che l'utente lo rifaccia.
};
