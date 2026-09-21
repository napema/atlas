// Training — le piccole cose che servono a più schermate.

/* La fase si legge dal colore, senza doverla scrivere tredici volte. Niente
   verde e niente rosso: in ATLAS vogliono dire «fatto» e «male». */
export function fase(nome: string) {
  if (/ricostr/i.test(nome)) return { chiave: "ricostruzione", colore: "var(--color-teal)" };
  if (/soglia/i.test(nome)) return { chiave: "soglia", colore: "var(--color-yellow)" };
  if (/specifico/i.test(nome)) return { chiave: "specifico", colore: "var(--color-orange)" };
  return { chiave: "taper", colore: "var(--color-indigo)" };
}

/** Legge un file di testo scelto dall'utente. */
export async function leggiFile(e: Event): Promise<{ nome: string; testo: string } | null> {
  const f = (e.currentTarget as HTMLInputElement).files?.[0];
  if (!f) return null;
  return { nome: f.name, testo: await f.text() };
}
