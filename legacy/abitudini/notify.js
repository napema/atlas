/* Abitudini — mittente delle notifiche.
   Gira nel repo PRIVATO dei dati, via GitHub Actions.
   Legge abitudini.json, decide quali promemoria sono scaduti e li spedisce
   alle subscription salvate. Lo stato di cosa è già stato mandato sta in
   notify-state.json, così nessun promemoria arriva due volte. */

const fs = require("fs");
const path = require("path");
const webpush = require("web-push");

const DATA_FILE = process.env.DATA_FILE || "abitudini.json";
const STATE_FILE = process.env.STATE_FILE || "notify-state.json";
const TZ = process.env.TZ_NAME || "Europe/Rome";
const APP_URL = process.env.APP_URL || "./";

const PUB = process.env.VAPID_PUBLIC;
const PRIV = process.env.VAPID_PRIVATE;
const SUBJ = process.env.VAPID_SUBJECT || "mailto:noreply@example.com";

if (!PUB || !PRIV) { console.error("Mancano VAPID_PUBLIC / VAPID_PRIVATE."); process.exit(1); }
webpush.setVapidDetails(SUBJ, PUB, PRIV);

function readJSON(f, fallback) {
  try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch (_) { return fallback; }
}

/* --- data/ora nel fuso di casa, senza dipendenze --- */
function partsIn(tz, when) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", weekday: "short", hour12: false
  });
  const p = {};
  for (const x of fmt.formatToParts(when)) p[x.type] = x.value;
  const dowMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    minutes: parseInt(p.hour, 10) * 60 + parseInt(p.minute, 10),
    dow: dowMap[p.weekday]
  };
}
function hhmmToMin(s) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(s || "").trim());
  return m ? (+m[1]) * 60 + (+m[2]) : null;
}
function isoDaysAgo(dateISO, n) {
  const [y, m, d] = dateISO.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - n);
  return dt.toISOString().slice(0, 10);
}

const db = readJSON(DATA_FILE, null);
if (!db) { console.log("Nessun file dati: niente da fare."); process.exit(0); }

const state = readJSON(STATE_FILE, { sent: {}, gone: [] });
state.sent = state.sent || {};
state.gone = state.gone || [];

const nowP = partsIn(TZ, new Date());
const today = nowP.date;

const habits = (db.habits || []).filter(h => h && !h.del && !h.archived);
const doneToday = new Set(
  (db.logs || []).filter(l => l && !l.del && l.d === today).map(l => l.h)
);

/* quale weekday copre l'abitudine oggi */
function scheduledToday(h) {
  const s = h.sched || { type: "daily" };
  if (s.type === "days") return (s.days || []).includes(nowP.dow);
  return true;
}

const due = [];
for (const h of habits) {
  const min = hhmmToMin(h.remind);
  if (min === null) continue;
  if (!scheduledToday(h)) continue;
  if (doneToday.has(h.id)) continue;
  if (nowP.minutes < min) continue;              // non è ancora ora
  if (nowP.minutes - min > 180) continue;        // troppo tardi: salta, non svegliare a notte
  const key = `${h.id}:${today}`;
  if (state.sent[key]) continue;
  due.push({ h, key });
}

if (!due.length) {
  console.log(`Niente da mandare (${today} ${String(Math.floor(nowP.minutes / 60)).padStart(2, "0")}:${String(nowP.minutes % 60).padStart(2, "0")} ${TZ}).`);
  process.exit(0);
}

const subs = (db.subs || []).filter(s => s && !s.del && s.endpoint && !state.gone.includes(s.id));
if (!subs.length) {
  console.log("Nessun dispositivo iscritto: niente da mandare.");
  process.exit(0);
}

(async () => {
  let sentAny = false;

  for (const { h, key } of due) {
    const payload = JSON.stringify({
      title: `${h.emoji || "⭐️"}  ${h.name}`,
      body: "Non l'hai ancora segnata oggi.",
      tag: `h-${h.id}`,
      url: APP_URL
    });

    let delivered = 0;
    for (const s of subs) {
      const sub = { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } };
      try {
        await webpush.sendNotification(sub, payload, { TTL: 3600, urgency: "normal" });
        delivered++;
      } catch (err) {
        const code = err && err.statusCode;
        if (code === 404 || code === 410) {
          console.log(`Subscription scaduta, la ignoro: ${s.id}`);
          if (!state.gone.includes(s.id)) state.gone.push(s.id);
        } else {
          console.error(`Errore invio a ${s.id}: ${code || ""} ${err && err.message}`);
        }
      }
    }

    if (delivered > 0) { state.sent[key] = Date.now(); sentAny = true; }
    console.log(`«${h.name}» → ${delivered}/${subs.length} dispositivi.`);
  }

  /* pulizia: tieni solo gli ultimi 10 giorni di stato */
  const cutoff = isoDaysAgo(today, 10);
  for (const k of Object.keys(state.sent)) {
    const d = k.split(":")[1];
    if (d && d < cutoff) delete state.sent[k];
  }

  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + "\n");
  console.log(sentAny ? "Stato aggiornato." : "Nessuna consegna riuscita.");
})();
