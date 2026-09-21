// Finanze — le piccole cose che servono a più schermate.

import { TIPI } from "$condivisi/finanze/dati.js";

/* I colori delle categorie. Sono etichette, non accenti: servono nove
   valori distinti per leggere una ciambella. La app di prima dava il verde
   alla spesa — ma in ATLAS il verde vuol dire «fatto» (regola 7), e una
   barra verde della spesa al 95% si leggeva come una cosa andata bene. */
const COLORI: Record<string, string> = {
  fisse: "var(--color-gray)",
  casa: "var(--color-blue)",
  auto: "var(--color-orange)",
  spesa: "var(--color-teal)",
  trasporti: "var(--color-indigo)",
  cibo: "var(--color-pink)",
  personale: "var(--color-purple)",
  acc: "var(--color-mint)",
  risp: "var(--color-cyan)",
};
export const coloreCat = (id?: string | null) => COLORI[id ?? ""] ?? "var(--color-gray)";

export const NOMI_POCKET: Record<string, string> = {
  principale: "Principale", contanti: "Contanti", cassa: "Cassa", fisse: "Fisse", ing: "ING",
};
export const nomePocket = (id?: string | null) => NOMI_POCKET[id ?? ""] ?? id ?? "";

export const ETICHETTA_TIPO: Record<string, string> = Object.fromEntries(
  Object.entries(TIPI as Record<string, { nome: string }>).map(([k, v]) => [k, v.nome]),
);

/** Da centesimi al testo che si modifica: 1250 → «12,50». */
export const testoDa = (c: number) => (c ? (c / 100).toFixed(2).replace(".", ",") : "");

/** Il testo di un importo digitato da tastiera: solo cifre e una virgola. */
export const pulisciImporto = (v: string) => v
  .replace(/\./g, ",")
  .replace(/[^\d,]/g, "")
  .replace(/,(?=.*,)/g, "")
  .replace(/^(\d*,\d{0,2}).*$/, "$1");

/** «straordinaria» vs «uscita» ecc.: la riga di un movimento, pronta. */
export function descriviMovimento(m: any, cat: any, origine?: any) {
  if (m.tipo === "out") return (cat?.nome || "—") + (m.sub ? ` · ${m.sub}` : "");
  if (m.tipo === "in") return "Entrata";
  if (m.tipo === "giro") return "Giroconto tra pocket";
  if (m.tipo === "extra") return "Ricarica fuori budget";
  return ETICHETTA_TIPO[m.tipo] + (origine ? ` → ${origine.nota}` : " · non agganciato");
}

/* ------------------------------------------------ la pila dei fogli -- */

export type Foglio =
  | { tipo: "movimento"; movimento?: any; tipoMov?: string }
  | { tipo: "dettaglio"; id: string }
  | { tipo: "categoria"; catId: string; mese: string }
  | { tipo: "sub"; catId: string; sub: string; mese: string }
  | { tipo: "check" }
  | { tipo: "arrivo"; voce: any }
  | { tipo: "ricarica" }
  | { tipo: "ricaricaSett" }
  | { tipo: "saldoING" }
  | { tipo: "pocket" }
  | { tipo: "dormo"; imp: number; bozza: any; conferma: () => void };

export const CADENZE: [string, string][] = [["mensile", "Ogni mese"], ["bimestrale", "Ogni 2 mesi"], ["trimestrale", "Ogni 3 mesi"], ["annuale", "Ogni anno"]];
const MESI_LUNGHI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];

export function etichettaCadenza(r: any) {
  const c = CADENZE.find(([k]) => k === r.cadenza)?.[1] || r.cadenza;
  if (r.cadenza === "mensile") return `${c} il ${r.giorno}`;
  return `${c} · ${r.giorno} ${MESI_LUNGHI[(r.mese || 1) - 1]}`;
}
