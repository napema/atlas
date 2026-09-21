// ui.ts — le funzioni PURE di `core/ui.js`: date, soldi, numeri, parole.
//
// Si chiama ancora `ui` per un motivo solo: la logica dei moduli, condivisa
// con la app di prima, importa `../../core/ui.js`, e il plugin del nucleo
// unico (vite.config.ts) gira quell'import qui. Il nome deve combaciare.
//
// Nel vecchio file stavano anche i costruttori di DOM (`el`, `scheda`,
// `riga`…). Qui non ci sono: li hanno sostituiti i componenti Svelte in
// `lib/ui/`. Resta solo ciò che non disegna niente.

export { avviso } from "./avvisi.svelte";

const NUM = new Intl.NumberFormat("it-IT");
const NUM2 = new Intl.NumberFormat("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const numero = (n: number) => NUM.format(Number(n) || 0);

/**
 * Da CENTESIMI a stringa in euro. Gli importi in ATLAS sono sempre interi
 * di centesimi: i decimali in virgola mobile sui soldi producono totali che
 * non tornano per un centesimo, e nessuno capisce perché.
 *
 * Il meno resta anche senza `segno`: prima `segno: false` buttava via il
 * meno insieme al più, e un pocket a −3.949 € si leggeva «3.949,51 €».
 */
export function euro(centesimi: number, { segno = false, tondo = false } = {}) {
  const c = Math.round(Number(centesimi) || 0);
  const n = Math.abs(c) / 100;
  const s = tondo ? `${NUM.format(Math.round(n))} €` : `${NUM2.format(n)} €`;
  if (segno) return (c < 0 ? "−" : "+") + s;
  return c < 0 ? `−${s}` : s;
}

/** Le parti di un importo, per chi lo disegna coi centesimi rimpiccioliti. */
export function euroParti(cent: number, { segno = false } = {}) {
  const c = Math.round(Number(cent) || 0);
  const n = Math.abs(c) / 100;
  return {
    meno: c < 0 ? "−" : (segno ? "+" : ""),
    intero: NUM.format(Math.trunc(n)),
    decimali: String(Math.round((n - Math.trunc(n)) * 100)).padStart(2, "0"),
  };
}

/** Da stringa scritta a mano a centesimi. Accetta "12,50", "12.50", "12". */
export function centesimi(testo: string): number | null {
  if (typeof testo !== "string") return null;
  const pulito = testo.replace(/[\s€]/g, "").replace(/\./g, testo.includes(",") ? "" : ".").replace(",", ".");
  const n = Number(pulito);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

export const MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno",
  "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
export const MESI_BREVI = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
export const GIORNI = ["lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato", "domenica"];
export const GIORNI_INIZIALI = ["L", "M", "M", "G", "V", "S", "D"];

/** "2026-08-21" da una Date. È la chiave con cui tutti i moduli indicizzano. */
export function isoDi(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
export const oggiISO = () => isoDi(new Date());

/** Da "2026-08-21" a Date, a mezzogiorno per non incappare nell'ora legale. */
export const daISO = (iso: string) => new Date(`${iso}T12:00:00`);

export function piuGiorni(iso: string, n: number) {
  const d = daISO(iso);
  d.setDate(d.getDate() + n);
  return isoDi(d);
}

/** "oggi", "ieri", "lun 18 ago". Le date lontane portano l'anno. */
export function dataUmana(iso: string) {
  const d = daISO(iso);
  if (Number.isNaN(+d)) return "";
  const giorno = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const scarto = Math.round((giorno(d) - giorno(new Date())) / 86400000);
  if (scarto === 0) return "oggi";
  if (scarto === -1) return "ieri";
  if (scarto === 1) return "domani";
  const opz: Intl.DateTimeFormatOptions = Math.abs(scarto) < 300
    ? { weekday: "short", day: "numeric", month: "short" }
    : { day: "numeric", month: "short", year: "numeric" };
  return d.toLocaleDateString("it-IT", opz);
}

export const dataBreve = (iso: string) => `${daISO(iso).getDate()} ${MESI_BREVI[daISO(iso).getMonth()]}`;

/** «lunedì» → «Lunedì». Solo la prima lettera: «Settembre» in mezzo a una
    data italiana è un errore, e `text-transform: capitalize` lo fa. */
export const maiuscola = (s: string) => (s ? s[0].toLocaleUpperCase("it-IT") + s.slice(1) : s);

/** "1 giorno", "3 giorni". «1 giorni di fila» in una schermata che si
    guarda ogni sera si nota tutte le sere. */
export const plurale = (n: number, singolare: string, plur: string) => `${n} ${n === 1 ? singolare : plur}`;

/** Da secondi a "14 min" o "1 h 05". */
export function durata(secondi: number) {
  const m = Math.round((Number(secondi) || 0) / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}`;
}

/** Id di un record: stabile, e non collide. Il tempo da solo non basta —
    due tocchi nello stesso millisecondo esistono, su due dispositivi di più. */
export function nuovoId(prefisso = "r") {
  return `${prefisso}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Una vibrazione breve, dove il dispositivo la sa fare. */
export function tocco(ms = 8) {
  try { navigator.vibrate?.(ms); } catch { /* niente */ }
}

export function escapa(s: unknown) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}
