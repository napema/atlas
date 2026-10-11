// notifiche/invia.ts — il mittente delle notifiche di ATLAS. Puntuale al minuto.
//
//     deno run --allow-net --allow-env --allow-read --location http://localhost/ notifiche/invia.ts
//
// PERCHÉ È QUI, NEL REPO PUBBLICO, e non più in atlas-dati.
//
// La precisione costa giri. Un promemoria alle 13:00 arriva alle 13:00 solo
// se a quell'ora c'è un giro acceso, e i giri si pagano: su un repo PRIVATO
// GitHub ne regala 2000 minuti al mese, ognuno fatturato come un minuto
// intero. Il vecchio mittente in atlas-dati doveva starci dentro, e per
// starci girava ogni dieci minuti solo fra le 7 e le 9 e fra le 20 e le 23:
// un integratore a pranzo non poteva arrivare mai. Su un repo PUBBLICO i
// minuti sono illimitati. Qui il giro può essere ogni cinque minuti, tutto
// il giorno, e dentro il giro si aspetta il minuto esatto.
//
// COSA VEDE IL MONDO. Il codice e i log di questo workflow sono pubblici: i
// dati no. Arrivano da atlas-dati con un token che sta nei secret del repo
// — i secret non finiscono mai nei log e non li vede chi apre una pull
// request da un fork. Per la stessa ragione QUESTO FILE NON STAMPA NIENTE
// DEI DATI: né nomi di abitudini, né importi, né iscrizioni. Solo numeri.
//
// COME TIENE L'ORA. Ogni giro si prende carico dei prossimi `FINESTRA`
// minuti: manda subito quello che è già dovuto, poi dorme fino al minuto
// esatto della notifica dopo, rilegge i dati (in cinque minuti si fa in
// tempo a spuntare) e manda solo quello che serve ancora. Il giro dopo
// riprende da lì. Un giro saltato non perde niente: chi arriva dopo manda
// in ritardo quello che era dovuto negli ultimi `RECUPERO` minuti.

import webpush from "npm:web-push@3.6.7";
import { pianoDelGiorno, adessoARoma, minutiDi, type Notifica, type FileDati } from "./piano.ts";

// deno-lint-ignore no-explicit-any
type J = any;

const env = (k: string, d = "") => (Deno.env.get(k) ?? d).trim();

const REPO = env("DATI_REPO", "napema/atlas-dati");
const RAMO = env("DATI_RAMO", "main");
const TOKEN = env("DATI_TOKEN");
const PUB = env("VAPID_PUBLIC");
const PRIV = env("VAPID_PRIVATE");
const SUBJ = env("VAPID_SUBJECT", "mailto:atlas@example.invalid");
const FINESTRA = Number(env("FINESTRA_MINUTI", "5"));
const RECUPERO = Number(env("RECUPERO_MINUTI", "90"));
/* PROVA=1: legge, calcola, dice quante ne manderebbe — e non manda né
   scrive niente. È il modo di accendere il mittente senza rischi. */
const PROVA = env("PROVA") === "1";

const STATO = "stato-mittente.json";

/* ------------------------------------------------------- log pubblico -- */
const log = (...x: unknown[]) => console.log(`[${adessoARoma().hhmm}]`, ...x);

/* ----------------------------------------------------- atlas-dati -- */

const intestazioni = () => ({
  Authorization: `Bearer ${TOKEN}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
});

const b64dec = (s: string) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\s/g, "")), (c) => c.charCodeAt(0)));
const b64enc = (s: string) => {
  const b = new TextEncoder().encode(s);
  let x = "";
  for (let i = 0; i < b.length; i += 0x2000) x += String.fromCharCode(...b.subarray(i, i + 0x2000));
  return btoa(x);
};

async function leggi(file: string): Promise<{ dati: J; sha: string | null }> {
  const r = await fetch(`https://api.github.com/repos/${REPO}/contents/${file}?ref=${RAMO}`, { headers: intestazioni() });
  if (r.status === 404) return { dati: null, sha: null };
  if (!r.ok) throw new Error(`lettura di un file dei dati: HTTP ${r.status}`);
  const j = await r.json();
  return { dati: JSON.parse(b64dec(j.content)), sha: j.sha };
}

async function scrivi(file: string, dati: J, sha: string | null): Promise<{ ok: boolean; sha?: string; conflitto?: boolean }> {
  const r = await fetch(`https://api.github.com/repos/${REPO}/contents/${file}`, {
    method: "PUT", headers: intestazioni(),
    body: JSON.stringify({
      message: "mittente: notifiche mandate",
      content: b64enc(JSON.stringify(dati, null, 1)),
      branch: RAMO, ...(sha ? { sha } : {}),
    }),
  });
  if (r.status === 409 || r.status === 422) return { ok: false, conflitto: true };
  if (!r.ok) return { ok: false };
  return { ok: true, sha: (await r.json()).content?.sha };
}

async function leggiTutto(): Promise<FileDati> {
  const [n, a, m, f] = await Promise.all(
    ["notifiche.json", "abitudini.json", "mobilita.json", "finanze.json"].map((x) => leggi(x)),
  );
  return { notifiche: n.dati, abitudini: a.dati, mobilita: m.dati, finanze: f.dati };
}

/* ---------------------------------------------------- lo stato -- */
/* Cosa è già stato mandato, in un file SUO. Il mittente di prima usava
   `stato-notifiche.json` con chiavi diverse: condividerlo vorrebbe dire due
   programmi che si sovrascrivono a vicenda per la durata del passaggio. */

interface Stato {
  mandati: Record<string, number>;
  /** Iscrizioni che il servizio push ha dichiarato morte (404/410), con l'ora. */
  morte: Record<string, number>;
  ultimiInvii: { ts: number; chiave: string; modulo: string; ok: number; di: number }[];
}

let stato: Stato = { mandati: {}, morte: {}, ultimiInvii: [] };
let shaStato: string | null = null;

async function caricaStato() {
  const s = await leggi(STATO);
  shaStato = s.sha;
  stato = { mandati: {}, morte: {}, ultimiInvii: [], ...(s.dati || {}) };
}

/** Scrive lo stato. Su conflitto rilegge e UNISCE: un invio segnato da un
 *  altro giro non si perde, e uno segnato qui nemmeno. */
async function salvaStato() {
  if (PROVA) return;
  // Si tiene una settimana di chiavi: oltre non servono a niente.
  const taglio = Date.now() - 7 * 86400_000;
  for (const [k, t] of Object.entries(stato.mandati)) if (t < taglio) delete stato.mandati[k];
  stato.ultimiInvii = stato.ultimiInvii.slice(-30);
  for (let tentativo = 0; tentativo < 4; tentativo++) {
    const r = await scrivi(STATO, stato, shaStato);
    if (r.ok) { shaStato = r.sha ?? null; return; }
    if (!r.conflitto) throw new Error("scrittura dello stato non riuscita");
    const altro = await leggi(STATO);
    shaStato = altro.sha;
    const o = altro.dati || {};
    stato.mandati = { ...(o.mandati || {}), ...stato.mandati };
    stato.morte = { ...(o.morte || {}), ...stato.morte };
    stato.ultimiInvii = [...(o.ultimiInvii || []), ...stato.ultimiInvii]
      .filter((x, i, a) => a.findIndex((y) => y.chiave === x.chiave && y.ts === x.ts) === i)
      .sort((x, y) => x.ts - y.ts);
  }
  throw new Error("lo stato non si scrive: troppi conflitti");
}

/* ------------------------------------------------------ gli invii -- */

/** Le iscrizioni vive. Una iscrizione «morta» torna viva se il telefono
 *  l'ha riscritta DOPO la morte: è il caso di iOS che rigenera l'endpoint. */
function iscrizioniVive(n: J): J[] {
  return (n?.subs || []).filter((s: J) =>
    s && !s.del && s.endpoint && s.p256dh && s.auth &&
    !(stato.morte[s.id] && (s.up || 0) <= stato.morte[s.id]));
}

async function manda(lista: Notifica[], f: FileDati): Promise<number> {
  const subs = iscrizioniVive(f.notifiche);
  if (!subs.length) { log("nessuna iscrizione viva"); return 0; }
  let mandate = 0;
  for (const n of lista) {
    if (PROVA) { mandate++; continue; }
    const carico = JSON.stringify({ titolo: n.titolo, corpo: n.corpo, rotta: n.rotta, modulo: n.modulo, tag: n.chiave });
    let ok = 0;
    for (const s of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          carico,
          // TTL di tre ore: una notifica delle 08:00 consegnata a mezzogiorno
          // non serve più, e svegliare il telefono per niente è peggio.
          // `high`: per un promemoria con un orario, il ritardo è il guasto.
          { TTL: 3 * 3600, urgency: "high" },
        );
        ok++;
      } catch (e: J) {
        const c = e?.statusCode;
        if (c === 404 || c === 410) stato.morte[s.id] = Date.now();
        log(`un invio rifiutato: HTTP ${c ?? "rete"}`);
      }
    }
    // Mandata se ALMENO un dispositivo l'ha presa. Se nessuno — la rete,
    // il servizio push giù — resta da mandare, e il giro dopo ci riprova.
    if (ok > 0) {
      stato.mandati[n.chiave] = Date.now();
      stato.ultimiInvii.push({ ts: Date.now(), chiave: n.chiave, modulo: n.modulo, ok, di: subs.length });
      mandate++;
    }
  }
  return mandate;
}

/* ------------------------------------------------------- il giro -- */

async function giro() {
  const mancano = [!TOKEN && "DATI_TOKEN", !PUB && "VAPID_PUBLIC", !PRIV && "VAPID_PRIVATE"].filter(Boolean);
  if (mancano.length) {
    // Non è un errore: è il mittente non ancora acceso. Una corsa rossa ogni
    // mezz'ora prima della configurazione sarebbe solo una casella di posta
    // piena di avvisi.
    console.log(`::notice::Mittente non configurato: mancano i secret ${mancano.join(", ")}.`);
    return;
  }
  webpush.setVapidDetails(SUBJ, PUB, PRIV);
  await caricaStato();
  /* IL PRIMO GIRO ACCESO LASCIA UN SEGNO. Senza secret il workflow gira lo
     stesso e finisce «con successo» senza aver fatto niente: l'app vedrebbe
     un giro riuscito su un mittente spento. Il file di stato, creato qui al
     primo giro configurato, è la differenza fra «gira» e «gira ed è acceso». */
  if (!shaStato && !PROVA) await salvaStato();

  const fine = Date.now() + FINESTRA * 60_000;
  let totale = 0, cicli = 0;

  while (true) {
    cicli++;
    const t = adessoARoma();
    const f = await leggiTutto();
    const piano = pianoDelGiorno(f, t.data);

    const dovute = piano.filter((n) => {
      const m = minutiDi(n.ora);
      return !stato.mandati[n.chiave] && m <= t.minuti && t.minuti - m <= RECUPERO;
    });
    if (dovute.length) {
      const m = await manda(dovute, f);
      totale += m;
      if (m) await salvaStato();
    }

    // La prossima dentro la finestra di questo giro.
    const future = piano
      .filter((n) => !stato.mandati[n.chiave] && minutiDi(n.ora) > t.minuti)
      .map((n) => minutiDi(n.ora));
    if (!future.length) break;
    const attesa = (Math.min(...future) - t.minuti) * 60_000 - t.secondi * 1000 + 400;
    if (Date.now() + attesa > fine) break;
    await new Promise((r) => setTimeout(r, Math.max(0, attesa)));
  }

  log(`${PROVA ? "PROVA · " : ""}giro chiuso: ${totale} mandate in ${cicli} ${cicli === 1 ? "controllo" : "controlli"}, ${iscrizioniVive((await leggi("notifiche.json")).dati).length} iscrizioni vive`);
}

try {
  await giro();
} catch (e: J) {
  // Il messaggio, non lo stack: lo stack può portarsi dietro pezzi dei dati.
  console.log(`::error::${e?.message || "errore"}`);
  Deno.exit(1);
}
