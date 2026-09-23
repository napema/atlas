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
  { k: "p", nome: "Proteine", breve: "Prot.", emoji: "\u{1F969}", colore: "var(--color-blue)" },
  { k: "c", nome: "Carboidrati", breve: "Carb.", emoji: "\u{1F35E}", colore: "var(--color-yellow)" },
  { k: "g", nome: "Grassi", breve: "Grassi", emoji: "\u{1F951}", colore: "var(--color-indigo)" },
] as const;

/* Un'emoji per fascia, non un'icona di linea. Un piatto disegnato a tratto
   è un simbolo; un'emoji è un'immagine — si riconosce prima di leggere, e
   dà alla giornata il ritmo che una colonna di glifi grigi non ha. Sono
   quelle di Apple ovunque: il font sta in `assets/fonts/`. */
export const EMOJI_FASCIA: Record<string, string> = {
  colazione: "\u{1F373}",
  spuntino1: "\u{1F34E}",
  pranzo: "\u{1F957}",
  spuntino2: "\u{1F95C}",
  cena: "\u{1F35D}",
};

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

/* Quello che vale per questa apertura della app e basta.

   La pianificazione della domenica si propone da sé UNA volta per sessione:
   se la chiudi, non ti ricompare davanti mentre stai segnando la merenda.
   Non sta nella casella di proposito — non è un dato, è un fatto di questa
   finestra, e sincronizzarlo vorrebbe dire che il PC decide cosa vede il
   telefono. */
export const sessione = { pianificazioneProposta: false };
