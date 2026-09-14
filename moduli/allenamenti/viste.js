// moduli/allenamenti/viste.js — dal calcolo agli elementi.
//
// Nessun conteggio qui dentro: tutto arriva da calcolo.js.
//
// LA DOMANDA DELLA SCHERMATA È UNA SOLA: cosa mi resta questa settimana.
// Non «quanto ho corso in tutto», non «a che punto è il blocco» — quelle
// sono buone domande ma sono di un'altra schermata, e messe insieme alla
// prima la rendono illeggibile. Il blocco intero sta in «Andamento».

import {
  el, aggiungi, apriFoglio, chiudiFoglio, avviso, tocco, campo, segmenti,
  vuoto, oggiISO, dataBreve, GIORNI_INIZIALI, piuGiorni, plurale, traccia,
} from "../../core/ui.js";
import { icona } from "../../core/icone.js";
import {
  PIANO, SETTIMANE, OBIETTIVO, ZONE, REGOLE, VINCOLO,
  slotDi, fatto, giornoSlot, alternaSlot, scegliGiorno, pianoDi,
  inizioSettimana, fineSettimana, settimanaDi, corseVive, eliminaCorsa,
  salvaCorse, salvaAllenamenti, ripristinaSlot, recordSlot,
} from "./dati.js";
import {
  progressoSettimana, kmPrevisti, kmFatti, corseDi, andamento, kmTotali,
  proiezione, giorniRimasti, settimaneAlTest, giornoTest, passoSettimana, consiglio,
  mmss, passo, km,
} from "./calcolo.js";
import { corseDaCSV, allenamentiDaCSV, ESEMPIO_ALLENAMENTI } from "./importa.js";
import { leggiAllenamento, descrivi } from "./passi.js";
import { fileAllenamento, scarica } from "./fit.js";
import * as hevy from "./hevy.js";

/* ====================================================== la striscia ===== */
/*
   Tredici settimane in una riga che scorre. È il «display per settimane»:
   il blocco intero resta sempre raggiungibile con il pollice, e la fase —
   Ricostruzione, Soglia, Specifico, Taper — si legge dal colore del bordo
   senza doverla scrivere tredici volte.
*/

export function strisciaSettimane(scelta, alCambio) {
  const oggi = oggiISO();
  const attuale = settimanaDi(oggi);
  const nastro = el("div", { class: "al-striscia" });

  for (const p of PIANO) {
    const pr = progressoSettimana(p.n);
    const b = el("button", {
      class: "al-sett"
        + (p.n === scelta ? " scelta" : "")
        + (p.n === attuale ? " ora" : "")
        + (pr.frazione >= 1 ? " chiusa" : ""),
      type: "button",
      "aria-pressed": String(p.n === scelta),
      "aria-label": `Settimana ${p.n}, ${p.fase}, ${pr.fatti} di ${pr.totali}`,
      onClick: () => alCambio(p.n),
    }, [
      el("span", { class: "al-sett-n", testo: String(p.n) }),
      // UNA BARRA, NON SEI PALLINI.
      //
      // I pallini dicevano la stessa cosa ma chiedevano di contarli, e con
      // tredici settimane affiancate sono settantotto puntini in fila: da
      // lontano diventano rumore grigio e il numero della settimana — che è
      // l'unica cosa che serve leggere — smetteva di stare al centro del
      // suo riquadro. Una barra si legge senza contare.
      el("span", { class: "al-sett-barra" },
        [el("i", { style: `width:${Math.round(pr.frazione * 100)}%` })]),
    ]);
    b.dataset.fase = chiaveFase(p.fase);
    nastro.append(b);
  }

  // La settimana di oggi al centro, non a sinistra: aprendo il modulo si
  // vede subito dove sei senza dover trascinare.
  queueMicrotask(() => {
    const q = nastro.querySelector(".al-sett.scelta");
    q?.scrollIntoView({ block: "nearest", inline: "center" });
  });
  return nastro;
}

const chiaveFase = (fase) =>
  /ricostr/i.test(fase) ? "ricostruzione"
  : /soglia/i.test(fase) ? "soglia"
  : /specifico/i.test(fase) ? "specifico" : "taper";

/* ======================================================== la testata ==== */
/*
   Il numero grande è QUANTO TI RESTA QUESTA SETTIMANA, non quanto hai
   fatto. Il piano non assegna giorni — «3 corse + 3 palestre, giorni
   liberi» — quindi la domanda vera non è «cosa tocca oggi» ma «quanto devo
   ancora piazzare, e quanti giorni ho per farlo».

   Il colore sta in un posto solo e dice una cosa sola: gli slot aperti sono
   più dei giorni rimasti. Non è pessimismo, è aritmetica — e detta il
   mercoledì serve, detta la domenica sera è un rimprovero inutile.
*/

export function testata(n) {
  const p = progressoSettimana(n);
  const piano = pianoDi(n);
  const oggi = oggiISO();
  const corrente = settimanaDi(oggi) === n;
  const aperti = p.totali - p.fatti;
  const giorni = giorniRimasti(n, oggi);
  const passoS = passoSettimana(n, oggi);

  const tono = !corrente ? ""
    : passoS === "indietro" ? "avviso"
    : passoS === "persa" ? "male" : "";

  const box = el("section", { class: `al-testata ${tono}`.trim() });

  aggiungi(box, [
    el("div", { class: "al-testata-alto" }, [
      el("span", { class: "al-micro", testo: `Settimana ${n} di ${SETTIMANE}` }),
      el("span", { class: "al-fase", testo: piano.fase }),
    ]),

    aperti === 0
      ? el("div", { class: "al-cifra chiusa", testo: "Chiusa" })
      : el("div", { class: "al-cifra", testo: String(aperti) }),

    el("p", { class: "al-sotto", testo: aperti === 0
      ? `Tutti e ${p.totali} gli slot fatti.`
      : `${plurale(aperti, "slot aperto", "slot aperti")} su ${p.totali}` +
        (corrente ? ` · ${plurale(giorni, "giorno", "giorni")} per piazzarli` : "") }),

    traccia(p.frazione, p.frazione >= 1 ? "ok" : ""),

    el("div", { class: "al-piede" }, [
      statistica(`${p.corse}/${p.corseTotali}`, "corse"),
      statistica(`${p.palestra}/${p.palestraTotali}`, "palestra"),
      statistica(km(kmFatti(n)), `su ${km(kmPrevisti(n))}`),
    ]),
  ]);

  // Il consiglio parla solo quando sa una cosa che l'elenco non mostra da
  // sé, e solo per la settimana in corso: su una settimana passata sarebbe
  // un rimprovero su qualcosa che non si può più fare.
  const c = corrente ? consiglio(n, oggi) : null;
  if (c) {
    box.append(el("p", { class: `al-consiglio ${c.tono}`.trim() }, [
      el("span", { class: "al-consiglio-segno", html: icona("info", 15, 2) }),
      el("span", { testo: c.testo }),
    ]));
  }

  if (piano.avvertenza) {
    box.append(el("p", { class: "al-avvertenza" }, [
      el("span", { class: "al-avvertenza-segno", html: icona("avviso", 15, 2.2) }),
      el("span", { testo: piano.avvertenza }),
    ]));
  }
  return box;
}

const statistica = (valore, etichetta) =>
  el("div", { class: "al-stat" }, [
    el("span", { class: "al-stat-valore", testo: valore }),
    el("span", { class: "al-stat-eti", testo: etichetta }),
  ]);

/* ========================================================= gli slot ===== */

export function elencoSlot(n, ridisegna) {
  const slot = slotDi(n);
  const fuori = el("div", { class: "al-gruppi" });

  for (const genere of ["corsa", "palestra"]) {
    const miei = slot.filter((s) => s.genere === genere);
    if (!miei.length) continue;
    const fattiQui = miei.filter((s) => fatto(s.id)).length;
    fuori.append(el("section", { class: "al-gruppo" }, [
      el("div", { class: "al-gruppo-testa" }, [
        el("span", { class: "al-gruppo-nome", testo: genere === "corsa" ? "Corsa" : "Palestra" }),
        el("span", { class: "al-gruppo-conta", testo: `${fattiQui}/${miei.length}` }),
      ]),
      el("ul", { class: "al-slot" }, miei.map((s) => rigaSlot(s, ridisegna))),
    ]));
  }
  return fuori;
}

/* Quale slot è stato appena toccato.
   `disegna()` ricostruisce tutta la lista a ogni spunta, quindi
   un'animazione d'ingresso sul cerchio verde partirebbe su TUTTI gli slot
   già fatti ogni volta che ne tocchi uno — dodici molle insieme per un
   tocco solo. Ricordando l'ultimo, la molla scatta dove l'hai chiesta. */
let appena = null;

function rigaSlot(s, ridisegna) {
  const f = fatto(s.id);
  const g = giornoSlot(s.id);

  const spunta = el("button", {
    class: "al-spunta" + (f ? " fatta" : "") + (s.id === appena ? " appena" : ""),
    type: "button", "aria-pressed": String(f),
    "aria-label": f ? `Riapri ${s.nome}` : `Segna ${s.nome} come fatto`,
    onClick: (e) => {
      e.stopPropagation();
      const ora = alternaSlot(s.id);
      appena = ora ? s.id : null;
      tocco(f ? 6 : 14);
      ridisegna();
      // La molla vale per quel ridisegno soltanto: al giro dopo lo slot è
      // già «fatto da prima» e non deve rifare l'ingresso.
      appena = null;
    },
  }, [el("span", { class: "al-spunta-cerchio", html: icona("spunta", 17, 2.6) })]);

  const corpo = el("button", {
    class: "al-slot-corpo", type: "button",
    onClick: () => apriSlot(s, ridisegna),
  }, [
    el("div", { class: "al-slot-alto" }, [
      el("span", { class: "al-slot-nome" + (f ? " fatta" : ""), testo: s.nome }),
      s.stella && el("span", { class: "al-stella", html: icona("bersaglio", 14, 2) }),
      s.cambiato && el("span", { class: "al-tag", testo: "importato" }),
      g && el("span", { class: "al-giorno", testo: etichettaGiorno(g) }),
    ]),
    el("p", { class: "al-slot-testo", testo: s.lift ? s.lift : s.testo }),
    s.lift && s.accessori?.length
      ? el("p", { class: "al-slot-accessori", testo: s.accessori.join(" · ") })
      : null,
  ]);

  return el("li", { class: "al-slot-li" + (f ? " fatta" : "") }, [spunta, corpo]);
}

function etichettaGiorno(iso) {
  const oggi = oggiISO();
  if (iso === oggi) return "oggi";
  if (iso === piuGiorni(oggi, -1)) return "ieri";
  const d = new Date(`${iso}T12:00:00`);
  return `${GIORNI_INIZIALI[(d.getDay() + 6) % 7]} ${d.getDate()}`;
}

/* ---------------------------------------------------- il foglio di uno -- */

export function apriSlot(s, ridisegna) {
  const { corpo } = apriFoglio({ titolo: s.nome, alChiudi: ridisegna });
  const f = fatto(s.id);

  aggiungi(corpo, [
    el("section", { class: "scheda" }, [
      el("p", { class: "al-foglio-testo", testo: s.lift ? s.lift : s.testo }),
      s.accessori?.length ? el("ul", { class: "al-foglio-accessori" },
        s.accessori.map((a) => el("li", { testo: a }))) : null,
      s.km ? el("p", { class: "nota", testo: `Circa ${km(s.km)} nel conteggio della settimana.` }) : null,
    ]),

    el("button", {
      class: "btn pieno " + (f ? "tenue" : "primario"),
      type: "button", testo: f ? "Riapri lo slot" : "Segna come fatto",
      onClick: () => { alternaSlot(s.id); tocco(14); chiudiFoglio(); ridisegna(); },
    }),

    /* IL GIORNO È UNA SCELTA, NON UN OBBLIGO. Il piano dice «giorni
       liberi»: la settimana si pianifica la domenica e gli slot si
       piazzano. Chi non vuole pianificare spunta e basta. */
    el("div", { class: "campo-gruppo" }, [
      el("label", { class: "campo-etichetta", testo: "Giorno" }),
      el("div", { class: "al-giorni" }, giorniDellaSettimana(s.sett).map(([iso, eti]) =>
        el("button", {
          class: "al-giorno-btn" + (giornoSlot(s.id) === iso ? " scelto" : ""),
          type: "button", testo: eti,
          onClick: (e) => {
            const era = giornoSlot(s.id) === iso;
            scegliGiorno(s.id, era ? "" : iso);
            for (const b of e.currentTarget.parentElement.children) {
              b.classList.toggle("scelto", !era && b === e.currentTarget);
            }
            ridisegna();
          },
        }))),
    ]),

    esportazioni(s, ridisegna),

    recordSlot(s.id)?.testo && el("button", {
      class: "btn nudo piccolo", type: "button", testo: "Rimetti il piano originale",
      onClick: () => { ripristinaSlot(s.id); chiudiFoglio(); avviso("Rimesso il piano."); ridisegna(); },
    }),
  ]);
}

/* =========================================================================
   PORTARE FUORI L'ALLENAMENTO — e le due strade non sono la stessa cosa.

   HEVY ha un'API aperta: la routine si crea davvero, con una chiamata, e
   compare nell'app senza incollare niente.

   GARMIN no. Non esiste nessuna porta d'ingresso per un allenamento che non
   sia un file `.FIT`, quindi il pulsante lo costruisce e lo salva; poi sei
   tu ad aprirlo e mandarlo a Garmin Connect dal foglio di condivisione. Non
   è pigrizia mia: è che un'API per creare allenamenti Garmin non la dà a
   nessuno. Il pulsante lo dice, invece di lasciartelo scoprire dopo.
   ========================================================================= */

function esportazioni(s, ridisegna) {
  return s.genere === "corsa" ? versoGarmin(s) : versoHevy(s, ridisegna);
}

/*
   GARMIN CONNECT NON IMPORTA ALLENAMENTI, e l'abbiamo scoperto col file in
   mano: caricato lì dentro diventa un PERCORSO, perché l'importazione di
   Connect sa fare solo attività e percorsi. Non è il file a essere
   sbagliato — il cookbook FIT di Garmin conferma che la struttura è quella
   giusta — è che quella porta non esiste. La stessa pagina dice qual è la
   porta vera: il cavo USB, cartella `GARMIN/NewFiles`.

   Quindi due strade, e tutte e due dichiarate per quello che sono:
   dal PC il file va sull'orologio in dieci secondi; dal telefono la via è
   l'editor di Connect, e allora la cosa utile è avere i passi scritti
   nell'ordine e nel formato in cui te li chiede.
*/
function versoGarmin(s) {
  const letto = leggiAllenamento(s.testo);
  const righe = descrivi(letto.passi);

  return el("div", { class: "campo-gruppo" }, [
    el("label", { class: "campo-etichetta", testo: "Porta su Garmin" }),

    // COSA FINIRÀ NELL'OROLOGIO, prima di salvarlo. Un file che parte alla
    // cieca e si scopre sbagliato a metà ripetuta è il modo peggiore di
    // scoprire che il lettore non aveva capito la frase.
    el("ul", { class: "al-passi" }, righe.map((r) => el("li", { testo: r }))),

    !letto.completo && el("p", { class: "nota tono-avviso", testo:
      "Una parte di questo allenamento non l'ho saputa tradurre in passi: nell'orologio arriva come corsa libera, e il dettaglio resta qui." }),
    letto.assunzioni && el("p", { class: "nota", testo:
      "Gli allunghi senza durata li ho messi a 30\" con 60\" di pausa." }),

    // DAL TELEFONO: i passi negli appunti, nell'ordine in cui l'editor di
    // Connect li chiede. È la strada che userai nove volte su dieci.
    el("button", {
      class: "btn primario pieno", type: "button",
      html: `${icona("scarica", 18)}<span>Copia i passi per Connect</span>`,
      onClick: async () => {
        const t = [`${s.nome} · Settimana ${s.sett}`, ...righe.map((r, i) => `${i + 1}. ${r}`)].join("\n");
        try {
          await navigator.clipboard.writeText(t);
          avviso("Copiati. Connect → Allenamenti → Crea allenamento.");
        } catch {
          avviso("Non riesco a copiare da qui.", { tono: "errore" });
        }
      },
    }),
    el("p", { class: "nota", testo:
      "Garmin Connect → Allenamenti e pianificazione → Allenamenti → Crea allenamento. I passi qui sopra sono già nell'ordine giusto." }),

    // DAL PC: il file vero, che l'orologio legge da sé.
    el("button", {
      class: "btn tenue pieno", type: "button", stile: { marginTop: "var(--s3)" },
      html: `${icona("scarica", 18)}<span>Scarica il .FIT per l'orologio</span>`,
      onClick: () => {
        try {
          const byte = fileAllenamento(`${s.nome} S${s.sett}`, letto.passi);
          scarica(`atlas-s${s.sett}-${s.chiave}.fit`, byte);
          avviso("Salvato. Copialo in GARMIN/NewFiles con il cavo USB.");
        } catch (e) {
          avviso(`Non riesco a costruire il file: ${e.message}`, { tono: "errore" });
        }
      },
    }),
    el("p", { class: "nota", testo:
      "Dal PC, col cavo: copialo nella cartella GARMIN/NewFiles dell'orologio e lo trovi fra gli allenamenti. NON caricarlo su Connect — lì l'importazione fa solo attività e percorsi, e diventerebbe un percorso." }),
  ]);
}

function versoHevy(s, ridisegna) {
  const righe = [s.lift, ...(s.accessori || [])].filter(Boolean);

  return el("div", { class: "campo-gruppo" }, [
    el("label", { class: "campo-etichetta", testo: "Porta su Hevy" }),

    !hevy.configurato()
      ? el("p", { class: "nota", testo: "Serve la chiave API, una volta sola: Impostazioni → Allenamenti." })
      : null,

    el("button", {
      class: "btn primario pieno", type: "button", disabled: !hevy.configurato(),
      html: `${icona("nuvola", 18)}<span>Crea la routine su Hevy</span>`,
      onClick: async (e) => {
        const b = e.currentTarget;
        b.disabled = true;
        b.textContent = "Creo…";
        try {
          const { mancanti } = await hevy.creaRoutine({
            titolo: `${s.nome} · Settimana ${s.sett}`,
            note: "Da ATLAS — blocco 5 km sub-20",
            righe,
          });
          chiudiFoglio();
          avviso(mancanti.length
            ? `Creata. ${mancanti.length} esercizi non erano nel catalogo: ${mancanti.join(", ")}.`
            : "Routine creata su Hevy.", { durata: mancanti.length ? 5200 : 2400 });
          ridisegna();
        } catch (err) {
          b.disabled = false;
          b.textContent = "Crea la routine su Hevy";
          avviso(err.message, { tono: "errore", durata: 4200 });
        }
      },
    }),
    hevy.configurato() && el("p", { class: "nota", testo:
      "La routine compare nell'app, in «My Routines». I carichi e le serie sono quelli del piano." }),
  ]);
}

function giorniDellaSettimana(n) {
  const da = inizioSettimana(n);
  return Array.from({ length: 7 }, (_, i) => {
    const iso = piuGiorni(da, i);
    return [iso, GIORNI_INIZIALI[i]];
  });
}

/* ====================================================== l'andamento ===== */

export function vistaAndamento(ridisegna) {
  const righe = andamento();
  const massimo = Math.max(1, ...righe.map((r) => Math.max(r.previsti, r.fatti)));
  const pr = proiezione();
  const corse = corseVive();

  return el("div", {}, [
    schedaProiezione(pr),

    el("section", { class: "scheda" }, [
      el("div", { class: "scheda-titolo" }, [
        el("span", { testo: "Chilometri per settimana" }),
        el("span", { class: "nota", testo: km(kmTotali()) }),
      ]),
      el("div", { class: "al-barre" }, righe.map((r) => barraSettimana(r, massimo))),
      el("div", { class: "al-legenda" }, [
        el("span", { class: "al-legenda-voce" }, [el("i", { class: "al-chiave piano" }), el("span", { testo: "piano" })]),
        el("span", { class: "al-legenda-voce" }, [el("i", { class: "al-chiave fatto" }), el("span", { testo: "fatto" })]),
        el("span", { class: "al-legenda-voce" }, [el("i", { class: "al-chiave sopra" }), el("span", { testo: "oltre il +10%" })]),
      ]),
    ]),

    el("section", { class: "scheda" }, [
      el("div", { class: "scheda-titolo" }, [
        el("span", { testo: "Corse importate" }),
        el("span", { class: "nota", testo: String(corse.length) }),
      ]),
      corse.length
        ? el("ul", { class: "al-corse" }, corse.slice(-12).reverse().map((c) => rigaCorsa(c, ridisegna)))
        : el("p", { class: "nota", testo: "Nessuna. Senza corse non c'è né andamento né previsione: importa l'export di Garmin." }),
    ]),
  ]);
}

/*
   LA PREVISIONE PUÒ MANCARE, E QUANDO MANCA VA DETTO.

   Una proiezione costruita su una corsa sola è precisa quanto un sasso
   lanciato, ma sullo schermo ha lo stesso aspetto di una vera — e una cifra
   che sembra solida è quella su cui poi decidi di alzare il ritmo. Quindi o
   c'è materiale, o c'è scritto cosa manca.
*/
function schedaProiezione(pr) {
  if (!pr) {
    return el("section", { class: "scheda" }, [
      el("div", { class: "scheda-titolo" }, [el("span", { testo: "Proiezione sui 5 km" })]),
      el("p", { class: "al-vuoto-cifra", testo: "—" }),
      el("p", { class: "nota", testo:
        "Serve almeno una corsa sopra i 3 km con il tempo, nelle ultime sei settimane. Più indietro non racconta la forma di adesso." }),
    ]);
  }
  const tono = pr.dentro ? "ok" : pr.scarto <= 90 ? "avviso" : "";
  return el("section", { class: "scheda" }, [
    el("div", { class: "scheda-titolo" }, [
      el("span", { testo: "Proiezione sui 5 km" }),
      el("span", { class: "nota", testo: `obiettivo ${mmss(OBIETTIVO.secondi)}` }),
    ]),
    el("div", { class: `al-proiezione ${tono}`.trim() }, [
      el("span", { class: "al-proiezione-cifra", testo: mmss(pr.secondi) }),
      el("span", { class: "al-proiezione-passo", testo: passo(pr.passo) }),
    ]),
    el("p", { class: "nota", testo: pr.dentro
      ? `Sei dentro il muro di ${mmss(OBIETTIVO.secondi)}.`
      : `Mancano ${mmss(pr.scarto)} al sub-20.` }),
    el("p", { class: "nota", testo:
      `Da ${km(pr.da.km)} in ${mmss(pr.da.secondi)} del ${dataBreve(pr.da.data)}, portati sui 5 km con la formula di Riegel.` }),
  ]);
}

function barraSettimana(r, massimo) {
  const riga = el("div", { class: "al-barra" + (r.corrente ? " ora" : "") }, [
    el("span", { class: "al-barra-n", testo: String(r.n) }),
    el("span", { class: "al-barra-binario" }, [
      el("i", { class: "al-barra-piano", style: `width:${(r.previsti / massimo) * 100}%` }),
      el("i", { class: "al-barra-fatto" + (r.sopraIlTetto ? " sopra" : ""), style: `width:${(r.fatti / massimo) * 100}%` }),
    ]),
    el("span", { class: "al-barra-km", testo: r.fatti > 0 ? km(r.fatti).replace(" km", "") : "—" }),
  ]);
  riga.dataset.fase = chiaveFase(r.fase);
  if (r.sopraIlTetto) riga.title = `Oltre il +10%: il tetto era ${km(r.tetto)}`;
  return riga;
}

function rigaCorsa(c, ridisegna) {
  const secKm = c.secondi && c.km ? c.secondi / c.km : 0;
  return el("li", { class: "al-corsa" }, [
    el("span", { class: "al-corsa-data", testo: dataBreve(c.data) }),
    el("span", { class: "al-corsa-tit", testo: c.titolo || "Corsa" }),
    el("span", { class: "al-corsa-km", testo: km(c.km).replace(" km", "") }),
    el("span", { class: "al-corsa-passo", testo: secKm ? passo(secKm) : "—" }),
    el("button", {
      class: "al-corsa-x", type: "button", "aria-label": "Togli questa corsa",
      html: icona("chiudi", 14, 2.4),
      onClick: () => { eliminaCorsa(c.id); ridisegna(); },
    }),
  ]);
}

/* ======================================================== l'importa ===== */

export function apriImport(ridisegna, quale = "corse") {
  const { corpo } = apriFoglio({ titolo: "Importa", alChiudi: ridisegna });
  const zona = el("div", {});
  let scelta = quale;

  const disegna = () => {
    zona.replaceChildren();
    aggiungi(zona, scelta === "corse" ? pannelloCorse(ridisegna) : pannelloAllenamenti(ridisegna));
  };

  aggiungi(corpo, [
    segmenti([["corse", "Corse fatte"], ["allenamenti", "Allenamenti"]], scelta,
      (v) => { scelta = v; disegna(); }),
    zona,
  ]);
  disegna();
}

function pannelloCorse(ridisegna) {
  const area = el("textarea", { class: "campo al-area", rows: 8,
    placeholder: "Incolla qui il CSV esportato da Garmin Connect…" });

  return [
    el("p", { class: "nota", testo:
      "Su Garmin Connect: Attività → Tutte le attività → l'icona di esportazione in alto a destra. Poi apri il file e incolla tutto qui." }),
    area,
    file(".csv,.txt", (t) => { area.value = t; }),
    el("button", {
      class: "btn primario pieno", type: "button", testo: "Importa le corse",
      onClick: () => {
        const { corse, scartate, motivo } = corseDaCSV(area.value);
        if (!corse.length) { avviso(motivo || "Non ho trovato corse.", { tono: "errore" }); return; }
        const { nuove, aggiornate } = salvaCorse(corse);
        chiudiFoglio();
        avviso(`${nuove} nuove, ${aggiornate} già c'erano${scartate ? `, ${scartate} scartate` : ""}.`);
        ridisegna();
      },
    }),
    el("p", { class: "nota", testo:
      "Reimportare lo stesso file non raddoppia niente: una corsa è identificata da data e distanza." }),
  ];
}

function pannelloAllenamenti(ridisegna) {
  const area = el("textarea", { class: "campo al-area", rows: 8,
    placeholder: ESEMPIO_ALLENAMENTI });

  return [
    el("p", { class: "nota", testo:
      "Una riga per slot. Le parole di `slot` sono sei: facile, qualita, lunga, lower, upper, total." }),
    el("pre", { class: "al-esempio", testo: ESEMPIO_ALLENAMENTI }),
    el("button", {
      class: "btn nudo piccolo", type: "button", testo: "Copia il formato da dare alla chat",
      onClick: async () => {
        try {
          await navigator.clipboard.writeText(PROMPT_FITNESS);
          avviso("Copiato: incollalo nella chat di fitness.");
        } catch { avviso("Non riesco a copiare da qui.", { tono: "errore" }); }
      },
    }),
    area,
    file(".csv,.txt", (t) => { area.value = t; }),
    el("button", {
      class: "btn primario pieno", type: "button", testo: "Importa gli allenamenti",
      onClick: () => {
        const { voci, scartate, motivo } = allenamentiDaCSV(area.value);
        if (!voci.length) { avviso(motivo || "Non ho trovato allenamenti.", { tono: "errore" }); return; }
        const scritti = salvaAllenamenti(voci);
        chiudiFoglio();
        avviso(`${scritti} slot aggiornati${scartate ? `, ${scartate} righe scartate` : ""}.`);
        ridisegna();
      },
    }),
    el("p", { class: "nota", testo:
      "Gli allenamenti importati COPRONO il piano, non lo cancellano: da ogni slot puoi rimettere quello originale." }),
  ];
}

/** Un selettore di file che legge il testo e lo passa indietro. */
function file(accetta, alTesto) {
  const input = el("input", { type: "file", accept: accetta, class: "al-file-input" });
  input.addEventListener("change", async () => {
    const f = input.files?.[0];
    if (!f) return;
    try { alTesto(await f.text()); avviso(`Letto ${f.name}.`); }
    catch { avviso("Non riesco a leggere il file.", { tono: "errore" }); }
  });
  return el("label", { class: "btn tenue pieno al-file" }, [
    el("span", { html: icona("importa", 18, 1.9) }),
    el("span", { testo: "…oppure scegli il file" }),
    input,
  ]);
}

export const PROMPT_FITNESS =
  "Dammi il lavoro in CSV con queste colonne esatte, senza altro testo intorno:\n" +
  "settimana,slot,testo,km\n" +
  "`settimana` è un numero da 1 a 13. `slot` è una di queste sei parole: " +
  "facile, qualita, lunga, lower, upper, total. `testo` è l'allenamento in una riga. " +
  "`km` solo per la corsa, con il punto decimale (lascia vuoto per la palestra).";

/* ==================================================== le impostazioni === */

export function vistaImpostazioni() {
  return el("div", {}, [
    schedaHevy(),
    el("section", { class: "scheda" }, [
      el("div", { class: "scheda-titolo" }, [el("span", { testo: "Il blocco" })]),
      el("ul", { class: "lista" }, [
        rigaSecca("Obiettivo", `${OBIETTIVO.nome} · ${OBIETTIVO.passo}`),
        rigaSecca("Inizio", dataBreve(inizioSettimana(1))),
        rigaSecca("Test", dataBreve(giornoTest())),
        rigaSecca("Zone", `${ZONE.z2.fc} · ${ZONE.z3.fc}`),
      ]),
    ]),
    el("section", { class: "scheda" }, [
      el("div", { class: "scheda-titolo" }, [el("span", { testo: "Le regole" })]),
      el("ul", { class: "al-regole" }, REGOLE.map((r) => el("li", { testo: r }))),
      el("p", { class: "nota", testo: VINCOLO }),
    ]),
  ]);
}

const rigaSecca = (etichetta, valore) =>
  el("li", {}, [el("div", { class: "riga" }, [
    el("span", { testo: etichetta }),
    el("span", { class: "valore", testo: valore }),
  ])]);

/*
   LA CHIAVE DI HEVY STA SOLO SU QUESTO DISPOSITIVO, e la riga sotto il campo
   lo dice. Non è una precauzione teorica: tutto il resto di questo modulo
   finisce in atlas-dati, che si legge con il token dentro `config.js` — e
   `config.js` lo serve GitHub Pages, quindi è pubblico. Sincronizzare la
   chiave vorrebbe dire pubblicarla.
*/
function schedaHevy() {
  const zona = el("div", {});

  const disegna = () => {
    zona.replaceChildren();
    const c = hevy.chiave();
    aggiungi(zona, [
      campo({
        etichetta: "Chiave API", tipo: "password", valore: c,
        segnaposto: "incollala qui",
        alCambio: (v) => hevy.scriviChiave(v),
      }),
      el("p", { class: "nota", testo:
        "Hevy → Settings → Developer → Generate API Key. Serve un account Pro." }),
      el("p", { class: "nota", testo:
        "Resta su questo dispositivo e non viene sincronizzata: il repo dei dati si legge con un token che è pubblico, quindi sincronizzarla vorrebbe dire pubblicarla." }),

      el("button", {
        class: "btn tenue pieno", type: "button", testo: "Prova la chiave",
        onClick: async (e) => {
          const b = e.currentTarget;
          b.disabled = true; b.textContent = "Provo…";
          try {
            await hevy.provaChiave();
            const el2 = await hevy.scaricaEsercizi({ forza: true });
            avviso(`Funziona. ${el2.length} esercizi nel catalogo.`);
          } catch (err) {
            avviso(err.message, { tono: "errore", durata: 4200 });
          }
          b.disabled = false; b.textContent = "Prova la chiave";
          disegna();
        },
      }),
      hevy.esercizinoti().length
        ? el("p", { class: "nota", testo: `Catalogo in memoria: ${hevy.esercizinoti().length} esercizi.` })
        : null,
    ]);
  };
  disegna();

  return el("section", { class: "scheda" }, [
    el("div", { class: "scheda-titolo" }, [el("span", { testo: "Hevy" })]),
    zona,
  ]);
}
