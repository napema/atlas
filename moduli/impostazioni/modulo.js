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
import * as notifiche from "../../core/notifiche.js";

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
      class: "btn tenue pieno",
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
      class: "btn tenue pieno",
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
      class: "btn tenue pieno",
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
 * Le notifiche.
 *
 * Una coppia VAPID sola per tutti i moduli: prima erano due, una per
 * Mobilità e una per Abitudini. Le iscrizioni delle vecchie app NON si
 * possono riusare — una subscription è legata all'origine e allo scope del
 * service worker, e ATLAS sta su un percorso diverso. Il telefono va
 * iscritto di nuovo da qui, e non c'è modo di evitarlo.
 */
async function bloccoNotifiche(ridisegna) {
  const perm = notifiche.permesso();
  const attive = await notifiche.iscritto();
  const s = notifiche.stato();
  const nSub = s.subs.filter((x) => !x.del).length;

  const corpo = [];

  // Su iPhone il push funziona SOLO da PWA installata. Dirlo prima evita
  // il giro a vuoto di chiedere il permesso e vederselo negare in silenzio.
  if (notifiche.suIOS() && !notifiche.installata()) {
    corpo.push(el("p", { class: "nota attenzione",
      testo: "Su iPhone le notifiche funzionano solo se ATLAS è aggiunta alla schermata Home. Condividi → Aggiungi alla schermata Home, poi riapri da lì." }));
  }

  if (perm === "unsupported") {
    corpo.push(el("p", { class: "nota", testo: "Questo browser non supporta le notifiche push." }));
  } else if (perm === "denied") {
    corpo.push(el("p", { class: "nota errore",
      testo: "Permesso negato. Va riattivato dalle impostazioni del browser: da qui non si può più chiedere." }));
  } else if (!attive) {
    corpo.push(el("button", {
      class: "btn pieno", type: "button", testo: "Attiva le notifiche",
      onClick: async (e) => {
        e.currentTarget.disabled = true;
        const r = await notifiche.iscrivi();
        avviso(r.ok ? "Dispositivo iscritto." : r.motivo, { tono: r.ok ? "" : "errore", durata: r.ok ? 2400 : 5000 });
        ridisegna();
      },
    }));
  } else {
    corpo.push(el("p", { class: "nota positivo", testo: `Questo dispositivo è iscritto. In tutto: ${nSub}.` }));

    // Interruttori per modulo. Le abitudini hanno il proprio orario per
    // abitudine, quindi qui c'è solo l'interruttore generale.
    corpo.push(el("ul", { class: "lista" }, [
      interruttore("Abitudini", s.orari.abitudini.attiva, (v) => { notifiche.scriviOrari("abitudini", { attiva: v }); ridisegna(); }),
      interruttore("Mobilità", s.orari.mobilita.attiva, (v) => { notifiche.scriviOrari("mobilita", { attiva: v }); ridisegna(); }),
      interruttore("Finanze", s.orari.finanze.attiva, (v) => { notifiche.scriviOrari("finanze", { attiva: v }); ridisegna(); }),
    ]));

    if (s.orari.mobilita.attiva) {
      corpo.push(el("div", { class: "gruppo-titolo", testo: "Orari · Mobilità" }));
      corpo.push(oraCampo("Sessione", s.orari.mobilita.principale, (v) => notifiche.scriviOrari("mobilita", { principale: v })));
      corpo.push(oraCampo("Ripiego (dose minima)", s.orari.mobilita.recupero, (v) => notifiche.scriviOrari("mobilita", { recupero: v })));
    }
    if (s.orari.finanze.attiva) {
      corpo.push(el("div", { class: "gruppo-titolo", testo: "Orari · Finanze" }));
      corpo.push(oraCampo("Riepilogo serale", s.orari.finanze.riepilogo, (v) => notifiche.scriviOrari("finanze", { riepilogo: v })));
    }

    corpo.push(el("button", {
      class: "btn tenue pieno", type: "button", testo: "Manda una notifica di prova",
      style: "margin-top:var(--s4)",
      onClick: async () => {
        const ok = await notifiche.provaLocale();
        avviso(ok ? "Mandata." : "Non riuscita.", { tono: ok ? "" : "errore" });
      },
    }));
    corpo.push(el("p", { class: "nota",
      testo: "La prova è locale: dimostra che il dispositivo sa mostrarle. I promemoria veri partono da GitHub Actions ogni dieci minuti, e possono slittare di qualche minuto." }));
    corpo.push(el("button", {
      class: "btn distruttivo nudo pieno", type: "button", testo: "Disiscrivi questo dispositivo",
      onClick: async () => { await notifiche.disiscrivi(); avviso("Disiscritto."); ridisegna(); },
    }));
  }

  return scheda("Notifiche", corpo);
}

function interruttore(etichetta, acceso, alCambio) {
  const sw = el("button", {
    class: "interruttore" + (acceso ? " acceso" : ""),
    type: "button", role: "switch", "aria-checked": String(Boolean(acceso)),
    "aria-label": etichetta,
    onClick: () => alCambio(!acceso),
  }, [el("span", { class: "interruttore-pallina" })]);
  return el("li", {}, [el("div", { class: "riga" }, [el("span", { testo: etichetta }), el("span", { class: "valore" }, [sw])])]);
}

function oraCampo(etichetta, valore, alCambio) {
  return el("div", { class: "campo-gruppo" }, [
    el("label", { class: "campo-etichetta", testo: etichetta }),
    el("input", { class: "campo", type: "time", value: valore || "",
      onChange: (e) => { alCambio(e.target.value); avviso("Orario salvato."); } }),
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

let contenitoreCorrente = null;
let posizioneCorrente = null;

async function disegna() {
  const contenitore = contenitoreCorrente;
  if (!contenitore) return;
  const scorrimento = globalThis.scrollY;
  contenitore.replaceChildren();

  const testa = intestazione("Impostazioni");
  testa.querySelector(".sync-pallino")?.remove();
  contenitore.append(testa);

  contenitore.append(scheda("Aspetto", [bloccoTema()]));
  contenitore.append(await bloccoNotifiche(disegna));
  contenitore.append(bloccoSync());
  contenitore.append(bloccoLavagna());
  contenitore.append(bloccoEventi());
  contenitore.append(bloccoCaselle());
  contenitore.append(await bloccoSpazio());
  contenitore.append(bloccoBackup());

  contenitore.append(el("a", {
    class: "btn tenue pieno",
    href: posizioneCorrente?.linkA?.("oggi") || "#/oggi",
    testo: "Torna a Oggi",
    style: "margin-top:var(--s5)",
  }));
  contenitore.append(el("p", {
    class: "nota",
    style: "text-align:center;margin-top:var(--s6)",
    testo: "ATLAS · tre moduli, un guscio",
  }));

  globalThis.scrollTo(0, scorrimento);
}

export default {
  async monta(contenitore, posizione) {
    contenitoreCorrente = contenitore;
    posizioneCorrente = posizione;
    await disegna();
  },
  smonta() { contenitoreCorrente = null; },
};
