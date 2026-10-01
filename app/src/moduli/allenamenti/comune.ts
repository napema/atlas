// Training — le piccole cose che servono a più schermate.

/* La fase si legge dal colore, senza doverla scrivere tredici volte. Niente
   verde e niente rosso: in ATLAS vogliono dire «fatto» e «male». */
/* COME SI SCRIVE UN GIORNO.

   «L 5» e «S 3» risparmiavano otto caratteri e costavano una traduzione a
   mente ogni volta: davanti a una riga non si capiva se fosse lunedi' 5 o
   la settimana 1 giorno 5. Qui il giorno si scrive per intero, e quando e'
   vicino si dice anche com'e' vicino — «oggi» e' l'informazione, «1
   ottobre» e' la conferma, e servono tutte e due. */
const GIORNI_LUNGHI = ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"];
const MESI_LUNGHI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno",
  "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];

export function quandoLungo(iso: string, oggiIso: string): string {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(+d)) return "";
  const data = `${d.getDate()} ${MESI_LUNGHI[d.getMonth()]}`;
  const scarto = Math.round(
    (new Date(`${iso}T00:00:00`).getTime() - new Date(`${oggiIso}T00:00:00`).getTime()) / 86400000,
  );
  if (scarto === 0) return `oggi, ${data}`;
  if (scarto === 1) return `domani, ${data}`;
  if (scarto === -1) return `ieri, ${data}`;
  return `${GIORNI_LUNGHI[d.getDay()]} ${data}`;
}

/** La forma corta per una pastiglia: «ven 2». Tre lettere, non una sola. */
export function quandoCorto(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return `${GIORNI_LUNGHI[d.getDay()].slice(0, 3)} ${d.getDate()}`;
}

export function fase(nome: string) {
  if (/ricostr/i.test(nome)) return { chiave: "ricostruzione", colore: "var(--color-teal)" };
  if (/svilupp/i.test(nome)) return { chiave: "sviluppo", colore: "var(--color-orange)" };
  if (/soglia/i.test(nome)) return { chiave: "soglia", colore: "var(--color-yellow)" };
  if (/specifico/i.test(nome)) return { chiave: "specifico", colore: "var(--color-orange)" };
  /* Il test ha il colore della meta, non quello del taper che lo precede:
     sono due settimane diverse e la striscia deve farle vedere diverse. */
  if (/test/i.test(nome)) return { chiave: "test", colore: "var(--color-green)" };
  return { chiave: "taper", colore: "var(--color-indigo)" };
}

/** Legge un file di testo scelto dall'utente. */
export async function leggiFile(e: Event): Promise<{ nome: string; testo: string } | null> {
  const f = (e.currentTarget as HTMLInputElement).files?.[0];
  if (!f) return null;
  return { nome: f.name, testo: await f.text() };
}
