// notifiche.js — UNA coppia VAPID, UN workflow, tutti i moduli.
//
// Prima c'erano due sistemi di push identici e incompatibili: uno in
// Mobilità, uno in Abitudini, con due coppie di chiavi e due workflow su
// GitHub Actions. Qui ce n'è uno solo, e il campo `modulo` del messaggio
// dice chi ha parlato.
//
// COME FUNZIONA, in breve. Il browser si iscrive al servizio push di Apple
// (o di Google) e riceve un `endpoint` con due chiavi. Quell'iscrizione
// finisce nel repo dati privato. Un workflow che gira ogni dieci minuti
// legge i file dei moduli, decide quali promemoria sono scaduti, e li
// spedisce firmandoli con la chiave VAPID privata — che sta nei secret del
// repo e non passa mai da qui.
//
// PERCHÉ LE VECCHIE ISCRIZIONI NON SI POSSONO RIUSARE: una subscription è
// legata all'origine E allo scope del service worker. ATLAS sta su
// /atlas/, le app di partenza su /habit-tracker-webapp/ e
// /mobility-blueprint/. Sono tre scope diversi, quindi tre iscrizioni
// diverse: il telefono va iscritto di nuovo da qui, e non c'è modo di
// evitarlo.

import { apriCasella } from "./storage.js";
import { apriCanale, fondiRecord, potaLapidi } from "./sync.js";
import { nuovoId } from "./ui.js";

const CFG = globalThis.ATLAS_CFG || {};

export const PREDEFINITO = {
  // Le iscrizioni push. Un record per dispositivo, con id stabile: così
  // due telefoni non si sovrascrivono e uno si può revocare da solo.
  subs: [],
  // Gli orari li legge il workflow da qui: cambiarli sul telefono li cambia
  // davvero, senza toccare il codice né il workflow.
  orari: {
    mobilita: {
      attiva: false,
      principale: "21:00",   // "hai fatto la sessione?"
      recupero: "22:15",     // propone la dose minima
      attivaRecupero: true,
    },
    abitudini: {
      // Le abitudini hanno il promemoria per abitudine (`remind`): qui c'è
      // solo l'interruttore generale.
      attiva: false,
    },
    finanze: {
      attiva: false,
      riepilogo: "21:30",    // "hai segnato le spese di oggi?"
    },
  },
  up: 0,
};

export const casella = apriCasella("notifiche", PREDEFINITO);
export const stato = () => casella.leggi();

export const supportate = () =>
  "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

export const permesso = () => (supportate() ? Notification.permission : "unsupported");

/** In PWA installata? Su iOS il push funziona SOLO da schermata Home. */
export const installata = () =>
  globalThis.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone === true;

export const suIOS = () =>
  /iPhone|iPad|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

/** La chiave pubblica VAPID, da base64url ai byte che vuole PushManager. */
function chiaveApplicativa(base64) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + pad).replace(/-/g, "+").replace(/_/g, "/");
  const grezzo = atob(b64);
  return Uint8Array.from(grezzo, (c) => c.charCodeAt(0));
}

const b64url = (buffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

/**
 * Chiede il permesso e iscrive questo dispositivo.
 *
 * Va chiamata da un gesto dell'utente: su Safari il permesso richiesto
 * fuori da un tocco viene negato in silenzio, senza mostrare nulla — e poi
 * non si può più richiedere.
 *
 * @returns {Promise<{ok: boolean, motivo?: string}>}
 */
export async function iscrivi() {
  if (!supportate()) return { ok: false, motivo: "Questo browser non supporta le notifiche push." };
  if (!CFG.vapidPublic) return { ok: false, motivo: "Manca la chiave VAPID in config.js." };
  if (suIOS() && !installata()) {
    return { ok: false, motivo: "Su iPhone le notifiche funzionano solo se ATLAS è installata dalla schermata Home." };
  }

  const esito = await Notification.requestPermission();
  if (esito !== "granted") {
    return { ok: false, motivo: esito === "denied"
      ? "Permesso negato. Va riattivato dalle impostazioni del browser."
      : "Permesso non concesso." };
  }

  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,   // obbligatorio: niente push silenziosi
      applicationServerKey: chiaveApplicativa(CFG.vapidPublic),
    });
  }

  const j = sub.toJSON();
  const impronta = impronaDi(j.endpoint);

  casella.aggiorna((s) => {
    // L'id deriva dall'endpoint: riaprire l'app non crea un doppione, e
    // reiscriversi dopo una revoca sostituisce il record invece di
    // affiancarlo. Senza, il repo si riempie di iscrizioni morte.
    const i = s.subs.findIndex((x) => x.id === impronta);
    const rec = {
      id: impronta,
      endpoint: j.endpoint,
      p256dh: j.keys?.p256dh,
      auth: j.keys?.auth,
      ua: navigator.userAgent.slice(0, 80),
      up: Date.now(),
    };
    if (i >= 0) s.subs[i] = rec; else s.subs.push(rec);
  });

  return { ok: true };
}

/** Disiscrive questo dispositivo e mette la lapide. */
export async function disiscrivi() {
  if (!supportate()) return;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  const impronta = impronaDi(sub.endpoint);
  await sub.unsubscribe();
  casella.aggiorna((s) => {
    const i = s.subs.findIndex((x) => x.id === impronta);
    if (i >= 0) s.subs[i] = { id: impronta, del: true, up: Date.now() };
  });
}

/** Questo dispositivo è iscritto? */
export async function iscritto() {
  if (!supportate() || permesso() !== "granted") return false;
  const reg = await navigator.serviceWorker.ready;
  return Boolean(await reg.pushManager.getSubscription());
}

/**
 * Un id stabile derivato dall'endpoint.
 *
 * Non si usa l'endpoint intero come id perché è lungo centinaia di
 * caratteri e finirebbe in ogni riga di diagnostica: l'endpoint è di fatto
 * una credenziale, chi ce l'ha può mandare notifiche a quel telefono.
 */
function impronaDi(endpoint) {
  let h = 5381;
  for (let i = 0; i < endpoint.length; i++) h = ((h << 5) + h + endpoint.charCodeAt(i)) >>> 0;
  return `d_${h.toString(36)}`;
}

/** Cambia gli orari di un modulo. Il workflow li rilegge al giro dopo. */
export function scriviOrari(modulo, patch) {
  casella.aggiorna((s) => { s.orari[modulo] = { ...s.orari[modulo], ...patch }; });
}

/** Una notifica locale, per provare che la catena funzioni fin qui. */
export async function provaLocale() {
  if (permesso() !== "granted") return false;
  const reg = await navigator.serviceWorker.ready;
  await reg.showNotification("ATLAS", {
    body: "Le notifiche funzionano.",
    icon: "./assets/icons/icon-192.png",
    badge: "./assets/icons/icon-192.png",
    tag: "prova",
  });
  return true;
}

// ---------------------------------------------------------------- sync ---

export function avviaSync() {
  const canale = apriCanale({
    id: "notifiche",
    file: "notifiche.json",
    impacchetta: () => {
      const s = stato();
      return { subs: s.subs, orari: s.orari, up: s.up || 0 };
    },
    applica: (remoto) => {
      casella.aggiorna((s) => {
        s.subs = potaLapidi(fondiRecord(s.subs, remoto.subs));
        // Gli orari sono uno solo per tutti i dispositivi: vince il più recente.
        if ((remoto.up || 0) > (s.up || 0)) {
          for (const k of Object.keys(s.orari)) {
            if (remoto.orari?.[k]) s.orari[k] = { ...s.orari[k], ...remoto.orari[k] };
          }
        }
      }, { origine: "sync", tocca: false });
    },
  });

  casella.osserva((_, origine) => { if (origine !== "sync") canale.segnalaModifica(); });
  canale.avvia();
  return canale;
}
