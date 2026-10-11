// notifiche/prova.ts — il piano di un lunedì, controllato riga per riga.
//
//     deno run --allow-read --allow-env --location http://localhost/ notifiche/prova.ts
//
// Non manda niente e non tocca la rete: costruisce un archivio con dentro
// tutti i casi che contano e controlla che escano ESATTAMENTE le notifiche
// giuste, all'ora giusta, con le parole giuste. Le cose che NON devono
// arrivare contano quanto quelle che devono: una notifica per una cosa già
// fatta è il modo più veloce di insegnare a ignorarle tutte.

import { pianoDelGiorno, adessoARoma } from "./piano.ts";

const OGGI = "2026-10-12";   // lunedì

/* L'orologio fermo sul giorno che la prova racconta: i moduli hanno dentro
   funzioni col loro «oggi», e una prova che dipende dal giorno in cui la si
   lancia smette di passare da sola. */
const DataVera = Date;
const FERMO = new DataVera(`${OGGI}T07:00:00`).getTime();
// deno-lint-ignore no-explicit-any
(globalThis as any).Date = class extends DataVera {
  // deno-lint-ignore no-explicit-any
  constructor(...a: any[]) { super(...((a.length ? a : [FERMO]) as [])); }
  static override now() { return FERMO; }
};
let rotti = 0;
const ok = (nome: string, c: boolean, visto = "") => {
  if (!c) rotti++;
  console.log(`${c ? "ok  " : "NO  "} ${nome.padEnd(60)} ${visto}`);
};

const log = (h: string, d: string, parte?: string) =>
  ({ id: `${parte ? `${h}#${parte}` : h}|${d}`, h: parte ? `${h}#${parte}` : h, d, up: 1 });

const f = {
  notifiche: {
    subs: [],
    orari: {
      abitudini: { attiva: true, riepiloghi: ["14:00", "21:30"] },
      mobilita: { attiva: true, principale: "21:00", recupero: "22:15", attivaRecupero: true },
      finanze: { attiva: true, riepilogo: "21:30", pagamenti: true, pagamentiOra: "08:30", pagamentiGiorni: [3, 1, 0] },
    },
  },
  abitudini: {
    habits: [
      // Gli integratori: quattro capsule a tre orari, una già presa.
      { id: "h_supplements", name: "Integratori", emoji: "💊", blocco: "supporto", up: 1,
        sched: { type: "daily", days: [0, 1, 2, 3, 4, 5, 6] },
        parti: [
          { id: "s1", nome: "Omega 3", ora: "08:00", fascia: "mattina" },
          { id: "s2", nome: "Vitamina D", ora: "08:00", fascia: "mattina" },
          { id: "s3", nome: "Creatina", ora: "13:00", fascia: "pomeriggio" },
          { id: "s4", nome: "Magnesio", ora: "22:00", fascia: "sera" },
        ] },
      // La skincare come era scritta prima: orari per fascia, niente ora sulle parti.
      { id: "h_skincare", name: "Skincare", emoji: "💧", blocco: "supporto", up: 1,
        sched: { type: "daily", days: [0, 1, 2, 3, 4, 5, 6] },
        orari: { mattina: "08:00", sera: "22:30" },
        parti: [
          { id: "k1", nome: "Cleanser", fascia: "mattina" },
          { id: "k2", nome: "SPF", fascia: "mattina" },
          { id: "k3", nome: "Benzac", fascia: "sera" },
        ] },
      // Già fatta oggi: niente notifica.
      { id: "h_lettura", name: "Lettura", emoji: "📖", remind: "21:00", blocco: "supporto", up: 1, sched: { type: "daily" } },
      // Della sfida sospesa: niente notifica.
      { id: "h_p50_journal", name: "Journal", emoji: "📝", remind: "22:00", blocco: "p50", up: 1, sched: { type: "daily" } },
      // Archiviata: niente notifica.
      { id: "h_vecchia", name: "Vecchia", emoji: "🗄️", remind: "09:00", archived: true, up: 1, sched: { type: "daily" } },
      // Solo la domenica: oggi è lunedì, niente notifica.
      { id: "h_domenica", name: "Spesa", emoji: "🛒", remind: "10:00", up: 1, sched: { type: "days", days: [0] } },
      // Senza orario: niente notifica (ma conta nel riepilogo? no: il
      // riepilogo guarda «quello che era dovuto fino a lì», e senza ora non
      // era dovuto a nessuna ora).
      { id: "h_acqua", name: "Acqua", emoji: "💧", up: 1, sched: { type: "daily" } },
    ],
    logs: [log("h_supplements", OGGI, "s1"), log("h_lettura", OGGI)],
  },
  // deno-lint-ignore no-explicit-any
  mobilita: { records: [] as any[] },
  finanze: {
    v: 5,
    // deno-lint-ignore no-explicit-any
    movs: [] as any[],
    ricorrenti: [
      { id: "r_wind", nome: "WindTRE", imp: 499, tipo: "fissa", cadenza: "mensile", giorno: 15, pocket: "fisse", cat: "fisse", attivo: true, up: 1 },
      { id: "r_icloud", nome: "iCloud+", imp: 299, tipo: "fissa", cadenza: "mensile", giorno: 12, pocket: "fisse", cat: "fisse", attivo: true, up: 1 },
      { id: "r_lontano", nome: "Netflix", imp: 1399, tipo: "fissa", cadenza: "mensile", giorno: 20, pocket: "fisse", cat: "fisse", attivo: true, up: 1 },
    ],
    previsti: [],
    pockets: [{ id: "fisse", nome: "Spese fisse", tipo: "fisse", saldo: 300, ancoraDa: "2026-10-01", up: 1 }],
    meta: { config: { giornoStipendio: 23, entrate: 2041 } },
  },
};

const piano = pianoDelGiorno(f, OGGI);
const per = new Map(piano.map((n) => [n.chiave, n]));
const c = (k: string) => per.get(`${k}:${OGGI}`);

console.log(`\n${piano.length} notifiche per lunedì ${OGGI}:\n`);
for (const n of piano) console.log(`     ${n.ora}  ${n.titolo.padEnd(34)} ${n.corpo}`);
console.log("");

/* --- gli integratori: una notifica per ORARIO, con quello che manca --- */
ok("integratori 08:00: c'è", Boolean(c("ab:h_supplements@08:00")));
ok("integratori 08:00: dice solo la capsula che manca", c("ab:h_supplements@08:00")?.corpo === "Vitamina D", c("ab:h_supplements@08:00")?.corpo);
ok("integratori 13:00: creatina", c("ab:h_supplements@13:00")?.corpo === "Creatina", c("ab:h_supplements@13:00")?.corpo);
ok("integratori 22:00: magnesio", c("ab:h_supplements@22:00")?.corpo === "Magnesio");
ok("integratori: tre notifiche, non quattro", piano.filter((n) => n.chiave.startsWith("ab:h_supplements@")).length === 3);
ok("il titolo porta l'emoji", c("ab:h_supplements@13:00")?.titolo === "💊  Integratori", c("ab:h_supplements@13:00")?.titolo);

/* --- la skincare con gli orari vecchi per fascia continua a funzionare --- */
ok("skincare 08:00 dagli orari per fascia", c("ab:h_skincare@08:00")?.corpo === "Cleanser · SPF", c("ab:h_skincare@08:00")?.corpo);
ok("skincare 22:30", Boolean(c("ab:h_skincare@22:30")));

/* --- quello che NON deve arrivare --- */
ok("niente per un'abitudine già fatta", !piano.some((n) => n.chiave.includes("h_lettura")));
ok("niente per la sfida sospesa", !piano.some((n) => n.chiave.includes("h_p50")));
ok("niente per un'archiviata", !piano.some((n) => n.chiave.includes("h_vecchia")));
ok("niente per un'abitudine solo di domenica", !piano.some((n) => n.chiave.includes("h_domenica")));
ok("niente per un'abitudine senza orario", !piano.some((n) => n.chiave.includes("h_acqua")));

/* --- i riepiloghi --- */
const r14 = c("ab:riepilogo@14:00");
ok("riepilogo delle 14: c'è", Boolean(r14));
ok("riepilogo delle 14: le quattro cose rimaste fino a lì", r14?.titolo === "Ti mancano 4 cose", r14?.titolo);
ok("riepilogo delle 14: per abitudine, con i nomi", r14?.corpo === "Integratori: Vitamina D, Creatina · Skincare: Cleanser, SPF", r14?.corpo);
ok("riepilogo delle 14: non conta il magnesio delle 22", !r14?.corpo.includes("Magnesio"));
ok("riepilogo delle 21:30: c'è", Boolean(c("ab:riepilogo@21:30")));

/* --- un riepilogo con tutto fatto non parte --- */
{
  const tutto = structuredClone(f);
  tutto.abitudini.logs.push(log("h_supplements", OGGI, "s2"), log("h_supplements", OGGI, "s3"), log("h_skincare", OGGI, "k1"), log("h_skincare", OGGI, "k2"));
  const p2 = pianoDelGiorno(tutto, OGGI);
  ok("tutto fatto fino alle 14: niente riepilogo", !p2.some((n) => n.chiave === `ab:riepilogo@14:00:${OGGI}`));
  ok("… e niente promemoria per le 08:00 e le 13:00",
    !p2.some((n) => n.chiave.includes("@08:00") || n.chiave.includes("@13:00")));
}

/* --- mobilità --- */
ok("mobilità alle 21:00", c("mo:sessione")?.ora === "21:00");
ok("dose minima alle 22:15", c("mo:recupero")?.ora === "22:15");
{
  const fatta = structuredClone(f);
  fatta.mobilita.records.push({ id: "x", data: OGGI, up: 1 });
  ok("sessione fatta: niente mobilità", !pianoDelGiorno(fatta, OGGI).some((n) => n.modulo === "mobilita"));
}

/* --- finanze --- */
ok("riepilogo serale delle spese", c("fi:riepilogo")?.ora === "21:30");
const pag = piano.filter((n) => n.chiave.startsWith("fi:pag:"));
ok("iCloud esce oggi: avviso del giorno stesso", pag.some((n) => n.titolo === "Oggi esce iCloud+"), pag.map((n) => n.titolo).join(" | "));
ok("WindTRE fra tre giorni: avviso a tre giorni", pag.some((n) => n.titolo === "Fra 3 giorni: WindTRE"));
ok("Netflix fra otto giorni: ancora niente", !pag.some((n) => n.titolo.includes("Netflix")));
ok("i pagamenti alle 08:30", pag.every((n) => n.ora === "08:30"));
ok("il pagamento apre la sua scadenza", pag.every((n) => n.rotta.startsWith("#/finanze/arrivo/")));
{
  const segnata = structuredClone(f);
  segnata.finanze.movs.push({ id: "m", data: OGGI, tipo: "out", imp: 300, up: 1 });
  ok("spesa segnata: niente riepilogo serale", !pianoDelGiorno(segnata, OGGI).some((n) => n.chiave.startsWith("fi:riepilogo")));
}

/* --- gli interruttori --- */
{
  const spente = structuredClone(f);
  spente.notifiche.orari.abitudini.attiva = false;
  spente.notifiche.orari.mobilita.attiva = false;
  spente.notifiche.orari.finanze.attiva = false;
  ok("tutto spento: nessuna notifica", pianoDelGiorno(spente, OGGI).length === 0);
}

/* --- le chiavi: uniche, perché sono anche il `tag` sul telefono --- */
ok("nessuna chiave doppia", new Set(piano.map((n) => n.chiave)).size === piano.length);
ok("in ordine di orologio", piano.every((n, i) => i === 0 || piano[i - 1].ora <= n.ora));

/* --- l'ora di Roma --- */
const mezzanotte = adessoARoma(new Date("2026-10-11T22:00:30Z"));   // 00:00 a Roma, ora legale
ok("mezzanotte a Roma è 00:00, non 24:00", mezzanotte.hhmm === "00:00" && mezzanotte.data === "2026-10-12", `${mezzanotte.data} ${mezzanotte.hhmm}`);
const inverno = adessoARoma(new Date("2026-12-01T20:00:00Z"));
ok("d'inverno Roma è UTC+1", inverno.hhmm === "21:00", inverno.hhmm);

console.log(rotti ? `\n${rotti} controlli non passano.` : "\nTutto torna.");
Deno.exit(rotti ? 1 : 0);
