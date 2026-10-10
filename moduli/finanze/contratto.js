// moduli/finanze/contratto.js — sync, lavagna, e la scheda per la home.
//
// CONDIVISO FRA LE DUE APP, come `moduli/abitudini/contratto.js`: la app di
// prima lo usa da `modulo.js`, la app nuova (`app/`) dal registro. Il codice
// è quello di `modulo.js`, spostato e non riscritto; `quandoCambia()` è il
// solo pezzo nuovo, e serve solo alla vista vecchia.

import { oggiISO, euro, plurale, dataBreve } from "../../core/ui.js";
import { apriCanale, fondiRecord, potaLapidi } from "../../core/sync.js";
import { scriviFatto, leggiFatto, giornoCorrente } from "../../core/contesto.js";
import { annuncia } from "../../core/bus.js";
import {
  casella, stato, movimentiVivi, migra, completaTravasi, dividiPersonale, allineaV3, sistemaGruppi,
  chiusuraFatta, vociLista, statoVoce,
} from "./dati.js";
import {
  statistiche, budgetTotale, meseDi, importoEffettivo, cicloDi,
  inArrivo, ricorrentiDiOggi, calendarioUscite, prossimoStipendio, giorniFra,
} from "./calcolo.js";
import {
  quotaDi, variazioneQuota, statoObiettivo, fuoriPianoDelCiclo, ingPrevisto, soglie,
} from "./piano.js";
import { pagaCompleta } from "./paga.js";
import { allineamento, domenicaDaChiudere } from "./chiusura.js";

let ridisegnaVista = () => {};

/** La vista vecchia registra qui il proprio `disegna()`. */
export function quandoCambia(fn) { ridisegnaVista = fn || (() => {}); }

/* ------------------------------------------------------ aiuti -- */

/**
 * La prima uscita ricorrente in arrivo, pronta da mostrare.
 *
 * Serve alla home, che di «in arrivo» vuole sapere una cosa sola: la
 * prossima. L'elenco intero sta in Finanze, dove c'è lo spazio per leggerlo.
 */
function prossimaUscita(iso) {
  const v = inArrivo(30, iso).voci[0];
  if (!v) return null;
  const quando = v.fra === 0 ? "oggi" : v.fra === 1 ? "domani" : `fra ${v.fra} gg`;
  return {
    quando,
    nome: v.nome,
    importo: v.stimato
      ? `${euro(v.stimaMin, { tondo: true })}–${euro(v.stimaMax, { tondo: true })}`
      : euro(v.importo, { tondo: true }),
  };
}

/**
 * Cosa resta da fare oggi, per la checklist della home.
 *
 * NON C'È PIÙ IL CHECK QUOTIDIANO, e la ragione è che non produceva
 * niente: trenta secondi la sera per guardare quattro pallini, ogni
 * giorno, e alla fine della settimana nessun numero era cambiato. Un rito
 * che non restituisce nulla lo si fa per due settimane.
 *
 * Al suo posto due cose che restituiscono qualcosa:
 *
 *   LA CHIUSURA, la domenica sera. Riconcilia l'estratto conto, riancora i
 *   saldi, produce la pagella e il report. È il rito che impedisce ai saldi
 *   di andare in deriva — trecento euro in due mesi, l'ultima volta.
 *
 *   IL GIORNO DI PAGA, finché i quattro travasi non sono fatti. È l'unico
 *   momento del mese in cui lasciare le cose a metà costa davvero: duemila
 *   euro sul Principale sembrano tutti spendibili.
 */
function restaDaFare(iso) {
  const voci = [];
  const ora = new Date().getHours();

  const paga = cicloDi(iso).da;
  if (!pagaCompleta(paga) && iso >= paga && giorniFra(paga, iso) <= 3) {
    voci.push({
      chiave: "finanze:paga", apre: "#/finanze",
      nome: "I quattro travasi", dentro: "Finanze", emoji: "💶", tint: "lime",
      nomeFascia: "Giorno di paga", fascia: "giorno",
      quando: "adesso",
    });
  }

  /* La domenica dalle 18. Prima di quell'ora la settimana non è ancora
     andata come andrà, e un estratto conto caricato alle tre del pomeriggio
     va ricaricato la settimana dopo per gli stessi due giorni. */
  const domenica = domenicaDaChiudere(iso);
  const eDomenica = iso === domenica;
  const vecchio = allineamento(iso).vecchio;
  if ((eDomenica && ora >= 18 && !chiusuraFatta(domenica)) || vecchio) {
    voci.push({
      chiave: "finanze:chiusura", apre: "#/finanze/chiusura",
      nome: "Chiudi la settimana", dentro: "Finanze", emoji: "💶", tint: "lime",
      nomeFascia: "Sera", fascia: "sera",
      quando: vecchio ? "tardi" : ora >= 22 ? "tardi" : "adesso",
    });
  }

  /* Le voci della lista d'attesa che si sono sbloccate: ventiquattro ore
     sono passate, la decisione è tornata in mano tua. Non è un promemoria
     di comprare — è un promemoria di decidere, e la risposta può essere no. */
  const sbloccate = vociLista().filter((v) => statoVoce(v) === "sbloccata");
  if (sbloccate.length) {
    voci.push({
      chiave: "finanze:lista", apre: "#/finanze/lista",
      nome: sbloccate.length === 1 ? `${sbloccate[0].nome}: deciso?` : `${sbloccate.length} cose in lista, sbloccate`,
      dentro: "Finanze", emoji: "💶", tint: "lime",
      nomeFascia: "Quando capita", fascia: "giorno",
      quando: "adesso",
    });
  }

  return voci;
}

/* ------------------------------------------------------------- lavagna -- */

export function pubblicaSullaLavagna() {
  const oggi = giornoCorrente();
  const diOggi = movimentiVivi().filter((m) => m.data === oggi && m.tipo === "out");
  const speso = diOggi.reduce((s, m) => s + importoEffettivo(m), 0);
  if (leggiFatto("finanze", "movimenti") !== diOggi.length) scriviFatto("finanze", "movimenti", diOggi.length);
  if (leggiFatto("finanze", "speso") !== speso) scriviFatto("finanze", "speso", speso);
}

/* ---------------------------------------------------------------- sync -- */

export function avviaSync() {
  // La migrazione gira all'apertura del canale, cioè all'avvio dell'app e
  // non al montaggio del modulo: la home legge `oggi()` senza montare
  // Finanze, e leggerebbe uno stato senza pocket.
  migra();

  const canale = apriCanale({
    id: "finanze",
    file: "finanze.json",
    impacchetta: () => {
      const s = stato();
      return {
        v: 5,
        movs: s.movs,
        // RICORRENTI E PREVISTI VIAGGIANO FUORI DA `meta`, ed è il punto.
        // Dentro si fondevano come un blocco unico sul confronto di un solo
        // `metaUp`: bastava che un dispositivo con una configurazione
        // vecchia scrivesse qualunque cosa perché l'elenco dei ricorrenti
        // dell'altro venisse sostituito da quello vecchio. Fuori, si
        // fondono per record come i movimenti.
        ricorrenti: s.ricorrenti,
        previsti: s.previsti,
        /* LA LISTA D'ATTESA VIAGGIA FUORI DA `meta`, come i ricorrenti e i
           previsti, e per lo stesso motivo: dentro si fonderebbe a blocchi
           sotto il confronto di un solo `metaUp`, e basterebbe un
           dispositivo con la lista vuota che scrive qualunque altra cosa
           per portarsela via. Fuori si fonde per record, con le lapidi. */
        lista: s.lista,
        // I pocket qui fuori insieme agli altri: dentro `meta` un
        // dispositivo che non aveva mai ricevuto i saldi spediva i suoi
        // quattro zeri e li faceva vincere. Dentro c'è il denaro: è il
        // record che meno di tutti può permettersi una fusione a blocchi.
        pockets: s.pockets,
        // Una copia dentro `meta` per i dispositivi non ancora aggiornati,
        // che sanno leggerli solo lì. Costa duecento byte e evita che un
        // telefono fermo alla versione di ieri smetta di vedere i
        // ricorrenti nuovi finché non si aggiorna.
        meta: {
          cats: s.cats, profili: s.profili, rules: s.rules, config: s.config,
          pockets: s.pockets, ricorrenti: s.ricorrenti, soglie: s.soglie,
          up: s.metaUp || 0,
          // Il timestamp dei PROFILI, staccato da quello del blocco: vedi
          // `applica` qui sotto.
          profiliUp: s.profiliUp || 0,
        },
      };
    },
    applica: (remoto) => {
      casella.aggiorna((s) => {
        s.movs = potaLapidi(fondiRecord(s.movs, remoto.movs));

        // Per record, e SEMPRE — non sotto il confronto di `metaUp`. Un
        // pacchetto vecchio non può più cancellare un ricorrente che non ha
        // mai visto: può solo riportare indietro quelli che ha toccato lui.
        // `remoto.meta.ricorrenti` è il ripiego per i pacchetti vecchi, che
        // li mandavano solo lì.
        const ricRemoti = remoto.ricorrenti ?? remoto.meta?.ricorrenti;
        if (Array.isArray(ricRemoti)) {
          s.ricorrenti = potaLapidi(fondiRecord(s.ricorrenti || [], ricRemoti));
        }
        if (Array.isArray(remoto.previsti)) {
          s.previsti = potaLapidi(fondiRecord(s.previsti || [], remoto.previsti));
        }
        if (Array.isArray(remoto.lista)) {
          s.lista = potaLapidi(fondiRecord(s.lista || [], remoto.lista));
        }
        // I pocket non si potano: sono quattro, fissi, e una lapide su un
        // pocket vorrebbe dire perdere un saldo.
        const pkRemoti = remoto.pockets ?? remoto.meta?.pockets;
        if (Array.isArray(pkRemoti)) {
          s.pockets = fondiRecord(s.pockets || [], pkRemoti);
        }

        const rm = remoto.meta;

        /* QUELLO CHE SI ACCUMULA SI SOMMA SEMPRE, FUORI DAL CANCELLO.

           `metaUp` è un cancello per le impostazioni, e per quelle va bene:
           il profilo, le categorie, le soglie sono valori che si
           sostituiscono, e vince chi ha scritto per ultimo. Ma il
           vocabolario appreso e i check giornalieri non sono impostazioni:
           sono STORIA, si aggiungono e non si tolgono mai. Metterli dietro
           lo stesso cancello vuol dire che basta un `metaUp` più fresco per
           cancellarli, e un `metaUp` più fresco lo produce qualunque
           scrittura — perfino salvare i saldi.

           È successo il 2 settembre, due volte in un'ora. La seconda con
           questa sequenza: alle 21:17 il repo aveva 17 regole e 6 check,
           alle 21:22 il telefono ha salvato i saldi (che alza `metaUp` in
           locale, prima ancora di leggere), alle 21:24 ha letto e ha
           RIFIUTATO il blocco remoto perché «vecchio», alle 21:35 ha
           rispedito il suo, che di regole ne aveva zero. Una gara che chi
           ha i dati buoni perde sempre.

           Sommandoli sempre, un dispositivo con la memoria vuota non può
           più cancellare niente: al massimo non aggiunge. L'unione non
           toglie mai una chiave, quindi non c'è un caso in cui questo
           faccia perdere qualcosa. */
        if (rm?.rules) s.rules = { ...s.rules, ...rm.rules };
        if (rm?.config?.checks) {
          s.config.checks = { ...rm.config.checks, ...(s.config.checks || {}) };
        }
        /* Le chiusure settimanali, i travasi della paga e gli sblocchi:
           stessa regola dei check, e la ragione e' la stessa. Non sono
           impostazioni, sono STORIA — «la settimana del 12 l'ho chiusa» non
           smette di essere vero perche' l'altro dispositivo non lo sa. Sotto
           il cancello di `metaUp` basterebbe un salvataggio qualunque, anche
           dei saldi, per cancellare un contatore di nove settimane. */
        if (rm?.config?.chiusure) {
          s.config.chiusure = { ...rm.config.chiusure, ...(s.config.chiusure || {}) };
        }
        if (rm?.config?.pagaFatta) {
          const mio = s.config.pagaFatta || {};
          const fuso = { ...rm.config.pagaFatta };
          // Per data, l'UNIONE dei travasi fatti: due dispositivi possono
          // averne spuntati due diversi, e nessuno dei due e' da disfare.
          for (const [k, v] of Object.entries(mio)) {
            fuso[k] = [...new Set([...(fuso[k] || []), ...v])];
          }
          s.config.pagaFatta = fuso;
        }
        if (Array.isArray(rm?.config?.sblocchi)) {
          const visti = new Set((s.config.sblocchi || []).map((x) => `${x.ts}`));
          s.config.sblocchi = [
            ...(s.config.sblocchi || []),
            ...rm.config.sblocchi.filter((x) => !visti.has(`${x.ts}`)),
          ].sort((a, b) => a.ts - b.ts).slice(-50);
        }

        /* I PROFILI HANNO UN CONFRONTO LORO, FUORI DAL CANCELLO.

           Dentro, bastava un `metaUp` più fresco per un motivo qualunque —
           il check della sera, un saldo salvato — perché un dispositivo con
           i profili di fabbrica sostituisse quelli veri dell'altro. Nella
           cronologia di atlas-dati `cassaCats` rimbalza fra 9 e 3 dal 26
           agosto: non era un valore perso, erano due dispositivi che se lo
           rimandavano.

           È la terza volta che questo schema si ripete — prima i ricorrenti,
           poi i pocket, adesso i profili — e la cura è sempre la stessa: un
           `up` per la cosa, e il confronto fra le due versioni DI QUELLA
           COSA. Un `profiliUp` a zero è la fabbrica, e non vince mai. */
        const profUp = rm?.profiliUp || 0;
        if (rm?.profili && profUp > (s.profiliUp || 0)) {
          s.profili = rm.profili;
          s.profiliUp = profUp;
        }

        if (rm && (rm.up || 0) > (s.metaUp || 0)) {
          if (rm.cats?.length) s.cats = rm.cats;
          // `checks` sopravvive allo spread: l'ha appena unito la riga di
          // sopra, e qui il blocco remoto lo riporterebbe a quelli suoi.
          if (rm.config) {
            s.config = {
              ...s.config, ...rm.config,
              // Questi quattro li hanno appena uniti le righe di sopra: il
              // blocco remoto li riporterebbe a quelli suoi.
              checks: s.config.checks,
              chiusure: s.config.chiusure,
              pagaFatta: s.config.pagaFatta,
              sblocchi: s.config.sblocchi,
            };
          }
          if (rm.soglie) s.soglie = { ...s.soglie, ...rm.soglie };
          s.metaUp = rm.up;
        }
      }, { origine: "sync", tocca: false });
    },
    ridisegna: () => {
      // La riparazione dei travasi a metà gira QUI, dopo che il canale ha
      // letto il repo, e non in `migra()` all'avvio. Riparare prima di
      // leggere darebbe a un record un `up` più fresco di una lapide messa
      // dall'altro dispositivo — e un movimento cancellato sul PC tornerebbe
      // in vita dal telefono. È la regola «chi non ha letto non scrive»,
      // applicata a una scrittura che parte da sola.
      if (canale.letturaFatta) completaTravasi();
      /* La divisione di «Personale» in Cura e Svago: stessa regola, stesso
         gancio. Rimappa i movimenti gia' registrati e riscrive categorie e
         profili DENTRO l'archivio — le costanti bastano a chi installa da
         zero, non a chi ha gia' i dati. Gira una volta sola: il marchio sta
         in `config.bloccoCategorie`.

         `stato === "off"` vuol dire sync non configurato: li' non c'e'
         nessuna lettura da aspettare, e aspettarla vorrebbe dire non
         migrare mai — chi non ha messo il token resterebbe con «Personale»
         per sempre. */
      migraCategorie();
      pubblicaSullaLavagna();
      ridisegnaVista();
    },
  });

  // La lavagna si aggiorna anche a modulo chiuso: la home la legge, e se si
  // scrivesse solo al montaggio mostrerebbe i numeri dell'ultima volta che
  // sei passato di qui.
  pubblicaSullaLavagna();

  casella.osserva((_, origine) => {
    if (origine === "sync") return;
    canale.segnalaModifica();
    annuncia("finanze:movimento-registrato", {});
  });

  /* IL GANCIO, e perche' sta in due posti.

     `ridisegna` scatta dopo ogni lettura del repo: e' li' che la
     migrazione deve girare, perche' «chi non ha letto non scrive». Ma col
     sync NON configurato `avvia()` esce subito e `ridisegna` non viene
     chiamata mai: senza la seconda chiamata, chi non ha messo il token
     resterebbe con «Personale» per sempre. */
  function migraCategorie() {
    if (!canale.letturaFatta && canale.stato !== "off") return;
    /* DUE MIGRAZIONI, DUE MARCHI, E DUE CHIAMATE SEPARATE.
    
       Era `dividiPersonale() || allineaV3()`, e il corto circuito dell'`||`
       se l'e' mangiata: su un archivio che non aveva mai visto nessuna delle
       due, la prima tornava `true` e la seconda non veniva nemmeno
       chiamata. Col sync spento `ridisegna` non scatta mai, quindi non
       c'era un secondo giro: i saldi restavano quelli sbagliati, l'obiettivo
       non compariva e i ricorrenti erano quelli vecchi.
    
       Entrambe sono idempotenti e si marcano da sole: chiamarle tutte e due
       sempre e' l'unica forma che non dipende dall'ordine. */
    const divisa = dividiPersonale();
    const allineata = allineaV3();
    // La terza, stesso trattamento: marchio suo, chiamata sua. Assegna le
    // sottocategorie che mancavano ai cinque gruppi dell'Analisi.
    const sistemata = sistemaGruppi();
    if (!divisa && !allineata && !sistemata) return;
    pubblicaSullaLavagna();
    ridisegnaVista();
  }

  canale.avvia();
  migraCategorie();
  return canale;
}

/* ------------------------------------------------ la scheda per la home -- */

/**
 * Quello che la home di ATLAS mostra di Finanze.
 *
 * UN NUMERO SOLO, ed è la quota di oggi. La carta ne ha mostrati tre —
 * quanto c'è nelle tasche, quanto è uscito oggi, quanto al giorno — tutti
 * della stessa misura: a colpo d'occhio non si capiva quale fosse la
 * risposta a «posso spendere stasera». Ed è la STESSA quota che si legge
 * dentro Finanze, con le stesse parole: due schermate che dicono due numeri
 * per la stessa domanda sono due app.
 *
 * Sotto, soltanto quello che può ribaltare quel numero nel giro di poche
 * ore: le scadenze che bruciano. Non le prossime sei — sei righe di
 * scadenze in home sono un estratto conto, si smettono di leggere, e con
 * loro si smette di vedere quella che conta.
 */
export function oggi() {
  migra();
  const iso = oggiISO();
  const st = statistiche(meseDi());
  if (!st.nMovimenti && !budgetTotale(meseDi())) return null;

  const ciclo = cicloDi(iso);
  const q = quotaDi(iso);
  const obi = statoObiettivo(iso);
  const fp = fuoriPianoDelCiclo(ciclo, iso);
  const ing = ingPrevisto(iso);
  const sg = soglie();
  const arrivo = inArrivo(3650, iso);
  const oggiRic = ricorrentiDiOggi(iso);
  const delta = variazioneQuota(iso);

  /* L'ALLARME È UNO SOLO, e in ordine di quanto è urgente. Tre allarmi
     insieme non sono tre informazioni: sono un muro di testo rosso in cui
     quello che conta sta in mezzo agli altri due. */
  let allarme = null;
  if (q.resta < 0) {
    allarme = `Oggi hai speso ${euro(q.speso)}, la quota era ${euro(q.quota)}.`;
  } else if (arrivo.scopertoTotale > 0) {
    allarme = `Mancano ${euro(arrivo.scopertoTotale)} per coprire quello che scade prima del ${dataBreve(ciclo.a)}.`;
  } else if (q.quota < (sg.quotaMinima || 0)) {
    allarme = `Quota di oggi ${euro(q.quota)}: ${plurale(q.giorni, "giorno", "giorni")} con ${euro(q.spendibile)}.`;
  } else if (ing.sotto) {
    allarme = `ING scende a ${euro(ing.minimo, { tondo: true })} il ${dataBreve(ing.quando)}.`;
  } else if (obi && !obi.inLinea) {
    allarme = `${obi.nome}: indietro di ${euro(-obi.scarto, { tondo: true })}.`;
  }

  /* IL DETTAGLIO: quello che ribalta il numero, in ordine di quanto lo
     ribalta. Un addebito che esce OGGI viene prima di tutto — è l'unica
     cosa che può rendere falsa la quota nel giro di poche ore. */
  const pezzi = [];
  if (oggiRic.length) {
    pezzi.push(oggiRic.length === 1
      ? `Oggi esce ${oggiRic[0].nome.toLowerCase()} · ${euro(oggiRic[0].importo, { tondo: true })}`
      : `Oggi escono ${oggiRic.length} addebiti · ${euro(oggiRic.reduce((t, r) => t + r.importo, 0), { tondo: true })}`);
  }
  if (q.speso > 0) pezzi.push(`speso ${euro(q.speso)}, restano ${euro(q.resta)}`);
  else pezzi.push(`${euro(q.spendibile)} fino al ${dataBreve(q.fine)}`);
  if (fp.n) pezzi.push(`fuori piano ${fp.n} · ${euro(fp.totale, { tondo: true })}`);

  return {
    titolo: "Finanze",

    /* `valore` ed `eti` sono il numero grande della carta larga. L'etichetta
       la scrive il modulo e non la home: era «restano questa settimana»
       scritto a mano lì, e diceva una cosa falsa. */
    valore: euro(q.quota),
    eti: `quota di oggi · ${plurale(q.giorni, "giorno", "giorni")} allo stipendio`,

    /* I due campi della carta piccola. Li formatta il modulo e non la home
       perché è il modulo a sapere che gli importi sono centesimi: passarli
       grezzi vorrebbe dire insegnarlo alla home. */
    oggiPuoi: euro(q.quota),
    oggiFino: q.speso > 0
      ? `speso ${euro(q.speso)} · restano ${euro(q.resta)}`
      : `${euro(q.spendibile)} fino al ${dataBreve(q.fine)}`,

    dettaglio: pezzi.join(" · "),
    allarme,
    urgente: q.resta < 0 || arrivo.scopertoTotale > 0 || q.quota < (sg.quotaMinima || 0),

    /* La barra della carta: quanto della quota di oggi è già andato. Era
       l'avanzamento della settimana, che su una carta che mostra un numero
       giornaliero misurava un'altra cosa. */
    avanzamento: q.quota > 0 ? Math.min(1, Math.max(0, q.speso / q.quota)) : 0,

    /* SOLO QUELLO CHE BRUCIA. `tono` lo assegna già `comeEvento()` — rosso
       se il pocket non la copre, ambra se esce entro due giorni — e quelle
       due sole sono le uscite che cambiano la risposta di stasera. */
    urgenti: calendarioUscite(iso, 6, 30).filter((e) => e.tono).slice(0, 2),

    // La home lo mette in una frase: «ti manca segnare le spese» non ha
    // senso — Finanze non è una cosa da fare, è una cosa da guardare. Solo
    // quando c'è una decisione vera da prendere c'è qualcosa da dire.
    mancaTesto: q.resta < 0 ? "una decisione sui soldi" : null,

    // I numeri in piu' per chi li vuole: niente li obbliga a esserci, ma
    // costano niente e la carta larga della home puo' crescere senza
    // tornare qui.
    quota: q.quota,
    spesoOggi: euro(q.speso),
    alGiorno: euro(q.quota),
    variazione: delta,
    obiettivo: obi ? {
      nome: obi.nome,
      saldo: euro(obi.saldo, { tondo: true }),
      target: euro(obi.target, { tondo: true }),
      frazione: obi.frazione,
      inLinea: obi.inLinea,
      gap: euro(obi.gap, { tondo: true }),
    } : null,
    fuoriPiano: { n: fp.n, totale: euro(fp.totale, { tondo: true }), giorniSenza: fp.giorniSenza },
    prossima: prossimaUscita(iso),
    prossimoStipendio: prossimoStipendio(iso),
    calendario: calendarioUscite(iso, 6, 14),

    resta: restaDaFare(iso),

    azione: { rotta: "#/finanze" },
  };
}
