// notifiche/prova-invio.ts — la spedizione, provata fino al telefono finto.
//
//     deno run --allow-net=fcm.googleapis.com --allow-env --allow-read notifiche/prova-invio.ts
//
// Il mittente gira sotto Deno, e `web-push` è scritto per Node: firma con
// ECDSA, cifra con ECDH + HKDF + AES-GCM, e Deno quelle funzioni le emula.
// Un'emulazione che sbaglia un byte produce una notifica che il servizio
// push accetta (201) e il telefono butta via in silenzio — cioè il guasto
// più difficile da vedere che esista. Quindi qui non basta il 201: un
// server push finto riceve il messaggio, e il messaggio si DECIFRA con le
// chiavi di un telefono finto. Se il testo torna uguale, la catena è sana.
//
// Tutte le chiavi nascono e muoiono qui dentro: nessuna è vera.

import webpush from "npm:web-push@3.6.7";
import ece from "npm:http_ece@1.2.0";
import { Buffer } from "node:buffer";
import crypto from "node:crypto";

let rotti = 0;
const ok = (nome: string, c: boolean, visto = "") => {
  if (!c) rotti++;
  console.log(`${c ? "ok  " : "NO  "} ${nome.padEnd(56)} ${visto}`);
};

// Il telefono finto: la sua coppia ECDH e il segreto di autenticazione.
const telefono = crypto.createECDH("prime256v1");
telefono.generateKeys();
const auth = crypto.randomBytes(16);
const b64u = (b: Uint8Array) => Buffer.from(b).toString("base64url");

// Le chiavi VAPID del mittente, usa e getta.
const v = webpush.generateVAPIDKeys();
webpush.setVapidDetails("mailto:prova@example.invalid", v.publicKey, v.privateKey);

const messaggio = { titolo: "💊  Integratori", corpo: "Creatina", rotta: "#/abitudini", modulo: "abitudini", tag: "ab:h_supplements@13:00:2026-10-12" };
const iscrizione = (endpoint: string) => ({ endpoint, keys: { p256dh: b64u(telefono.getPublicKey()), auth: b64u(auth) } });

/* LA RICHIESTA, PREPARATA E NON SPEDITA. `web-push` parla sempre HTTPS, e
   un server finto in chiaro non lo accetta: la cifratura si prova qui,
   sulla richiesta pronta, e il trasporto più sotto, contro Google. */
const richiesta = webpush.generateRequestDetails(iscrizione("https://push.example.invalid/finto"), JSON.stringify(messaggio), { TTL: 3 * 3600, urgency: "high" });
const ricevuto = { headers: Object.fromEntries(Object.entries(richiesta.headers).map(([k, x]) => [k.toLowerCase(), String(x)])), corpo: new Uint8Array(richiesta.body) };

ok("la richiesta è pronta, con un corpo", ricevuto.corpo.length > 0, `${ricevuto.corpo.length} byte`);
ok("è una POST", richiesta.method === "POST");
const h = ricevuto?.headers || {};
ok("cifrato aes128gcm (lo standard che legge iOS)", h["content-encoding"] === "aes128gcm", h["content-encoding"]);
ok("firmato VAPID", /^vapid t=.+, k=.+/.test(h["authorization"] || ""), (h["authorization"] || "").slice(0, 16) + "…");
ok("TTL di tre ore", h["ttl"] === "10800", h["ttl"]);
ok("urgenza alta", h["urgency"] === "high", h["urgency"]);

// La firma VAPID: un JWT ES256 che deve verificarsi con la chiave PUBBLICA.
{
  const [t] = (h["authorization"] || "").replace("vapid ", "").split(", ");
  const jwt = t.replace(/^t=/, "");
  const [testa, carico, firma] = jwt.split(".");
  const pub = Buffer.from(v.publicKey, "base64url");
  const chiave = await crypto.webcrypto.subtle.importKey("raw", pub, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
  const valida = await crypto.webcrypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" }, chiave,
    Buffer.from(firma, "base64url"), new TextEncoder().encode(`${testa}.${carico}`),
  );
  const claims = JSON.parse(Buffer.from(carico, "base64url").toString());
  ok("la firma si verifica con la chiave pubblica", valida);
  ok("il destinatario è il server push", claims.aud === "https://push.example.invalid", claims.aud);
}

// E il testo, decifrato dal telefono finto.
{
  const chiaro = ece.decrypt(Buffer.from(ricevuto.corpo), {
    version: "aes128gcm", privateKey: telefono, authSecret: Buffer.from(auth),
  });
  // deno-lint-ignore no-explicit-any
  let letto: any = null;
  try { letto = JSON.parse(chiaro.toString("utf8")); } catch { /* resta null */ }
  ok("il telefono lo decifra", Boolean(letto));
  ok("e il testo è identico, emoji comprese", JSON.stringify(letto) === JSON.stringify(messaggio), letto?.titolo);
}

/* IL TRASPORTO: una spedizione vera, in HTTPS, a Google, con un'iscrizione
   palesemente finta. Google la rifiuta — ed è proprio il rifiuto la prova:
   per riceverlo la richiesta è partita, ha negoziato TLS, è arrivata, ed è
   stata letta. Un 4xx qui vuol dire che il canale di Deno funziona; un
   errore di rete vorrebbe dire che no. */
try {
  await webpush.sendNotification(iscrizione("https://fcm.googleapis.com/fcm/send/atlas-prova-iscrizione-finta"), "x", { TTL: 60 });
  ok("Google rifiuta l'iscrizione finta", false, "accettata?!");
} catch (e: any) {
  ok("HTTPS fino al servizio push: risposta ricevuta", typeof e?.statusCode === "number", `HTTP ${e?.statusCode ?? e?.message}`);
  ok("e il rifiuto è un 4xx, cioè un'iscrizione sconosciuta", e?.statusCode >= 400 && e?.statusCode < 500);
}

console.log(rotti ? `\n${rotti} controlli non passano.` : "\nLa catena è sana.");
Deno.exit(rotti ? 1 : 0);
