// moduli/oggi — la home. È la ragione per cui i tre tracker diventano uno.
//
// Non ha dati propri: interroga gli altri moduli con `oggi()` e impagina le
// risposte. Un modulo che non ha niente da dire oggi restituisce null e non
// occupa spazio — la home resta corta, e ciò che c'è è ciò che conta.
//
// Ordine delle schede: prima gli urgenti nell'ordine del registro, poi il
// resto. Nessun punteggio, nessuna euristica: l'urgenza la dichiara il
// modulo, che è l'unico a sapere cosa vuol dire per lui.

import { MODULI, prendiModulo } from "../../core/registro.js";
import { el, intestazione, vuoto } from "../../core/ui.js";
import { icona } from "../../core/icone.js";

const SALUTI = [
  [5, "Buongiorno"],
  [13, "Buon pomeriggio"],
  [18, "Buonasera"],
  [24, "Buonanotte"],
];

const saluto = () => SALUTI.find(([h]) => new Date().getHours() < h)?.[1] || "Ciao";

const dataLunga = () =>
  new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });

function schedaModulo(mod, dati) {
  const s = el("a", {
    class: `scheda oggi-scheda${dati.urgente ? " urgente" : ""}`,
    href: dati.azione?.rotta || `#/${mod.id}`,
  }, [
    el("div", { class: "oggi-testa" }, [
      el("span", { class: "oggi-icona", html: icona(mod.icona, 20) }),
      el("span", { class: "oggi-nome", testo: dati.titolo || mod.nome }),
      el("span", { class: "oggi-freccia", html: icona("freccia", 18) }),
    ]),
    dati.valore != null && el("div", { class: "oggi-valore cifra", testo: String(dati.valore) }),
    dati.dettaglio && el("div", { class: "nota", testo: dati.dettaglio }),
  ]);
  s.style.setProperty("--accento", mod.accento);
  return s;
}

export default {
  async monta(contenitore) {
    contenitore.append(intestazione(saluto(), dataLunga()));

    const schede = el("div", { class: "oggi-elenco" });
    contenitore.append(schede);

    // Il caricamento è in parallelo e tollerante: un modulo rotto non deve
    // portarsi via la home, che è la schermata che si apre più spesso.
    const esiti = await Promise.allSettled(
      MODULI.filter((m) => m.id !== "oggi" && m.id !== "impostazioni")
            .map(async (voce) => {
              const mod = await prendiModulo(voce.id);
              return { mod, dati: mod?.oggi?.() || null };
            })
    );

    const vive = esiti
      .filter((e) => e.status === "fulfilled" && e.value.dati)
      .map((e) => e.value)
      .sort((a, b) => Number(Boolean(b.dati.urgente)) - Number(Boolean(a.dati.urgente)));

    if (!vive.length) {
      schede.append(vuoto(
        "Niente da segnalare, per ora.",
        "Le schede compariranno qui man mano che i moduli entrano in funzione."
      ));
      return;
    }

    for (const { mod, dati } of vive) schede.append(schedaModulo(mod, dati));
  },
};
