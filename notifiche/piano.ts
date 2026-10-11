// notifiche/piano.ts — COSA mandare oggi, e a che ora. Niente rete, niente invii.
//
// IL PRINCIPIO DI QUESTO FILE: il mittente non riscrive le regole dei
// moduli, le USA. «Un'abitudine è da fare», «un pagamento esce fra tre
// giorni», «le parti delle 08:00 sono un gruppo» li decidono gli stessi
// file che li decidono in home — `giornataOggi()` delle Abitudini,
// `inArrivoDiviso()` di Finanze — caricati con i dati veri dentro.
//
// Il mittente di prima, in atlas-dati, aveva le regole RICOPIATE: il
// calcolo delle scadenze, i giorni della settimana, le fasce. Ed è lì che
// sono nati i suoi guasti di settembre — l'ora «24» a mezzanotte, la
// domenica sfasata, il conto delle parti diverso da quello della home.
// Una regola scritta due volte smette di dire la stessa cosa il giorno in
// cui una delle due copie cambia.
//
// Gira sotto Deno, come i file di prova dei moduli: `--location` gli dà un
// `localStorage` vero, e le caselle dei moduli ci funzionano dentro.

/* `core/ui.js` — la versione della app di prima che i moduli importano —
   tocca il `document` appena viene valutato. Fuori dal browser non c'è:
   il tappo si mette prima, e i moduli si importano dopo, dinamicamente. */
// deno-lint-ignore no-explicit-any
const g = globalThis as any;
g.window ??= g;
g.document ??= {
  addEventListener() {}, removeEventListener() {},
  createElement: () => ({ style: {}, classList: { add() {}, remove() {} }, appendChild() {}, setAttribute() {}, addEventListener() {} }),
  body: { appendChild() {} },
};

const ab = await import("../moduli/abitudini/dati.js");
const abCalc = await import("../moduli/abitudini/calcolo.js");
const fiDati = await import("../moduli/finanze/dati.js");
const fiCalc = await import("../moduli/finanze/calcolo.js");
const fiPiano = await import("../moduli/finanze/piano.js");
const { euro } = await import("../core/ui.js");

// deno-lint-ignore no-explicit-any
type J = any;

export interface Notifica {
  /** Unica per giorno: è la chiave con cui non si manda due volte, e il `tag`
   *  della notifica sul telefono — unico, così non ne sostituisce un'altra
   *  in silenzio. */
  chiave: string;
  /** «HH:MM», ora di Roma. */
  ora: string;
  titolo: string;
  corpo: string;
  rotta: string;
  modulo: string;
}

export interface FileDati {
  notifiche: J;
  abitudini: J;
  mobilita: J;
  finanze: J;
}

/* --------------------------------------------- caricare i dati veri -- */
/* La forma dei file nel repo è quella che scrivono i canali di sync
   (`impacchetta`), quasi uguale allo stato delle caselle. Finanze tiene
   categorie, profili e configurazione dentro `meta`: si tirano fuori qui,
   come fa il suo `applica`. */

function caricaAbitudini(f: J) {
  if (!f) return;
  ab.casella.scrivi({
    ...ab.casella.leggi(),
    habits: f.habits || [], logs: f.logs || [],
    meta: f.meta || {}, semi: f.semi || [],
    chiusure: f.chiusure || [], serate: f.serate || [], p50: f.p50 || {},
  });
}

function caricaFinanze(f: J) {
  if (!f) return;
  const m = f.meta || {};
  fiDati.casella.scrivi({
    ...fiDati.casella.leggi(),
    v: 7,
    movs: f.movs || [],
    ricorrenti: f.ricorrenti ?? m.ricorrenti ?? [],
    previsti: f.previsti || [],
    lista: f.lista || [],
    pockets: f.pockets ?? m.pockets ?? [],
    cats: m.cats ?? fiDati.casella.leggi().cats,
    profili: m.profili ?? fiDati.casella.leggi().profili,
    rules: m.rules ?? {},
    config: m.config ?? {},
    soglie: m.soglie ?? {},
  });
}

/* --------------------------------------------------------- il piano -- */

const ora2 = (n: number) => String(n).padStart(2, "0");
const valida = (s: unknown) => typeof s === "string" && /^\d{2}:\d{2}$/.test(s);
const NOMI_POCKET: Record<string, string> = { principale: "Principale", contanti: "Contanti", cassa: "Cassa", fisse: "Spese fisse", ing: "ING", fondo: "Fondo" };

/**
 * Tutte le notifiche di un giorno, già fatte. Chi le manda decide QUANDO;
 * qui si decide cosa e se.
 *
 * Una notifica che non serve più non c'è: l'abitudine già spuntata, la
 * sessione già fatta, la spesa già segnata. È per questo che il mittente
 * rifà il piano un attimo prima di ogni invio — in cinque minuti si fa in
 * tempo a spuntare.
 */
export function pianoDelGiorno(f: FileDati, oggi: string): Notifica[] {
  const orari = f.notifiche?.orari || {};
  const fuori: Notifica[] = [];

  /* ======================================================= ABITUDINI === */
  if (f.abitudini && orari.abitudini?.attiva !== false) {
    caricaAbitudini(f.abitudini);
    // La giornata delle abitudini, UNA riga per orario: la stessa della
    // home e dei gettoni. Gli integratori delle 08:00 sono una notifica.
    const righe = (abCalc.giornataOggi(oggi, 12) as J[]).filter((r) => valida(r.ora));

    // Quello che manca DI UN ORARIO: «Creatina», non tutte e quattro le
    // capsule della giornata. Vuoto per le abitudini senza parti.
    const mancantiDi = (r: J): string[] => {
      const h = ab.abitudinePerId(r.habitId);
      return (h?.parti || [])
        .filter((p: J) => (r.parti || []).includes(p.id) && !ab.parteFatta(h.id, p.id, oggi))
        .map((p: J) => p.nome);
    };

    for (const r of righe) {
      if (r.fatta || r.saltata) continue;
      const mancano = mancantiDi(r);
      fuori.push({
        chiave: `ab:${r.habitId}@${r.ora}:${oggi}`,
        ora: r.ora,
        titolo: `${r.emoji ? `${r.emoji}  ` : ""}${r.nome}`,
        corpo: mancano.length ? mancano.join(" · ") : "Non l'hai ancora segnata oggi.",
        rotta: "#/abitudini",
        modulo: "abitudini",
      });
    }

    /* I RIEPILOGHI. A un'ora scelta, quello che è rimasto indietro fino a
       lì. Uno solo, e solo se c'è qualcosa: un riepilogo che dice «tutto
       fatto» è una notifica che insegna a non aprire le notifiche. */
    const riepiloghi = (Array.isArray(orari.abitudini?.riepiloghi) ? orari.abitudini.riepiloghi : []).filter(valida);
    for (const t of riepiloghi) {
      const indietro = righe.filter((r) => !r.fatta && !r.saltata && r.ora <= t);
      if (!indietro.length) continue;
      /* PER ABITUDINE, con dentro quello che manca: «Integratori: Vitamina
         D, Creatina · Skincare: Cleanser, SPF». Per orario sarebbe stato
         «Integratori (1 di 2) · … · Integratori (Creatina)»: la stessa
         abitudine due volte, e un conto al posto di un nome. Il numero nel
         titolo è quello delle cose da fare davvero — le capsule, non gli
         orari. */
      const per = new Map<string, string[]>();
      let cose = 0;
      for (const r of indietro) {
        const m = mancantiDi(r);
        cose += m.length || 1;
        per.set(r.nome, [...(per.get(r.nome) || []), ...m]);
      }
      const voci = [...per.entries()].map(([nome, m]) => (m.length ? `${nome}: ${m.join(", ")}` : nome));
      fuori.push({
        chiave: `ab:riepilogo@${t}:${oggi}`,
        ora: t,
        titolo: cose === 1 ? "Ti manca una cosa" : `Ti mancano ${cose} cose`,
        corpo: voci.slice(0, 4).join(" · ") + (voci.length > 4 ? ` e altre ${voci.length - 4}` : ""),
        rotta: "#/abitudini",
        modulo: "abitudini",
      });
    }
  }

  /* ======================================================== MOBILITÀ === */
  if (f.mobilita && orari.mobilita?.attiva) {
    const fatta = (f.mobilita.records || []).some((r: J) => r && !r.del && r.data === oggi);
    if (!fatta) {
      const p = orari.mobilita.principale || "21:00";
      if (valida(p)) {
        fuori.push({ chiave: `mo:sessione:${oggi}`, ora: p, titolo: "Mobilità", corpo: "La sessione di oggi ti aspetta.", rotta: "#/mobilita/inizia", modulo: "mobilita" });
      }
      const r = orari.mobilita.recupero || "22:15";
      if (orari.mobilita.attivaRecupero !== false && valida(r)) {
        fuori.push({ chiave: `mo:recupero:${oggi}`, ora: r, titolo: "Due minuti bastano", corpo: "Dose minima: collo e un allungamento. Meglio di zero.", rotta: "#/mobilita/inizia", modulo: "mobilita" });
      }
    }
  }

  /* ========================================================= FINANZE === */
  if (f.finanze && orari.finanze?.attiva) {
    caricaFinanze(f.finanze);

    // La sera, se oggi non è stato segnato niente.
    const q = orari.finanze.riepilogo || "21:30";
    const segnati = (f.finanze.movs || []).some((m: J) => m && !m.del && m.data === oggi);
    if (!segnati && valida(q)) {
      fuori.push({ chiave: `fi:riepilogo:${oggi}`, ora: q, titolo: "Finanze", corpo: "Oggi non hai segnato nessuna spesa.", rotta: "#/finanze/nuovo", modulo: "finanze" });
    }

    /* I PAGAMENTI, tre avvisi per scadenza: a tre giorni fai in tempo a
       spostare i soldi, a uno a rinunciare a qualcosa, la mattina stessa a
       non trovare il conto più magro senza sapere perché. Le scadenze le
       calcola Finanze — `inArrivoDiviso()`, anche quelle dopo lo stipendio —
       e la copertura pure. */
    if (orari.finanze.pagamenti !== false) {
      const t = valida(orari.finanze.pagamentiOra) ? orari.finanze.pagamentiOra : "08:30";
      const anticipi: number[] = Array.isArray(orari.finanze.pagamentiGiorni) ? orari.finanze.pagamentiGiorni : [3, 1, 0];
      const a = fiPiano.inArrivoDiviso(Math.max(...anticipi, 0) + 1, oggi) as J;
      const voci = [...(a.prima?.voci || []), ...(a.dopo || [])];
      for (const v of voci) {
        const fra = fiCalc.giorniFra(oggi, v.quando) - 1;
        if (!anticipi.includes(fra)) continue;
        const cop = fiCalc.coperturaDi(v);
        const dove = NOMI_POCKET[v.pocket || "principale"] || v.pocket;
        fuori.push({
          chiave: `fi:pag:${v.origine}:${v.id}:${v.quando}:${fra}`,
          ora: t,
          titolo: fra === 0 ? `Oggi esce ${v.nome}` : fra === 1 ? `Domani esce ${v.nome}` : `Fra ${fra} giorni: ${v.nome}`,
          corpo: `${euro(v.importo)} da ${dove}` + (cop.coperto ? "" : ` · mancano ${euro(cop.manca, { tondo: true })}`),
          rotta: `#/finanze/arrivo/${encodeURIComponent(v.origine)}/${encodeURIComponent(v.id)}/${encodeURIComponent(v.quando)}`,
          modulo: "finanze",
        });
      }
    }
  }

  return fuori.sort((x, y) => x.ora.localeCompare(y.ora));
}

/* ------------------------------------------------------- l'ora di Roma -- */
/**
 * La data e l'ora di Roma, adesso. Il runner gira in UTC: senza questo un
 * promemoria delle 21:00 partirebbe alle 23:00 d'estate.
 *
 * `hourCycle: "h23"` e non `hour12: false`: il secondo, a mezzanotte, in
 * alcuni motori scrive «24» — ed è stato un guasto vero, il 25 settembre.
 */
export function adessoARoma(t = new Date()) {
  const p: Record<string, string> = {};
  for (const x of new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(t)) p[x.type] = x.value;
  return {
    data: `${p.year}-${p.month}-${p.day}`,
    hhmm: `${p.hour}:${p.minute}`,
    minuti: Number(p.hour) * 60 + Number(p.minute),
    secondi: Number(p.second),
  };
}

export const minutiDi = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
export { ora2 };
