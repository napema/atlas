// registro.ts — l'elenco dei moduli. L'UNICO file da toccare per
// aggiungerne uno: barra, router, sync e home lo prendono da qui.
//
// Stessi id, stesso ordine e stessi gruppi della app di prima: gli id sono
// gli indirizzi delle rotte (`#/finanze`) e delle notifiche, e cambiarne uno
// romperebbe il tocco su una notifica arrivata ieri.
//
// OGNI MODULO HA DUE PARTI, e si caricano separatamente:
//
//   vista      il componente Svelte della schermata. Arriva quando apri la
//              scheda: l'avvio non paga Finanze se apri Pasti.
//   contratto  `moduli/<id>/contratto.js`, CONDIVISO con la app di prima:
//              il canale di sync, `oggi()` per la home, le azioni che la
//              home può chiedere (spuntare un'abitudine). Una copia sola,
//              così le regole di fusione dei dati non possono divergere fra
//              le due app.

import type { Component } from "svelte";
import { avviaSync as sincronizzaContesto } from "./contesto";

/** La scheda che un modulo dà alla home. Vedi CLAUDE.md, «oggi()». */
export interface SchedaOggi {
  titolo?: string;
  valore?: string | number | null;
  dettaglio?: string | null;
  urgente?: boolean;
  fatto?: boolean;
  azione?: { rotta?: string; etichetta?: string };
  [k: string]: any;
}

export interface Contratto {
  avviaSync?: (opz?: { ridisegna?: () => void }) => unknown;
  oggi?: () => SchedaOggi | null;
  [k: string]: any;
}

export interface VoceModulo {
  id: string;
  nome: string;
  icona: string;
  /** Il colore del modulo: dice DOVE SEI e colora le azioni. */
  accento: string;
  gruppo?: string;
  /** Da che parte del bersaglio si sta bene: in Finanze stare sotto, in
      Training stare sopra. La home non può indovinarlo. */
  verso?: "su" | "giu";
  vista: () => Promise<{ default: Component<any> }>;
  contratto?: () => Promise<Contratto>;
}

export const MODULI: VoceModulo[] = [
  {
    id: "oggi", nome: "Oggi", icona: "oggi", accento: "var(--color-blue)",
    vista: () => import("../../moduli/oggi/Vista.svelte"),
  },
  {
    id: "finanze", nome: "Finanze", icona: "finanze", accento: "var(--color-orange)", verso: "giu",
    vista: () => import("../../moduli/finanze/Vista.svelte"),
    contratto: () => import("../../../../moduli/finanze/contratto.js"),
  },
  {
    id: "pasti", nome: "Pasti", icona: "pasti", accento: "var(--color-pink)", verso: "giu",
    vista: () => import("../../moduli/pasti/Vista.svelte"),
    contratto: () => import("../../../../moduli/pasti/contratto.js"),
  },
  {
    id: "mobilita", nome: "Mobilità", icona: "corpo", accento: "var(--color-mint)", gruppo: "corpo",
    vista: () => import("../../moduli/mobilita/Vista.svelte"),
    contratto: () => import("../../../../moduli/mobilita/contratto.js"),
  },
  {
    id: "allenamenti", nome: "Training", icona: "bersaglio", accento: "var(--color-red)", gruppo: "corpo",
    vista: () => import("../../moduli/allenamenti/Vista.svelte"),
    contratto: () => import("../../../../moduli/allenamenti/contratto.js"),
  },
  {
    id: "abitudini", nome: "Abitudini", icona: "abitudini", accento: "var(--color-indigo)",
    vista: () => import("../../moduli/abitudini/Vista.svelte"),
    contratto: () => import("../../../../moduli/abitudini/contratto.js"),
  },
  {
    id: "impostazioni", nome: "Impostazioni", icona: "impostazioni", accento: "var(--color-blue)",
    vista: () => import("../../moduli/impostazioni/Vista.svelte"),
  },
];

/* I GRUPPI: due moduli, una scheda sola nella barra. Mobilità e Training
   raccontano la stessa cosa da due lati — il corpo, e un numero da colpire
   entro dicembre — e meritano due archivi ma non due schede su cinque.
   Il gruppo è SOLO un fatto della barra: ogni membro tiene casella, canale,
   rotte e scheda nella home. */
export const GRUPPI = [
  { id: "corpo", nome: "Corpo", icona: "corpo", membri: ["mobilita", "allenamenti"] },
];

export const voceDi = (id: string) => MODULI.find((m) => m.id === id);
export const gruppoDi = (id: string) => GRUPPI.find((g) => g.membri.includes(id)) ?? null;

/* Quale membro aprire toccando la scheda del gruppo: l'ultimo guardato. È
   una preferenza di questo dispositivo, come il tema — non un dato, quindi
   niente sync. Stessa chiave della app di prima. */
const chiaveMembro = (idGruppo: string) => `atlas.gruppo.${idGruppo}`;

export function membroRicordato(gruppo: { id: string; membri: string[] }) {
  try {
    const v = localStorage.getItem(chiaveMembro(gruppo.id));
    if (v && gruppo.membri.includes(v)) return v;
  } catch { /* privata o piena: si riparte dal primo */ }
  return gruppo.membri[0];
}

export function ricordaMembro(idGruppo: string, idModulo: string) {
  try { localStorage.setItem(chiaveMembro(idGruppo), idModulo); } catch { /* vedi sopra */ }
}

/* Le voci della barra: i moduli senza gruppo più una voce per gruppo.
   Impostazioni resta fuori — si apre dall'ingranaggio della home. A sei
   schede le etichette diventano illeggibili proprio dove il pollice ha meno
   spazio: cinque è il tetto. */
export interface VoceBarra { id: string; nome: string; icona: string; rotte: string[]; gruppo?: (typeof GRUPPI)[number] }

export const MODULI_IN_BARRA: VoceBarra[] = (() => {
  const visti = new Set<string>();
  const voci: VoceBarra[] = [];
  for (const m of MODULI) {
    if (m.id === "impostazioni") continue;
    const g = m.gruppo ? GRUPPI.find((x) => x.id === m.gruppo) : undefined;
    if (!g) { voci.push({ id: m.id, nome: m.nome, icona: m.icona, rotte: [m.id] }); continue; }
    if (visti.has(g.id)) continue;
    visti.add(g.id);
    voci.push({ id: g.id, nome: g.nome, icona: g.icona, rotte: g.membri, gruppo: g });
  }
  return voci;
})();

/** I moduli con dati propri: quelli che hanno un contratto. */
export const MODULI_DATI = MODULI.filter((m) => m.contratto);

const contratti = new Map<string, Contratto>();

/** Carica (una volta sola) il contratto di un modulo. */
export async function prendiContratto(id: string): Promise<Contratto | null> {
  const gia = contratti.get(id);
  if (gia) return gia;
  const voce = voceDi(id);
  if (!voce?.contratto) return null;
  const c = await voce.contratto();
  contratti.set(id, c);
  return c;
}

/**
 * Apre TUTTI i canali di sync, compreso quello della lavagna. Per tutti i
 * moduli e non solo quello aperto: i dati di Finanze devono arrivare anche
 * mentre guardi Pasti, altrimenti la home mostra numeri vecchi.
 *
 * Un modulo rotto non deve portarsi via gli altri: ognuno nel suo try.
 */
export async function avviaTuttiISync() {
  try { sincronizzaContesto(); }
  catch (e) { console.error("[registro] sync della lavagna non avviato", e); }

  const esiti = await Promise.allSettled(MODULI_DATI.map((m) => prendiContratto(m.id)));
  esiti.forEach((e, i) => {
    if (e.status !== "fulfilled" || !e.value?.avviaSync) return;
    try { e.value.avviaSync(); }
    catch (err) { console.error(`[registro] sync di "${MODULI_DATI[i].id}" non avviato`, err); }
  });
}
