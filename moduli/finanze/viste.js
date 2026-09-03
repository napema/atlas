// moduli/finanze/viste.js — dal risultato del calcolo agli elementi.
//
// Quattro schermate (Riepilogo, Movimenti, Analisi, Setup) e quattro fogli
// (categoria, sottocategoria, dettaglio, inserimento). È la stessa struttura
// dell'app di partenza, funzione per funzione: cambia lo stile, non cosa c'è.
//
// Nessun calcolo qui dentro. Se compare un `reduce` che somma soldi è nel
// posto sbagliato: sta in calcolo.js.

import {
  el, aggiungi, apriFoglio, chiudiFoglio, avviso, celebra, tocco, traccia, lista, riga, vuoto, voceEvento,
  campo, segmenti, pillole, euro, euroRicco, euroGrande, centesimi, nuovoId, plurale,
  tessera, spezzata, gettone, selettore,
  oggiISO, dataUmana, dataBreve, daISO, GIORNI, GIORNI_INIZIALI, MESI,
} from "../../core/ui.js";
import { icona } from "../../core/icone.js";
import {
  stato, movimentiVivi, categoriaPerId, profiloDi, chiaveProfilo, coloreCat, emojiCat, TIPI,
  salvaMovimento, eliminaMovimento, impara, normalizza, scriviMeta, casella,
  CATEGORIE_CASSA, TIPI_POCKET, SOGLIE_PREDEFINITE, pocketPerId, scriviPocket,
  salvaRicorrente, eliminaRicorrente, pendenti, metteInSospeso, togliDaSospeso,
  segnaCheck, segnaScadenzaPagata, ricorrentiVivi, riancoraPocket, segnaRicarica,
  previsti, salvaPrevisto, eliminaPrevisto, segnaPrevistoPagato,
} from "./dati.js";
import {
  statistiche, budgetTotale, cassaSettimana, avvisi, verdetto, proiezione,
  cumulata, movimentiDelMese, importoEffettivo, giorniDelMese,
  nomeMese, autoCategoria, spostaMese, stessoGiornoMesePrima, statisticheDelMese,
  mediaPerGiornoSettimana, ultimiSeiMesi, sottocategorieDelMese, categoriaSuSeiMesi,
  movimentiSottocategoria, contestoMovimento, quadratura,
  cicloDi, spostaCiclo, nomeCiclo, movimentiDelCiclo, categorieDelCiclo, categorieDelMese,
  settimana, giornata, saldoPocket, deltaPocket, pocketConSaldi, inArrivo, comeSpendi, sforamenti,
  alert, spesoOggi, importoRicorrente, prossimaScadenza, esitoCheck, coperturaDi, comeEvento,
} from "./calcolo.js";
import { graficoCumulato, graficoCiambella, graficoBarre } from "./grafici.js";
import { preparaImport, eseguiImport } from "./importa.js";
import { scaricaAnalisi, copiaAnalisi } from "./esporta.js";

const ETICHETTA_TIPO = Object.fromEntries(Object.entries(TIPI).map(([k, v]) => [k, v.nome]));

/* Ciclo o mese solare nella carta delle categorie.

   Sta in una variabile di modulo e non nello stato salvato, di proposito: è
   una preferenza di lettura, non un dato. In `config` si sincronizzerebbe e
   si fonderebbe a blocchi insieme al resto della configurazione, e per una
   cosa che si sceglie con un dito non vale quel rischio. Il prezzo è che
   riparte da «ciclo» a ogni avvio — che è anche la vista giusta. */
let modoCategorie = "ciclo";

/* ==================================================================== HOME
   Una domanda sola: posso spendere oggi, e quanto.

   L'ordine dei blocchi è quello della spec, e non è arbitrario. Prima il
   numero — il saldo vero del Principale, non un budget calcolato. Poi le
   due azioni. Poi cosa sta per uscire, che è la cosa che ribalta la
   risposta al numero: 67 € restano tanti finché non scopri che dopodomani
   esce l'affitto.

   Il tono è quello di un cruscotto: riporta, non sgrida. */

export function vistaHome(mese, grafico, cambia, apriCat, azioni = {}) {
  const oggi = oggiISO();
  const ciclo = cicloDi(oggi);
  const set = settimana(oggi);
  // Trenta giorni e non quattordici: le uscite che contano davvero — affitto,
  // rata, assicurazione — cadono una volta al mese, e con due settimane di
  // finestra si vedono solo quando è tardi per spostare qualcosa.
  const arrivo = inArrivo(30, oggi);
  const av = alert(oggi);

  const fuori = el("div", {});

  aggiungi(fuori, [
    ilNumero(set, azioni),
    bloccoCheck(oggi, () => cambia({})),
    av.length > 0 && blocchoAlert(av),
    blocchoSospese(() => cambia({})),
    inArrivoBlocco(arrivo, () => cambia({})),
    dovSonoISoldi(azioni),
    categorieDelCicloBlocco(ciclo, apriCat),
    comeSpendiBlocco(ciclo),
    sforamentiBlocco(ciclo),
  ]);

  return fuori;
}

/* ------------------------------------------------------- 1. IL NUMERO --- */
/*
   Il saldo del pocket Principale. Denaro reale, non budget residuo.

   Il colore resta neutro fino al 70% consumato: rosso al primo giorno solo
   perché hai fatto la spesa grossa il lunedì è un allarme che insegna a
   ignorare gli allarmi.
*/

function ilNumero(s, azioni) {
  const tono = s.finita ? "male" : s.frazione >= 0.9 ? "male" : s.frazione >= 0.7 ? "avviso" : "";
  const box = el("section", { class: `fi-numero ${tono}`.trim() });

  // PRIMA DI TUTTO: zero perché non è configurato non è zero perché hai
  // finito i soldi. Sono due stati diversi e vanno detti in due modi
  // diversi, altrimenti al primo avvio l'app annuncia un disastro che non
  // c'è e non si capisce cosa fare.
  if (!pocketConSaldi().some((p) => p.saldo)) {
    aggiungi(box, [
      el("div", { class: "micro", testo: "Questa settimana" }),
      el("div", { class: "cifra cifra-xl", testo: "—" }),
      el("p", { class: "fi-numero-nota", testo:
        "I pocket non hanno ancora un saldo, quindi il conto della settimana non può partire." }),
      el("button", {
        class: "btn pieno grande", type: "button", testo: "Imposta i saldi",
        stile: { marginTop: "var(--s5)" },
        onClick: () => azioni.pocketSetup?.(),
      }),
      el("p", { class: "nota-2", stile: { marginTop: "var(--s3)" }, testo:
        "Si copiano da Revolut e da ING una volta sola. Da lì in poi li muovono i movimenti." }),
    ]);
    return box;
  }

  if (s.finita) {
    aggiungi(box, [
      el("div", { class: "micro male", testo: "Questa settimana" }),
      el("div", { class: "cifra cifra-xl negativo", html: euroGrande(0) }),
      el("p", { class: "fi-numero-nota", testo:
        `La settimana è finita · ${plurale(s.giorniRimasti, "giorno", "giorni")} a lunedì` }),
      el("div", { class: "fi-numero-scelta" }, [
        el("button", { class: "btn morbido", type: "button", testo: "Non ricaricare",
          onClick: () => avviso("Va bene così. Lunedì si riparte.") }),
        el("button", { class: "btn", type: "button", testo: "Devo ricaricare",
          onClick: () => azioni.ricarica?.() }),
      ]),
    ]);
    return box;
  }

  aggiungi(box, [
    el("div", { class: "fi-numero-testa" }, [
      el("div", { class: "micro", testo: "Questa settimana" }),
      s.budget > 0 && el("div", { class: `micro ${tono}`,
        testo: `${Math.round(s.frazione * 100)}% consumato` }),
    ]),
    el("div", { class: "cifra cifra-xl", html: euroGrande(s.resta) }),
    el("p", { class: "fi-numero-nota", testo:
      `restano · ${plurale(s.giorniRimasti, "giorno", "giorni")} a lunedì` }),
    s.budget > 0 && el("div", { class: "fi-consumo" }, [
      el("i", { stile: { width: `${Math.round(s.frazione * 100)}%` } }),
    ]),
    zonaOggi(s),
  ]);
  return box;
}

/* La riga di OGGI, sotto il numero della settimana.
 *
 * La settimana da sola si legge troppo tardi: «restano 171,84 € e 4 giorni»
 * è vero anche il giovedì sera dopo aver bruciato metà budget, e il numero
 * settimanale non ha modo di dirtelo prima di domenica. Qui c'è l'unica
 * domanda che si può ancora usare per decidere qualcosa stasera: quanto è
 * uscito oggi, e quanto poteva uscirne.
 *
 * Prende il posto della vecchia riga del ritmo invece di aggiungersi: due
 * numeri «al giorno» sulla stessa scheda, calcolati su basi diverse, sono
 * il modo più rapido per rendere illeggibile la cosa che dovrebbe chiarire.
 *
 * Il colore lo decide `giornata().livello`, non questa funzione: la soglia è
 * una scelta di calcolo e non di disegno, e tenerla lì la rende provabile
 * senza montare niente.
 */
function zonaOggi(s) {
  const g = giornata();

  if (g.quota <= 0) {
    return el("p", { class: "fi-numero-ritmo", testo: "Meglio non spendere altro fino a lunedì" });
  }

  // Due numeri e due parole, non una frase. La frase la leggevi una volta e
  // poi mai più: questa riga la si guarda di sfuggita venti volte al giorno,
  // e di sfuggita si leggono le cifre, non il testo intorno.
  const stat = (valore, etichetta) => el("div", { class: "fi-oggi-stat" }, [
    el("b", { testo: valore }),
    el("span", { testo: etichetta }),
  ]);

  // Oltre i due giorni il delta in euro smette di dire quanto è grosso: «140 €
  // oltre» va pesato contro la quota per capirlo. I giorni no — «3,2 giorni»
  // si capisce senza confronti, ed è quello che è successo davvero.
  const sinistra = g.sforo > 0
    ? (g.livello === "male" || g.livello === "grave"
        ? stat(`${g.giorni.toFixed(1).replace(".", ",")} giorni`, "spesi oggi")
        : stat(`−${euro(g.sforo)}`, "oltre"))
    : stat(euro(g.resta), g.speso === 0 ? "puoi spendere" : "restano oggi");

  return el("div", { class: `fi-oggi ${g.livello}` }, [
    el("div", { class: "fi-oggi-testa" }, [
      el("div", { class: "micro", testo: "Oggi" }),
      el("div", { class: "fi-oggi-cifra", testo: `${euro(g.speso)} di ${euro(g.quota)}` }),
    ]),
    el("div", { class: "fi-consumo" }, [
      el("i", { stile: { width: `${Math.round(g.frazione * 100)}%` } }),
    ]),
    el("div", { class: "fi-oggi-fondo" }, [
      sinistra,
      stat(euro(s.alGiorno), "al giorno"),
    ]),
  ]);
}

/* -------------------------------------------------- 1bis. IL CHECK ------ */
/*
   Il gesto quotidiano di questo modulo.

   Un registro non si rompe perché il calcolo sbaglia: si rompe quando smetti
   di segnare, e smetti di segnare quando nessuno ti chiede se l'hai fatto.
   Il check è quella domanda, e in cambio dà due cose che il resto della
   schermata non dà: un verdetto in due parole e una serie da non spezzare.

   Deve costare trenta secondi. Se diventa un modulo da compilare lo si salta
   il terzo giorno, e un check che si salta è peggio di nessun check perché
   lascia credere di avere una misura che non c'è più.
*/

function bloccoCheck(iso, ridisegna) {
  const c = esitoCheck(iso);

  // Già fatto: una riga bassa, non una carta. Ha già dato quello che doveva
  // dare, e ripetere lo stesso invito a schermo pieno per il resto della
  // giornata insegna a scavalcare quella zona con lo sguardo.
  if (c.fatto) {
    return el("button", {
      class: "fi-check-fatto", type: "button",
      onClick: () => apriCheck(iso, ridisegna),
    }, [
      el("span", { class: "fi-check-spunta", html: icona("fatto", 20) }),
      el("span", { class: "fi-check-fatto-testo" }, [
        el("span", { class: "fi-check-fatto-titolo", testo: "Check di oggi fatto" }),
        el("span", { class: "fi-check-fatto-nota", testo: c.serie > 1
          ? `${plurale(c.serie, "giorno", "giorni")} di fila`
          : "Ci risentiamo domani" }),
      ]),
      el("span", { class: "fi-check-freccia", html: icona("freccia", 16) }),
    ]);
  }

  const box = el("button", {
    class: `fi-check ${c.esito}`, type: "button",
    onClick: () => apriCheck(iso, ridisegna),
  }, [
    el("div", { class: "fi-check-testa" }, [
      el("span", { class: "fi-check-eti", testo: "Check di oggi" }),
      c.serie > 0 && el("span", { class: "fi-check-serie" }, [
        el("span", { class: "emoji", testo: "🔥" }),
        el("span", { testo: String(c.serie) }),
      ]),
    ]),
    el("div", { class: "fi-check-titolo", testo: c.titolo }),
    el("p", { class: "fi-check-sotto", testo: c.sottotitolo }),
    // I quattro pallini: si legge l'esito senza aprire niente, e aprire
    // serve a sapere PERCHÉ. Aprire per sapere COSA è un tocco sprecato.
    el("div", { class: "fi-check-punti" }, c.voci.map((v) =>
      el("span", { class: `fi-check-punto ${v.esito}`, title: v.titolo }))),
    el("span", { class: "fi-check-azione" }, [
      el("span", { testo: "Fai il check" }),
      el("span", { html: icona("freccia", 15) }),
    ]),
  ]);
  return box;
}

/**
 * Il foglio del check: il verdetto, le quattro voci, la conferma.
 *
 * La conferma non è «i conti tornano» — quello lo dice il calcolo da solo e
 * non c'è niente da confermare. È «ho segnato tutto», che è l'unica cosa che
 * il calcolo non può sapere e l'unica che dipende da te.
 */
export function apriCheck(iso, ridisegna) {
  const c = esitoCheck(iso);
  const { corpo, chiudi } = apriFoglio({ titolo: "Check di oggi" });

  aggiungi(corpo, [
    el("div", { class: `fi-verdetto ${c.esito}` }, [
      el("div", { class: "fi-verdetto-titolo", testo: c.titolo }),
      el("p", { class: "fi-verdetto-sotto", testo: c.sottotitolo }),
    ]),

    el("ul", { class: "fi-check-lista" }, c.voci.map((v) => el("li", {
      class: `fi-check-voce ${v.esito}`,
    }, [
      el("span", { class: "fi-check-segno", html: icona(
        v.esito === "ok" ? "fatto" : v.esito === "attenzione" ? "info" : "allarme", 19) }),
      el("div", { class: "fi-check-voce-testo" }, [
        el("span", { class: "fi-check-voce-titolo", testo: v.titolo }),
        el("span", { class: "fi-check-voce-nota", testo: v.testo }),
      ]),
      v.valore && el("span", { class: "fi-check-voce-num num", testo: v.valore }),
    ]))),

    el("p", { class: "fi-check-domanda", testo:
      "Hai segnato tutto quello che è uscito oggi?" }),

    el("div", { class: "fi-check-scelte" }, [
      el("button", {
        class: "btn pieno grande", type: "button",
        testo: c.fatto ? "Sì, e l'ho già confermato" : "Sì, ho segnato tutto",
        onClick: () => {
          segnaCheck(iso);
          chiudi();
          // La serie che si vede è quella DOPO: `esitoCheck` l'ha letta
          // prima della scrittura, e mostrare il numero vecchio sotto una
          // spunta verde è il modo più veloce per farla sembrare rotta.
          const n = c.serie + (c.fatto ? 0 : 1);
          celebra(n > 1 ? `${plurale(n, "giorno", "giorni")} di fila` : "Giornata chiusa");
          ridisegna?.();
        },
      }),
      el("button", {
        class: "btn morbido", type: "button", testo: "Manca un movimento",
        onClick: () => { chiudi(); apriMovimento({ ridisegna, tipo: "out" }); },
      }),
    ]),
  ]);
}

/* ---------------------------------------------------------- 2. ALERT ---- */

function blocchoAlert(lista) {
  return el("div", { class: "fi-avvisi" }, lista.map((a) => {
    const r = el("div", { class: "fi-avviso" }, [
      el("span", { class: "fi-avviso-punto" }),
      el("div", {}, [el("span", { class: "fi-avviso-testo", testo: a.testo })]),
    ]);
    r.style.setProperty("--tinta",
      a.livello === "critico" ? "var(--male)" : a.livello === "warn" ? "var(--avviso)" : "var(--accento)");
    return r;
  }));
}

/* ------------------------------------------------------- 3. IN ARRIVO --- */
/*
   Risponde a «posso permettermi questa cena, o fra tre giorni mi arriva una
   bolletta?». Ogni voce dice da quale pocket uscirà, e in fondo c'è la riga
   di verifica: se il pocket Fisse non copre i ricorrenti dei prossimi
   quattordici giorni, si vede subito. È l'errore che ha spaccato luglio.
*/

function inArrivoBlocco(a, ridisegna) {
  if (!a.voci.length) {
    return el("section", { class: "scheda" }, [
      el("div", { class: "micro", testo: "In arrivo · prossimi 30 giorni" }),
      el("p", { class: "nota", stile: { marginTop: "8px", marginBottom: "0" },
        testo: "Niente in scadenza. I ricorrenti e i pagamenti previsti si configurano in Impostazioni." }),
    ]);
  }

  return el("section", { class: "scheda fi-arrivo" }, [
    el("div", { class: "fi-arrivo-testa" }, [
      el("span", { class: "micro", testo: "In arrivo · prossimi 30 giorni" }),
      el("span", { class: "cifra cifra-s negativo", html: euroGrande(a.totale, { centesimi: false }) }),
    ]),

    // La stessa voce di calendario della home, `voceEvento()` di core/ui.js.
    // Erano due righe diverse per la stessa cosa — qui una griglia con la
    // data in maiuscoletto, in home un calendario — e la seconda si leggeva
    // meglio. Averne due voleva anche dire che fra un mese non si sarebbero
    // più somigliate.
    el("ul", { class: "eventi fi-arrivo-lista" }, a.voci.map((v) =>
      voceEvento({ ...comeEvento(v), azione: () => apriInArrivo(v, ridisegna) }))),

    // La verifica pocket per pocket. Con le sole Fisse bastava finché tutto
    // usciva da lì: una maxi rata sulla riserva non la vedeva nessuno.
    ...Object.entries(a.perPocket).map(([id, p]) =>
      el("div", { class: `fi-arrivo-verifica ${p.coperto ? "ok" : "male"}` }, [
        el("span", { testo: p.coperto
          ? `Coperto da ${nomePocket(id)}`
          : `${nomePocket(id)} non basta` }),
        el("span", { class: "num", testo: p.coperto
          ? `${euro(p.totale, { tondo: true })} / ${euro(p.saldo, { tondo: true })}`
          : `mancano ${euro(p.scoperto, { tondo: true })}` }),
      ])),
  ]);
}

/* ------------------------------------------------ il foglio di «in arrivo»
   Una spesa che non è ancora un movimento.

   Il pulsante è «Paga», e vuol dire una cosa sola: è uscita davvero, adesso.
   Non muove i soldi al posto tuo — la banca l'ha già fatto o la farà — ma
   registra il movimento e toglie la voce dall'elenco. Serve perché una rata
   pagata tre giorni prima restava lì fino al giorno giusto a dire una cosa
   falsa, e l'unico modo di zittirla era registrare la spesa a mano e poi
   ignorare la riga.

   L'importo si può correggere prima di confermare: le stime sbagliano, ed è
   l'unico momento in cui si conosce il numero vero.                        */

export function apriInArrivo(v, ridisegna) {
  const oggi = oggiISO();
  const cop = coperturaDi(v);
  const bozza = { imp: v.importo || 0 };

  const { corpo, chiudi } = apriFoglio({
    titolo: v.nome,
    sinistra: el("button", { class: "btn nudo", type: "button", testo: "Chiudi",
      onClick: () => chiudiFoglio() }),
  });

  const quando = v.fra === 0 ? "oggi" : v.fra === 1 ? "domani"
    : v.fra < 0 ? `${Math.abs(v.fra)} giorni fa` : `fra ${v.fra} giorni`;

  aggiungi(corpo, [
    el("div", { class: "fi-arrivo-eroe" }, [
      el("div", { class: "cifra cifra-l", html: euroGrande(v.importo) }),
      el("p", { class: "fi-arrivo-eroe-nota",
        testo: `${dataUmana(v.quando)} · ${quando}` }),
    ]),

    el("ul", { class: "fi-dett-lista" }, [
      rigaDett("Esce da", nomePocket(v.pocket)),
      rigaDett("Tipo", v.origine === "previsto" ? "Una tantum" : etichettaCadenza(v)),
      v.cat && rigaDett("Categoria", categoriaPerId(v.cat)?.nome || v.cat),
      v.stimato && rigaDett("Importo", "stimato, da correggere quando lo sai"),
      v.nota && rigaDett("Nota", v.nota),
    ].filter(Boolean)),

    // La copertura: la domanda vera davanti a una scadenza non è quanto
    // costa, è se i soldi ci sono nel posto da cui deve uscire.
    el("div", { class: `fi-copertura ${cop.coperto ? "ok" : "male"}` }, [
      el("span", { class: "fi-copertura-segno",
        html: icona(cop.coperto ? "fatto" : "allarme", 20) }),
      el("div", {}, [
        el("div", { class: "fi-copertura-titolo", testo: cop.coperto
          ? "I soldi ci sono" : `Mancano ${euro(cop.manca, { tondo: true })}` }),
        el("div", { class: "fi-copertura-nota",
          testo: `${nomePocket(cop.pocket)}: ${euro(cop.saldo)} disponibili` }),
      ]),
    ]),

    el("div", { class: "campo-gruppo fi-campo-staccato" }, [
      el("label", { class: "campo-etichetta", testo: "Importo pagato" }),
      campo({ tipo: "text", inputmode: "decimal",
        valore: (bozza.imp / 100).toFixed(2).replace(".", ","),
        alCambio: (t) => { bozza.imp = centesimi(t); } }),
      el("p", { class: "nota", testo:
        "Prefilled con l'importo previsto. Correggilo se la cifra vera è un'altra." }),
    ]),

    el("button", {
      class: "btn pieno grande", type: "button", testo: "Paga",
      stile: { marginTop: "var(--s4)" },
      onClick: () => {
        if (bozza.imp <= 0) { avviso("Serve un importo.", { tono: "errore" }); return; }
        paga(v, bozza.imp, oggi);
        chiudi();
        celebra(v.nome.length <= 22 ? v.nome : "Pagato");
        ridisegna?.();
      },
    }),
    el("p", { class: "nota", stile: { marginTop: "var(--s3)" }, testo:
      "Registra il movimento di oggi e toglie la voce da «In arrivo». " +
      (v.origine === "previsto"
        ? "Il pagamento previsto non torna più."
        : "Il ricorrente resta, e riparte dalla prossima scadenza.") }),

    /* LA SECONDA VIA: segnare senza registrare.

       «Paga» fa due cose insieme — il movimento e la spunta — ed è giusto
       che le faccia insieme, perché nel caso normale sono lo stesso gesto.
       Ma le due cose si possono anche scollare: una spunta persa in una
       fusione fa ricomparire in «In arrivo» una scadenza il cui movimento è
       già in archivio, e ripagarla dall'unico pulsante disponibile
       significa contare la stessa uscita due volte.

       Sta staccata e in basso, con l'aria di una riparazione e non di
       un'azione di tutti i giorni: nel caso normale il pulsante giusto
       resta quello sopra. */
    el("div", { class: "fi-gia-pagata" }, [
      el("button", {
        class: "btn nudo", type: "button",
        testo: "Era già pagata, non registrare niente",
        onClick: () => {
          if (v.origine === "previsto") segnaPrevistoPagato(v.id, v.quando);
          else segnaScadenzaPagata(v.id, v.quando);
          chiudi();
          avviso("Segnata come pagata. Nessun movimento aggiunto.");
          ridisegna?.();
        },
      }),
      el("p", { class: "nota", testo:
        "Toglie la voce da «In arrivo» e basta: il saldo non si muove. "
        + "Da usare quando il movimento c'è già in archivio." }),
    ]),
  ]);
}

/* ------------------------------------------- il foglio di un previsto ----
   Quattro campi e nient'altro: nome, quanto, quando, da dove.

   «Da dove» è quello che lo distingue da un promemoria: senza il pocket non
   si può rispondere alla sola domanda che conta prima di una spesa grossa
   già decisa, cioè se quando arriva i soldi ci sono. Il conto lo si vede
   qui sotto mentre lo si compila.                                          */

function apriPrevisto(esistente, ridisegna) {
  const b = esistente
    ? { ...esistente }
    : { id: nuovoId("p"), nome: "", imp: 0, quando: oggiISO(),
        pocket: "ing", cat: "fisse", nota: "", pagatoIl: null };

  const zonaCop = el("div", {});
  const disegnaCop = () => {
    zonaCop.replaceChildren();
    if (!b.imp) return;
    const cop = coperturaDi(b);
    aggiungi(zonaCop, [el("div", { class: `fi-copertura ${cop.coperto ? "ok" : "male"}` }, [
      el("span", { class: "fi-copertura-segno",
        html: icona(cop.coperto ? "fatto" : "allarme", 20) }),
      el("div", {}, [
        el("div", { class: "fi-copertura-titolo", testo: cop.coperto
          ? "I soldi ci sono" : `Mancano ${euro(cop.manca, { tondo: true })}` }),
        el("div", { class: "fi-copertura-nota",
          testo: `${nomePocket(cop.pocket)}: ${euro(cop.saldo)} disponibili` }),
      ]),
    ])]);
  };
  disegnaCop();

  const { corpo } = apriFoglio({
    titolo: esistente ? "Pagamento previsto" : "Nuovo pagamento previsto",
    sinistra: el("button", { class: "btn nudo", type: "button", testo: "Annulla",
      onClick: () => chiudiFoglio() }),
    destra: el("button", {
      class: "btn nudo", type: "button", testo: "Salva",
      onClick: () => {
        if (!b.nome.trim()) { avviso("Serve un nome.", { tono: "errore" }); return; }
        if (!b.imp) { avviso("Serve un importo.", { tono: "errore" }); return; }
        salvaPrevisto({ ...b, nome: b.nome.trim() });
        chiudiFoglio();
        avviso("Salvato.");
      },
    }),
    alChiudi: ridisegna,
  });

  aggiungi(corpo, [
    campo({ etichetta: "Nome", valore: b.nome, segnaposto: "Maxi rata affitto",
      alCambio: (v) => { b.nome = v; } }),

    el("div", { class: "campo-gruppo" }, [
      el("label", { class: "campo-etichetta", testo: "Importo" }),
      campo({ tipo: "text", inputmode: "decimal",
        valore: b.imp ? (b.imp / 100).toFixed(2).replace(".", ",") : "",
        alCambio: (v) => { b.imp = centesimi(v); disegnaCop(); } }),
    ]),

    el("div", { class: "campo-gruppo" }, [
      el("label", { class: "campo-etichetta", testo: "Quando esce" }),
      campo({ tipo: "date", valore: b.quando, alCambio: (v) => { b.quando = v || oggiISO(); } }),
    ]),

    el("div", { class: "campo-gruppo" }, [
      el("label", { class: "campo-etichetta", testo: "Da quale pocket esce" }),
      pillole((stato().pockets || []).map((p) => [p.id, p.nome]), b.pocket,
        (v) => { b.pocket = v; disegnaCop(); }),
    ]),
    zonaCop,

    el("div", { class: "campo-gruppo" }, [
      el("label", { class: "campo-etichetta", testo: "Categoria" }),
      pillole(stato().cats.map((c) => [c.id, c.nome, coloreCat(c.id)]), b.cat,
        (v) => { b.cat = v; }, { unaRiga: true }),
    ]),

    campo({ etichetta: "Nota", valore: b.nota || "", segnaposto: "facoltativa",
      alCambio: (v) => { b.nota = v; } }),

    esistente && el("button", {
      class: "btn distruttivo nudo pieno", type: "button", testo: "Elimina",
      stile: { marginTop: "var(--s6)" },
      onClick: (e) => {
        const btn = e.currentTarget;
        if (btn.dataset.sicuro !== "1") {
          btn.dataset.sicuro = "1";
          btn.textContent = "Tocca di nuovo per eliminare";
          setTimeout(() => { btn.dataset.sicuro = ""; btn.textContent = "Elimina"; }, 3000);
          return;
        }
        eliminaPrevisto(b.id);
        chiudiFoglio();
        avviso("Eliminato.");
      },
    }),
  ]);
}

const rigaDett = (etichetta, valore) => el("li", { class: "fi-dett-riga" }, [
  el("span", { class: "fi-dett-eti", testo: etichetta }),
  el("span", { class: "fi-dett-val", testo: String(valore) }),
]);

/** Il movimento vero + la voce che sparisce. Le due cose insieme, sempre. */
function paga(v, imp, oggi) {
  salvaMovimento({
    id: nuovoId("m"), data: oggi, tipo: "out", imp,
    nota: v.nome, cat: v.cat || "fisse", sub: null,
    pocket: v.pocket || "principale", ecc: false,
  });
  if (v.origine === "previsto") segnaPrevistoPagato(v.id, oggi);
  else segnaScadenzaPagata(v.id, v.quando);
}

const NOMI_POCKET = { principale: "Principale", cassa: "Cassa", fisse: "Fisse", ing: "ING" };
const nomePocket = (id) => NOMI_POCKET[id] || id;

/* --------------------------------------------------- 4. DOVE SONO I SOLDI */

function dovSonoISoldi(azioni) {
  const pk = pocketConSaldi();
  if (!pk.length) return null;
  const soglie = { ...SOGLIE_PREDEFINITE, ...(stato().soglie || {}) };
  const totale = pk.reduce((s, p) => s + p.saldoVero, 0);

  const nota = {
    principale: "spendibile",
    cassa: "parcheggio · non spendere",
    fisse: "addebiti automatici",
    ing: "riserva · non toccare",
  };

  return el("section", { class: "scheda fi-pocket" }, [
    el("div", { class: "micro", testo: "Dove sono i soldi" }),
    el("ul", { class: "fi-pocket-lista" }, pk.map((p) => {
      const sotto = p.id === "ing" && p.saldoVero > 0 && p.saldoVero < soglie.ingMinimo;
      const riga = el("li", { class: "fi-pocket-riga" + (sotto ? " sotto" : "") }, [
        el("span", { class: "fi-pocket-nome", testo: p.nome }),
        el("span", { class: "fi-pocket-saldo num", testo: euro(p.saldoVero) }),
        el("span", { class: "fi-pocket-nota", testo: sotto
          ? "sotto il minimo di sicurezza"
          : (nota[p.id] || TIPI_POCKET[p.tipo]?.nome || "") }),
      ]);
      // ING lo si aggiorna a mano: è l'unico saldo che l'app non può sapere.
      if (p.external) {
        riga.classList.add("tocca");
        riga.addEventListener("click", () => azioni.saldoING?.());
      }
      return riga;
    })),
    el("div", { class: "fi-pocket-totale" }, [
      el("span", { class: "micro", testo: "Totale" }),
      el("span", { class: "cifra cifra-s", html: euroGrande(totale, { centesimi: false }) }),
    ]),
  ]);
}

/* -------------------------------------------------- 5. LE CATEGORIE ----- */
/*
   Solo quelle della cassa settimanale più le due che sforano di più: nove
   barre non si leggono, e le sei che vanno bene rendono invisibili le tre
   che non vanno.
*/

function categorieDelCicloBlocco(ciclo, apriCat) {
  const sezione = el("section", { class: "scheda fi-cat-ciclo" });
  disegnaCategorie(sezione, ciclo, apriCat);
  return sezione.firstChild ? sezione : null;
}

function disegnaCategorie(sezione, ciclo, apriCat) {
  const perCiclo = modoCategorie === "ciclo";
  const mese = oggiISO().slice(0, 7);
  const tutte = (perCiclo ? categorieDelCiclo(ciclo) : categorieDelMese(mese))
    .filter((c) => c.budget > 0 || c.speso > 0);
  const dellaCassa = tutte.filter((c) => CATEGORIE_CASSA.includes(c.id));
  // `speso > 0` e non solo `budget > 0`: ordinando per consumo, a inizio
  // finestra le due «peggiori» sono due categorie a zero, e due righe da
  // «0 € / 185 €» non dicono niente e occupano il posto di quelle che
  // parlano.
  const altre = tutte
    .filter((c) => !CATEGORIE_CASSA.includes(c.id) && c.budget > 0 && c.speso > 0)
    .sort((a, b) => (b.speso / b.budget) - (a.speso / a.budget))
    .slice(0, 2);
  const mostrate = [...dellaCassa, ...altre];
  if (!mostrate.length) { sezione.replaceChildren(); return; }

  const profilo = profiloDi(perCiclo ? ciclo.indice : mese).nome;

  sezione.replaceChildren(...[
    el("div", { class: "fi-arrivo-testa" }, [
      el("span", { class: "micro", testo: "Le categorie" }),
      el("span", { class: "nota", testo: perCiclo ? nomeCiclo(ciclo) : nomeMese(mese) }),
    ]),

    /* DUE FINESTRE, E SI DICE QUALE. La carta diceva «Questo mese» e
       mostrava il ciclo dello stipendio: due nomi per la stessa cosa, con
       la carta sotto che la chiamava «questo ciclo». Chi legge non ha modo
       di sapere quale delle due sta guardando, e il 2 settembre la
       differenza non è un dettaglio — nel ciclo aperto il 21 agosto ci
       sono 656 € di spese di agosto e 12 € di settembre. */
    segmenti([["ciclo", "Ciclo"], ["mese", "Mese solare"]], modoCategorie, (v) => {
      modoCategorie = v;
      disegnaCategorie(sezione, ciclo, apriCat);
    }),

    el("ul", { class: "fi-catlista" }, mostrate.map((c) => {
      const f = c.budget > 0 ? c.speso / c.budget : 0;
      const oltre = c.budget > 0 && c.speso > c.budget;
      const b = el("li", {}, [el("button", { class: "fi-catriga", type: "button",
        onClick: () => apriCat(c.id) }, [
        el("span", { class: "fi-catriga-nome" }, [
          el("span", { class: "fi-catriga-emoji", testo: emojiCat(c.id) }),
          el("span", { testo: c.nome }),
        ]),
        el("span", { class: `fi-catriga-cifra num ${oltre ? "negativo" : ""}`,
          testo: `${euro(c.speso, { tondo: true })} / ${euro(c.budget, { tondo: true })}` }),
        el("span", { class: "fi-catriga-barra" }, [
          el("i", { stile: { width: `${Math.min(100, Math.round(f * 100))}%` } }),
        ]),
      ])]);
      b.querySelector(".fi-catriga").style.setProperty("--tinta",
        oltre ? "var(--male)" : f >= 0.85 ? "var(--avviso)" : coloreCat(c.id));
      return b;
    })),

    // Quale delle due conta, detto una volta e non lasciato indovinare.
    el("p", { class: "nota", testo: perCiclo
      ? `Dal 21, il giorno dello stipendio: è la finestra su cui l'app fa tutti i conti. Budget del profilo ${profilo}.`
      : `Mese solare, per confronto. I conti dell'app seguono il ciclo, non questo. Budget del profilo ${profilo}.` }),
  ]);
}

/* ------------------------------------------------------- 6. COME SPENDI - */

function comeSpendiBlocco(ciclo) {
  const c = comeSpendi(ciclo);
  if (!c.totale) return null;
  const pct = Math.round(c.pctDiscrezionale * 100);

  return el("section", { class: "scheda fi-come" }, [
    el("div", { class: "micro", testo: "Come spendi · questo ciclo" }),
    el("div", { class: "fi-come-barra" }, [
      el("i", { class: "necessario", stile: { width: `${100 - pct}%` } }),
      el("i", { class: "discrezionale", stile: { width: `${pct}%` } }),
    ]),
    el("div", { class: "fi-come-legenda" }, [
      el("span", {}, [
        el("i", { class: "necessario" }),
        el("span", { testo: `Necessario ${euro(c.necessarioTotale, { tondo: true })}` }),
      ]),
      el("span", {}, [
        el("i", { class: "discrezionale" }),
        el("span", { testo: `Discrezionale ${euro(c.discrezionale, { tondo: true })} (${pct}%)` }),
      ]),
    ]),
  ]);
}

/* ------------------------------------------------------ 7. SFORAMENTI --- */
/*
   Sempre visibile, e soprattutto quando è a zero: è l'unica abitudine che è
   cambiata davvero — giugno 440, luglio 619, agosto 0 — e uno zero che si
   vede è quello che la protegge.
*/

function sforamentiBlocco(ciclo) {
  const s = sforamenti(ciclo);
  return el("section", { class: `scheda fi-sfor ${s.n ? "male" : "ok"}` }, [
    el("div", { class: "fi-arrivo-testa" }, [
      el("span", { class: `micro ${s.n ? "avviso" : "ok"}`, testo: "Sforamenti" }),
      el("span", { class: `cifra cifra-s ${s.n ? "attenzione" : "positivo"}`,
        testo: String(s.n) }),
    ]),
    el("p", { class: "nota", stile: { margin: "6px 0 0" }, testo: s.n === 0
      ? "Questo ciclo · nessuna ricarica fuori dal budget."
      : `Questo ciclo · ${euro(s.totale, { tondo: true })} in ${plurale(s.n, "ricarica", "ricariche")}.` }),
    s.ultimo && el("p", { class: "nota-2", stile: { margin: "4px 0 0" },
      testo: `Ultimo: ${dataBreve(s.ultimo.data)} · ${euro(s.ultimo.imp, { tondo: true })}${s.ultimo.nota ? ` — ${s.ultimo.nota}` : ""}` }),
  ]);
}

/* ============================================================== MOVIMENTI */

const FILTRI = [
  ["tutti", "Tutti"], ["out", "Uscite"], ["ecc", "Straordinari"],
  ["in", "Entrate"], ["extra", "Sforamenti"], ["altri", "Altri"],
];

export function vistaMovimenti(mese, filtro, cambia, apriDett) {
  let ms = movimentiDelMese(mese);
  if (filtro === "altri") ms = ms.filter((m) => ["giro", "rimb", "reso"].includes(m.tipo));
  else if (filtro === "ecc") ms = ms.filter((m) => m.tipo === "out" && m.ecc);
  else if (filtro === "out") ms = ms.filter((m) => m.tipo === "out" && !m.ecc);
  else if (filtro !== "tutti") ms = ms.filter((m) => m.tipo === filtro);

  const fuori = el("div", {}, [
    el("div", { class: "fi-filtri" }, [
      pillole(FILTRI, filtro, (v) => cambia({ filtro: v }), { unaRiga: true }),
    ]),
  ]);

  if (!ms.length) {
    fuori.append(vuoto("Nessun movimento", "Con Uscita, Entrata o ⋯ qui sopra ne registri uno."));
    return fuori;
  }

  const perGiorno = new Map();
  for (const m of ms) {
    if (!perGiorno.has(m.data)) perGiorno.set(m.data, []);
    perGiorno.get(m.data).push(m);
  }

  // Ogni giorno è un blocco chiuso — intestazione più righe. Serve perché da
  // scrivania l'elenco va su due colonne, e con intestazione e righe come
  // fratelli sciolti il taglio della colonna capitava in mezzo a un giorno.
  const colonne = el("div", { class: "fi-mov-colonne" });
  for (const [data, movs] of perGiorno) {
    // Il totale del giorno è il NETTO: entrate meno uscite ordinarie. Gli
    // straordinari non ci sono dentro, per lo stesso motivo per cui stanno
    // fuori dal budget.
    const netto = movs.reduce((s, m) =>
      s + (m.tipo === "in" ? m.imp : (m.tipo === "out" && !m.ecc) ? -importoEffettivo(m) : 0), 0);
    colonne.append(el("div", { class: "fi-giorno-blocco" }, [
      el("div", { class: "fi-giorno-testa" }, [
        el("span", { testo: dataUmana(data) }),
        netto !== 0 && el("span", { class: `num ${netto < 0 ? "" : "positivo"}`, testo: euro(netto, { segno: true }) }),
      ]),
      lista(movs.map((m) => rigaMovimento(m, apriDett))),
    ]));
  }
  fuori.append(colonne);
  return fuori;
}

export function rigaMovimento(m, apriDett) {
  const cat = categoriaPerId(m.cat);
  const effettivo = importoEffettivo(m);
  const ridotto = m.tipo === "out" && effettivo !== m.imp;
  const straordinario = m.tipo === "out" && m.ecc;

  let descrizione;
  if (m.tipo === "out") descrizione = (cat?.nome || "—") + (m.sub ? ` · ${m.sub}` : "");
  else if (m.tipo === "in") descrizione = "Entrata";
  else if (m.tipo === "giro") descrizione = "Giroconto tra pocket";
  else if (m.tipo === "extra") descrizione = "Ricarica fuori budget";  // «sforamento» lo dice già la targhetta
  else {
    const origine = movimentiVivi().find((x) => x.id === m.rif);
    descrizione = ETICHETTA_TIPO[m.tipo] + (origine ? ` → ${origine.nota}` : " · non agganciato");
  }

  const segno = { in: "+", out: "−", extra: "+", giro: "", rimb: "−", reso: "−" }[m.tipo] ?? "−";
  // Un quadratino con il simbolo della categoria al posto del pallino: in un
  // elenco di trenta movimenti il simbolo si riconosce prima della nota, e
  // dà alla lista un ritmo che una colonna di testo non ha.
  const tinta = m.tipo === "out" ? coloreCat(m.cat)
    : m.tipo === "in" ? "var(--ok)"
    : m.tipo === "extra" ? "var(--male)" : "var(--grigio)";
  const simbolo = m.tipo === "out" ? emojiCat(m.cat)
    : m.tipo === "in" ? "↓" : m.tipo === "extra" ? "!" : m.tipo === "giro" ? "⇄" : "↩";

  return el("li", {}, [el("button", {
    class: `riga fi-mov${straordinario ? " straordinario" : ""}`, type: "button",
    onClick: () => apriDett(m.id),
  }, [
    gettone(simbolo, tinta),
    el("span", { class: "fi-mov-testo" }, [
      el("span", { class: "fi-mov-nota" }, [
        el("span", { testo: m.nota || ETICHETTA_TIPO[m.tipo] || "—" }),
        straordinario && el("span", { class: "fi-tag ambra", testo: "straordinaria" }),
        m.tipo === "extra" && el("span", { class: "fi-tag rosso", testo: "sforamento" }),
      ]),
      el("span", { class: "nota", testo: descrizione }),
    ]),
    el("span", { class: "fi-mov-cifra" }, [
      el("span", { class: `num ${m.tipo === "in" ? "positivo" : ""}`,
        testo: segno + euro(m.tipo === "out" ? effettivo : m.imp) }),
      ridotto && el("span", { class: "nota", testo: `lordo ${euro(m.imp)}` }),
    ]),
  ])]);
}

/* ================================================================ ANALISI
   Nove pannelli. Sono le domande che uno si fa davvero guardando un mese,
   e ognuna esiste perché una risposta sola non basta a capire se il mese
   sta andando bene. */

export function vistaAnalisi(mese, apriCat, apriSub) {
  const st = statistiche(mese);
  const p = profiloDi(mese);
  const bt = budgetTotale(mese);
  const oggi = oggiISO();
  const eCorrente = oggi.slice(0, 7) === mese;
  const giorni = giorniDelMese(mese);
  const giorno = eCorrente ? Number(oggi.slice(8, 10)) : giorni;
  const uscite = movimentiDelMese(mese).filter((m) => m.tipo === "out");

  if (!uscite.length && st.usciteNette === 0 && st.sforamentiN === 0) {
    return vuoto("Niente da analizzare",
      "Registra le uscite e qui trovi grafici, statistiche e il dettaglio voce per voce.");
  }

  const fuori = el("div", { class: "fi-analisi" });
  const sm = statisticheDelMese(mese);
  const sei = ultimiSeiMesi(mese);
  const passo = eCorrente && bt > 0 ? st.usciteNette - Math.round((bt * giorno) / giorni) : null;

  // 1 — andamento cumulato contro il ritmo del budget
  aggiungi(fuori, [el("section", { class: "scheda fi-larga" }, [
    el("div", { class: "fi-riga-doppia" }, [
      el("span", { class: "micro", testo: "Andamento del mese" }),
      el("span", { class: "nota num", testo: `budget ${euro(bt, { tondo: true })}` }),
    ]),
    graficoCumulato(cumulata(mese), bt, eCorrente ? giorno : null, giorni),
    el("p", { class: "nota", testo: passo === null
      ? `Mese chiuso a ${euro(st.usciteNette)}.`
      : passo > 0
        ? `La retta tratteggiata è il ritmo ideale. Sei ${euro(passo, { tondo: true })} sopra.`
        : `La retta tratteggiata è il ritmo ideale. Sei ${euro(-passo, { tondo: true })} sotto.` }),
  ])]);

  // 2 — ripartizione
  const fette = stato().cats
    .map((c) => ({ etichetta: c.nome, valore: st.perCat[c.id]?.tot || 0, colore: coloreCat(c.id) }))
    .filter((e) => e.valore > 0);
  if (fette.length) {
    aggiungi(fuori, [el("section", { class: "scheda" }, [
      el("div", { class: "micro", testo: "Ripartizione uscite" }),
      graficoCiambella(fette, st.usciteNette),
    ])]);
  }

  // 3 — lo stesso giorno del mese scorso: l'unico paragone onesto a metà mese
  const cfr = stessoGiornoMesePrima(mese);
  if (cfr.alloraSpeso > 0 || st.ordinaria > 0) {
    const meglio = cfr.scarto <= 0;
    aggiungi(fuori, [el("section", { class: "scheda" }, [
      el("div", { class: "micro", testo: "Oggi, un mese fa" }),
      el("div", { class: "fi-confronto" }, [
        el("div", { class: "fi-cfr" }, [
          el("span", { class: "nota", testo: `${MESI[Number(cfr.mesePrima.slice(5, 7)) - 1]} al giorno ${cfr.taglio}` }),
          el("span", { class: "num", testo: euro(cfr.alloraSpeso) }),
        ]),
        el("div", { class: "fi-cfr adesso" }, [
          el("span", { class: "nota", testo: `${MESI[Number(mese.slice(5, 7)) - 1]} al giorno ${cfr.giorno}` }),
          el("span", { class: "num", testo: euro(cfr.adesso) }),
        ]),
      ]),
      // Qui c'era una barra che valeva `adesso / max(allora, adesso)`: senza
      // etichetta e senza scala non diceva niente, ed era piena tutte le
      // volte che stai spendendo di più. I due riquadri e la frase sotto
      // dicono già tutto quello che c'è da dire.
      el("p", { class: "nota", testo: cfr.alloraSpeso === 0
        ? "Nessun termine di paragone: il mese scorso a questo punto non avevi speso nulla."
        : cfr.scarto === 0 ? "Stesso identico ritmo del mese scorso."
        : meglio ? `Stai spendendo ${euro(-cfr.scarto, { tondo: true })} in meno del mese scorso.`
                 : `Stai spendendo ${euro(cfr.scarto, { tondo: true })} in più del mese scorso.` }),
    ])]);
  }

  // 4 — i sei numeri del mese
  aggiungi(fuori, [el("section", { class: "scheda" }, [
    el("div", { class: "micro", testo: "Statistiche del mese" }),
    el("div", { class: "fi-statgrid" }, [
      casella_("Media al giorno", euro(sm.mediaGiorno)),
      casella_("Scontrino medio", sm.nUscite ? euro(sm.scontrinoMedio) : "—"),
      casella_("Giorno più caro", sm.piuCaro ? euro(sm.piuCaro.valore) : "—",
        sm.piuCaro ? `il ${sm.piuCaro.giorno}` : ""),
      casella_("Vs mese scorso", sm.delta === null ? "—" : `${sm.delta > 0 ? "+" : ""}${sm.delta}%`, "",
        sm.delta === null ? "" : sm.delta > 0 ? "negativo" : "positivo"),
      casella_("Movimenti", String(sm.nUscite), "uscite"),
      casella_("Rimborsi recuperati", euro(sm.recuperato)),
    ]),
  ])]);

  // 5 — sei mesi di uscite
  aggiungi(fuori, [el("section", { class: "scheda" }, [
    el("div", { class: "micro", testo: "Uscite nette · 6 mesi" }),
    graficoBarre(sei.usciteNette, sei.etichette, 5, bt || null),
    el("p", { class: "nota", testo: `Linea tratteggiata: budget del profilo ${p.nome} (${euro(bt, { tondo: true })}).` }),
  ])]);

  // 6 — sei mesi di sforamenti: l'unico numero che deve restare a zero
  aggiungi(fuori, [el("section", { class: "scheda" }, [
    el("div", { class: "micro male", testo: "Sforamenti · 6 mesi" }),
    graficoBarre(sei.sforamenti, sei.etichette, 5, null, "var(--rosso)"),
    el("p", { class: "nota", testo: st.sforamentiTot > 0
      ? `Questo mese: ${st.sforamentiN} ricariche per ${euro(st.sforamentiTot)}.`
      : "Questo mese: zero. Così deve restare." }),
  ])]);

  // 7 — dove si concentra il ritmo
  aggiungi(fuori, [el("section", { class: "scheda" }, [
    el("div", { class: "micro", testo: "Media per giorno della settimana" }),
    graficoBarre(mediaPerGiornoSettimana(mese), ["lun", "mar", "mer", "gio", "ven", "sab", "dom"],
      eCorrente ? (daISO(oggi).getDay() + 6) % 7 : -1),
  ])]);

  // 8 — le sottocategorie che pesano
  const top = sottocategorieDelMese(mese).slice(0, 5);
  if (top.length) {
    aggiungi(fuori, [el("section", { class: "scheda" }, [
      el("div", { class: "micro", testo: "Top sottocategorie" }),
      el("div", { class: "fi-sublista" }, top.map((x) => el("button", {
        class: "fi-subriga", type: "button", onClick: () => apriSub(x.catId, x.sub),
      }, [
        el("div", { class: "fi-subriga-testo" }, [
          el("div", { testo: x.sub }),
          el("div", { class: "nota", testo: `${x.categoria} · ${plurale(x.volte, "volta", "volte")}` }),
        ]),
        el("span", { class: "num", testo: euro(x.totale) }),
        el("span", { class: "freccia", html: icona("freccia", 16) }),
      ]))),
    ])]);
  }

  // 9 — categorie contro pocket, tutte
  const totale = st.usciteNette || 1;
  const righe = stato().cats
    .map((c) => ({ c, speso: st.perCat[c.id]?.tot || 0, budget: Math.round((p.b[c.id] || 0) * 100),
                   n: st.perCat[c.id]?.movs.length || 0 }))
    .filter((r) => r.speso > 0 || r.budget > 0)
    .sort((a, b) => b.speso - a.speso);

  const blocco = el("div", { class: "fi-larga" }, [
    el("div", { class: "gruppo-titolo", testo: "Categorie vs pocket — tocca per il dettaglio" }),
  ]);
  for (const r of righe) {
    const frazione = r.budget > 0 ? r.speso / r.budget : (r.speso > 0 ? 1.01 : 0);
    blocco.append(el("button", { class: "scheda fi-cat-riga", type: "button", onClick: () => apriCat(r.c.id) }, [
      el("div", { class: "fi-cat-testa" }, [
        el("span", { class: "fi-cat-nome" }, [
          el("i", { class: "fi-punto", stile: { background: coloreCat(r.c.id) } }),
          el("span", { testo: r.c.nome }),
        ]),
        el("span", { class: "num", testo: euro(r.speso) }),
      ]),
      traccia(Math.min(1, frazione), frazione >= 1 ? "oltre" : frazione >= 0.9 ? "avviso" : ""),
      el("div", { class: "nota", testo:
        `${r.budget > 0 ? `${Math.round(frazione * 100)}% di ${euro(r.budget, { tondo: true })} di pocket` : "senza budget nel profilo"}` +
        ` · ${Math.round((r.speso / totale) * 100)}% delle uscite · ${r.n} mov.` }),
    ]));
  }
  fuori.append(blocco);

  if (st.orfani > 0) {
    aggiungi(fuori, [el("div", { class: "fi-avviso ambra fi-larga" }, [
      el("span", { class: "fi-avviso-icona", html: icona("info", 16) }),
      el("div", {}, [
        el("b", { testo: `Rimborsi non agganciati: ${euro(st.orfani)}` }),
        el("span", { class: "nota", testo: "Riducono il totale ma non sai da quale spesa vengono. Aprili e collegali." }),
      ]),
    ])]);
  }

  return fuori;
}

function casella_(chiave, valore, sotto = "", tono = "") {
  return el("div", { class: "fi-statbox" }, [
    el("div", { class: "nota", testo: chiave }),
    el("div", { class: `num fi-statval ${tono}` }, [
      el("span", { testo: valore }),
      sotto && el("small", { testo: ` ${sotto}` }),
    ]),
  ]);
}

/* ================================================================== FOGLI */

/** Il dettaglio di una categoria: sei mesi, sottocategorie, movimenti. */
export function apriCategoria(mese, catId, ridisegna, apriSub, apriDett) {
  const c = categoriaPerId(catId);
  if (!c) return;
  const st = statistiche(mese);
  const d = st.perCat[catId];
  const budget = Math.round((profiloDi(mese).b[catId] || 0) * 100);
  const medio = d.movs.length ? Math.round(d.tot / d.movs.length) : 0;
  const sei = categoriaSuSeiMesi(mese, catId);
  const sub = Object.entries(d.sub).sort((a, b) => b[1].tot - a[1].tot);

  const { corpo } = apriFoglio({
    titolo: c.nome,
    sinistra: el("button", { class: "btn nudo", type: "button", testo: "Chiudi", onClick: () => chiudiFoglio() }),
    alChiudi: ridisegna,
  });

  aggiungi(corpo, [
    el("div", { class: "fi-statgrid tre" }, [
      casella_("Questo mese", euro(d.tot)),
      casella_("Pocket", budget ? euro(budget, { tondo: true }) : "—"),
      casella_("Scontrino medio", d.movs.length ? euro(medio) : "—"),
    ]),
    budget > 0 && traccia(Math.min(1, d.tot / budget), d.tot >= budget ? "oltre" : d.tot >= budget * 0.9 ? "avviso" : ""),
    budget > 0 && el("p", { class: "nota", testo:
      `${Math.round((d.tot / budget) * 100)}% del pocket · ${d.tot <= budget ? `restano ${euro(budget - d.tot)}` : `sforato di ${euro(d.tot - budget)}`}` }),

    graficoBarre(sei.valori, sei.etichette, 5, budget || null, coloreCat(catId)),

    sub.length > 0 && el("div", { class: "gruppo-titolo", testo: "Sottocategorie" }),
    sub.length > 0 && el("div", { class: "fi-sublista" }, sub.map(([nome, v]) => el("button", {
      class: "fi-subriga", type: "button", onClick: () => { chiudiFoglio(); setTimeout(() => apriSub(catId, nome), 200); },
    }, [
      el("div", { class: "fi-subriga-testo" }, [
        el("div", { testo: nome }),
        el("div", { class: "nota", testo: `${plurale(v.n, "volta", "volte")} · medio ${euro(Math.round(v.tot / v.n))}` }),
      ]),
      el("span", { class: "num", testo: euro(v.tot) }),
      el("span", { class: "freccia", html: icona("freccia", 16) }),
    ]))),

    el("div", { class: "gruppo-titolo", testo: "Movimenti del mese" }),
    d.movs.length
      ? lista(d.movs.map((m) => rigaMovimento(m, (id) => { chiudiFoglio(); setTimeout(() => apriDett(id), 200); })))
      : el("p", { class: "nota", testo: "Nessun movimento questo mese." }),
  ]);
}

/** Il drill-down su una sottocategoria: cosa ci sta sotto, anche fuori dal mese. */
export function apriSottocategoria(mese, catId, sub, ridisegna, apriDett) {
  const c = categoriaPerId(catId);
  if (!c) return;
  const tutti = movimentiSottocategoria(catId, sub);
  const delMese = tutti.filter((m) => m.data.slice(0, 7) === mese);
  const prima = tutti.filter((m) => m.data.slice(0, 7) !== mese).slice(0, 12);
  const totMese = delMese.reduce((s, m) => s + importoEffettivo(m), 0);
  const totTutti = tutti.reduce((s, m) => s + importoEffettivo(m), 0);

  const { corpo } = apriFoglio({
    titolo: sub,
    sinistra: el("button", { class: "btn nudo", type: "button", testo: "Chiudi", onClick: () => chiudiFoglio() }),
    alChiudi: ridisegna,
  });

  const vaiAlDettaglio = (id) => { chiudiFoglio(); setTimeout(() => apriDett(id), 200); };

  aggiungi(corpo, [
    el("p", { class: "nota", testo: c.nome }),
    el("div", { class: "fi-statgrid tre" }, [
      casella_("Questo mese", euro(totMese)),
      casella_("Volte", String(delMese.length)),
      casella_("Medio", delMese.length ? euro(Math.round(totMese / delMese.length)) : "—"),
    ]),
    el("div", { class: "gruppo-titolo", testo: `Movimenti di ${MESI[Number(mese.slice(5, 7)) - 1]}` }),
    delMese.length
      ? lista(delMese.map((m) => rigaMovimento(m, vaiAlDettaglio)))
      : el("p", { class: "nota", testo: "Nessun movimento questo mese." }),
    prima.length > 0 && el("div", { class: "gruppo-titolo", testo: "Prima di questo mese" }),
    prima.length > 0 && lista(prima.map((m) => rigaMovimento(m, vaiAlDettaglio))),
    prima.length > 0 && el("p", { class: "nota",
      testo: `In archivio: ${tutti.length} movimenti per ${euro(totTutti)} in totale.` }),
  ]);
}

/**
 * Il dettaglio di un movimento.
 *
 * Non è solo "quanto e quando": è il contesto. Sapere che quella cena costa
 * il 40% più della media delle cene è l'informazione che cambia il
 * comportamento; il numero da solo no.
 */
export function apriDettaglio(id, ridisegna, apriDett) {
  const m = movimentiVivi().find((x) => x.id === id);
  if (!m) return;
  const c = categoriaPerId(m.cat);
  const effettivo = importoEffettivo(m);
  const ctx = contestoMovimento(m);
  const d = daISO(m.data);

  const natura = m.tipo === "out"
    ? (m.ecc ? "Straordinaria · fuori budget" : "Ordinaria · dentro il budget")
    : m.tipo === "extra" ? "Sforamento del sistema pocket"
    : m.tipo === "giro" ? "Giroconto · neutro sul budget"
    : ETICHETTA_TIPO[m.tipo];

  const segno = m.tipo === "in" ? "+" : m.tipo === "giro" ? "" : "−";
  const tono = m.tipo === "in" ? "positivo" : m.tipo === "extra" ? "negativo" : m.ecc ? "attenzione" : "";

  const { corpo } = apriFoglio({
    titolo: m.tipo === "out" ? "Uscita" : ETICHETTA_TIPO[m.tipo],
    sinistra: el("button", { class: "btn nudo", type: "button", testo: "Chiudi", onClick: () => chiudiFoglio() }),
    destra: el("button", { class: "btn nudo", type: "button", testo: "Modifica",
      onClick: () => { chiudiFoglio(); setTimeout(() => apriMovimento({ movimento: m, ridisegna }), 200); } }),
    alChiudi: ridisegna,
  });

  aggiungi(corpo, [
    el("div", { class: "fi-dett-testa" }, [
      el("div", { class: `cifra fi-dett-cifra ${tono}`, html: segno + euroRicco(effettivo) }),
      effettivo !== m.imp && el("div", { class: "nota", testo: `lordo ${euro(m.imp)} · rimborsato ${euro(m.imp - effettivo)}` }),
      el("div", { class: "fi-dett-nota", testo: m.nota || ETICHETTA_TIPO[m.tipo] }),
      c && el("span", { class: "fi-badge-cat" }, [
        el("i", { class: "fi-punto", stile: { background: coloreCat(m.cat) } }),
        el("span", { testo: c.nome + (m.sub ? ` · ${m.sub}` : "") }),
      ]),
    ]),

    lista([
      riga({ etichetta: "Data", valore: `${GIORNI[(d.getDay() + 6) % 7]} ${d.getDate()} ${MESI[d.getMonth()]} ${d.getFullYear()}` }),
      riga({ etichetta: "Natura", valore: natura }),
      m.tipo === "out" && ctx.simili > 1 && riga({
        etichetta: `Media ${m.sub || c?.nome || "categoria"}`,
        valore: euro(ctx.media) + (ctx.scostamento !== null && Math.abs(ctx.scostamento) >= 5
          ? ` (${ctx.scostamento > 0 ? "+" : ""}${ctx.scostamento}%)` : ""),
        tono: ctx.scostamento > 0 ? "negativo" : "positivo",
      }),
      m.tipo === "out" && ctx.quotaSulMese !== null && riga({
        etichetta: "Peso sul mese", valore: `${ctx.quotaSulMese}% della spesa ordinaria` }),
      m.tipo === "out" && ctx.simili > 0 && riga({
        etichetta: "Frequenza", valore: `${plurale(ctx.simili, "volta", "volte")} in archivio` }),
      ctx.rimborsi.length > 0 && riga({
        etichetta: "Rimborsi",
        valore: `${ctx.rimborsi.length} · ${euro(ctx.rimborsi.reduce((s, x) => s + x.imp, 0))}` }),
      m.rif && riga({
        etichetta: "Agganciato a",
        valore: movimentiVivi().find((x) => x.id === m.rif)?.nota || "spesa non trovata" }),
    ].filter(Boolean)),

    ctx.rimborsi.length > 0 && el("div", { class: "gruppo-titolo", testo: "Rimborsi agganciati" }),
    ctx.rimborsi.length > 0 && lista(ctx.rimborsi.map((r) =>
      rigaMovimento(r, (x) => { chiudiFoglio(); setTimeout(() => apriDett(x), 200); }))),

    el("button", {
      class: "btn distruttivo pieno", type: "button", testo: "Elimina",
      style: "margin-top:var(--s5)",
      onClick: (e) => {
        const b = e.currentTarget;
        if (b.dataset.sicuro !== "1") {
          b.dataset.sicuro = "1";
          b.textContent = "Tocca di nuovo per eliminare";
          setTimeout(() => { b.dataset.sicuro = ""; b.textContent = "Elimina"; }, 3000);
          return;
        }
        eliminaMovimento(m.id);
        chiudiFoglio();
        avviso("Eliminato.");
        ridisegna();
      },
    }),
  ]);
}

/* ------------------------------------------- il foglio di inserimento --
   È la schermata che si apre dieci volte al giorno, quindi è quella che
   deve costare meno gesti: importo, nota, e la categoria si propone da sé. */

export function apriMovimento({ movimento = null, ridisegna, tipo = "out" } = {}) {
  const nuovo = !movimento;
  const b = movimento
    ? { ...movimento }
    : { id: nuovoId("m"), tipo, imp: 0, nota: "", cat: null, sub: null, rif: null, ecc: false,
        data: oggiISO(),
        // Il Principale è l'unico conto da cui si spende: è il valore giusto
        // per default, e non va chiesto ogni volta.
        pocket: tipo === "in" ? "ing" : "principale", pocketTo: null, rimborsoDi: null };

  let testoImporto = b.imp ? (b.imp / 100).toFixed(2).replace(".", ",") : "";
  let categoriaManuale = Boolean(movimento?.cat);
  let assegnataAuto = false;

  const { corpo } = apriFoglio({
    titolo: nuovo ? "Nuovo movimento" : "Modifica",
    sinistra: el("button", { class: "btn nudo", type: "button", testo: "Annulla", onClick: () => chiudiFoglio() }),
    alChiudi: ridisegna,
  });

  /*
     L'IMPORTO SI SCRIVE IN DUE MODI, ed è un `input` vero, non un `div`.
     Su iPhone il tastierino a schermo è più veloce della tastiera di
     sistema e non fa saltare la vista; su una tastiera fisica il tastierino
     è la cosa più lenta possibile — si scrive «46,50» in mezzo secondo e
     invece bisognava cliccare cinque bottoni.

     `inputmode="decimal"` fa comparire il tastierino numerico di iOS quando
     il campo prende il fuoco, e `readOnly` su touch impedisce che si apra
     sopra al nostro. Il tastierino disegnato resta, e i due modi scrivono
     nella stessa variabile.
  */
  const daTastiera = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const schermo = el("input", {
    class: "fi-importo cifra",
    type: "text",
    inputmode: "decimal",
    "aria-label": "Importo",
    placeholder: "0,00",
    readonly: !daTastiera,
  });
  const zonaCat = el("div", { class: "campo-gruppo" });
  const zonaSub = el("div", { class: "campo-gruppo" });
  const zonaRif = el("div", { class: "campo-gruppo" });
  const zonaSalva = el("div", {});

  const aggiornaImporto = () => {
    if (schermo.value !== testoImporto) schermo.value = testoImporto;
    schermo.classList.toggle("vuoto", !testoImporto);
    disegnaSalva();
  };

  // Da tastiera si accettano solo cifre e una virgola sola, e il punto del
  // tastierino numerico diventa virgola: è la sequenza che le dita fanno da
  // sole su un numero decimale.
  schermo.addEventListener("input", () => {
    const pulito = schermo.value
      .replace(/\./g, ",")
      .replace(/[^\d,]/g, "")
      .replace(/,(?=.*,)/g, "")
      .replace(/^(\d*,\d{0,2}).*$/, "$1");
    testoImporto = pulito;
    schermo.value = pulito;
    schermo.classList.toggle("vuoto", !pulito);
    disegnaSalva();
  });
  // Invio salva, se c'è abbastanza per salvare: su desktop è il gesto che ci
  // si aspetta dopo aver digitato una cifra.
  schermo.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && valido()) { e.preventDefault(); salva(false); }
  });

  const disegnaSub = () => {
    zonaSub.replaceChildren();
    const c = categoriaPerId(b.cat);
    if (b.tipo !== "out" || !c?.sub?.length) return;
    zonaSub.append(el("label", { class: "campo-etichetta", testo: "Sottocategoria" }));
    zonaSub.append(pillole(c.sub.map((s) => [s, s]), b.sub, (v) => {
      b.sub = b.sub === v ? null : v;
      categoriaManuale = true;
    }));
  };

  const disegnaCat = () => {
    zonaCat.replaceChildren();
    if (b.tipo !== "out") return;
    zonaCat.append(el("label", { class: "campo-etichetta" }, [
      el("span", { testo: "Categoria" }),
      assegnataAuto && el("span", { class: "fi-suggerita", testo: " · assegnata in automatico" }),
    ]));
    zonaCat.append(pillole(
      stato().cats.map((c) => [c.id, c.nome, coloreCat(c.id)]),
      b.cat,
      (v) => { b.cat = v; b.sub = null; assegnataAuto = false; categoriaManuale = true; disegnaCat(); disegnaSub(); disegnaSalva(); },
      { unaRiga: true }
    ));
    disegnaSub();
  };

  /** Le uscite recenti da agganciare a un rimborso o a un reso. */
  const disegnaRif = () => {
    zonaRif.replaceChildren();
    if (b.tipo !== "rimb" && b.tipo !== "reso") return;
    const recenti = movimentiVivi()
      .filter((m) => m.tipo === "out")
      .sort((a, c) => c.data.localeCompare(a.data) || (c.ts || 0) - (a.ts || 0))
      .slice(0, 12);
    zonaRif.append(el("label", { class: "campo-etichetta", testo: "Aggancia alla spesa" }));
    if (!recenti.length) {
      zonaRif.append(el("p", { class: "nota", testo: "Nessuna spesa recente da agganciare." }));
      return;
    }
    zonaRif.append(pillole(
      recenti.map((m) => [m.id, `${m.nota} · ${euro(m.imp)}`]),
      b.rif,
      (v) => { b.rif = b.rif === v ? null : v; },
      { unaRiga: true }
    ));
    zonaRif.append(el("p", { class: "nota",
      testo: "Senza aggancio il rimborso abbassa il totale ma non si sa da quale spesa venga." }));
  };

  const valido = () => {
    if (centesimi(testoImporto) === null) return false;
    if (b.tipo !== "giro" && b.tipo !== "extra" && !b.nota.trim()) return false;
    if (b.tipo === "out" && !b.cat) return false;
    return Boolean(b.data);
  };

  const scrivi = (imp, eccezionale) => {
    salvaMovimento({ ...b, imp, ecc: b.tipo === "out" ? Boolean(eccezionale) : false });
    // Si impara solo da una scelta esplicita: memorizzare quello che ha
    // indovinato l'app la farebbe convergere sui propri errori.
    if (categoriaManuale && b.nota && b.cat) impara(b.nota, b.cat, b.sub);
    chiudiFoglio();
    tocco(12);
    avviso(nuovo ? "Registrato." : "Aggiornato.");
    ridisegna();
  };

  const salva = (eccezionale) => {
    const imp = centesimi(testoImporto);
    if (!imp) { avviso("Manca l'importo.", { tono: "errore" }); return; }
    if (b.tipo === "out" && !b.cat) { avviso("Manca la categoria.", { tono: "errore" }); return; }

    // FRIZIONE SULLE SPESE GROSSE. Sopra la soglia si passa da una domanda:
    // le uscite sopra i 50 € sono cinque in due mesi e pesano più di tutte
    // le colazioni sommate, quindi è lì che tre secondi di attesa valgono
    // qualcosa — e su un caffè non devono esserci.
    const soglia = { ...SOGLIE_PREDEFINITE, ...(stato().soglie || {}) }.spesaGrossa;
    if (nuovo && b.tipo === "out" && imp >= soglia) {
      chiediSeCiDormi(imp, b, () => scrivi(imp, eccezionale), ridisegna);
      return;
    }
    scrivi(imp, eccezionale);
  };

  // Ordinaria o straordinaria è la domanda che tiene in piedi tutto il
  // calcolo: si chiede al momento del salvataggio invece di nasconderla in
  // una casella che nessuno spunta.
  const disegnaSalva = () => {
    zonaSalva.replaceChildren();
    const ok = valido();
    if (b.tipo === "out") {
      zonaSalva.append(el("div", { class: "fi-doppio-salva" }, [
        el("button", { class: "btn pieno", type: "button", disabled: !ok, onClick: () => salva(false) }, [
          el("b", { testo: "Ordinaria" }), el("small", { testo: "capita spesso" }),
        ]),
        el("button", { class: "btn tenue pieno", type: "button", disabled: !ok, onClick: () => salva(true) }, [
          el("b", { testo: "Straordinaria" }), el("small", { testo: "una volta tanto" }),
        ]),
      ]));
    } else {
      zonaSalva.append(el("button", { class: "btn pieno", type: "button", testo: "Salva",
        disabled: !ok, style: "margin-top:var(--s4)", onClick: () => salva(false) }));
    }
  };

  const SEGNAPOSTO = {
    out: "Cosa hai pagato?", in: "Da dove arriva?", rimb: "Chi ti ha rimborsato?",
    reso: "Cosa hai reso?", giro: "Da quale a quale pocket?", extra: "Da quale carta?",
  };
  const campoNota = el("input", { class: "campo", type: "text", value: b.nota,
    placeholder: SEGNAPOSTO[b.tipo], autocomplete: "off" });

  campoNota.addEventListener("input", () => {
    b.nota = campoNota.value;
    disegnaSalva();
    // La proposta si aggiorna finché l'utente non ha scelto a mano: cambiare
    // una scelta esplicita mentre continua a scrivere è il modo più veloce
    // per far odiare l'autocategorizzazione.
    if (b.tipo !== "out" || !nuovo || categoriaManuale) return;
    const indovinata = autoCategoria(campoNota.value, { normalizza, categoriaPerId });
    if (indovinata && (indovinata.cat !== b.cat || indovinata.sub !== b.sub)) {
      b.cat = indovinata.cat; b.sub = indovinata.sub; assegnataAuto = true;
      disegnaCat(); disegnaSalva();
    } else if (!indovinata && assegnataAuto) {
      b.cat = null; b.sub = null; assegnataAuto = false;
      disegnaCat(); disegnaSalva();
    }
  });

  /* ------------------------------------------------- da quale pocket ----
     Un tap, non un menù nascosto.

     Prima era fisso — Principale per le uscite, ING per le entrate — e non
     si poteva cambiare: una spesa pagata dalla carta delle Fisse finiva
     comunque a scalare il Principale, e i due saldi divergevano dalla
     realtà senza che niente lo dicesse. Adesso si sceglie, e il valore
     predefinito resta quello giusto nove volte su dieci.

     Per travasi e sforamenti i pocket sono due, e servono tutti e due:
     senza la destinazione i soldi spariscono da una parte e non compaiono
     dall'altra.                                                          */
  const zonaPocket = el("div", {});
  const disegnaPocket = () => {
    zonaPocket.replaceChildren();
    const elenco = (stato().pockets || []).map((p) => [p.id, p.nome]);
    const doppio = b.tipo === "giro" || b.tipo === "extra";

    aggiungi(zonaPocket, [
      el("div", { class: "campo-gruppo" }, [
        el("label", { class: "campo-etichetta",
          testo: doppio ? "Da quale pocket esce" : b.tipo === "in" ? "Su quale pocket entra" : "Da quale pocket" }),
        pillole(elenco, b.pocket || "principale",
          (v) => { b.pocket = v; disegnaPocket(); disegnaSalva(); }, { unaRiga: true }),
      ]),
      doppio && el("div", { class: "campo-gruppo" }, [
        el("label", { class: "campo-etichetta", testo: "E su quale entra" }),
        pillole(elenco.filter(([id]) => id !== b.pocket), b.pocketTo || "principale",
          (v) => { b.pocketTo = v; disegnaSalva(); }, { unaRiga: true }),
      ]),
    ]);
  };

  const cambiaTipo = (v) => {
    b.tipo = v; b.cat = null; b.sub = null; b.rif = null;
    assegnataAuto = false; categoriaManuale = false;
    // Il pocket predefinito cambia col tipo: un'entrata arriva su ING, uno
    // sforamento esce da ING per finire sul Principale, tutto il resto si
    // spende dal Principale.
    if (v === "in") { b.pocket = "ing"; b.pocketTo = null; }
    else if (v === "extra") { b.pocket = "ing"; b.pocketTo = "principale"; }
    else if (v === "giro") { b.pocket = "cassa"; b.pocketTo = "principale"; }
    else { b.pocket = "principale"; b.pocketTo = null; }
    campoNota.placeholder = SEGNAPOSTO[v];
    disegnaCat(); disegnaRif(); disegnaPocket(); disegnaSalva();
  };

  disegnaCat();
  disegnaRif();
  aggiornaImporto();

  aggiungi(corpo, [
    el("div", { class: "campo-gruppo" }, [
      pillole(Object.entries(TIPI).map(([k, t]) => [k, t.nome]), b.tipo, cambiaTipo, { unaRiga: true }),
    ]),

    el("div", { class: "fi-importo-riga" }, [schermo]),
    // Il tastierino resta, ma da scrivania si fa da parte: è più lento della
    // tastiera che hai già sotto le dita.
    !daTastiera && tastierino((tasto) => {
      if (tasto === "←") testoImporto = testoImporto.slice(0, -1);
      else if (tasto === ",") { if (!testoImporto.includes(",")) testoImporto += testoImporto ? "," : "0,"; }
      else {
        const [, dec] = testoImporto.split(",");
        if (dec != null && dec.length >= 2) return;
        if (testoImporto.replace(",", "").length >= 8) return;
        testoImporto += tasto;
      }
      tocco(5);
      aggiornaImporto();
    }),

    el("div", { class: "campo-gruppo" }, [
      el("label", { class: "campo-etichetta", testo: "Nota" }),
      campoNota,
    ]),
    zonaCat,
    zonaSub,
    zonaRif,
    zonaPocket,
    campo({ etichetta: "Data", tipo: "date", valore: b.data,
      alCambio: (v) => { if (v) { b.data = v; disegnaSalva(); } } }),
    zonaSalva,
  ]);

  disegnaPocket();
}

/** Il tastierino. Su iPhone è più veloce e non fa saltare la vista. */
function tastierino(premi) {
  const g = el("div", { class: "fi-tastierino" });
  for (const t of ["1", "2", "3", "4", "5", "6", "7", "8", "9", ",", "0", "←"]) {
    g.append(el("button", {
      class: "fi-tasto" + (t === "←" ? " fi-tasto-canc" : ""),
      type: "button",
      testo: t === "←" ? undefined : t,
      html: t === "←" ? icona("indietro", 22) : undefined,
      "aria-label": t === "←" ? "Cancella" : t,
      onClick: () => premi(t),
    }));
  }
  return g;
}

/* ================================================================== SETUP */

export function vistaSetup(mese, ridisegna) {
  const s = stato();
  const chiave = chiaveProfilo(mese);
  const p = profiloDi(mese);
  const fuori = el("div", {});

  // --- pocket per categoria, con la spunta "entra nella cassa"
  const quadra = el("div", { class: "fi-quadra" });
  const disegnaQuadra = () => {
    const q = quadratura(mese);
    quadra.className = `fi-quadra ${q.differenza < 0 ? "ko" : "ok"}`;
    quadra.replaceChildren(
      el("div", { class: "fi-riga-doppia" }, [
        el("span", { testo: q.differenza < 0 ? "Sfori le entrate di" : "Ti resta" }),
        el("b", { class: "num", testo: `${Math.abs(q.differenza).toLocaleString("it-IT")} €` }),
      ]),
      el("div", { class: "nota", testo: q.differenza < 0
        ? "Il budget non quadra: taglia qualche pocket finché non rientri."
        : q.differenza === 0 ? "Budget allocato al centesimo."
        : "Margine non allocato: puoi destinarlo a risparmio o accantonamenti." }),
    );
  };
  disegnaQuadra();

  const listaBudget = el("ul", { class: "lista" });
  for (const c of s.cats) {
    listaBudget.append(el("li", {}, [el("div", { class: "riga fi-setrow" }, [
      el("i", { class: "fi-punto", stile: { background: coloreCat(c.id) } }),
      el("span", { class: "fi-setnome", testo: c.nome }),
      el("label", { class: "fi-cassa-check" }, [
        el("input", {
          type: "checkbox", checked: p.cassaCats.includes(c.id),
          onChange: (e) => scriviMeta((st_) => {
            const cc = new Set(st_.profili[chiave].cassaCats);
            e.target.checked ? cc.add(c.id) : cc.delete(c.id);
            st_.profili[chiave].cassaCats = [...cc];
          }),
        }),
        el("span", { testo: "cassa" }),
      ]),
      el("input", {
        class: "campo fi-campo-corto", type: "number", inputmode: "numeric",
        value: String(p.b[c.id] ?? 0), min: "0",
        onChange: (e) => {
          scriviMeta((st_) => { st_.profili[chiave].b[c.id] = Math.max(0, Number(e.target.value) || 0); });
          disegnaQuadra();
        },
      }),
    ])]));
  }

  aggiungi(fuori, [
    el("div", { class: "gruppo-titolo", testo: `Profilo ${p.nome} — pocket mensili (€)` }),
    listaBudget,
    lista([
      el("li", {}, [el("div", { class: "riga" }, [
        el("span", { testo: "Entrate mensili attese" }),
        el("input", { class: "campo fi-campo-corto", type: "number", inputmode: "numeric",
          value: String(s.config.entrate),
          onChange: (e) => { scriviMeta((st_) => { st_.config.entrate = Math.max(0, Number(e.target.value) || 0); }); disegnaQuadra(); } }),
      ])]),
    ]),
    quadra,

    el("div", { class: "gruppo-titolo", testo: "Cassa settimanale" }),
    lista([
      el("li", {}, [el("div", { class: "riga" }, [
        el("span", { testo: "Tetto settimanale" }),
        el("input", { class: "campo fi-campo-corto", type: "number", inputmode: "numeric",
          value: String(p.cassa),
          onChange: (e) => scriviMeta((st_) => { st_.profili[chiave].cassa = Math.max(0, Number(e.target.value) || 0); }) }),
      ])]),
      el("li", {}, [el("div", { class: "riga" }, [
        el("span", { testo: "Finestra (giorni del mese)" }),
        el("input", { class: "campo fi-campo-mini", type: "number", inputmode: "numeric", value: String(p.dal), min: "1", max: "31",
          onChange: (e) => scriviMeta((st_) => { st_.profili[chiave].dal = Math.max(1, Number(e.target.value) || 1); }) }),
        el("input", { class: "campo fi-campo-mini", type: "number", inputmode: "numeric", value: String(p.al), min: "1", max: "31",
          onChange: (e) => scriviMeta((st_) => { st_.profili[chiave].al = Math.max(1, Number(e.target.value) || 31); }) }),
      ])]),
    ]),
    el("p", { class: "nota", testo: "La cassa copre solo le categorie spuntate qui sopra: quelle che dipendono da una decisione giornaliera. Le fisse dentro un tetto settimanale lo farebbero sforare da sole il giorno dell'affitto." }),

    // La «regola del costo casa» stava qui. Serviva a confrontare gli
    // affitti mentre cercavi casa; il contratto è firmato, e da allora quel
    // calcolo non tornava più col resto del piano — mostrava un risparmio
    // che non esiste. Un numero sbagliato nelle impostazioni è peggio di
    // nessun numero, quindi via lui e via `risparmioReale()` che lo usava.

    bloccoImport(ridisegna),

    el("div", { class: "gruppo-titolo", testo: "Autocategorizzazione" }),
    el("section", { class: "scheda" }, [
      el("p", { class: "nota", testo: `${Object.keys(s.rules).length} corrispondenze apprese dalle tue correzioni. Hanno sempre la precedenza sul dizionario di partenza.` }),
      el("button", {
        class: "btn tenue pieno", type: "button", testo: "Dimentica tutto",
        onClick: (e) => {
          const btn = e.currentTarget;
          if (btn.dataset.sicuro !== "1") {
            btn.dataset.sicuro = "1";
            btn.textContent = "Tocca di nuovo per dimenticare";
            setTimeout(() => { btn.dataset.sicuro = ""; btn.textContent = "Dimentica tutto"; }, 3000);
            return;
          }
          scriviMeta((st_) => { st_.rules = {}; });
          avviso("Regole dimenticate.");
          ridisegna();
        },
      }),
    ]),
  ]);

  // Il ciclo, i pocket, i ricorrenti e le soglie: tutto quello che il
  // Registro v2 ha aggiunto e che va configurato una volta sola.
  aggiungi(fuori, [vistaSetupV2(ridisegna)]);

  return fuori;
}

/* ---------------------------------------------------------- import ----- */

function bloccoImport(ridisegna) {
  let righe = [];
  const anteprima = el("div", { class: "fi-anteprima" });

  const disegnaAnteprima = () => {
    anteprima.replaceChildren();
    if (!righe.length) {
      anteprima.append(el("p", { class: "nota", testo: "Nessuna riga riconosciuta." }));
      return;
    }
    const doppioni = righe.filter((r) => r.doppione).length;
    const senzaCat = righe.filter((r) => r.inc && !r.doppione && r.tipo === "out" && !r.cat).length;

    anteprima.append(el("p", { class: "nota" }, [
      el("b", { testo: `${righe.length} righe` }),
      doppioni > 0 && el("span", { testo: ` · ${doppioni} doppioni scartati` }),
      senzaCat > 0
        ? el("span", { class: "attenzione", testo: ` · ${senzaCat} senza categoria: assegnala tu` })
        : el("span", { testo: " · categorie tutte assegnate" }),
    ]));

    const BADGE = { out: "USCITA", in: "ENTRATA", extra: "EXTRA", reso: "RESO", giro: "GIRO", rimb: "RIMB" };

    for (const [i, r] of righe.entries()) {
      const scelta = el("input", { type: "checkbox", checked: r.inc && !r.doppione, disabled: r.doppione,
        onChange: (e) => { r.inc = e.target.checked; aggiornaConta(); } });

      const selettore = r.tipo === "out" && !r.doppione
        ? el("select", { class: "campo fi-select",
            onChange: (e) => { r.cat = e.target.value || null; r.sub = null; disegnaAnteprima(); } },
            [el("option", { value: "", testo: "— categoria —" }),
             ...stato().cats.map((c) => el("option", { value: c.id, selected: c.id === r.cat, testo: c.nome }))])
        : null;

      anteprima.append(el("div", { class: `fi-imp-riga${r.doppione ? " doppione" : ""}` }, [
        scelta,
        el("div", { class: "fi-imp-testo" }, [
          el("div", { class: "fi-imp-nota", testo: r.nota }),
          el("div", { class: "nota" }, [
            el("span", { testo: `${r.data} · ` }),
            el("b", { class: r.tipo === "extra" ? "negativo" : r.tipo === "in" ? "positivo" : "", testo: BADGE[r.tipo] }),
            r.doppione && el("span", { testo: " · già presente" }),
            !r.doppione && r.tipo === "out" && r.auto && el("span", { class: "positivo", testo: ` · auto${r.sub ? `: ${r.sub}` : ""}` }),
          ]),
          selettore,
        ]),
        el("span", { class: "num fi-imp-cifra",
          testo: (r.tipo === "in" ? "+" : r.tipo === "giro" ? "" : "−") + euro(r.imp) }),
      ]));
    }

    const bottone = el("button", { class: "btn pieno", type: "button", style: "margin-top:var(--s4)",
      onClick: () => {
        const { quante, ultimoMese } = eseguiImport(righe);
        righe = [];
        avviso(quante ? `${quante} movimenti importati.` : "Niente da importare.");
        ridisegna(ultimoMese ? { mese: ultimoMese } : {});
      } });
    const aggiornaConta = () => {
      const n = righe.filter((r) => r.inc && !r.doppione).length;
      bottone.textContent = n ? `Importa ${n} movimenti` : "Nessuna riga selezionata";
      bottone.disabled = !n;
    };
    aggiornaConta();
    anteprima.append(bottone);
  };

  const areaTesto = el("textarea", { class: "campo fi-textarea",
    placeholder: "…oppure incolla qui le righe dell'estratto conto" });

  const fileInput = el("input", { type: "file", accept: ".csv,text/csv,text/plain", hidden: true,
    onChange: (e) => {
      const f = e.target.files[0];
      if (!f) return;
      const lettore = new FileReader();
      lettore.onload = () => { righe = preparaImport(lettore.result); disegnaAnteprima(); };
      lettore.readAsText(f);
      e.target.value = "";
    } });

  return el("div", {}, [
    el("div", { class: "gruppo-titolo", testo: "Import estratto conto" }),
    el("section", { class: "scheda" }, [
      el("p", { class: "nota", testo:
        "CSV Revolut (TOPUP → sforamento, refund → reso, pocket → giroconto; DECLINED e valute estere scartati), " +
        "CSV italiani col punto e virgola, oppure righe incollate tipo «27/07 Barbiere 15,00» (+ davanti = entrata). " +
        "I doppioni vengono riconosciuti e scartati; la categoria si assegna da sola dalle note." }),
      fileInput,
      el("div", { class: "fi-imp-bottoni" }, [
        el("button", { class: "btn tenue", type: "button", testo: "Carica CSV", onClick: () => fileInput.click() }),
        el("button", { class: "btn tenue", type: "button", testo: "Analizza il testo",
          onClick: () => { righe = preparaImport(areaTesto.value); disegnaAnteprima(); } }),
      ]),
      areaTesto,
      anteprima,
    ]),
  ]);
}

/* ============================================================== RICARICA
   Il flusso anti-sforamento. È il cuore del prodotto.

   Quando il Principale è vuoto e servono soldi, l'app NON deve impedirlo:
   deve renderlo cosciente e tracciato. Da qui le tre cose che sembrano
   attrito e sono il punto:

   1. si deve scegliere DA DOVE, e l'app dice cosa comporta;
   2. il campo «perché» è obbligatorio — tre secondi di frizione fermano
      metà delle ricariche impulsive, e lo storico dei motivi è la cosa più
      utile da rileggere a fine mese;
   3. dalla seconda volta nello stesso ciclo, l'app lo dice.
*/

/* ============================================ la ricarica del lunedì =====
   Un tap, e la settimana riparte.

   È la sola operazione ricorrente di tutto il modulo che si può fare senza
   decidere niente: l'importo è quello di ogni lunedì, la sorgente è la
   Cassa, la destinazione il Principale. Chiederla in quattro schermate
   sarebbe chiedere quattro volte una cosa già decisa — quindi qui c'è un
   numero modificabile e due pulsanti.

   L'AVANZO NON SI AZZERA, ed è la riga che conta più di tutte. Se la
   settimana scorsa hai speso meno, quei soldi restano sul Principale e si
   sommano alla ricarica: lunedì ne hai 170 invece di 130. Azzerare
   premierebbe chi arriva a domenica con zero, cioè insegnerebbe a spendere
   tutto entro sabato — l'esatto contrario di quello a cui serve.
   ========================================================================= */

export function apriRicaricaSettimanale(ridisegna) {
  const oggi = oggiISO();
  const previsto = Number(stato().config?.cassaSettimanale) || 0;
  const saldoCassa = saldoPocket("cassa");
  const saldoPrinc = saldoPocket("principale");
  const saldoIng = saldoPocket("ing");

  // Da dove arrivano i soldi: dalla Cassa se ce ne sono, altrimenti da ING —
  // e allora è uno sforamento, perché intaccare la riserva è esattamente il
  // fatto che il contatore deve registrare.
  const daIng = saldoCassa <= 0;
  const massimo = daIng ? saldoIng : saldoCassa;
  const b = { imp: Math.min(previsto, massimo) };

  const { corpo, chiudi } = apriFoglio({
    titolo: "Ricarica settimanale",
    sinistra: el("button", { class: "btn nudo", type: "button", testo: "Non ora",
      onClick: () => chiudiFoglio() }),
  });

  const dopo = el("p", { class: "fi-ric-dopo" });
  const zonaTasto = el("div", {});

  const aggiorna = () => {
    const fonteDopo = massimo - b.imp;
    dopo.textContent =
      `Dopo: ${daIng ? "ING" : "Cassa"} ${euro(fonteDopo)} · Principale ${euro(saldoPrinc + b.imp)}`;

    zonaTasto.replaceChildren(el("button", {
      class: "btn pieno grande", type: "button",
      disabled: b.imp <= 0 || b.imp > massimo,
      testo: b.imp > 0 ? `Trasferisci ${euro(b.imp)}` : "Quanto?",
      onClick: () => {
        salvaMovimento({
          id: nuovoId("m"), data: oggi,
          // Dalla Cassa è un travaso fra pocket miei; da ING è uno
          // sforamento, e la differenza è tutto il valore del contatore.
          tipo: daIng ? "extra" : "giro", imp: b.imp,
          pocket: daIng ? "ing" : "cassa", pocketTo: "principale",
          cat: null, sub: null,
          nota: daIng ? "Ricarica settimanale — Cassa vuota" : "Ricarica settimanale",
        });
        segnaRicarica(oggi);
        tocco(14);
        chiudi();
        celebra("Settimana ricaricata");
        ridisegna?.();
      },
    }));
  };

  aggiungi(corpo, [
    // Prima i due numeri di partenza: senza, «trasferisci 130» è un numero
    // senza contesto e non si sa se sia tanto o poco.
    el("ul", { class: "fi-dett-lista" }, [
      rigaDett(daIng ? "ING" : "Cassa", euro(massimo)),
      rigaDett("Principale", euro(saldoPrinc)),
    ]),

    daIng && el("div", { class: "fi-copertura male" }, [
      el("span", { class: "fi-copertura-segno", html: icona("allarme", 20) }),
      el("div", {}, [
        el("div", { class: "fi-copertura-titolo", testo: "Cassa vuota" }),
        el("div", { class: "fi-copertura-nota", testo:
          "La ricarica arriva da ING e viene contata come sforamento. Succede dopo il 21, quando lo stipendio non è ancora entrato." }),
      ]),
    ]),
    !daIng && saldoCassa < previsto && el("div", { class: "fi-copertura male" }, [
      el("span", { class: "fi-copertura-segno", html: icona("allarme", 20) }),
      el("div", {}, [
        el("div", { class: "fi-copertura-titolo", testo: `In Cassa ci sono solo ${euro(saldoCassa)}` }),
        el("div", { class: "fi-copertura-nota", testo:
          "Puoi trasferire quello che c'è, oppure chiudere e prendere il resto da ING — quello sì conta come sforamento." }),
      ]),
    ]),

    el("div", { class: "campo-gruppo fi-campo-staccato" }, [
      el("label", { class: "campo-etichetta", testo: "Trasferisci" }),
      campo({ tipo: "text", inputmode: "decimal",
        valore: (b.imp / 100).toFixed(2).replace(".", ","),
        alCambio: (t) => { b.imp = Math.min(centesimi(t), massimo); aggiorna(); } }),
      dopo,
    ]),

    zonaTasto,

    el("p", { class: "nota", stile: { marginTop: "var(--s3)" }, testo:
      saldoPrinc > 0
        ? `Sul Principale ci sono ancora ${euro(saldoPrinc)} della settimana scorsa: non si azzerano, si sommano.`
        : "Quello che avanza a fine settimana resta sul Principale e si somma alla prossima ricarica." }),
  ]);

  aggiorna();
}

export function apriRicarica(ridisegna) {
  const oggi = oggiISO();
  const ciclo = cicloDi(oggi);
  const s = settimana(oggi);
  const sf = sforamenti(ciclo);

  const b = { fonte: "cassa", imp: 0, perche: "" };
  let testoImporto = "";

  const { corpo } = apriFoglio({
    titolo: "Ricarica fuori ciclo",
    sinistra: el("button", { class: "btn nudo", type: "button", testo: "Annulla",
      onClick: () => chiudiFoglio() }),
    alChiudi: ridisegna,
  });

  const schermo = el("div", { class: "fi-importo cifra vuoto", testo: "0,00" });
  const conseguenza = el("p", { class: "fi-conseguenza" });
  const zonaConferma = el("div", {});

  const saldoCassa = saldoPocket("cassa");

  const aggiornaConseguenza = () => {
    if (b.fonte === "cassa") {
      const dopo = saldoCassa - b.imp;
      const settimaneCoperte = s.budget > 0 ? Math.floor(Math.max(0, dopo) / s.budget) : 0;
      conseguenza.textContent = b.imp > 0
        ? `Anticipi la prossima settimana: lunedì avrai ${euro(Math.max(0, s.budget - b.imp))} invece di ${euro(s.budget)}.`
        : `Nella Cassa ci sono ${euro(saldoCassa)}, cioè ${plurale(settimaneCoperte, "settimana", "settimane")}.`;
      conseguenza.className = "fi-conseguenza";
    } else {
      conseguenza.textContent = "Intacchi la riserva. Viene contato come sforamento.";
      conseguenza.className = "fi-conseguenza male";
    }
  };

  const disegnaConferma = () => {
    zonaConferma.replaceChildren();
    const perche = b.perche.trim();
    const ok = b.imp > 0 && perche.length >= 3;
    zonaConferma.append(el("button", {
      class: "btn pieno grande", type: "button", disabled: !ok,
      testo: ok ? `Ricarica ${euro(b.imp)}` : perche.length < 3 && b.imp > 0
        ? "Scrivi perché, anche due parole"
        : "Quanto ti serve?",
      onClick: () => {
        // Un travaso dalla Cassa NON è uno sforamento: sposta soldi miei fra
        // pocket miei. Dall'ING sì, ed è la distinzione che rende il
        // contatore degli sforamenti una metrica e non un rumore.
        salvaMovimento(b.fonte === "cassa"
          ? { id: nuovoId("m"), data: oggi, tipo: "giro", imp: b.imp,
              pocket: "cassa", pocketTo: "principale", cat: null, sub: null,
              nota: `Anticipo — ${perche}` }
          // Anche lo sforamento ha due estremi: ESCE da ING ed ENTRA nel
          // Principale. Prima aveva solo `pocket: principale` e nessuna
          // destinazione, quindi i soldi comparivano nel Principale senza
          // sparire da nessuna parte — la riserva restava intatta a
          // schermo mentre nella realtà si era svuotata.
          : { id: nuovoId("m"), data: oggi, tipo: "extra", imp: b.imp,
              pocket: "ing", pocketTo: "principale", cat: null, sub: null,
              nota: perche });
        tocco(14);
        avviso(b.fonte === "cassa" ? "Anticipo registrato." : "Sforamento registrato.");
        chiudiFoglio();
      },
    }));
  };

  aggiungi(corpo, [
    el("p", { class: "fi-ric-stato", testo:
      `Restano ${plurale(s.giorniRimasti, "giorno", "giorni")} a lunedì. ` +
      (sf.n === 0
        ? "Questo ciclo non hai ancora ricaricato."
        : `Questo ciclo hai già ricaricato ${plurale(sf.n, "volta", "volte")}.`) }),

    // Dalla seconda in poi si aggiunge il contesto. Non è un rimprovero: è
    // il numero che serve per decidere, e senza va nascosto.
    sf.n >= 1 && el("p", { class: "fi-ric-avviso", testo:
      `L'ultima è del ${dataBreve(sf.ultimo.data)} da ${euro(sf.ultimo.imp, { tondo: true })}${sf.ultimo.nota ? ` — «${sf.ultimo.nota}»` : ""}.` }),

    el("div", { class: "gruppo-titolo", testo: "Da dove" }),
    segmenti([["cassa", "Cassa"], ["ing", "ING"]], b.fonte, (v) => {
      b.fonte = v; aggiornaConseguenza();
    }),
    conseguenza,

    el("div", { class: "gruppo-titolo", testo: "Quanto" }),
    schermo,
    tastierino((t) => {
      testoImporto = digita(testoImporto, t);
      b.imp = centesimi(testoImporto);
      schermo.textContent = testoImporto || "0,00";
      schermo.classList.toggle("vuoto", !testoImporto);
      tocco(5);
      aggiornaConseguenza();
      disegnaConferma();
    }),

    el("div", { class: "campo-gruppo" }, [
      el("label", { class: "campo-etichetta", testo: "Perché" }),
      el("input", { class: "campo", type: "text", maxlength: "80",
        placeholder: "cena fuori non prevista",
        onInput: (e) => { b.perche = e.target.value; disegnaConferma(); } }),
      el("p", { class: "nota-2", stile: { marginTop: "6px" },
        testo: "Obbligatorio. A fine mese rileggere i motivi vale più dei totali." }),
    ]),

    zonaConferma,
  ]);

  aggiornaConseguenza();
  disegnaConferma();
}

/** Un tasto premuto sopra un testo di importo: torna il testo nuovo. */
function digita(v, t) {
  if (t === "←") return v.slice(0, -1);
  if (t === ",") return v.includes(",") ? v : (v ? v + "," : "0,");
  const [, dec] = v.split(",");
  if (dec != null && dec.length >= 2) return v;
  if (v.replace(",", "").length >= 8) return v;
  return v + t;
}

/* ================================================================ SALDO ING
   L'unico saldo che l'app non può dedurre: ING vive fuori di qui. */

export function apriSaldoING(ridisegna) {
  const p = pocketPerId("ing");
  let testo = p?.saldo ? (p.saldo / 100).toFixed(2).replace(".", ",") : "";

  const { corpo } = apriFoglio({
    titolo: "Saldo ING",
    sinistra: el("button", { class: "btn nudo", type: "button", testo: "Annulla", onClick: () => chiudiFoglio() }),
    alChiudi: ridisegna,
    mezzo: true,
  });

  const schermo = el("div", { class: "fi-importo cifra" + (testo ? "" : " vuoto"), testo: testo || "0,00" });

  aggiungi(corpo, [
    el("p", { class: "nota", testo:
      "ING è una riserva che sta fuori dall'app: il saldo non si deduce dai movimenti, si copia dall'estratto conto." }),
    schermo,
    tastierino((t) => {
      testo = digita(testo, t);
      schermo.textContent = testo || "0,00";
      schermo.classList.toggle("vuoto", !testo);
      tocco(5);
    }),
    el("button", {
      class: "btn pieno grande", type: "button", testo: "Salva",
      onClick: () => { scriviPocket("ing", { saldo: centesimi(testo) }); avviso("Saldo aggiornato."); chiudiFoglio(); },
    }),
  ]);
}

/* ============================================================ CI DORMO SU
   La frizione sulle spese grosse.

   Sopra la soglia — 50 € di serie — prima di confermare si passa da una
   domanda sola, con il costo espresso in una unità che significa qualcosa:
   non «194 €» ma «una settimana e mezza di budget».

   «Ci dormo su» non annulla: mette la spesa fra le INTENZIONI. Se dopo
   ventiquattro ore la confermi si registra, se la ignori decade da sola
   dopo sette giorni. Sulla base dello storico questa singola funzione vale
   più di tutte le altre: le uscite sopra i 50 € sono cinque in due mesi e
   pesano più di tutte le colazioni sommate.
*/

function chiediSeCiDormi(imp, bozza, conferma, ridisegna) {
  const s = settimana();
  const settimane = s.budget > 0 ? imp / s.budget : 0;
  const quanto = settimane >= 0.9
    ? `Sono ${settimane.toFixed(1).replace(".", ",")} settimane di budget.`
    : `Sono ${Math.round((imp / Math.max(1, s.budget)) * 100)}% del budget della settimana.`;

  const { corpo } = apriFoglio({
    titolo: "Un momento",
    sinistra: el("button", { class: "btn nudo", type: "button", testo: "Indietro", onClick: () => chiudiFoglio() }),
    mezzo: true,
  });

  aggiungi(corpo, [
    el("div", { class: "fi-dormo-cifra cifra", html: euroGrande(imp) }),
    el("p", { class: "fi-dormo-quanto", testo: quanto }),
    s.resta > 0 && el("p", { class: "nota", testo:
      `Dopo questa ne restano ${euro(s.resta - imp)} per ${plurale(s.giorniRimasti, "giorno", "giorni")}.` }),

    el("div", { class: "fi-dormo-scelta" }, [
      el("button", { class: "btn morbido", type: "button", testo: "Ci dormo su",
        onClick: () => {
          metteInSospeso({ ...bozza, imp, id: nuovoId("p") });
          chiudiFoglio();   // il foglio della domanda
          chiudiFoglio();   // il foglio del movimento
          avviso("Messa in sospeso. La ritrovi in Riepilogo.");
          ridisegna();
        } }),
      el("button", { class: "btn", type: "button", testo: "Registra",
        onClick: () => { chiudiFoglio(); conferma(); } }),
    ]),
  ]);
}

/* --------------------------------------------------------- le in sospeso */

function blocchoSospese(ridisegna) {
  const p = pendenti();
  if (!p.length) return null;

  return el("section", { class: "scheda fi-sospese" }, [
    el("div", { class: "micro", testo: "Ci hai dormito su" }),
    el("ul", { class: "fi-sospese-lista" }, p.map((x) => {
      const ore = Math.floor((Date.now() - x.ts) / 3600000);
      const pronta = ore >= 24;
      return el("li", { class: "fi-sospesa" }, [
        el("div", { class: "fi-sospesa-testo" }, [
          el("div", { class: "fi-sospesa-nota", testo: x.nota || categoriaPerId(x.cat)?.nome || "Spesa" }),
          el("div", { class: "nota-2", testo: pronta
            ? "Sono passate 24 ore. La vuoi ancora?"
            : `Ancora ${plurale(24 - ore, "ora", "ore")} di attesa` }),
        ]),
        el("span", { class: "fi-sospesa-cifra num", testo: euro(x.imp) }),
        el("div", { class: "fi-sospesa-azioni" }, [
          el("button", { class: "btn piccolo nudo", type: "button", testo: "Lascia stare",
            onClick: () => { togliDaSospeso(x.id); avviso("Lasciata perdere."); ridisegna(); } }),
          el("button", { class: "btn piccolo", type: "button", testo: "Registra", disabled: !pronta,
            onClick: () => {
              const { ts, ...m } = x;
              salvaMovimento({ ...m, id: nuovoId("m"), data: oggiISO() });
              togliDaSospeso(x.id);
              avviso("Registrata.");
              ridisegna();
            } }),
        ]),
      ]);
    })),
  ]);
}

/* ========================================================= SALDI DEI POCKET
   Si compila una volta sola, copiando da Revolut e da ING. Da lì in poi i
   saldi li muovono i movimenti, e questa schermata serve solo a rimetterli
   in bolla quando ci si accorge di uno scostamento.

   La cassa settimanale sta qui e non in Impostazioni perché è il numero che
   trasforma i quattro saldi in «quanto posso spendere oggi»: separarli
   vorrebbe dire compilarne metà e non capire perché il conto non parte. */

export function apriSetupPocket(ridisegna) {
  // Il saldo VERO, quello che si vede ovunque nell'app — non `p.saldo`, che
  // è l'ancora. I due coincidono solo finché nessun movimento ha toccato quel
  // pocket dalla data dell'ancora in poi: il Principale, che li prende tutti,
  // era l'unico a mostrare qui un numero diverso da tutte le altre schermate.
  const b = {};
  for (const p of pocketConSaldi()) b[p.id] = p.saldoVero || 0;
  let cassaSett = Number(stato().config?.cassaSettimanale) || 0;

  const { corpo } = apriFoglio({
    titolo: "Saldi dei pocket",
    sinistra: el("button", { class: "btn nudo", type: "button", testo: "Annulla", onClick: () => chiudiFoglio() }),
    alChiudi: ridisegna,
  });

  const NOTE = {
    principale: "Revolut · la settimana corrente. È l'unico conto da cui si spende.",
    cassa: "Revolut · le settimane future del mese. Parcheggio, non spendibile.",
    fisse: "Revolut · gli addebiti automatici. Non si tocca.",
    ing: "Il deposito. Riserva: alimenta gli altri, non si spende da qui.",
  };

  aggiungi(corpo, [
    el("p", { class: "nota", testo:
      "Qui sotto c'è quello che l'app crede di avere. Apri il conto e confronta: se combacia, non toccare niente. Se non combacia, scrivi il numero che vedi sul conto adesso — alle spese che hai già segnato oggi ci pensa l'app." }),

    ...pocketConSaldi().map((p) => el("div", { class: "campo-gruppo fi-setup-pocket" }, [
      el("label", { class: "campo-etichetta", testo: p.nome }),
      campo({
        tipo: "text", valore: p.saldoVero ? (p.saldoVero / 100).toFixed(2).replace(".", ",") : "",
        segnaposto: "0,00",
        inputmode: "decimal",
        alCambio: (v) => { b[p.id] = centesimi(v); },
      }),
      el("p", { class: "nota-2", testo: NOTE[p.id] || "" }),
    ])),

    el("div", { class: "gruppo-titolo", testo: "Il travaso del lunedì" }),
    el("div", { class: "campo-gruppo" }, [
      campo({
        tipo: "text", valore: cassaSett ? (cassaSett / 100).toFixed(2).replace(".", ",") : "",
        segnaposto: "130,00",
        inputmode: "decimal",
        alCambio: (v) => { cassaSett = centesimi(v); },
      }),
      el("p", { class: "nota-2", testo:
        "Quanto passa dalla Cassa al Principale ogni lunedì. È il budget della settimana, e la barra del consumo si misura su questo." }),
    ]),

    el("button", {
      class: "btn pieno grande", type: "button", testo: "Salva i saldi",
      stile: { marginTop: "var(--s5)" },
      onClick: () => {
        // NON si scrive un saldo: si riscrive l'ANCORA, con la data di oggi.
        // Da qui in poi il saldo lo fanno i movimenti, e questo numero non
        // viene più toccato finché non lo si riancora di nuovo.
        //
        // E qui il numero scritto NON è quello digitato, perché le due cose
        // sono diverse: tu digiti quanto c'è sul conto ADESSO, l'ancora vale
        // quanto c'era all'INIZIO di oggi. In mezzo ci sono le spese che hai
        // già segnato stamattina, e il calcolo del saldo le sottrae comunque.
        //
        // Scrivendo il numero digitato così com'era, quelle spese venivano
        // tolte una seconda volta: digitare i 63,01 € letti su Revolut, con
        // 108,83 € già segnati oggi, dava −45,82 €. Si toglie il delta prima
        // di scrivere, e il conto torna: 63,01 − (−108,83) = 171,84 di
        // ancora, che meno le spese di oggi fa di nuovo 63,01.
        //
        // Ne viene anche che salvare senza toccare niente non cambia niente,
        // ed è la prova che il giro è giusto.
        const oggi = oggiISO();
        for (const [id, saldo] of Object.entries(b)) {
          riancoraPocket(id, saldo - deltaPocket(id, oggi), oggi);
        }
        scriviMeta((s) => { s.config.cassaSettimanale = cassaSett; });
        avviso("Ancore riscritte.");
        chiudiFoglio();
      },
    }),
  ]);
}

/* ============================================== IMPOSTAZIONI — REGISTRO v2
   Il ciclo, i pocket, i ricorrenti e le soglie. Sta in fondo alla sezione
   Finanze di #/impostazioni, sotto quello che c'era già. */

export function vistaSetupV2(ridisegna) {
  const s = stato();
  const soglie = { ...SOGLIE_PREDEFINITE, ...(s.soglie || {}) };
  const fuori = el("div", {});

  /* --- il ciclo ------------------------------------------------------- */
  const g = Number(s.config?.giornoStipendio) || 21;
  aggiungi(fuori, [el("section", { class: "scheda" }, [
    el("div", { class: "scheda-titolo", testo: "Il ciclo dello stipendio" }),
    el("p", { class: "nota", testo:
      "Il mese finanziario non parte il primo. Da questo giorno si contano budget, proiezioni e «quanto manca alla fine del mese»: col mese solare i conti sbagliavano di venti giorni tutti i mesi." }),
    el("div", { class: "campo-gruppo", stile: { marginTop: "var(--s3)" } }, [
      el("label", { class: "campo-etichetta", testo: "Giorno dello stipendio" }),
      el("div", { class: "fi-riga-doppia" }, [
        campo({ tipo: "number", valore: String(g), min: "1", max: "28",
          alCambio: (v) => {
            const n = Math.min(28, Math.max(1, Number(v) || 1));
            scriviMeta((st) => { st.config.giornoStipendio = n; });
          } }),
        el("span", { class: "nota", testo: `Ciclo in corso: ${nomeCiclo(cicloDi())}` }),
      ]),
    ]),
  ])]);

  /* --- il travaso del lunedì ------------------------------------------- */
  const ric = s.config?.ricarica || { giorno: 1, ora: "08:00" };
  const GIORNI_SETT = [["1", "Lun"], ["2", "Mar"], ["3", "Mer"], ["4", "Gio"],
    ["5", "Ven"], ["6", "Sab"], ["0", "Dom"]];
  aggiungi(fuori, [el("section", { class: "scheda" }, [
    el("div", { class: "scheda-titolo", testo: "La ricarica settimanale" }),
    el("p", { class: "nota", testo:
      "Il promemoria che ti chiede di travasare dalla Cassa al Principale. Un tap conferma, e l'importo si può correggere prima. Se non rispondi te lo ricorda una volta il giorno dopo, poi basta." }),
    el("div", { class: "campo-gruppo", stile: { marginTop: "var(--s3)" } }, [
      el("label", { class: "campo-etichetta", testo: "Che giorno" }),
      pillole(GIORNI_SETT, String(ric.giorno ?? 1),
        (v) => scriviMeta((st) => { st.config.ricarica = { ...ric, giorno: Number(v) }; }),
        { unaRiga: true }),
    ]),
    el("div", { class: "campo-gruppo" }, [
      el("label", { class: "campo-etichetta", testo: "A che ora" }),
      campo({ tipo: "time", valore: ric.ora || "08:00",
        alCambio: (v) => { if (v) scriviMeta((st) => { st.config.ricarica = { ...ric, ora: v }; }); } }),
    ]),
  ])]);

  /* --- i pocket -------------------------------------------------------- */
  aggiungi(fuori, [el("section", { class: "scheda" }, [
    el("div", { class: "scheda-titolo", testo: "I pocket" }),
    lista(pocketConSaldi().map((p) => riga({
      etichetta: p.nome,
      valore: euro(p.saldoVero),
      dettaglio: TIPI_POCKET[p.tipo]?.nome + (p.external ? " · saldo a mano" : ""),
    }))),
    el("button", {
      class: "btn tenue pieno", type: "button", testo: "Correggi i saldi",
      onClick: () => apriSetupPocket(ridisegna),
    }),
    el("p", { class: "nota", testo:
      "Questi non sono numeri fermi: sono calcolati. Ogni pocket parte dalla sua ancora e ci somma i movimenti da quella data in poi, così non può andare in deriva. «Correggi i saldi» non scrive un saldo — sposta l'ancora a oggi." }),
  ])]);

  /* --- i ricorrenti ---------------------------------------------------- */
  const zonaRic = el("div", {});
  const disegnaRic = () => {
    zonaRic.replaceChildren();
    const ric = ricorrentiVivi();
    aggiungi(zonaRic, [
      ric.length === 0
        ? el("p", { class: "nota", testo: "Nessun ricorrente. Senza, la sezione «In arrivo» della home resta vuota." })
        : lista(ric.map((r) => riga({
            etichetta: r.nome,
            valore: r.tipo === "variabile"
              ? `${euro(r.stimaMin, { tondo: true })}–${euro(r.stimaMax, { tondo: true })}`
              : euro(r.imp, { tondo: true }),
            dettaglio: `${etichettaCadenza(r)} · ${nomePocket(r.pocket)}${r.attivo ? "" : " · sospeso"}`,
            tono: r.attivo ? "" : "",
            azione: () => apriRicorrente(r, () => { disegnaRic(); ridisegna(); }),
          }))),
      el("button", {
        class: "btn tenue pieno", type: "button", testo: "Aggiungi un ricorrente",
        onClick: () => apriRicorrente(null, () => { disegnaRic(); ridisegna(); }),
      }),
    ]);
  };
  disegnaRic();

  aggiungi(fuori, [el("section", { class: "scheda" }, [
    el("div", { class: "scheda-titolo", testo: "Uscite ricorrenti" }),
    el("p", { class: "nota", testo:
      "Alimentano «In arrivo» e l'allarme sulle Spese fisse scoperte. Le variabili si dichiarano con un intervallo, e nelle proiezioni vale sempre il massimo." }),
    zonaRic,
  ])]);

  /* --- i pagamenti previsti -------------------------------------------- */
  const zonaPrev = el("div", {});
  const disegnaPrev = () => {
    zonaPrev.replaceChildren();
    const p = previsti();
    aggiungi(zonaPrev, [
      p.length === 0
        ? el("p", { class: "nota", testo: "Nessun pagamento previsto." })
        : lista(p.slice().sort((a, b) => a.quando.localeCompare(b.quando)).map((x) => {
            const cop = coperturaDi(x);
            return riga({
              etichetta: x.nome,
              valore: euro(x.imp, { tondo: true }),
              dettaglio: `${dataBreve(x.quando)} · ${nomePocket(x.pocket)}` +
                (cop.coperto ? "" : ` · mancano ${euro(cop.manca, { tondo: true })}`),
              tono: cop.coperto ? "" : "male",
              azione: () => apriPrevisto(x, () => { disegnaPrev(); ridisegna(); }),
            });
          })),
      el("button", {
        class: "btn tenue pieno", type: "button", testo: "Aggiungi un pagamento previsto",
        onClick: () => apriPrevisto(null, () => { disegnaPrev(); ridisegna(); }),
      }),
    ]);
  };
  disegnaPrev();

  aggiungi(fuori, [el("section", { class: "scheda" }, [
    el("div", { class: "scheda-titolo", testo: "Pagamenti previsti" }),
    el("p", { class: "nota", testo:
      "Una tantum con una data: la maxi rata, una caparra, un acquisto già deciso. Entrano in «In arrivo» insieme ai ricorrenti, e il pocket che scegli qui è quello su cui viene fatto il conto se i soldi bastano." }),
    zonaPrev,
  ])]);

  /* --- le soglie ------------------------------------------------------- */
  aggiungi(fuori, [el("section", { class: "scheda" }, [
    el("div", { class: "scheda-titolo", testo: "Soglie" }),
    campoSoglia("Minimo della riserva ING", soglie.ingMinimo, (v) => scriviSoglia("ingMinimo", v),
      "Sotto questa cifra ING passa in ambra e compare l'avviso."),
    campoSoglia("Frizione sulle spese grosse", soglie.spesaGrossa, (v) => scriviSoglia("spesaGrossa", v),
      "Sopra questo importo, prima di registrare l'app chiede se ci vuoi dormire su."),
    el("div", { class: "campo-gruppo" }, [
      el("label", { class: "campo-etichetta", testo: "Avviso di categoria" }),
      segmenti([["0.75", "75%"], ["0.85", "85%"], ["0.95", "95%"]], String(soglie.catAvviso),
        (v) => scriviSoglia("catAvviso", Number(v))),
      el("p", { class: "nota", testo: "A che punto del budget di categoria compare l'avviso." }),
    ]),
  ])]);

  /* --- il pacchetto da far analizzare ---------------------------------- */

  aggiungi(fuori, [el("section", { class: "scheda" }, [
    el("div", { class: "scheda-titolo", testo: "Esporta per l'analisi" }),
    el("p", { class: "nota", testo:
      "Un file JSON con tutto: movimenti, categorie, ricorrenti, saldi, budget e i totali per mese già fatti. "
      + "Gli importi sono in euro e non in centesimi, gli id sono risolti in nomi, e in cima c'è la legenda delle convenzioni — "
      + "così chi lo legge non deve indovinare niente." }),
    // Solo classi condivise, e non è un dettaglio: `moduli/finanze/stile.css`
    // NON viene caricato nella schermata Impostazioni — lì il modulo dà solo
    // il suo nodo, e i fogli in pagina sono tokens, base e quelli di Oggi e
    // Impostazioni. Una classe `fi-` qui dentro non ha stile e i due tasti
    // restavano uno lungo e uno corto, appiccicati.
    // Affiancati, non impilati: sono due strade per la stessa cosa, e uno
    // sopra l'altro sembravano due azioni diverse in fila.
    el("div", { stile: { display: "flex", gap: "var(--s2)", marginTop: "var(--s3)" } }, [
      el("button", {
        class: "btn", type: "button", testo: "Scarica il file",
        stile: { flex: "1" },
        onClick: () => {
          try { avviso(`File pronto · ${Math.round(scaricaAnalisi() / 1024)} KB`); }
          catch (e) { avviso("Non è riuscito: " + (e.message || e), { tono: "errore" }); }
        },
      }),
      // Su iPhone, da un'app installata sulla home, un file scaricato
      // finisce in un posto che poi va cercato. Incollare in chat è un gesto
      // solo, e il contenuto è identico.
      el("button", {
        class: "btn morbido", type: "button", testo: "Copia",
        stile: { flex: "1" },
        onClick: async () => {
          try { avviso(`Copiato · ${Math.round((await copiaAnalisi()) / 1024)} KB`); }
          catch { avviso("Gli appunti non sono disponibili qui. Usa «Scarica il file».", { tono: "errore" }); }
        },
      }),
    ]),
    el("p", { class: "nota-2", testo:
      "Contiene tutte le tue spese: dallo a un modello solo se ti sta bene che le legga." }),
  ])]);

  return fuori;
}

const scriviSoglia = (k, v) => scriviMeta((s) => { s.soglie = { ...(s.soglie || {}), [k]: v }; });

function campoSoglia(etichetta, valore, alSalva, nota) {
  return el("div", { class: "campo-gruppo" }, [
    el("label", { class: "campo-etichetta", testo: etichetta }),
    campo({ tipo: "text", inputmode: "decimal",
      valore: valore ? (valore / 100).toFixed(2).replace(".", ",") : "",
      alCambio: (v) => alSalva(centesimi(v)) }),
    el("p", { class: "nota", testo: nota }),
  ]);
}

const CADENZE = [["mensile", "Ogni mese"], ["bimestrale", "Ogni 2 mesi"], ["trimestrale", "Ogni 3 mesi"], ["annuale", "Ogni anno"]];
const NOMI_MESI_LUNGHI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno",
  "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];

function etichettaCadenza(r) {
  const c = CADENZE.find(([k]) => k === r.cadenza)?.[1] || r.cadenza;
  if (r.cadenza === "mensile") return `${c} il ${r.giorno}`;
  return `${c} · ${r.giorno} ${NOMI_MESI_LUNGHI[(r.mese || 1) - 1]}`;
}

/** Il foglio di un ricorrente: fisso o variabile, con cadenza e pocket. */
function apriRicorrente(esistente, ridisegna) {
  const b = esistente
    ? { ...esistente }
    : { id: nuovoId("r"), nome: "", imp: 0, cat: "fisse", pocket: "fisse", tipo: "fissa",
        cadenza: "mensile", giorno: 1, mese: 1, da: null, pagato: null,
        stimaMin: 0, stimaMax: 0, attivo: true };

  const { corpo } = apriFoglio({
    titolo: esistente ? "Ricorrente" : "Nuovo ricorrente",
    sinistra: el("button", { class: "btn nudo", type: "button", testo: "Annulla", onClick: () => chiudiFoglio() }),
    destra: el("button", {
      class: "btn nudo", type: "button", testo: "Salva",
      onClick: () => {
        if (!b.nome.trim()) { avviso("Serve un nome.", { tono: "errore" }); return; }
        salvaRicorrente({ ...b, nome: b.nome.trim() });
        chiudiFoglio();
        avviso("Salvato.");
      },
    }),
    alChiudi: ridisegna,
  });

  const zonaImporto = el("div", {});
  const zonaQuando = el("div", {});

  const disegnaImporto = () => {
    zonaImporto.replaceChildren();
    if (b.tipo === "fissa") {
      aggiungi(zonaImporto, [
        el("label", { class: "campo-etichetta", testo: "Importo" }),
        campo({ tipo: "text", inputmode: "decimal",
          valore: b.imp ? (b.imp / 100).toFixed(2).replace(".", ",") : "",
          alCambio: (v) => { b.imp = centesimi(v); } }),
      ]);
    } else {
      aggiungi(zonaImporto, [
        el("label", { class: "campo-etichetta", testo: "Stima" }),
        el("div", { class: "fi-ric-range" }, [
          campo({ tipo: "text", inputmode: "decimal", segnaposto: "minimo",
            valore: b.stimaMin ? (b.stimaMin / 100).toFixed(2).replace(".", ",") : "",
            alCambio: (v) => { b.stimaMin = centesimi(v); } }),
          campo({ tipo: "text", inputmode: "decimal", segnaposto: "massimo",
            valore: b.stimaMax ? (b.stimaMax / 100).toFixed(2).replace(".", ",") : "",
            alCambio: (v) => { b.stimaMax = centesimi(v); } }),
        ]),
        el("p", { class: "nota", testo: "Nelle proiezioni vale il massimo: una bolletta sottostimata è esattamente il caso in cui il pocket non basta." }),
      ]);
    }
  };

  const disegnaQuando = () => {
    zonaQuando.replaceChildren();
    aggiungi(zonaQuando, [
      el("label", { class: "campo-etichetta", testo: "Giorno del mese" }),
      campo({ tipo: "number", min: "1", max: "31", valore: String(b.giorno),
        alCambio: (v) => { b.giorno = Math.min(31, Math.max(1, Number(v) || 1)); } }),

      // LA PRIMA SCADENZA, con la data intera.
      //
      // Prima qui c'era solo il mese di ancoraggio, e non bastava: le utenze
      // partono a settembre ma la prima bolletta arriva a fine ottobre, e
      // l'unico modo di dirlo era tenere il ricorrente spento e ricordarsi
      // di accenderlo. Con la data, la prima scadenza è quella e la cadenza
      // conta da lì — bimestrale da ottobre vuol dire ottobre, dicembre,
      // febbraio, e non gennaio, marzo, maggio.
      el("div", { class: "campo-gruppo" }, [
        el("label", { class: "campo-etichetta", testo: "Prima scadenza" }),
        campo({ tipo: "date", valore: b.da || "",
          alCambio: (v) => { b.da = v || null; } }),
        el("p", { class: "nota", testo: b.da
          ? (b.cadenza === "mensile"
              ? "Prima di questa data il ricorrente non esiste."
              : "Prima di questa data non esiste, e la cadenza conta da questo mese.")
          : "Vuoto: vale da subito." }),
      ]),

      // Il mese di ancoraggio resta solo quando non c'è la data: senza uno
      // dei due, un annuale cadrebbe ogni anno nel mese in cui lo stai
      // guardando. Mostrarli tutti e due insieme è il modo di ritrovarsi
      // due verità in disaccordo.
      b.cadenza !== "mensile" && !b.da && el("div", { class: "campo-gruppo" }, [
        el("label", { class: "campo-etichetta", testo: "Mese di riferimento" }),
        pillole(NOMI_MESI_LUNGHI.map((n, i) => [String(i + 1), n.slice(0, 3)]),
          String(b.mese || 1), (v) => { b.mese = Number(v); }, { unaRiga: true }),
      ]),

      // La scadenza già saldata: si vede e si può annullare, altrimenti un
      // «Paga» dato per sbaglio resta senza rimedio.
      b.pagato && el("div", { class: "campo-gruppo" }, [
        el("label", { class: "campo-etichetta", testo: "Ultima scadenza saldata" }),
        el("div", { class: "fi-riga-doppia" }, [
          el("span", { class: "nota", testo: dataUmana(b.pagato) }),
          el("button", { class: "btn piccolo morbido", type: "button", testo: "Annulla",
            onClick: () => { b.pagato = null; disegnaQuando(); } }),
        ]),
      ]),
    ]);
  };

  disegnaImporto();
  disegnaQuando();

  aggiungi(corpo, [
    campo({ etichetta: "Nome", valore: b.nome, segnaposto: "Rata prestito",
      alCambio: (v) => { b.nome = v; } }),

    el("div", { class: "campo-gruppo" }, [
      el("label", { class: "campo-etichetta", testo: "Importo" }),
      segmenti([["fissa", "Certo"], ["variabile", "Stimato"]], b.tipo,
        (v) => { b.tipo = v; disegnaImporto(); }),
    ]),
    el("div", { class: "campo-gruppo" }, [zonaImporto]),

    el("div", { class: "campo-gruppo" }, [
      el("label", { class: "campo-etichetta", testo: "Ogni quanto" }),
      segmenti(CADENZE, b.cadenza, (v) => { b.cadenza = v; disegnaQuando(); }),
    ]),
    el("div", { class: "campo-gruppo" }, [zonaQuando]),

    el("div", { class: "campo-gruppo" }, [
      el("label", { class: "campo-etichetta", testo: "Da quale pocket esce" }),
      pillole((stato().pockets || []).map((p) => [p.id, p.nome]), b.pocket,
        (v) => { b.pocket = v; }),
    ]),

    el("div", { class: "campo-gruppo" }, [
      el("label", { class: "campo-etichetta", testo: "Categoria" }),
      pillole(stato().cats.map((c) => [c.id, c.nome, coloreCat(c.id)]), b.cat,
        (v) => { b.cat = v; }, { unaRiga: true }),
    ]),

    el("div", { class: "campo-gruppo" }, [
      segmenti([["si", "Attivo"], ["no", "Sospeso"]], b.attivo ? "si" : "no",
        (v) => { b.attivo = v === "si"; }),
      el("p", { class: "nota", testo: "Un ricorrente sospeso resta configurato ma sparisce da «In arrivo»." }),
    ]),

    esistente && el("button", {
      class: "btn distruttivo nudo pieno", type: "button", testo: "Elimina",
      stile: { marginTop: "var(--s6)" },
      onClick: (e) => {
        const btn = e.currentTarget;
        if (btn.dataset.sicuro !== "1") {
          btn.dataset.sicuro = "1";
          btn.textContent = "Tocca di nuovo per eliminare";
          setTimeout(() => { btn.dataset.sicuro = ""; btn.textContent = "Elimina"; }, 3000);
          return;
        }
        eliminaRicorrente(b.id);
        chiudiFoglio();
        avviso("Eliminato.");
      },
    }),
  ]);
}
