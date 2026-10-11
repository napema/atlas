// notifiche/chiavi.ts — una coppia VAPID nuova per il mittente.
//
//     deno run --allow-read --allow-write=app/src/lib/core/config.ts notifiche/chiavi.ts
//
// Serve una volta sola, se la chiave privata di prima non è salvata da
// nessuna parte: i secret di GitHub si scrivono e non si rileggono, quindi
// quella in atlas-dati non si può copiare qui.
//
// Cosa fa:
//   - la chiave PUBBLICA la scrive da sé in `app/src/lib/core/config.ts`:
//     non è un segreto, e copiarla a mano è il modo di sbagliarla;
//   - la chiave PRIVATA la stampa SOLO qui, nel terminale. Non la scrive in
//     nessun file — un file in questa cartella finirebbe sul sito pubblico
//     al primo push. Va incollata nel secret VAPID_PRIVATE e basta.
//
// Dopo: i telefoni si reiscrivono da soli alla prima apertura di ATLAS con
// la versione nuova (vedi `riallinea()` in notifiche.ts). Se uno non ce la
// fa senza un tocco, in Impostazioni → Notifiche torna «Attiva».

import webpush from "npm:web-push@3.6.7";

const FILE = "app/src/lib/core/config.ts";
const k = webpush.generateVAPIDKeys();

const testo = await Deno.readTextFile(FILE);
const nuovo = testo.replace(/vapidPublic:\s*"[^"]*"/, `vapidPublic: "${k.publicKey}"`);
if (nuovo === testo) {
  console.error(`Non trovo vapidPublic in ${FILE}: la chiave pubblica va messa a mano.`);
} else {
  await Deno.writeTextFile(FILE, nuovo);
}

console.log(`
La chiave PUBBLICA è già scritta in ${FILE}.

Su github.com/napema/atlas → Settings → Secrets and variables → Actions:

  VAPID_PUBLIC   ${k.publicKey}

  VAPID_PRIVATE  ${k.privateKey}

La privata non è salvata da nessun'altra parte: incollala adesso, e poi
chiudi questo terminale.
`);
