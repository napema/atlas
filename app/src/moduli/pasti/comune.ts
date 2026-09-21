// Pasti — le piccole cose che servono a più schermate.
//
// IL TONO DI TUTTO IL MODULO: «non voglio essere fissato, voglio un'app che
// mi aiuta». Niente semafori sulla giornata, niente percentuali di
// fallimento: la schermata dice cosa c'è da mangiare e quanto manca, il
// giudizio non lo dà.

import { numero } from "$lib/core/ui";
import { FASCE } from "$condivisi/pasti/dati.js";

/* I tre macro hanno un colore fisso in tutto il modulo. Non verde e non
   rosso: in ATLAS quei due vogliono dire «fatto» e «male». */
export const MACRO = [
  { k: "p", nome: "Proteine", colore: "var(--color-blue)" },
  { k: "c", nome: "Carboidrati", colore: "var(--color-yellow)" },
  { k: "g", nome: "Grassi", colore: "var(--color-indigo)" },
] as const;

export const ICONE_FASCIA: Record<string, string> = {
  colazione: "sole",
  spuntino1: "fiamma",
  pranzo: "piatto",
  spuntino2: "orologio",
  cena: "luna",
};

export const kcal = (n: number) => numero(Math.round(n || 0));

export const oraAdesso = () => new Date().toTimeString().slice(0, 5);

/** La fascia più probabile a quest'ora: quella il cui orario è più vicino. */
export function fasciaDallOra(ora = oraAdesso()): string {
  const min = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));
  const adesso = min(ora);
  return (FASCE as { id: string; ora: string }[]).reduce((migliore, f) =>
    Math.abs(min(f.ora) - adesso) < Math.abs(min(migliore.ora) - adesso) ? f : migliore, FASCE[0]).id;
}

export type Fascia = { id: string; nome: string; ora: string };
export const FASCE_T = FASCE as Fascia[];
