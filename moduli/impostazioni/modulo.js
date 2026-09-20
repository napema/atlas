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

import { el, aggiungi, intestazione, scheda, riga, lista, avviso, segmenti, campo } from "../../core/ui.js";
import { icona } from "../../core/icone.js";
import { canaliAperti, configurato, sincronizzaTutto, verificaAccesso, recapito } from "../../core/sync.js";
import { leggiToken, scriviToken, dimenticaToken, tokenPresente, sembraUnToken } from "../../core/credenziali.js";
import { esportaTutto, caselleAperte } from "../../core/storage.js";
import { spazio, chiediPersistenza } from "../../core/blobs.js";
import { ultimiEventi, chiAscolta } from "../../core/bus.js";
import { MODULI_DATI, prendiModulo, mappaEventi } from "../../core/registro.js";
import { assicuraStile } from "../../core/router.js";
import { fattiDelGiorno, giornoCorrente } from "../../core/contesto.js";
import * as notifiche from "../../core/notifiche.js";

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
    }),
    el("p", { class: "nota", testo: "«Sistema» segue l'impostazione del telefono, e cambia da sola al tramonto se l'hai attivata lì." }),
  ], { ico: "sole" });
}

/*
  Il token si incolla QUI, non si pubblica in config.js.

  È l'unica schermata di ATLAS che chiede un segreto, e la forma conta:
  si verifica PRIMA di dichiararlo buono, e un token che GitHub rifiuta non
  resta salvato. Un token rotto che rimane nella casella è peggio di nessun
  token: i canali ripartono ogni venti secondi, bussano, prendono 401, e la
  schermata si riempie di errori rossi che non dicono cosa fare.
*/
function bloccoSync(ridisegna) {
  const canali = canaliAperti();
  const r = recapito();
  const contenuto = [];

  if (configurato()) {
    const errori = canali.filter((c) => c.stato === "err");
    contenuto.push(
      canali.length
        ? lista(canali.map((c) => riga({
            etichetta: c.id,
            valore: `${ETICHETTE_STATO[c.stato] || c.stato}${c.ultimo ? ` · ${c.ultimo}` : ""}`,
            tono: c.stato === "err" ? "negativo" : c.stato === "ok" ? "positivo" : "",
          })))
        : el("p", { class: "nota", testo: "Nessun canale aperto." }),
      ...errori.map((c) => el("p", { class: "nota negativo", testo: `${c.id}: ${c.messaggio}` })),
      el("button", {
        class: "btn tenue pieno", type: "button", testo: "Sincronizza adesso",
        onClick: () => { sincronizzaTutto(); avviso("Giro di sincronizzazione avviato."); },
      }),
    );
  } else {
    contenuto.push(el("p", { testo: "Non attiva: i dati restano su questo dispositivo. Incolla qui sotto il token e riparte." }));
  }

  const esito = el("p", { class: "nota" });
  let bozza = leggiToken();

  contenuto.push(
    campo({
      etichetta: "Token di accesso", tipo: "password", valore: bozza,
      segnaposto: "github_pat_…", autocomplete: "off",
      // Si scrive solo al pulsante, non a ogni tasto: salvare mezzo token
      // farebbe partire un giro di sync destinato a fallire a ogni lettera.
      alCambio: (v) => { bozza = v; },
    }),
    el("button", {
      class: "btn primario pieno", type: "button", testo: "Verifica e salva",
      onClick: async (e) => {
        const b = e.currentTarget;
        if (!sembraUnToken(bozza)) {
          esito.className = "nota negativo";
          esito.textContent = "Non ha la forma di un token GitHub: deve cominciare per github_pat_ o ghp_.";
          return;
        }
        b.disabled = true; b.textContent = "Verifico…";
        const prima = leggiToken();
        scriviToken(bozza);
        const r2 = await verificaAccesso();
        if (!r2.ok) scriviToken(prima);   // vedi il commento sopra la funzione
        esito.className = `nota ${r2.ok ? "positivo" : "negativo"}`;
        esito.textContent = r2.motivo;
        b.disabled = false; b.textContent = "Verifica e salva";
        if (r2.ok) { avviso("Token salvato su questo dispositivo."); ridisegna(); }
      },
    }),
    esito,
    el("p", { class: "nota", html:
      `Su <code>github.com/settings/personal-access-tokens</code>: token fine-grained, solo il repo <code>${r.owner}/${r.repo}</code>, permesso <code>Contents: Read and write</code>. ` +
      "Creane uno per dispositivo — dal telefono lo generi in Safari e lo incolli qui senza farlo viaggiare da nessuna parte." }),
    el("p", { class: "nota", testo:
      "Resta solo qui e non viene mai sincronizzato né incluso nel backup: se finisse in un file pubblicato aprirebbe il repo dei dati a chiunque." }),
  );

  if (tokenPresente()) {
    contenuto.push(el("button", {
      class: "btn tenue pieno", type: "button", testo: "Dimentica il token su questo dispositivo",
      onClick: () => {
        dimenticaToken();
        avviso("Token rimosso. I dati locali restano, il sync si ferma.");
        ridisegna();
      },
    }));
  }

  contenuto.push(el("p", { class: "nota", testo: "Un file per modulo nello stesso repo privato. Gli sha restano indipendenti, così due moduli salvati insieme non si annullano." }));

  return scheda("Sincronizzazione", contenuto, { ico: "sync" });
}

async function bloccoNotifiche(ridisegna) {
  const perm = notifiche.permesso();
  const attive = await notifiche.iscritto();
  const s = notifiche.stato();
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
    /* NON BASTA DIRE «ISCRITTO». Prima questa riga guardava solo se il
       browser aveva un'iscrizione, e diceva «iscritto» anche quando il
       server ne conosceva un'altra — vecchia, rigenerata da iOS, morta.
       Le notifiche partivano, Apple le accettava, e non arrivava niente,
       mentre qui c'era scritto che andava tutto bene. Adesso il riallineamento
       gira prima, e la riga dice se il server conosce QUESTO telefono. */
    const esito = await notifiche.riallinea();
    const mio = await notifiche.idQuestoDispositivo();
    const vivi = notifiche.stato().subs.filter((x) => !x.del);
    const altri = vivi.filter((x) => x.id !== mio).length;

    corpo.push(el("p", {
      class: "nota positivo",
      testo: esito.stato === "riparato"
        ? "Questo dispositivo non era registrato sul server: sistemato ora. Le prossime notifiche arrivano qui."
        : "Questo dispositivo è iscritto, e il server lo conosce.",
    }));

    if (altri > 0) {
      corpo.push(el("p", { class: "nota", testo:
        `Il server manda anche a ${altri === 1 ? "un'altra iscrizione" : `altre ${altri} iscrizioni`}. ` +
        "Se usi ATLAS solo su questo telefono sono vecchie — di una reinstallazione o di un aggiornamento di iOS — e ricevono messaggi che non arrivano da nessuna parte." }));
      corpo.push(el("button", {
        class: "btn tenue pieno", type: "button",
        testo: altri === 1 ? "Tieni solo questo dispositivo" : `Tieni solo questo dispositivo (togli le altre ${altri})`,
        onClick: async () => {
          const n = await notifiche.tieniSoloQuesto();
          avviso(n ? `Tolte ${n}. Resta solo questo dispositivo.` : "Niente da togliere.");
          ridisegna();
        },
      }));
    }
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
      testo: "La prova parte da QUESTO telefono e non passa dal server: se non la vedi, il problema è nelle impostazioni di iOS — Impostazioni → Notifiche → ATLAS, e controlla che non ci sia una Full immersione attiva. Se la vedi ma i promemoria no, il problema era l'iscrizione, e il riallineamento qui sopra l'ha appena sistemata." }));
    corpo.push(el("button", {
      class: "btn distruttivo nudo pieno", type: "button", testo: "Disiscrivi questo dispositivo",
      onClick: async () => { await notifiche.disiscrivi(); avviso("Disiscritto."); ridisegna(); },
    }));
  }

  return scheda("Notifiche", corpo, { ico: "campanella" });
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
  ], { ico: "nuvola" });
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
  ], { ico: "grafico" });
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
  ], { ico: "calendario" });
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
  ], { ico: "onda" });
}

function bloccoCaselle() {
  return scheda("Archivi locali", [
    lista(caselleAperte().map((id) => {
      const byte = (localStorage.getItem(`atlas.${id}.v1`) || "").length;
      return riga({ etichetta: id, valore: `${(byte / 1024).toFixed(1)} kB` });
    })),
    el("p", { class: "nota", testo: "Una casella per modulo, isolate fra loro: azzerarne una non tocca le altre." }),
  ], { ico: "importa" });
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
      bloccoSync(disegna),
      await bloccoSpazio(),
      bloccoDati(),
      el("p", { class: "nota", style: "text-align:center;margin-top:var(--s6)",
        testo: "ATLAS · tre moduli, un guscio" }),
    ]);
  } else if (sezione === "diagnostica") {
    aggiungi(corpo, [bloccoLavagna(), bloccoEventi(), bloccoCaselle()]);
  } else {
    const mod = await prendiModulo(sezione);

    // Il CSS del modulo va aspettato PRIMA di disegnare: la sua sezione usa
    // le sue classi, e qui dentro quel foglio non l'ha caricato nessuno.
    if (mod) await assicuraStile(mod);

    /* La sezione di un modulo prende il SUO accento, non quello di
       Impostazioni. Senza, i componenti che si tingono con `var(--accento)`
       diventano grigi qui dentro: la griglia della settimana tipo di Pasti
       perdeva la differenza fra «a casa» e «fuori», che è l'unica cosa che
       quella griglia deve dire. */
    if (mod?.accento) corpo.style.setProperty("--accento", mod.accento);

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
