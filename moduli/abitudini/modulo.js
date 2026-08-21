// moduli/abitudini — le abitudini del giorno, marcate in un tocco.
//
// Parte da napema/habit-tracker-webapp: index.html da 73 KB, monolitico, con
// notifiche push già funzionanti (notify.js + un workflow che gira su GitHub
// Actions). Il codice delle notifiche è la parte più preziosa: in ATLAS
// diventa il servizio unico per tutti i moduli, con una sola coppia VAPID.
//
// Dati oggi: napema/abitudini-dati → abitudini.json
// Dati dopo: napema/atlas-dati     → abitudini.json

import { cantiere } from "../cantiere.js";

export default {
  monta: cantiere({
    titolo: "Abitudini",
    origine: "https://napema.github.io/habit-tracker-webapp/",
    repoDati: "napema/abitudini-dati · abitudini.json",
    daFare: [
      "Estrarre lo schema di abitudini.json: definizioni, spunte per giorno, streak.",
      "Separare la griglia dei giorni dal calcolo delle serie.",
      "Portare notify.js in core/notifiche.js come servizio di tutti i moduli.",
      "Unificare le due coppie VAPID in una sola e rifare l'iscrizione sull'iPhone.",
      "Fondere i tre workflow di notifica in uno, con gli orari letti dal repo dati.",
    ],
  }),

  // `oggi()` volutamente non c'è ancora: vedi la nota in moduli/finanze.
  // Quando ci sarà: le abitudini del giorno non ancora spuntate e la serie
  // più lunga in corso. E leggerà dalla lavagna quello che gli altri moduli
  // hanno già fatto, invece di chiederlo di nuovo all'utente.
};
