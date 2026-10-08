<!--
  Uno slot aperto: che cosa si fa stasera.

  Prima era un paragrafo e un elenco puntato — «Stacco 5×3 @ 100 kg» e sotto
  cinque righe di testo piccolo. Tutto quello che serve sapere in palestra
  c'era dentro, e non si vedeva niente: quante serie in tutto, quale
  esercizio viene ora, dove arriva il lavoro.

  Ora la seduta si legge in tre livelli. La CIFRA in cima (le serie totali,
  perché è la misura del «quanto dura»), il CORPO con i gruppi accesi (dove
  arriva), e le SCHEDE degli esercizi — una per riga, serie e ripetizioni
  grandi, il carico a parte, i muscoli sotto. Toccarne una accende solo i
  suoi muscoli sul corpo: è l'unico modo per rispondere a «questo cos'è che
  allena» senza cercarlo su internet a metà seduta.

  Il resto — Garmin, Hevy, il giorno — non è cambiato: funzionava.
-->
<script lang="ts">
  import Foglio from "$lib/ui/Foglio.svelte";
  import Sezione from "$lib/ui/Sezione.svelte";
  import Pulsante from "$lib/ui/Pulsante.svelte";
  import Pillole from "$lib/ui/Pillole.svelte";
  import Riga from "$lib/ui/Riga.svelte";
  import Corpo from "./Corpo.svelte";
  import { dati } from "$lib/core/reattivo.svelte";
  import { quandoCorto } from "./comune";
  import { avviso, tocco, piuGiorni, plurale, dataUmana, oggiISO } from "$lib/core/ui";
  import { slide } from "svelte/transition";
  import {
    slotDi, fatto, giornoSlot, alternaSlot, scegliGiorno, inizioSettimana, fineSettimana, recordSlot, ripristinaSlot, togliBonus,
    oraDi, scegliOra, oraPredefinita, cambiaSlot, UPPER_B, durataDi, sedutaDelGiorno, OBIETTIVO,
  } from "$condivisi/allenamenti/dati.js";
  import { km, passo, mmss, distanza, descriviPezzi } from "$condivisi/allenamenti/calcolo.js";
  import { leggiRiga, gruppiSeduta, serieTotali } from "$condivisi/allenamenti/muscoli.js";
  import { leggiAllenamento, descrivi } from "$condivisi/allenamenti/passi.js";
  import { fileAllenamento, scarica } from "$condivisi/allenamenti/fit.js";
  import * as hevy from "$condivisi/allenamenti/hevy.js";
  import { allenamentoJSON } from "$condivisi/allenamenti/garmin.js";

  let { aperto = $bindable(false), id }: { aperto: boolean; id: string | null } = $props();

  const s = $derived.by(() => {
    dati.versione;
    if (!id) return null;
    const n = Number(id.slice(1, 3));
    return (slotDi(n) as any[]).find((x) => x.id === id) ?? null;
  });
  const f = $derived.by(() => { dati.versione; return id ? fatto(id) : false; });
  const giorno = $derived.by(() => { dati.versione; return id ? giornoSlot(id) : ""; });
  const coperto = $derived.by(() => { dati.versione; return Boolean(id && recordSlot(id)?.testo); });
  const ora = $derived.by(() => { dati.versione; return s ? oraDi(s) : ""; });

  /* CHI C'E' GIA' IN QUEL GIORNO. Il piano lascia i giorni liberi, quindi
     mettere due allenamenti lo stesso giorno non e' vietato — ma quasi
     sempre e' una svista, e scoprirlo il giorno stesso costa una seduta.
     Il pallino lo dice prima; la conferma lo dice al momento di farlo. */
  const occupanti = $derived.by(() => {
    dati.versione;
    if (!s) return new Map<string, string[]>();
    const m = new Map<string, string[]>();
    for (const x of slotDi(s.sett) as any[]) {
      if (x.id === s.id) continue;
      const g = giornoSlot(x.id);
      if (!g) continue;
      m.set(g, [...(m.get(g) || []), x.nome]);
    }
    return m;
  });

  /* I GIORNI VERI DI QUELLA SETTIMANA, con la loro iniziale.

     Erano sette a partire dall'inizio, etichettati L M M G V S D per
     posizione. Finche' ogni settimana cominciava di lunedi' combaciava; da
     quando la prima puo' essere corta no: la settimana 1 parte di
     mercoledi', quindi la pastiglia «L» era il 30 settembre e le ultime due
     sconfinavano nella settimana dopo. L'iniziale si prende dalla DATA, e
     la lista finisce dove finisce la settimana. */
  const giorni = $derived.by(() => {
    if (!s) return [];
    const da = inizioSettimana(s.sett), a = fineSettimana(s.sett);
    const fuori = [];
    for (let id = da; id <= a; id = piuGiorni(id, 1)) {
      fuori.push({
        id,
        testo: quandoCorto(id),
        punto: (occupanti.get(id) || []).length > 0,
      });
    }
    return fuori;
  });

  /* ===================================================================
     HO FATTO ALTRO.

     Il pannello si apre dentro il foglio, non sopra: due fogli impilati su
     un telefono non si leggono, ed e' lo stesso motivo per cui la conferma
     del conflitto sta in linea.

     Le SCORCIATOIE sono le altre sedute della fase. Il caso vero non e'
     «ho inventato un allenamento»: e' «siamo andati a fare la lunga invece
     degli intervalli», e quello deve costare due tocchi. Il testo libero
     resta per il calcetto.
     =================================================================== */
  let cambio = $state(false);
  let cNome = $state("");
  let cTesto = $state("");
  let cGenere = $state<"corsa" | "palestra" | "altro">("altro");
  let cDurata = $state("");
  /* I PEZZI. Una riga sola e' una corsa normale; tre righe sono le ripetute
     in pista. Non ci sono due modi di inserire una corsa, ce n'e' uno — e
     la riga in piu' si aggiunge solo quando serve. */
  let pezzi = $state<{ dist: string; tempo: string }[]>([{ dist: "", tempo: "" }]);
  /* `unisci` dice che quei pezzi vengono dalle corse GIA' registrate di quel
     giorno: al salvataggio si fondono quelle invece di crearne una a mano,
     o i chilometri si conterebbero due volte. */
  let unisci = $state(false);

  $effect(() => { if (!aperto) cambio = false; });

  /* ------------------------------------------------ i conti dei pezzi ---
     «3000» sono metri, «3» sono chilometri. La soglia e' ottanta: sotto non
     esiste una ripetuta in chilometri, sopra non esiste una corsa in metri.
     Il valore normalizzato si mostra sotto il campo, cosi' non c'e' niente
     da indovinare. */
  function aKm(t: string) {
    const n = Number(String(t || "").replace(",", ".").trim());
    if (!Number.isFinite(n) || n <= 0) return 0;
    return n >= 80 ? Math.round(n) / 1000 : Math.round(n * 1000) / 1000;
  }
  /** «48:30», «1:02:10», «52» (minuti) → secondi. Zero se non si capisce. */
  function aSecondi(t: string) {
    const grezzo = String(t || "").trim();
    if (!grezzo) return 0;
    const parti = grezzo.split(":").map((x) => Number(x.replace(",", ".")));
    if (!parti.length || parti.some((x) => !Number.isFinite(x))) return 0;
    if (parti.length === 1) return Math.round(parti[0] * 60);
    if (parti.length === 2) return Math.round(parti[0] * 60 + parti[1]);
    return Math.round(parti[0] * 3600 + parti[1] * 60 + parti[2]);
  }
  const numero = (t: string) => Number(String(t || "").replace(",", ".")) || 0;

  const letti = $derived(pezzi.map((p) => {
    const k = aKm(p.dist);
    const s = aSecondi(p.tempo);
    return { km: k, secondi: s, passo: k > 0 && s > 0 ? s / k : 0 };
  }));
  const totale = $derived({
    km: Math.round(letti.reduce((t, p) => t + p.km, 0) * 100) / 100,
    secondi: letti.reduce((t, p) => t + p.secondi, 0),
  });

  /* IL PASSO SI PUO' SCRIVERE AL POSTO DEL TEMPO, e sulla pista e' il modo
     in cui lo sai: «3 km a ritmo gara» sono 4:24/km, non 13:12. Scrivendolo
     li', il tempo si calcola — e viceversa. */
  function passoScritto(i: number, testo: string) {
    const sec = aSecondi(testo);
    const k = aKm(pezzi[i].dist);
    if (!sec || !k) return;
    pezzi[i].tempo = mmss(sec * k);
  }

  /** Le corse gia' registrate nel giorno dello slot: i pezzi sono li'. */
  const corseDelDi = $derived.by(() => {
    dati.versione;
    return sedutaDelGiorno(giorno || oggiISO());
  });

  function prendiLeCorse() {
    const s2 = corseDelDi;
    if (!s2) return;
    pezzi = s2.pezzi.map((g: any) => ({
      dist: g.km < 1 ? String(Math.round(g.km * 1000)) : String(g.km).replace(".", ","),
      tempo: g.secondi ? mmss(g.secondi) : "",
    }));
    unisci = true;
    cGenere = "corsa";
    if (!cNome.trim()) cNome = s2.corse.find((c: any) => c.titolo && c.titolo !== "Corsa")?.titolo || "";
    tocco(8);
  }

  /** Le altre sedute della settimana, piu' la Upper B: le scorciatoie. */
  const alternative = $derived.by(() => {
    dati.versione;
    if (!s) return [];
    const altre = (slotDi(s.sett) as any[])
      .filter((x) => x.id !== s.id && !x.bonus)
      .map((x) => ({
        id: x.id, testo: x.nome, nome: x.nome, genere: x.genere,
        corpo: (x.lift ? [x.lift, ...(x.accessori || [])].join(" · ") : x.testo) || "",
        km: x.km || 0,
      }));
    return [
      ...altre,
      { id: "upperB", testo: UPPER_B.nome, nome: UPPER_B.nome, genere: "palestra", corpo: UPPER_B.testo, km: 0 },
    ];
  });

  function preparaCambio() {
    if (!s) return;
    const r = recordSlot(s.id);
    cambio = true;
    unisci = false;
    // Se l'avevi gia' cambiato, si riparte da quello che avevi scritto.
    cNome = r?.nome || "";
    cTesto = r?.cambiato ? (r.testo || "") : "";
    cGenere = (r?.genere || s.genere) as any;
    cDurata = r?.durata ? String(r.durata) : "";
    const giri = r?.cambiato ? (r.giri as any[] | undefined) : undefined;
    pezzi = giri?.length
      ? giri.map((g) => ({
          dist: g.km < 1 ? String(Math.round(g.km * 1000)) : String(g.km).replace(".", ","),
          tempo: g.secondi ? mmss(g.secondi) : "",
        }))
      : [{ dist: r?.cambiato && r.km ? String(r.km).replace(".", ",") : "", tempo: "" }];
  }

  function scorciatoia(a: any) {
    cNome = a.nome;
    cTesto = a.corpo;
    cGenere = a.genere;
    pezzi = [{ dist: a.km ? String(a.km).replace(".", ",") : "", tempo: "" }];
    unisci = false;
  }

  const cValido = $derived(Boolean(cNome.trim() || cTesto.trim()));

  function salvaCambio() {
    if (!s || !cValido) return;
    const giri = cGenere === "corsa" ? letti.filter((p) => p.km > 0) : [];
    /* IL TESTO LO SCRIVONO I PEZZI quando ci sono. Chiedere di descrivere a
       parole una cosa che hai appena misurato in tre righe e' chiedere due
       volte lo stesso dato — e la seconda volta viene scritta peggio. */
    const testo = cTesto.trim() || (giri.length > 1 ? descriviPezzi(giri) : "");
    cambiaSlot(s.id, {
      nome: cNome.trim() || undefined,
      testo,
      genere: cGenere,
      giri,
      // Solo la durata scritta a mano: dal tempo della corsa la deduce
      // `cambiaSlot`, che e' il posto in cui la sa chiunque la chiami.
      durata: numero(cDurata),
      data: giorno || undefined,
      unisci: unisci && giri.length > 0,
    });
    /* E SI SPUNTA. Il pannello chiede «cosa hai fatto davvero», al passato:
       chi lo compila ha gia' fatto quella seduta, e lasciargli poi premere
       «Segna come fatto» sarebbe chiedere due volte la stessa cosa — con il
       rischio, molto concreto, che la seconda se la dimentichi e la
       settimana resti aperta su un allenamento finito. */
    const spuntato = f;
    if (!spuntato) alternaSlot(s.id, giorno || undefined);
    cambio = false;
    tocco(14);
    avviso(totale.km > 0
      ? `${spuntato ? "Cambiato" : "Fatto"}. ${km(totale.km)} nei conti della settimana.`
      : spuntato ? "Cambiato." : "Fatto.");
  }

  /** Lo spostamento in attesa di conferma: `null` quando non c'e' niente da chiedere. */
  let conflitto = $state<{ giorno: string; chi: string[] } | null>(null);
  $effect(() => { if (!aperto) conflitto = null; });
  const letto = $derived(s?.genere === "corsa" ? leggiAllenamento(s.testo) : null);
  let creo = $state(false);

  /* LA SEDUTA LETTA. Il lift principale è il primo esercizio, non una cosa
     a parte: in palestra si fa per primo e basta. Ma resta marcato, perché
     è l'unico che cambia carico di settimana in settimana. */
  const seduta = $derived.by(() => {
    if (!s || s.genere !== "palestra") return null;
    /* DUE FORME DELLA STESSA COSA. Il blocco scritto a mano tiene il lift
       principale a parte dagli accessori; un allenamento importato è una
       riga sola con gli esercizi separati da «·», perché è così che lo
       scrive una chat e sarebbe assurdo chiedere due colonne per questo.
       Da qui in giù non c'è differenza: sono esercizi. */
    const righe = (s.lift
      ? [s.lift, ...(s.accessori || [])]
      : String(s.testo || "").split(/\s*[·;]\s*/)
    ).map((x: string) => String(x).trim()).filter(Boolean) as string[];
    if (!righe.length) return null;
    return {
      righe,
      esercizi: righe.map((r, i) => ({ ...leggiRiga(r)!, principale: i === 0 && Boolean(s.lift) })),
      gruppi: gruppiSeduta(righe),
      serie: serieTotali(righe),
    };
  });

  // L'esercizio che stai guardando. Null = tutta la seduta insieme.
  let scelto = $state<number | null>(null);
  $effect(() => { id; aperto; scelto = null; });

  const acceso = $derived.by(() => {
    if (!seduta) return { primari: [], secondari: [] };
    if (scelto === null) {
      const g = seduta.gruppi;
      // Con tutta la seduta insieme: primario chi prende almeno un quarto
      // del lavoro del gruppo più colpito. Accendere tutto uguale direbbe
      // che un giorno di gambe allena i bicipiti quanto i quadricipiti.
      const massimo = g[0]?.serie || 1;
      return {
        primari: g.filter((x: any) => x.serie >= massimo * 0.34).map((x: any) => x.id),
        secondari: g.filter((x: any) => x.serie < massimo * 0.34).map((x: any) => x.id),
      };
    }
    const e = seduta.esercizi[scelto];
    return { primari: e.primari, secondari: e.secondari };
  });

  const NOMI: Record<string, string> = {
    petto: "Petto", spalle: "Spalle", bicipiti: "Bicipiti", avambracci: "Avambracci",
    addome: "Addome", obliqui: "Obliqui", quadricipiti: "Quadricipiti", adduttori: "Adduttori",
    tibiali: "Tibiali", trapezio: "Trapezio", dorsali: "Dorsali", deltoidiPost: "Deltoidi post.",
    tricipiti: "Tricipiti", lombari: "Lombari", glutei: "Glutei", femorali: "Femorali", polpacci: "Polpacci",
  };
  const serieTonde = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ","));

  function alterna() {
    if (!s) return;
    alternaSlot(s.id);
    tocco(14);
    aperto = false;
  }

  /* IL GIORNO È UNA SCELTA, NON UN OBBLIGO: il piano dice «giorni liberi».
     Chi non vuole pianificare spunta e basta. Toccare di nuovo lo toglie. */
  function giornoScelto(v: string[]) {
    if (!s) return;
    const scelto = v[0];
    // Toccare di nuovo il giorno scelto lo toglie: non c'e' niente da chiedere.
    if (!scelto || scelto === giorno) { conflitto = null; scegliGiorno(s.id, ""); return; }
    const chi = occupanti.get(scelto) || [];
    if (chi.length) { conflitto = { giorno: scelto, chi }; return; }
    conflitto = null;
    scegliGiorno(s.id, scelto);
  }

  function confermaConflitto() {
    if (!s || !conflitto) return;
    scegliGiorno(s.id, conflitto.giorno);
    conflitto = null;
    tocco(12);
  }

  async function copiaGarmin() {
    if (!s || !letto) return;
    try {
      const j = allenamentoJSON(`${s.nome} · S${s.sett}`, letto.passi, `Da ATLAS — ${OBIETTIVO.nome}`);
      await navigator.clipboard.writeText(JSON.stringify(j));
      avviso("Copiato. Apri Connect → Allenamenti e tocca il segnalibro.");
    } catch (e: any) {
      avviso(`Non riesco a copiare: ${e.message}`, { tipo: "errore" });
    }
  }

  function scaricaFit() {
    if (!s || !letto) return;
    try {
      scarica(`atlas-s${s.sett}-${s.chiave}.fit`, fileAllenamento(`${s.nome} S${s.sett}`, letto.passi));
      avviso("Salvato. Copialo in GARMIN/NewFiles con il cavo USB.");
    } catch (e: any) {
      avviso(`Non riesco a costruire il file: ${e.message}`, { tipo: "errore" });
    }
  }

  async function creaSuHevy() {
    if (!s) return;
    creo = true;
    try {
      const { mancanti } = await hevy.creaRoutine({
        titolo: `${s.nome} · Settimana ${s.sett}`,
        note: `Da ATLAS — ${OBIETTIVO.nome}`,
        /* LE STESSE RIGHE CHE VEDI SOPRA. Qui c'era `[lift, ...accessori]`,
           che un allenamento importato non ha: gli esercizi stanno nel testo
           separati da «·». A Hevy arrivava una lista vuota e l'errore diceva
           «nessuno di questi esercizi esiste nel catalogo» — vero, perché non
           ce n'era nessuno. Una sola fonte, quella che il foglio disegna. */
        righe: seduta?.righe ?? [],
      });
      aperto = false;
      avviso(mancanti.length
        ? `Creata. ${mancanti.length} esercizi non erano nel catalogo: ${mancanti.join(", ")}.`
        : "Routine creata su Hevy.", { durata: mancanti.length ? 5200 : 2400 });
    } catch (e: any) {
      avviso(e.message, { tipo: "errore", durata: 4200 });
    } finally {
      creo = false;
    }
  }
</script>

<Foglio bind:aperto titolo={s?.nome ?? ""}>
  {#if s}
    {#if seduta}
      <!-- LA CIFRA: quanto lavoro è, prima di qualunque dettaglio. -->
      <div class="eroe">
        <div class="numeri">
          <span class="text-footnote etichetta">Settimana {s.sett}</span>
          <span class="cifra cifre">{seduta.serie}</span>
          <span class="text-subheadline secondario">
            serie · {plurale(seduta.esercizi.length, "esercizio", "esercizi")}
          </span>
        </div>
        <div class="gruppi-eroe">
          {#each seduta.gruppi.slice(0, 4) as g (g.id)}
            <span class="pillola text-caption1">{NOMI[g.id] ?? g.id} <b class="cifre">{serieTonde(g.serie)}</b></span>
          {/each}
        </div>
      </div>

      <Sezione titolo="Dove arriva" piede={scelto === null
        ? "Pieno: il lavoro grosso. A metà: quello che partecipa. Tocca un esercizio qui sotto per vedere solo il suo."
        : `Solo ${seduta.esercizi[scelto].nome}. Tocca di nuovo per tornare a tutta la seduta.`}>
        <div class="mappa">
          <Corpo primari={acceso.primari} secondari={acceso.secondari} />
        </div>
      </Sezione>

      <Sezione titolo="La seduta">
        {#each seduta.esercizi as e, i (e.testo)}
          <button type="button" class="esercizio" class:scelto={scelto === i} onclick={() => { scelto = scelto === i ? null : i; tocco(6); }}>
            <span class="posto cifre">{i + 1}</span>
            <span class="centro">
              <span class="nome text-body">
                {e.nome}
                {#if e.principale}<span class="tag text-caption2">principale</span>{/if}
              </span>
              {#if e.primari.length || e.secondari.length}
                <span class="muscoli text-caption1 secondario">
                  {#each e.primari as g (g)}<span class="punto forte"></span>{NOMI[g] ?? g}{/each}
                  {#each e.secondari as g (g)}<span class="punto"></span>{NOMI[g] ?? g}{/each}
                </span>
              {/if}
            </span>
            <span class="lavoro">
              {#if e.serie}
                <span class="serie cifre">{e.serie}<i>×</i>{e.ripetizioni}</span>
              {:else}
                <span class="serie cifre piccolo">—</span>
              {/if}
              {#if e.carico}<span class="carico text-caption1 secondario cifre">{e.carico}</span>{/if}
            </span>
          </button>
        {/each}
      </Sezione>
    {:else}
      <Sezione piede={s.km ? `Circa ${km(s.km)} nel conteggio della settimana.` : undefined}>
        <div class="lavoro-testo"><p class="text-body">{s.testo}</p></div>
      </Sezione>
    {/if}

    <Pulsante variante={f ? "grigio" : "pieno"} larga icona={f ? undefined : "spunta"} onclick={alterna}>
      {f ? "Riapri lo slot" : "Segna come fatto"}
    </Pulsante>

    <!-- HO FATTO ALTRO. Sta subito sotto la spunta perche' e' li' che
         serve: apri lo slot per segnarlo fatto e ti accorgi che quello che
         hai fatto non era questo. -->
    {#if !cambio}
      <Pulsante variante="testo" larga onclick={preparaCambio}>
        {s.cambiato && s.aMano ? "Cambia di nuovo" : "Ho fatto un altro allenamento"}
      </Pulsante>
    {:else}
      <Sezione titolo="Cosa hai fatto davvero"
        piede="Resta questo slot — il giorno non si perde — e si spunta da sé: lo stai compilando al passato. Cambiano il nome, il contenuto, i km e i conti della settimana.">
        <div class="blocco">
          <Pillole
            opzioni={alternative}
            scelte={[]}
            controllato
            oncambio={(v) => { const a = alternative.find((x: any) => x.id === v[0]); if (a) scorciatoia(a); }}
            etichetta="Al posto di questo ho fatto"
          />
        </div>

        <Riga titolo="Nome">
          {#snippet fine()}
            <input class="campo" type="text" bind:value={cNome} placeholder={s.nome} aria-label="Nome dell'allenamento" />
          {/snippet}
        </Riga>

        <div class="blocco">
          <Pillole
            opzioni={[{ id: "corsa", testo: "Corsa" }, { id: "palestra", testo: "Palestra" }, { id: "altro", testo: "Altro" }]}
            scelte={[cGenere]}
            oncambio={(v) => (cGenere = v[0] as any)}
            etichetta="Genere"
          />
        </div>

        {#if cGenere === "corsa"}
          <!-- I PEZZI SONO IL PUNTO. Senza numeri il cambio resta
               un'etichetta: andamento, tetto della lunga e proiezione sui 5
               km leggono le corse, e una corsa senza numeri per loro non e'
               una corsa. Con i pezzi, una seduta di ripetute smette di
               essere «6 km a 5:30» e torna a essere quello che era. -->
          {#if corseDelDi && !unisci}
            <!-- LE CORSE DI QUEL GIORNO CI SONO GIA'. In pista l'orologio
                 registra ogni ripetuta come un'attivita' a se': tre pezzi,
                 tre corse nell'elenco. Prenderle e' un tocco, e cosi' non
                 si riscrivono a mano numeri che l'orologio ha gia'. -->
            <Riga titolo="Prendi le corse di {giorno ? quandoCorto(giorno) : 'oggi'}"
              sottotitolo="{plurale(corseDelDi.quante, 'corsa', 'corse')} · {km(corseDelDi.km)}{corseDelDi.secondi ? ` · ${mmss(corseDelDi.secondi)}` : ''}"
              accento onclick={prendiLeCorse} />
          {/if}

          <div class="pezzi">
            <!-- Le intestazioni UNA VOLTA SOLA, in cima alla colonna. Su
                 ogni riga erano tre parole ripetute tre volte, e con tre
                 ripetute diventano nove: la colonna di numeri, che e' la
                 cosa da leggere, spariva in mezzo alle etichette. -->
            <div class="pezzo intestazioni text-caption1 secondario" aria-hidden="true">
              <span></span><span>Distanza</span><span>Tempo</span><span>Passo</span><span></span>
            </div>
            {#each pezzi as p, i (i)}
              {@const metri = letti[i].km > 0 && aKm(p.dist) !== Number(String(p.dist).replace(",", "."))}
              <div class="pezzo">
                <span class="indice cifre">{i + 1}</span>
                <input class="campo cifre" type="text" inputmode="decimal" bind:value={p.dist} placeholder="3000" aria-label="Distanza del pezzo {i + 1}" />
                <input class="campo cifre" type="text" inputmode="numeric" bind:value={p.tempo} placeholder="12:06" aria-label="Tempo del pezzo {i + 1}" />
                <input
                  class="campo cifre" type="text" inputmode="numeric"
                  value={letti[i].passo ? mmss(letti[i].passo) : ""}
                  placeholder="4:02"
                  aria-label="Passo del pezzo {i + 1}"
                  onchange={(e) => passoScritto(i, e.currentTarget.value)}
                />
                {#if pezzi.length > 1}
                  <button type="button" class="via" aria-label="Togli il pezzo {i + 1}" onclick={() => { pezzi = pezzi.filter((_, k) => k !== i); unisci = false; }}>×</button>
                {:else}
                  <span class="via vuota"></span>
                {/if}
                <!-- La conferma solo quando serve davvero: hai scritto
                     «3000» e l'app ha letto 3 km. Se hai scritto «3» non
                     c'e' niente da confermare. -->
                {#if metri}<span class="letto text-caption1 secondario cifre">= {distanza(letti[i].km)}</span>{/if}
              </div>
            {/each}
            <button type="button" class="aggiungi text-subheadline" onclick={() => { pezzi = [...pezzi, { dist: "", tempo: "" }]; unisci = false; }}>
              + Aggiungi un pezzo
            </button>
          </div>

          <Riga>
            <span class="text-footnote secondario">
              {totale.km > 0
                ? `${pezzi.length > 1 ? `${plurale(letti.filter((p) => p.km > 0).length, "pezzo", "pezzi")} · ` : ""}${km(totale.km)}${totale.secondi ? ` in ${mmss(totale.secondi)}` : ""}${totale.secondi ? ` · media ${passo(totale.secondi / totale.km)}` : ""}. Entra nell'andamento, nel tetto della lunga e nella proiezione.`
                : "«3000» sono metri, «3» sono chilometri. Il tempo si scrive «12:06»; il passo puoi scriverlo al posto suo."}
            </span>
          </Riga>
        {:else}
          <Riga titolo="Durata">
            {#snippet fine()}
              <input class="campo cifre corto" type="text" inputmode="numeric" bind:value={cDurata} placeholder={String(durataDi(s))} aria-label="Durata in minuti" />
            {/snippet}
          </Riga>
        {/if}

        <label class="riga-testo">
          <span class="text-footnote secondario">Cosa</span>
          <textarea bind:value={cTesto} rows="3" placeholder="Gli esercizi separati da ·, oppure due parole" aria-label="Contenuto dell'allenamento"></textarea>
        </label>
      </Sezione>

      <div class="due">
        <Pulsante variante="grigio" larga onclick={() => (cambio = false)}>Annulla</Pulsante>
        <Pulsante variante="pieno" larga disabled={!cValido} onclick={salvaCambio}>Salva</Pulsante>
      </div>
    {/if}

    <Sezione titolo="Quando" piede={s.genere === "palestra"
      ? "La palestra la mattina è chiusa: l'ora predefinita è del pomeriggio. Qui la cambi solo per questo allenamento."
      : "Facoltativo. Il piano lascia i giorni liberi: se lo scegli, la home e i consigli ne tengono conto."}>
      <div class="blocco">
        <Pillole opzioni={giorni} scelte={giorno ? [giorno] : []} controllato oncambio={giornoScelto} etichetta="Giorno" />
      </div>
      {#if conflitto}
        <!-- In linea, non un dialogo sopra un dialogo: due fogli impilati su
             un telefono non si leggono, e la domanda nasce a due centimetri
             dalla pastiglia che hai appena toccato. -->
        <div class="conflitto" transition:slide={{ duration: 200 }}>
          <p class="text-subheadline">
            {dataUmana(conflitto.giorno)} c'è già
            {conflitto.chi.length === 1 ? conflitto.chi[0] : `${conflitto.chi.length} allenamenti`}.
            Ce lo metto lo stesso?
          </p>
          <div class="due">
            <Pulsante variante="grigio" misura="media" onclick={() => (conflitto = null)}>No</Pulsante>
            <Pulsante variante="pieno" misura="media" onclick={confermaConflitto}>Sì, mettilo lì</Pulsante>
          </div>
        </div>
      {/if}
      <Riga titolo="Ora">
        {#snippet fine()}
          <input
            class="ora cifre" type="time" value={ora}
            aria-label="Ora dell'allenamento"
            onchange={(e) => scegliOra(s.id, e.currentTarget.value)}
          />
        {/snippet}
      </Riga>
      {#if !recordSlot(s.id)?.ora}
        <Riga><span class="text-footnote secondario">Predefinita per {s.genere === "corsa" ? "la corsa" : s.genere === "palestra" ? "la palestra" : "questo genere"}: {oraPredefinita(s.genere)}. Cambiandola qui vale solo per questo.</span></Riga>
      {/if}
    </Sezione>

    {#if s.genere === "corsa" && letto}
      <!-- COSA FINIRÀ NELL'OROLOGIO, prima di salvarlo: un file che parte alla
           cieca e si scopre sbagliato a metà ripetuta è il modo peggiore di
           scoprire che il lettore non aveva capito la frase. -->
      <Sezione titolo="Porta su Garmin" piede={!letto.completo
        ? "Una parte non l'ho saputa tradurre in passi: arriva come corsa libera, e il dettaglio resta qui."
        : letto.assunzioni ? "Gli allunghi senza durata li ho messi a 30\" con 60\" di pausa." : undefined}>
        <ol class="passi text-subheadline">
          {#each descrivi(letto.passi) as r, i (i)}<li>{r}</li>{/each}
        </ol>
      </Sezione>
      <Pulsante variante="tinto" larga icona="scarica" onclick={copiaGarmin}>Copia per Garmin Connect</Pulsante>
      <p class="text-footnote secondario spiega">Poi su connect.garmin.com → Allenamenti tocca il segnalibro «ATLAS → Garmin». Il segnalibro si salva una volta sola, da Impostazioni.</p>
      <Pulsante variante="grigio" larga icona="scarica" onclick={scaricaFit}>Scarica il .FIT per l'orologio</Pulsante>
      <p class="text-footnote secondario spiega">Dal PC, col cavo, nella cartella GARMIN/NewFiles. Non caricarlo su Connect: lì diventerebbe un percorso.</p>
    {:else if s.genere === "palestra"}
      <Sezione titolo="Porta su Hevy" piede={hevy.configurato()
        ? "La routine compare nell'app, in «My Routines»."
        : "Serve la chiave API, una volta sola: Impostazioni → Training."}>
        <div class="blocco">
          <Pulsante variante="tinto" larga icona="nuvola" disabled={!hevy.configurato() || creo} onclick={creaSuHevy}>
            {creo ? "Creo…" : "Crea la routine su Hevy"}
          </Pulsante>
        </div>
      </Sezione>
    {/if}

    {#if coperto && !cambio}
      <Pulsante variante="testo" larga onclick={() => { if (s) { ripristinaSlot(s.id); avviso("Rimesso il piano."); } }}>
        Rimetti il piano originale
      </Pulsante>
      <p class="text-footnote secondario spiega">
        Torna la seduta scritta nel piano. La spunta e il giorno restano{s.aMano ? ", e la corsa a mano sparisce dai conti" : ""}.
      </p>
    {/if}

    {#if s?.bonus}
      <!-- Solo i bonus si tolgono. Uno slot del programma non si cancella:
           si lascia non spuntato, ed e' un'informazione — «questa seduta non
           l'ho fatta» — che cancellandola andrebbe persa. -->
      <Pulsante variante="testo" distruttivo larga onclick={() => { if (s) { togliBonus(s.id); avviso("Allenamento tolto."); aperto = false; } }}>
        Togli questo allenamento
      </Pulsante>
    {/if}
  {/if}
</Foglio>

<style>
  /* I campi del cambio. 17px ovunque: sotto, iOS zooma al focus e non
     torna indietro (CLAUDE.md, regola 9). */
  .campo {
    font-size: 17px; text-align: right; outline: none; background: var(--fill-tertiary);
    border-radius: var(--radius-sm); padding: 5px 9px; color: var(--accento); max-width: 190px;
  }
  .campo.corto { max-width: 90px; }
  .pezzi { display: flex; flex-direction: column; padding: var(--space-3) var(--space-4) var(--space-2); border-top: 0.5px solid var(--separator); gap: var(--space-2); }
  /* Una riga per pezzo: numero, tre campi, la croce. Il valore normalizzato
     va sotto, a tutta riga: e' la conferma che «3000» l'ha letto come 3 km,
     e sta dove non ruba larghezza ai campi. */
  .pezzo { display: grid; grid-template-columns: 18px 1fr 1fr 1fr 24px; gap: 4px 6px; align-items: center; }
  .pezzo.intestazioni { margin-bottom: -2px; }
  .indice { font-size: var(--text-caption1); color: var(--label-tertiary); }
  .letto { grid-column: 2 / -1; }
  .via { width: 24px; height: 30px; color: var(--label-tertiary); font-size: 18px; line-height: 1; }
  .via.vuota { visibility: hidden; }
  .aggiungi { align-self: flex-start; padding: 6px 0; color: var(--accento); font-weight: var(--weight-semibold); }
  /* I campi dei pezzi stanno nella griglia, non in una colonnina loro: le
     etichette adesso sono in cima una volta sola. */
  .pezzo .campo { max-width: none; width: 100%; text-align: left; }
  .riga-testo { display: flex; flex-direction: column; gap: 3px; padding: var(--space-3) var(--space-4); border-top: 0.5px solid var(--separator); }
  .riga-testo textarea {
    font-size: 17px; font-family: inherit; width: 100%; outline: none; resize: vertical;
    background: var(--fill-tertiary); border-radius: var(--radius-sm); padding: 7px 9px;
  }

  .eroe {
    display: flex; align-items: center; gap: var(--space-4);
    padding: var(--space-4) var(--space-5);
    background: var(--lastra-dentro); border-radius: var(--radius-xl);
  }
  .numeri { display: flex; flex-direction: column; gap: 2px; flex: none; }
  .etichetta { font-weight: var(--weight-semibold); color: var(--accento); }
  .cifra { font-family: var(--font-display); font-size: 48px; line-height: 50px; font-weight: var(--weight-bold); }
  .gruppi-eroe { display: flex; flex-wrap: wrap; gap: 6px; justify-content: flex-end; flex: 1; }
  .pillola {
    padding: 4px 10px; border-radius: var(--radius-full);
    background: color-mix(in srgb, var(--accento) 15%, transparent);
    color: color-mix(in srgb, var(--accento) 85%, var(--label-primary));
    font-weight: var(--weight-medium);
  }
  .pillola b { font-weight: var(--weight-bold); }

  .mappa { padding: var(--space-4) var(--space-3) var(--space-2); display: flex; justify-content: center; }

  .esercizio {
    display: flex; align-items: center; gap: var(--space-3); width: 100%; text-align: left;
    padding: var(--space-3) var(--space-4); min-height: 64px;
    border-radius: var(--radius-lg);
    transition: background-color var(--duration-fast) var(--ease-default);
  }
  .esercizio + .esercizio { box-shadow: inset 0 0.5px 0 var(--separator); }
  .esercizio:active { background: var(--fill-quaternary); }
  .esercizio.scelto { background: color-mix(in srgb, var(--accento) 12%, transparent); }

  .posto {
    flex: none; display: grid; place-items: center; width: 24px; height: 24px; border-radius: 8px;
    background: var(--fill-tertiary); color: var(--label-secondary);
    font-size: var(--text-caption1); font-weight: var(--weight-semibold);
  }
  .esercizio.scelto .posto { background: var(--accento); color: #fff; }

  .centro { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
  .nome { display: flex; align-items: center; gap: 6px; font-weight: var(--weight-medium); }
  .tag {
    flex: none; padding: 1px 7px; border-radius: var(--radius-full); font-weight: var(--weight-semibold);
    color: var(--accento); background: color-mix(in srgb, var(--accento) 16%, transparent);
  }
  .muscoli { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 5px; }
  .punto {
    width: 6px; height: 6px; border-radius: 50%; margin-left: 4px;
    background: color-mix(in srgb, var(--accento) 40%, transparent);
  }
  .punto:first-child { margin-left: 0; }
  .punto.forte { background: var(--accento); }

  .lavoro { flex: none; display: flex; flex-direction: column; align-items: flex-end; gap: 1px; }
  .serie { font-size: 22px; line-height: 24px; font-weight: var(--weight-semibold); }
  .serie i { font-style: normal; color: var(--label-tertiary); margin: 0 1px; font-size: 17px; }
  .serie.piccolo { font-size: 17px; color: var(--label-tertiary); }

  .lavoro-testo { padding: var(--space-4); }
  .conflitto {
    display: flex; flex-direction: column; gap: var(--space-3);
    padding: var(--space-3) var(--space-4) var(--space-4);
  }
  .conflitto .due { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-2); }
  .blocco { padding: var(--space-4); }
  /* 17px: sotto, iOS zooma al focus e non torna indietro. */
  .ora { font-size: 17px; background: none; color: var(--label-primary); text-align: right; }
  .passi { padding: var(--space-4) var(--space-4) var(--space-4) 36px; list-style: decimal; display: flex; flex-direction: column; gap: 4px; }
  .spiega { padding: 0 var(--space-4); margin-top: calc(-1 * var(--space-3)); }
</style>
