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
  proiezione, giorniRimasti, settimaneAlTest, giornoTest, passoSettimana,
  mmss, passo, km,
} from "./calcolo.js";
import { corseDaCSV, allenamentiDaCSV, ESEMPIO_ALLENAMENTI } from "./importa.js";

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
      "aria-label": `Settimana ${p.n}, ${p.fase}`,
      onClick: () => alCambio(p.n),
    }, [
      el("span", { class: "al-sett-n", testo: String(p.n) }),
      el("span", { class: "al-sett-punti" },
        slotDi(p.n).map((s) => el("span", { class: "al-punto" + (fatto(s.id) ? " pieno" : "") }))),
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

function rigaSlot(s, ridisegna) {
  const f = fatto(s.id);
  const g = giornoSlot(s.id);

  const spunta = el("button", {
    class: "al-spunta" + (f ? " fatta" : ""),
    type: "button", "aria-pressed": String(f),
    "aria-label": f ? `Riapri ${s.nome}` : `Segna ${s.nome} come fatto`,
    onClick: (e) => { e.stopPropagation(); alternaSlot(s.id); tocco(f ? 6 : 14); ridisegna(); },
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
  const testoPieno = s.lift
    ? [s.lift, ...(s.accessori || [])].join("\n")
    : s.testo;

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

    esportazioni(s, testoPieno),

    recordSlot(s.id)?.testo && el("button", {
      class: "btn nudo piccolo", type: "button", testo: "Rimetti il piano originale",
      onClick: () => { ripristinaSlot(s.id); chiudiFoglio(); avviso("Rimesso il piano."); ridisegna(); },
    }),
  ]);
}

/*
   «Aggiungi a Garmin» e «Aggiungi a Hevy» oggi copiano, non caricano.
   Vale la pena dirlo sul pulsante invece di scoprirlo dopo: né Garmin
   Connect né Hevy accettano un allenamento da un link o da un file di testo
   — Garmin vuole un `.FIT` costruito byte per byte, Hevy la sua API a
   pagamento. Sono tutti e due fattibili, ma sono un lavoro a sé, e un
   pulsante che promette un caricamento e fa una copia è peggio di un
   pulsante onesto.
*/
function esportazioni(s, testoPieno) {
  const dove = s.genere === "corsa" ? "Garmin" : "Hevy";
  return el("div", { class: "campo-gruppo" }, [
    el("label", { class: "campo-etichetta", testo: "Porta fuori" }),
    el("button", {
      class: "btn tenue pieno", type: "button",
      html: `${icona("scarica", 18)}<span>Copia per ${dove}</span>`,
      onClick: async () => {
        const t = `${s.nome} — settimana ${s.sett}\n${testoPieno}`;
        try {
          await navigator.clipboard.writeText(t);
          avviso(`Copiato. Incollalo in ${dove}.`);
        } catch {
          avviso("Non riesco a copiare da qui.", { tono: "errore" });
        }
      },
    }),
    el("p", { class: "nota", testo: `Copia il testo negli appunti. Il caricamento diretto su ${dove} non c'è ancora.` }),
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
    el("span", { html: icona("nuvola", 18) }),
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
  const pr = progressoSettimana(1);
  return el("div", {}, [
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
