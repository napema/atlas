/* config.js — configurazione di ATLAS. Non è codice: sono i tuoi dati.
 *
 * QUI DENTRO NON VA NESSUN SEGRETO, e non è una precauzione teorica.
 * Questo file lo serve GitHub Pages da un repo pubblico: rispondeva 200 a
 * chiunque aprisse napema.github.io/atlas/config.js. Fino a settembre 2026
 * ci stava il token di scrittura su `atlas-dati` — base64 spezzato in tre,
 * che non nascondeva niente a nessuno tranne che al secret scanner di
 * GitHub, cioè all'unico allarme che avrebbe potuto revocarlo.
 *
 * Il token ora sta sul dispositivo e lo si incolla in Impostazioni →
 * Sincronizzazione, una volta per dispositivo. Il perché è scritto per
 * esteso in `core/credenziali.js`.
 *
 * Quello che resta qui è solo il RECAPITO, e va benissimo che sia pubblico:
 * il nome di un repo privato non apre il repo, e la chiave VAPID pubblica è
 * pubblica per definizione.
 *
 * A vuoto, ATLAS funziona lo stesso: tutto in locale, niente sync.
 */

window.ATLAS_CFG = {
  owner:  "napema",
  repo:   "atlas-dati",   // il repo PRIVATO dei dati
  branch: "main",
  cartella: "",           // "" = i file stanno nella radice del repo

  // Chiave PUBBLICA VAPID per le notifiche. È pubblica per definizione: sta
  // nel client ed è giusto così. La privata vive nei secret di atlas-dati e
  // non compare da nessuna parte in questo repo.
  //
  // Una coppia sola per tutti i moduli — prima erano due, una per Mobilità e
  // una per Abitudini. Rigenerarla obbliga a reiscrivere ogni dispositivo:
  // una subscription è legata alla chiave con cui è stata creata.
  vapidPublic: "BA-MCfD2AgZsi0o2XbR07FMTZE0WGJ_aw5CRaHc2Vrbp77wR57yHn9nVGRb0E_U_gWbmOil08oBUGCcZNPn0WaQ",
};
