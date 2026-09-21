// config.ts — il RECAPITO dei dati. Nessun segreto.
//
// Era `config.js`, uno script classico che scriveva `window.ATLAS_CFG`
// prima di tutto il resto. Qui è un modulo come gli altri: chi ne ha
// bisogno lo importa, e l'ordine di caricamento lo garantisce il grafo degli
// import invece di un tag <script> messo nel posto giusto di index.html.
//
// Quello che c'è qui è pubblico e va benissimo che lo sia: il nome di un
// repo privato non apre il repo, e la chiave VAPID pubblica è pubblica per
// definizione. Il token NON sta qui: sta sul dispositivo, in credenziali.ts.

export interface Recapito {
  owner: string;
  repo: string;
  branch: string;
  cartella: string;
  vapidPublic: string;
}

export const CFG: Readonly<Recapito> = {
  owner: "napema",
  repo: "atlas-dati",   // il repo PRIVATO dei dati
  branch: "main",
  cartella: "",         // "" = i file stanno nella radice del repo

  // Una coppia sola per tutti i moduli. Rigenerarla obbliga a reiscrivere
  // ogni dispositivo: una subscription è legata alla chiave con cui è nata.
  vapidPublic: "BA-MCfD2AgZsi0o2XbR07FMTZE0WGJ_aw5CRaHc2Vrbp77wR57yHn9nVGRb0E_U_gWbmOil08oBUGCcZNPn0WaQ",
};
