// giornata.ts — cosa dire della giornata. Puro: niente DOM, niente Svelte.
//
// Le regole vengono dalla home di prima (`moduli/oggi/modulo.js`), che le
// aveva imparate a spese sue: sono riportate qui con i loro perché, perché
// ciascuna è la correzione di una home che diceva una cosa sbagliata.

import type { Contratto, SchedaOggi, VoceModulo } from "$lib/core/registro";
import { ultimiGiorni, giornoCorrente } from "$lib/core/contesto";
import { plurale } from "$lib/core/ui";

export interface VoceResta {
  chiave: string;
  nome: string;
  dentro?: string;
  emoji?: string;
  tint?: string;
  fascia?: string;
  nomeFascia?: string;
  quando?: "presto" | "adesso" | "tardi";
  /** Una sessione: non si spunta, si apre. */
  apre?: string;
  habitId?: string;
  parteId?: string;
  /** Il modulo che la possiede, per chiedergli di spuntarla. */
  modulo: string;
}

export interface Scheda { voce: VoceModulo; contratto: Contratto; dati: SchedaOggi | null }

/** L'ora da cui «dopo» non esiste più: quello che resta è tutto di adesso. */
const ORA_SERA = 20;

export function quadro(schede: Scheda[], ora = new Date().getHours()) {
  const conDati = schede.filter((s) => s.dati);
  const fatti = conDati.filter((s) => s.dati!.fatto === true);

  // La checklist unica: le voci arrivano già pronte dai moduli, che sanno
  // cosa vuol dire «resta» per sé. La home le impila e basta.
  const resta: VoceResta[] = [];
  for (const s of conDati) for (const v of s.dati!.resta || []) resta.push({ ...v, modulo: s.voce.id });
  const peso = { tardi: 0, adesso: 1, presto: 2 } as const;
  resta.sort((a, b) => (peso[a.quando ?? "adesso"] ?? 1) - (peso[b.quando ?? "adesso"] ?? 1));

  const prio = prioritarie(resta, ora);
  return {
    conDati, fatti, resta, prio, ora,
    dopo: resta.length - prio.length,
    inRitardo: prio.filter((v) => v.quando === "tardi"),
    allarme: (conDati.map((s) => s.dati!.allarme).find(Boolean) as string | undefined) ?? null,
    finanze: conDati.find((s) => s.voce.id === "finanze")?.dati ?? null,
  };
}

export type Quadro = ReturnType<typeof quadro>;

/**
 * Cosa merita una riga ADESSO. Non tutto quello che è di oggi è di adesso:
 * una lista di nove cose non è una priorità, è un elenco, e un elenco lo si
 * smette di leggere. Entra ciò che è in ritardo, ciò che tocca in questa
 * fascia, e una sessione senza un'ora sua. Di sera torna tutto.
 */
function prioritarie(resta: VoceResta[], ora: number) {
  if (ora >= ORA_SERA) return resta;
  return resta.filter((v) =>
    v.quando === "tardi" ||
    (Boolean(v.fascia) && v.quando === "adesso") ||
    (!v.fascia && Boolean(v.apre)),
  );
}

const elenco = (n: string[]) => (n.length === 1 ? n[0] : `${n.slice(0, -1).join(", ")} e ${n[n.length - 1]}`);

/**
 * La frase che riassume la giornata. Vince la prima regola che si applica,
 * e il tono non colpevolizza mai: «ti mancano due cose» è un fatto, «non
 * hai fatto niente» è un giudizio, e un'app che giudica si smette di aprirla.
 */
export function verdetto(q: Quadro) {
  const { prio, resta, inRitardo, fatti, conDati, dopo, ora } = q;
  if (!conDati.length) return "Non c'è ancora niente da guardare.";
  if (!resta.length) return fatti.length ? "Hai chiuso tutto. Puoi staccare." : "Niente in programma oggi.";
  if (inRitardo.length) {
    const nomi = elenco(inRitardo.slice(0, 2).map((v) => v.nome.toLowerCase()));
    return inRitardo.length === 1 ? `Ti è sfuggito ${nomi}.` : `Ti sono sfuggiti ${nomi}.`;
  }
  if (!prio.length) return `Adesso sei in pari. ${plurale(dopo, "cosa", "cose")} più avanti nella giornata.`;
  if (ora >= 21) return `${plurale(prio.length, "cosa", "cose")} e hai chiuso la giornata.`;
  return `${plurale(prio.length, "cosa", "cose")} da fare adesso.`;
}

const SALUTI: [number, string][] = [[5, "Buonanotte"], [13, "Buongiorno"], [18, "Buon pomeriggio"], [22, "Buonasera"], [24, "Buonanotte"]];
export const saluto = (ora = new Date().getHours()) => SALUTI.find(([h]) => ora < h)?.[1] ?? "Ciao";

/* ------------------------------------------------------------ costanza -- */

export type StatoGiorno = "pieno" | "parziale" | "vuoto" | "riposo" | "ignoto";
export interface GiornoCostanza { giorno: string; spuntate: number; attese: number; stato: StatoGiorno }

/**
 * La costanza si misura sulle ABITUDINI, che sono le uniche ad avere un
 * denominatore (`attese`). Prima si accendeva una casella per qualunque
 * fatto sulla lavagna — anche una spesa segnata — e una giornata da 0 su 6
 * risultava piena.
 */
export function costanza() {
  const oggi = giornoCorrente();
  const giorni: GiornoCostanza[] = ultimiGiorni(7).reverse().map(({ giorno, fatti }: { giorno: string; fatti: Record<string, any> }) => {
    const a = fatti.abitudini || {};
    const noto = typeof a.attese === "number";
    const attese = noto ? a.attese : 0;
    const spuntate = a.spuntate || 0;
    return {
      giorno, spuntate, attese,
      stato: !noto ? "ignoto"
        : attese === 0 ? "riposo"
        : spuntate === 0 ? "vuoto"
        : spuntate >= attese ? "pieno"
        : "parziale",
    };
  });

  // Oggi non spezza mai la serie: alle otto di mattina non hai ancora
  // mancato niente. Un giorno senza niente da fare la salta, non la rompe.
  let i = giorni.length - 1;
  if (giorni[i]?.giorno === oggi && (giorni[i].stato === "vuoto" || giorni[i].stato === "ignoto")) i--;

  let serie = 0, pieni = 0;
  for (; i >= 0; i--) {
    const g = giorni[i];
    if (g.stato === "riposo") continue;
    if (g.stato !== "pieno" && g.stato !== "parziale") break;
    serie++;
    if (g.stato === "pieno") pieni++;
  }

  let vuotiDiFila = 0;
  for (let k = giorni.length - 1; k >= 0; k--) {
    if (giorni[k].stato === "riposo") continue;
    if (giorni[k].stato === "pieno" || giorni[k].stato === "parziale") break;
    vuotiDiFila++;
  }

  const tot = giorni.reduce((s, g) => ({ sp: s.sp + g.spuntate, at: s.at + g.attese }), { sp: 0, at: 0 });
  return { giorni, serie, pieni, vuotiDiFila, spuntate: tot.sp, attese: tot.at, oggi };
}

/**
 * La frase cambia con la lunghezza della serie: una formula identica ogni
 * giorno smette di significare qualcosa dopo tre giorni. Prima la verità
 * scomoda, poi l'incoraggiamento — al contrario la carta faceva i
 * complimenti a una settimana in cui non era stato spuntato quasi niente.
 */
export function fraseSerie(serie: number, pieni: number, vuotiDiFila: number) {
  if (serie === 0) {
    if (vuotiDiFila >= 2) return `${vuotiDiFila} giorni senza spuntare niente.`;
    if (vuotiDiFila === 1) return "Ieri non hai spuntato niente.";
    return "Nessuna serie aperta. Ne parte una appena spunti qualcosa.";
  }
  if (pieni === 0) return `${plurale(serie, "giorno", "giorni")} di fila, ma nessuno completo.`;
  if (pieni < serie) return `${plurale(serie, "giorno", "giorni")} di fila, ${pieni} ${pieni === 1 ? "completo" : "completi"}.`;
  if (serie >= 30) return "Non è più una prova, è come vivi.";
  if (serie >= 14) return "Sarebbe un peccato spezzarla stasera.";
  if (serie >= 7) return "Una settimana piena. Tienila.";
  if (serie >= 3) return "Adesso comincia a contare. Non mollare.";
  return "È l'inizio. I primi tre giorni sono i più cari.";
}
