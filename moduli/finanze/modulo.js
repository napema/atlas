// moduli/finanze — il registro di entrate e uscite.
//
// Parte da napema/budget-tracker-webpage: un index.html da 118 KB con CSS e
// JS dentro. Il codice è buono, la forma no: va spezzato in dati / calcolo /
// viste, e il suo motore di sync va buttato in favore di core/sync.js.
//
// Dati oggi: napema/finance-tracker → registro.json
// Dati dopo: napema/atlas-dati      → finanze.json

import { cantiere } from "../cantiere.js";

export default {
  monta: cantiere({
    titolo: "Finanze",
    origine: "https://napema.github.io/budget-tracker-webpage/",
    repoDati: "napema/finance-tracker · registro.json",
    daFare: [
      "Leggere registro.json e fissare per iscritto lo schema dei movimenti.",
      "Dare a ogni movimento un id stabile e un campo up: senza, la fusione per record non può funzionare.",
      "Estrarre il calcolo (saldi, categorie, ricorrenti) in calcolo.js, senza toccare il DOM.",
      "Ridisegnare le viste con i token condivisi al posto del CSS incorporato.",
      "Aprire il canale su finanze.json e migrare i dati una volta sola.",
    ],
  }),

  // `oggi()` volutamente NON c'è ancora. Un modulo che risponde `null` sta
  // dicendo "oggi niente da segnalare"; uno che non risponde affatto sta
  // dicendo "non ci sono ancora". La home mostra le due cose in modo
  // diverso, ed è giusto che lo faccia.
  //
  // Quando ci sarà: saldo del mese e sforamento sulle categorie.
};
