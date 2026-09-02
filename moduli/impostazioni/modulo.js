// moduli/impostazioni — tutte le impostazioni, in un posto solo.
//
// Prima erano sparse: il Setup di Finanze dentro Finanze, quello di Mobilità
// da nessuna parte, e le impostazioni di ATLAS dietro un pulsante nella home
// che non si trovava. Ora c'è una scheda nella barra e la schermata è divisa
// in sezioni: prima ATLAS, poi una per modulo.
//
// Le sezioni dei moduli non le disegna questo file: ogni modulo espone
// `impostazioni()` e restituisce il proprio nodo. Impostazioni non sa cosa
// c'è dentro, e i moduli restano indipendenti.

import { el, aggiungi, intestazione, scheda, riga, lista, avviso, segmenti } from "../../core/ui.js";
import { icona } from "../../core/icone.js";
import { canaliAperti, configurato, sincronizzaTutto } from "../../core/sync.js";
import { esportaTutto, caselleAperte } from "../../core/storage.js";
import { spazio, chiediPersistenza } from "../../core/blobs.js";
import { ultimiEventi, chiAscolta } from "../../core/bus.js";
import { MODULI_DATI, prendiModulo, mappaEventi } from "../../core/registro.js";
import { fattiDelGiorno, giornoCorrente } from "../../core/contesto.js";
import * as notifiche from "../../core/notifiche.js";
import { dipingiIcona } from "../../core/app.js";

let contenitore = null;
let sezione = "atlas";

const ETICHETTE_STATO = {
  ok: "sincronizzato", corso: "in corso…", err: "errore",
  off: "non configurato", inattivo: "in attesa",
};

/* ============================================================ ATLAS ===== */

function bloccoAspetto() {
  const attuale = localStorage.getItem("atlas.tema") || "auto";
  return scheda("Aspetto", [
    segmenti([["auto", "Sistema"], ["chiaro", "Chiaro"], ["scuro", "Scuro"]], attuale, (v) => {
      if (v === "auto") { localStorage.removeItem("atlas.tema"); delete document.documentElement.dataset.tema; }
      else { localStorage.setItem("atlas.tema", v); document.documentElement.dataset.tema = v; }
      // La favicon segue il tema scelto qui dentro, non solo quello di sistema.
      dipingiIcona();
    }),
    el("p", { class: "nota", testo: "«Sistema» segue l'impostazione del telefono, e cambia da sola al tramonto se l'hai attivata lì." }),
  ]);
}

function bloccoSync() {
  const canali = canaliAperti();
  if (!configurato()) {
    return scheda("Sincronizzazione", [
      el("p", { testo: "Non configurata: i dati restano su questo dispositivo." }),
      el("p", { class: "nota", html: "Compila <code>config.js</code> con il repo dati e il token. Istruzioni in <code>docs/SYNC.md</code>." }),
    ]);
  }

  const l = lista(canali.map((c) => riga({
    etichetta: c.id,
    valore: `${ETICHETTE_STATO[c.stato] || c.stato}${c.ultimo ? ` · ${c.ultimo}` : ""}`,
    tono: c.stato === "err" ? "negativo" : c.stato === "ok" ? "positivo" : "",
  })));
  const errori = canali.filter((c) => c.stato === "err");

  return scheda("Sincronizzazione", [
    canali.length ? l : el("p", { class: "nota", testo: "Nessun canale aperto." }),
    ...errori.map((c) => el("p", { class: "nota negativo", testo: `${c.id}: ${c.messaggio}` })),
    el("button", {
      class: "btn tenue pieno", type: "button", testo: "Sincronizza adesso",
      onClick: () => { sincronizzaTutto(); avviso("Giro di sincronizzazione avviato."); },
    }),
    el("p", { class: "nota", testo: "Un file per modulo nello stesso repo privato. Gli sha restano indipendenti, così due moduli salvati insieme non si annullano." }),
  ]);
}

async function bloccoNotifiche(ridisegna) {
  const perm = notifiche.permesso();
  const attive = await notifiche.iscritto();
  const s = notifiche.stato();
  const nSub = s.subs.filter((x) => !x.del).length;
  const corpo = [];

  if (notifiche.suIOS() && !notifiche.installata()) {
    corpo.push(el("p", { class: "nota attenzione",
      testo: "Su iPhone le notifiche funzionano solo con ATLAS aggiunta alla schermata Home. Condividi → Aggiungi alla schermata Home, poi riapri da lì." }));
  }

  if (perm === "unsupported") {
    corpo.push(el("p", { class: "nota", testo: "Questo browser non supporta le notifiche push." }));
  } else if (perm === "denied") {
    corpo.push(el("p", { class: "nota negativo",
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
    corpo.push(lista([
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
      corpo.push(lista([interruttore("Pagamenti in arrivo", s.orari.finanze.pagamenti !== false,
        (v) => { notifiche.scriviOrari("finanze", { pagamenti: v }); ridisegna(); },
        "Tre giorni prima, il giorno prima, la mattina stessa")]));
      if (s.orari.finanze.pagamenti !== false) {
        corpo.push(oraCampo("Ora dell'avviso", s.orari.finanze.pagamentiOra || "08:30",
          (v) => notifiche.scriviOrari("finanze", { pagamentiOra: v })));
        corpo.push(el("p", { class: "nota", testo:
          "Tre avvisi e non uno perché servono a tre cose diverse: a tre giorni fai in tempo a spostare i soldi nel pocket giusto, a un giorno a rinunciare a qualcosa, la mattina stessa a non trovare il conto più magro senza sapere perché." }));
      }
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
      testo: "I promemoria veri partono da GitHub Actions ogni dieci minuti e possono slittare di qualche minuto: non è un orologio, è un promemoria." }));
    corpo.push(el("button", {
      class: "btn distruttivo nudo pieno", type: "button", testo: "Disiscrivi questo dispositivo",
      onClick: async () => { await notifiche.disiscrivi(); avviso("Disiscritto."); ridisegna(); },
    }));
  }

  return scheda("Notifiche", corpo);
}

export function interruttore(etichetta, acceso, alCambio, dettaglio = "") {
  const sw = el("button", {
    class: "interruttore" + (acceso ? " acceso" : ""),
    type: "button", role: "switch", "aria-checked": String(Boolean(acceso)),
    "aria-label": etichetta,
    onClick: () => alCambio(!acceso),
  }, [el("span", { class: "interruttore-pallina" })]);

  return el("li", {}, [el("div", { class: "riga" }, [
    el("span", {}, [
      el("span", { testo: etichetta }),
      dettaglio && el("div", { class: "nota", testo: dettaglio }),
    ]),
    el("span", { class: "valore" }, [sw]),
  ])]);
}

export function oraCampo(etichetta, valore, alCambio) {
  return el("div", { class: "campo-gruppo" }, [
    el("label", { class: "campo-etichetta", testo: etichetta }),
    el("input", { class: "campo", type: "time", value: valore || "",
      onChange: (e) => { alCambio(e.target.value); avviso("Orario salvato."); } }),
  ]);
}

async function bloccoSpazio() {
  const s = await spazio();
  const mb = (n) => `${(n / 1048576).toFixed(1)} MB`;
  return scheda("Spazio e persistenza", [
    s ? el("p", { testo: `${mb(s.usati)} usati su ${mb(s.totali)} disponibili.` })
      : el("p", { class: "nota", testo: "Questo browser non dice quanto spazio sta usando." }),
    el("p", { class: "nota",
      testo: "Su iOS un sito non aperto per settimane può perdere i dati locali. La persistenza rende molto meno probabile che accada; il repo di sync resta comunque la copia che conta." }),
    el("button", {
      class: "btn tenue pieno", type: "button", testo: "Chiedi persistenza",
      onClick: async () => {
        const ok = await chiediPersistenza();
        avviso(ok ? "Persistenza concessa." : "Persistenza negata dal browser.", { tono: ok ? "" : "errore" });
      },
    }),
  ]);
}

function bloccoDati() {
  return scheda("Dati", [
    el("button", {
      class: "btn tenue pieno", type: "button", testo: "Esporta stato (JSON)",
      onClick: () => {
        const testo = JSON.stringify(esportaTutto(), null, 2);
        const url = URL.createObjectURL(new Blob([testo], { type: "application/json" }));
        const a = el("a", { href: url, download: `atlas-${new Date().toISOString().slice(0, 10)}.json` });
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      },
    }),
    el("p", { class: "nota", testo: "Tutto lo stato locale in un file. Non contiene le foto: quelle stanno in IndexedDB e nel repo dati." }),
    el("button", {
      class: "btn tenue pieno", type: "button", testo: "Svuota la cache e ricarica",
      onClick: async () => {
        avviso("Svuoto la cache…");
        try {
          for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister();
          for (const k of await caches.keys()) await caches.delete(k);
        } catch { /* niente */ }
        location.reload();
      },
    }),
    el("p", { class: "nota", testo: "Serve quando l'app resta indietro dopo un aggiornamento. Non tocca i dati: quelli sono altrove." }),
  ]);
}

/* ======================================================== DIAGNOSTICA === */

function bloccoLavagna() {
  const fatti = fattiDelGiorno();
  const righe = [];
  for (const [modulo, chiavi] of Object.entries(fatti)) {
    for (const [k, v] of Object.entries(chiavi)) {
      righe.push(el("div", { html: `<b>${modulo}</b> · ${k} = ${JSON.stringify(v)}` }));
    }
  }
  return scheda(`Lavagna di ${giornoCorrente()}`, [
    righe.length ? el("div", { class: "diagnostica" }, righe)
                 : el("p", { class: "nota", testo: "Niente scritto oggi." }),
    el("p", { class: "nota",
      testo: "È qui che i moduli si dicono cosa è già successo, senza conoscersi. Quando Mobilità segna la sessione, Abitudini la legge da qui." }),
  ]);
}

function bloccoEventi() {
  const { orfani } = mappaEventi();
  const ascoltati = chiAscolta();
  const eventi = ultimiEventi().slice(0, 10);
  return scheda("Comunicazione fra moduli", [
    el("div", { class: "diagnostica" }, [
      el("div", { html: `<b>in ascolto</b> · ${Object.entries(ascoltati).map(([e, n]) => `${e} (${n})`).join(", ") || "nessuno"}` }),
      ...eventi.map((v) => el("div", { testo: `${new Date(v.quando).toLocaleTimeString("it-IT")} — ${v.evento}` })),
      !eventi.length && el("div", { testo: "nessun annuncio finora" }),
    ]),
    orfani.length > 0 && el("p", { class: "nota negativo",
      testo: `Eventi ascoltati che nessuno annuncia: ${orfani.join(", ")}. Quasi sempre è un refuso in registro.js.` }),
  ]);
}

function bloccoCaselle() {
  return scheda("Archivi locali", [
    lista(caselleAperte().map((id) => {
      const byte = (localStorage.getItem(`atlas.${id}.v1`) || "").length;
      return riga({ etichetta: id, valore: `${(byte / 1024).toFixed(1)} kB` });
    })),
    el("p", { class: "nota", testo: "Una casella per modulo, isolate fra loro: azzerarne una non tocca le altre." }),
  ]);
}

/* ============================================================== vista === */

async function disegna() {
  if (!contenitore) return;
  const scorrimento = globalThis.scrollY;
  contenitore.replaceChildren();

  const testa = intestazione("Impostazioni");
  // Il pallino del sync viveva in cima a ogni schermata e cambiava colore
  // da solo mentre guardavi: ora sta qui e basta, nella scheda dello stato.
  testa.querySelector(".sync-pallino")?.remove();
  contenitore.append(testa);

  // Le sezioni: ATLAS, poi una per modulo, poi la diagnostica.
  const voci = [["atlas", "ATLAS"], ...MODULI_DATI.map((m) => [m.id, m.nome]), ["diagnostica", "Diagnostica"]];
  contenitore.append(el("div", { class: "im-sezioni" }, voci.map(([id, nome]) => el("button", {
    class: "im-sezione" + (sezione === id ? " attiva" : ""),
    type: "button", testo: nome, "aria-pressed": String(sezione === id),
    onClick: () => { sezione = id; disegna(); },
  }))));

  const corpo = el("div", { class: "im-corpo" });
  contenitore.append(corpo);

  if (sezione === "atlas") {
    aggiungi(corpo, [
      bloccoAspetto(),
      await bloccoNotifiche(disegna),
      bloccoSync(),
      await bloccoSpazio(),
      bloccoDati(),
      el("p", { class: "nota", style: "text-align:center;margin-top:var(--s6)",
        testo: "ATLAS · tre moduli, un guscio" }),
    ]);
  } else if (sezione === "diagnostica") {
    aggiungi(corpo, [bloccoLavagna(), bloccoEventi(), bloccoCaselle()]);
  } else {
    const mod = await prendiModulo(sezione);
    const suo = mod?.impostazioni?.();
    corpo.append(suo || el("div", { class: "vuoto" }, [
      el("p", { class: "grande", testo: "Niente da configurare" }),
      el("p", { class: "nota", testo: `${mod?.nome || sezione} non ha impostazioni proprie.` }),
    ]));
  }

  globalThis.scrollTo(0, scorrimento);
}

export default {
  async monta(cont, posizione) {
    contenitore = cont;
    const chiesta = posizione?.resto?.[0];
    if (chiesta) sezione = chiesta;
    await disegna();
  },
  smonta() { contenitore = null; },

};
