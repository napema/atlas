// tinte.ts — dal nome di una tinta nei dati al colore di sistema.
//
// Le abitudini portano nomi inglesi («blue», «green»), le voci della home
// qualche nome italiano («ciano», «lime»): sono DATI, scritti anni fa dalle
// app di partenza, e non si toccano. Si traducono qui, in un posto solo.
//
// Verde e rosso non si danno a nessuno: in ATLAS il verde vuol dire «fatto»
// e il rosso uno stato negativo (CLAUDE.md, regola 7). Un'abitudine verde
// diventa menta, una rossa rosa: stessa famiglia, significato libero.

const TINTE: Record<string, string> = {
  blue: "--color-blue", blu: "--color-blue",
  green: "--color-mint", verde: "--color-mint",
  red: "--color-pink", rosso: "--color-pink",
  orange: "--color-orange", arancio: "--color-orange",
  purple: "--color-purple", viola: "--color-purple",
  pink: "--color-pink", rosa: "--color-pink",
  yellow: "--color-yellow", giallo: "--color-yellow",
  mint: "--color-mint", menta: "--color-mint",
  indigo: "--color-indigo", indaco: "--color-indigo",
  ciano: "--color-cyan", cyan: "--color-cyan",
  teal: "--color-teal", lime: "--color-teal",
  brown: "--color-brown",
};

export const tinta = (nome?: string | null) => `var(${TINTE[nome ?? ""] ?? "--color-indigo"})`;
