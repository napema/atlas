// tema.ts — la barra del sistema dello stesso colore della pagina.
//
// La cornice che il sistema disegna attorno alla app — la barra del titolo
// di una PWA su Windows, la barra di stato su Android, la striscia sotto il
// notch su iOS — la colora `<meta name="theme-color">`. Non la decide il
// CSS: è l'unico pezzo di interfaccia che sta FUORI dalla pagina, e il
// browser lo legge una volta sola da quel tag.
//
// IL GUASTO CHE QUESTO FILE ESISTE PER NON RIPETERE. Il colore stava
// scritto a mano in `index.html` (`#000000`) e nel manifest. Il fondo della
// app è passato da nero assoluto a `#08080c` — un filo di blu, perché il
// grigio neutro su un OLED vira al verde — e nessuno ha aggiornato i due
// tag: la barra del titolo è rimasta nera sopra una pagina che nera non era
// più, e si vedeva la riga di stacco.
//
// Scriverlo di nuovo a mano avrebbe solo spostato la prossima dimenticanza.
// Qui il colore si LEGGE da `--scena-fondo`, cioè dal token che dipinge la
// pagina: se quello cambia, cambia anche la cornice, e non c'è un secondo
// posto da ricordarsi.
//
// E risolve anche il caso che i due `<meta media="...">` di `index.html`
// non possono risolvere: quelli seguono il tema del SISTEMA, mentre ATLAS
// ha anche un tema forzato (`data-tema`). Con «Chiaro» scelto a mano su un
// telefono in scuro, la pagina era chiara e la barra restava nera.

/** Il tag unico che governa la cornice. Gli altri due restano per il primo disegno. */
function tag(): HTMLMetaElement {
  let m = document.querySelector<HTMLMetaElement>('meta[name="theme-color"][data-atlas]');
  if (m) return m;
  m = document.createElement("meta");
  m.name = "theme-color";
  m.dataset.atlas = "";
  document.head.appendChild(m);
  return m;
}

function aggiorna() {
  const c = getComputedStyle(document.documentElement)
    .getPropertyValue("--scena-fondo").trim();
  if (!c) return;
  const m = tag();
  // Si riscrive solo se cambia: su alcuni browser toccare `content` fa
  // ridisegnare la cornice, e farlo a ogni cambio di tema a ogni avvio è
  // un lampo gratuito.
  if (m.content !== c) m.content = c;
}

/**
 * Tiene la cornice in pari con la pagina.
 *
 * Tre momenti, e servono tutti e tre: adesso, quando l'utente cambia il tema
 * in Impostazioni (`data-tema` su <html>), e quando lo cambia il sistema
 * mentre la app è aperta — che su iOS succede da solo al tramonto.
 */
export function seguiIlTema() {
  aggiorna();

  new MutationObserver(aggiorna).observe(document.documentElement, {
    attributes: true, attributeFilter: ["data-tema"],
  });

  matchMedia("(prefers-color-scheme: light)").addEventListener("change", aggiorna);
}
