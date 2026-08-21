/* config.js — configurazione di ATLAS. Non è codice: sono i tuoi dati.
 *
 * ATTENZIONE, e vale la pena leggerla una volta:
 * il token sta qui in chiaro-ish (base64 spezzato in tre). Non è sicurezza,
 * è solo antiscraping: chi apre il sorgente lo trova in trenta secondi.
 * È accettabile SOLO perché è un token fine-grained con permessi minimi
 * (Contents: read/write) su un unico repo PRIVATO di dati personali, e si
 * revoca in un clic. Se un giorno i dati diventano sensibili davvero o gli
 * utenti più di uno, serve un backend vero.
 *
 * A vuoto, ATLAS funziona lo stesso: tutto in locale, niente sync.
 *
 * COME RIEMPIRLO — istruzioni per esteso in docs/SYNC.md. In breve:
 *   1. crea un repo PRIVATO chiamato "atlas-dati"
 *   2. genera un token fine-grained con accesso a quel solo repo,
 *      permesso "Contents: Read and write"
 *   3. in una console del browser:
 *
 *        const t = "github_pat_iltuotoken";
 *        const b = btoa(t), n = Math.ceil(b.length / 3);
 *        console.log(JSON.stringify([b.slice(0,n), b.slice(n,2*n), b.slice(2*n)]));
 *
 *   4. incolla i tre pezzi in t1, t2, t3 qui sotto.
 */

window.ATLAS_CFG = {
  owner:  "napema",
  repo:   "atlas-dati",   // il repo PRIVATO dei dati
  branch: "main",
  cartella: "",           // "" = i file stanno nella radice del repo

  // base64 del token, spezzato in tre parti consecutive		
  t1: "Z2l0aHViX3BhdF8xMUFYQkRXN1kwbThTOUNVeXVnVT",
  t2: "Z2X3B2TlV4UGZLcjBjZjNyUDFkRzRBWTNNZW5zSHEz",
  t3: "Um5palVmNDA1dXZNVVNKV1ZPRzVBU3FsaDJZVW5w",

  // Chiave PUBBLICA VAPID per le notifiche. È pubblica per definizione: sta
  // nel client ed è giusto così. La privata vive nei secret di atlas-dati e
  // non compare da nessuna parte in questo repo.
  //
  // Una coppia sola per tutti i moduli — prima erano due, una per Mobilità e
  // una per Abitudini. Rigenerarla obbliga a reiscrivere ogni dispositivo:
  // una subscription è legata alla chiave con cui è stata creata.
  vapidPublic: "BA-MCfD2AgZsi0o2XbR07FMTZE0WGJ_aw5CRaHc2Vrbp77wR57yHn9nVGRb0E_U_gWbmOil08oBUGCcZNPn0WaQ",
};
