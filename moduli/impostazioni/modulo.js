// moduli/impostazioni — tema, stato del sync, spazio, backup.
//
// È anche la valvola di sicurezza: quando qualcosa nel sync va storto, è
// qui che si vede quale canale, con quale errore, e da qui si forza un giro.

import { el, intestazione, scheda, riga, avviso } from "../../core/ui.js";
import { canaliAperti, configurato, sincronizzaTutto } from "../../core/sync.js";
import { esportaTutto, caselleAperte } from "../../core/storage.js";
import { spazio, chiediPersistenza } from "../../core/blobs.js";
import { ultimiEventi, chiAscolta } from "../../core/bus.js";
import { mappaEventi } from "../../core/registro.js";
import { fattiDelGiorno, giornoCorrente } from "../../core/contesto.js";

const ETICHETTE_STATO = {
  ok: "sincronizzato",
  corso: "in corso…",
  err: "errore",
  off: "non configurato",
  inattivo: "in attesa",
};

function bloccoTema() {
  const attuale = localStorage.getItem("atlas.tema") || "auto";
  const gruppo = el("div", { class: "segmenti", role: "group", "aria-label": "Tema" });
  for (const [valore, testo] of [["auto", "Sistema"], ["chiaro", "Chiaro"], ["scuro", "Scuro"]]) {
    gruppo.append(el("button", {
      class: "segmento",
      type: "button",
      "aria-pressed": String(valore === attuale),
      testo,
      onClick: () => {
        if (valore === "auto") { localStorage.removeItem("atlas.tema"); delete document.documentElement.dataset.tema; }
        else { localStorage.setItem("atlas.tema", valore); document.documentElement.dataset.tema = valore; }
        for (const b of gruppo.children) b.setAttribute("aria-pressed", String(b.textContent === testo));
      },
    }));
  }
  return gruppo;
}

function bloccoSync() {
  const canali = canaliAperti();
  if (!configurato()) {
    return scheda("Sincronizzazione", [
      el("p", { testo: "Non configurata: i dati restano su questo dispositivo." }),
      el("p", { class: "nota", html: "Compila <code>config.js</code> con il repo dati e il token. Le istruzioni sono in <code>docs/SYNC.md</code>." }),
    ]);
  }

  const lista = el("ul", { class: "lista" });
  for (const c of canali) {
    lista.append(riga({
      etichetta: c.id,
      valore: `${ETICHETTE_STATO[c.stato] || c.stato}${c.ultimo ? ` · ${c.ultimo}` : ""}`,
    }));
  }
  if (!canali.length) lista.append(riga({ etichetta: "nessun canale aperto", valore: "—" }));

  const errori = canali.filter((c) => c.stato === "err");

  return scheda("Sincronizzazione", [
    lista,
    ...errori.map((c) => el("p", { class: "nota errore", testo: `${c.id}: ${c.messaggio}` })),
    el("button", {
      class: "btn secondario pieno",
      type: "button",
      testo: "Sincronizza adesso",
      onClick: () => { sincronizzaTutto(); avviso("Giro di sincronizzazione avviato."); },
    }),
  ]);
}

async function bloccoSpazio() {
  const s = await spazio();
  const mb = (n) => `${(n / 1048576).toFixed(1)} MB`;
  return scheda("Spazio e persistenza", [
    s
      ? el("p", { testo: `${mb(s.usati)} usati su ${mb(s.totali)} disponibili.` })
      : el("p", { class: "nota", testo: "Questo browser non dice quanto spazio sta usando." }),
    el("p", {
      class: "nota",
      testo: "Su iOS un sito non aperto per settimane può perdere i dati locali. " +
             "Chiedere la persistenza rende molto meno probabile che accada. " +
             "Il repo di sync resta comunque la copia che conta.",
    }),
    el("button", {
      class: "btn secondario pieno",
      type: "button",
      testo: "Chiedi persistenza",
      onClick: async () => {
        const ok = await chiediPersistenza();
        avviso(ok ? "Persistenza concessa." : "Persistenza negata dal browser.", { tono: ok ? "" : "errore" });
      },
    }),
  ]);
}

function bloccoBackup() {
  return scheda("Backup manuale", [
    el("p", {
      class: "nota",
      testo: "Un file JSON con tutto lo stato locale. Non contiene le foto: " +
             "quelle stanno in IndexedDB e nel repo dati.",
    }),
    el("button", {
      class: "btn secondario pieno",
      type: "button",
      testo: "Esporta stato",
      onClick: () => {
        const testo = JSON.stringify(esportaTutto(), null, 2);
        const url = URL.createObjectURL(new Blob([testo], { type: "application/json" }));
        const a = el("a", { href: url, download: `atlas-${new Date().toISOString().slice(0, 10)}.json` });
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      },
    }),
  ]);
}

/**
 * La lavagna del giorno, in chiaro.
 *
 * Non è un vezzo da sviluppatore: quando un modulo "non si accorge" di
 * quello che ha fatto un altro, la domanda è sempre la stessa — il fatto è
 * stato scritto? Qui si vede in due secondi, senza aprire la console.
 */
function bloccoLavagna() {
  const fatti = fattiDelGiorno();
  const righe = [];
  for (const [modulo, chiavi] of Object.entries(fatti)) {
    for (const [k, v] of Object.entries(chiavi)) {
      righe.push(el("div", { html: `<b>${modulo}</b> · ${k} = ${JSON.stringify(v)}` }));
    }
  }
  return scheda(`Lavagna di ${giornoCorrente()}`, [
    righe.length
      ? el("div", { class: "diagnostica" }, righe)
      : el("p", { class: "nota", testo: "Niente scritto oggi." }),
    el("p", {
      class: "nota",
      testo: "È qui che i moduli si dicono cosa è già successo, senza conoscersi. " +
             "Quando Mobilità segnerà la sessione serale, Abitudini la leggerà da qui.",
    }),
  ]);
}

/** Chi parla, chi ascolta, e cosa si sono detti. */
function bloccoEventi() {
  const { orfani } = mappaEventi();
  const ascoltati = chiAscolta();
  const eventi = ultimiEventi().slice(0, 12);

  return scheda("Comunicazione fra moduli", [
    el("div", { class: "diagnostica" }, [
      el("div", { html: `<b>in ascolto</b> · ${Object.entries(ascoltati).map(([e, n]) => `${e} (${n})`).join(", ") || "nessuno"}` }),
      ...eventi.map((v) => el("div", {
        testo: `${new Date(v.quando).toLocaleTimeString("it-IT")} — ${v.evento}`,
      })),
      !eventi.length && el("div", { testo: "nessun annuncio finora" }),
    ]),
    orfani.length && el("p", {
      class: "nota errore",
      testo: `Eventi ascoltati che nessuno annuncia: ${orfani.join(", ")}. Quasi sempre è un refuso in registro.js.`,
    }),
  ]);
}

function bloccoCaselle() {
  const lista = el("ul", { class: "lista" });
  for (const id of caselleAperte()) {
    const byte = (localStorage.getItem(`atlas.${id}.v1`) || "").length;
    lista.append(riga({ etichetta: id, valore: `${(byte / 1024).toFixed(1)} kB` }));
  }
  return scheda("Archivi locali", [
    lista,
    el("p", { class: "nota", testo: "Una casella per modulo, isolate fra loro: azzerarne una non tocca le altre." }),
  ]);
}

export default {
  async monta(contenitore, posizione) {
    const testa = intestazione("Impostazioni");
    testa.querySelector(".sync-pallino")?.remove();
    contenitore.append(testa);

    contenitore.append(scheda("Aspetto", [bloccoTema()]));
    contenitore.append(bloccoSync());
    contenitore.append(bloccoLavagna());
    contenitore.append(bloccoEventi());
    contenitore.append(bloccoCaselle());
    contenitore.append(await bloccoSpazio());
    contenitore.append(bloccoBackup());

    contenitore.append(el("a", {
      class: "btn secondario pieno",
      href: posizione.linkA("oggi"),
      testo: "Torna a Oggi",
      style: "margin-top:var(--s5)",
    }));
    contenitore.append(el("p", {
      class: "nota",
      style: "text-align:center;margin-top:var(--s6)",
      testo: "ATLAS · guscio v1",
    }));
  },
};
