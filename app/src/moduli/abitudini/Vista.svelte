<!--
  Abitudini — le abitudini del giorno, spuntate in un tocco.

  In alto la settimana (si tocca un giorno per guardarlo o correggerlo),
  poi quante ne restano, poi la lista. «Serie» è l'altra faccia della
  stessa cosa: non cosa fare oggi, ma quanto stai tenendo.
-->
<script lang="ts">
  import Pagina from "$lib/ui/Pagina.svelte";
  import Pulsante from "$lib/ui/Pulsante.svelte";
  import Segmenti from "$lib/ui/Segmenti.svelte";
  import Settimana from "$lib/ui/Settimana.svelte";
  import Sezione from "$lib/ui/Sezione.svelte";
  import Anello from "$lib/ui/Anello.svelte";
  import Icona from "$lib/ui/Icona.svelte";
  import Vuoto from "$lib/ui/Vuoto.svelte";
  import RigaAbitudine from "./RigaAbitudine.svelte";
  import Dettaglio from "./Dettaglio.svelte";
  import Modifica from "./Modifica.svelte";
  import Serie from "./Serie.svelte";
  import Testata50 from "./Testata50.svelte";
  import SerateFuori from "./SerateFuori.svelte";
  import Blocchi from "./Blocchi.svelte";
  import Chiusura from "./Chiusura.svelte";
  import Revisione from "./Revisione.svelte";
  import NumeriSfida from "./NumeriSfida.svelte";
  import { dati } from "$lib/core/reattivo.svelte";
  import { ascolta, EVENTI } from "$lib/core/bus";
  import { oggiISO, piuGiorni, dataUmana, plurale, tocco } from "$lib/core/ui";
  import { abitudiniVive } from "$condivisi/abitudini/dati.js";
  import * as p50 from "$condivisi/abitudini/p50.js";
  import { progressoGiorno, eAttesa, giorniSettimana } from "$condivisi/abitudini/calcolo.js";

  let { resto = [] }: { resto?: string[] } = $props();

  let vista = $state<"oggi" | "serie" | "sfida">("oggi");
  let giorno = $state(oggiISO());

  let chiusuraAperta = $state(false);
  let dettaglioAperto = $state(false);
  let dettaglioId = $state<string | null>(null);
  let modificaAperta = $state(false);
  let modificaId = $state<string | null>(null);

  const apriDettaglio = (id: string) => { dettaglioId = id; dettaglioAperto = true; };
  const apriModifica = (id: string | null) => { modificaId = id; modificaAperta = true; };

  // Le rotte che arrivano da fuori: `#/abitudini/nuova` è la scorciatoia
  // della home e delle notifiche, `#/abitudini/serie` apre le serie.
  /* In sfida «le serie» non esistono: c'è un contatore solo in tutta la app
     (ee1805f), e la domanda «quanto sto tenendo» ha una risposta sola, la
     griglia dei cinquanta giorni. La rotta resta quella — è l'indirizzo di
     una notifica — e porta dove ha senso adesso. */
  $effect(() => {
    if (resto[0] === "nuova") queueMicrotask(() => apriModifica(null));
    if (resto[0] === "serie") vista = p50.attivo() ? "sfida" : "serie";
    // `#/abitudini/chiudi` apre il foglio di chiusura: ci arriva la card
    // della home, e un domani il promemoria delle 21. Se il giorno non è
    // chiudibile il foglio non si apre — la rotta non scavalca la regola.
    if (resto[0] === "chiudi" && p50.chiudibile(oggiISO()) === "si") {
      queueMicrotask(() => (chiusuraAperta = true));
    }
  });

  /* Accendere o spegnere la sfida in Impostazioni cambia quali schede
     esistono: senza questo si resta su una scheda che non è più in barra,
     e i segmenti mostrano due opzioni con nessuna scelta. */
  $effect(() => {
    if (!sfida && vista === "sfida") vista = "oggi";
    if (sfida && vista === "serie") vista = "sfida";
  });

  // A mezzanotte il giorno scelto torna oggi: guardare «ieri» senza averlo
  // chiesto sarebbe un giorno sbagliato con la faccia di quello giusto.
  $effect(() => ascolta(EVENTI.GIORNO_CAMBIATO, () => { giorno = oggiISO(); }));

  const oggi = $derived.by(() => { dati.versione; return oggiISO(); });
  const tutte = $derived.by(() => { dati.versione; return abitudiniVive(); });
  const attese = $derived.by(() => { dati.versione; return tutte.filter((h: any) => eAttesa(h, giorno)); });
  const altre = $derived.by(() => { dati.versione; return tutte.filter((h: any) => !eAttesa(h, giorno)); });
  const p = $derived.by(() => { dati.versione; return progressoGiorno(giorno); });
  const restano = $derived(Math.max(0, p.attese - p.fatte));
  const tutto = $derived(p.attese > 0 && restano === 0);

  const settimana = $derived.by(() => {
    dati.versione;
    return (giorniSettimana(giorno) as string[]).map((g) => {
      const x = progressoGiorno(g);
      return {
        iso: g,
        titolo: dataUmana(g),
        stato: g > oggi ? ("futuro" as const)
          : x.riposo ? ("riposo" as const)
          : x.fatte === 0 ? ("vuoto" as const)
          : x.frazione >= 1 ? ("pieno" as const)
          : ("parziale" as const),
      };
    });
  });

  /* PROJECT 50. Quando è acceso la schermata è un'altra cosa: non una lista
     di abitudini ma otto voci non negoziabili più il supporto. Il resto del
     modulo resta lì e funziona come prima per chi non fa la sfida. */
  const sfida = $derived.by(() => {
    dati.versione;
    if (!p50.attivo()) return null;
    const b = p50.bilancio(giorno);
    const rec = p50.chiusuraDi(giorno);
    const supporto = p50.delBlocco("supporto");
    return {
      giorno: p50.giornoCorrente(giorno),
      chiuso: Boolean(rec),
      rec,
      // Perché non si può chiudere: `"si"`, `"presto"` (non sono le 21),
      // `"non-oggi"`, `"chiuso"`. `dati.versione` cresce anche una volta al
      // minuto, quindi alle 21 il pulsante si accende da sé.
      chiudibile: p50.chiudibile(giorno),
      fatte: b.fatte,
      previste: b.previste,
      otto: p50.ottoVoci().filter((h: any) => p50.vocePrevista(h, giorno)),
      // Il workout la domenica non è previsto: non sparisce, si spegne. Una
      // voce che sparisce fa contare sette caselle e chiedersi dov'è l'ottava.
      spente: p50.ottoVoci().filter((h: any) => !p50.vocePrevista(h, giorno)),
      supporto,
      // Anche il supporto ha il suo conto, e con le PARTI vale la stessa
      // regola delle otto: la skincare è fatta quando lo sono tutti e sei i
      // passaggi. Un conto diverso fra i due blocchi sarebbe due modi di
      // contare nella stessa schermata.
      supportoFatte: supporto.filter((h: any) => p50.voceFatta(h, giorno)).length,
    };
  });

  /* La striscia, con la semantica della sfida: un giorno o è chiuso bene, o
     è chiuso male, o non è ancora chiuso. Nessun riempimento parziale —
     mostrare «5 su 8» come mezza casella verde direbbe che sei a metà
     strada, e in una sfida tutto-o-niente non esiste la metà strada. */
  const settimana50 = $derived.by(() => {
    dati.versione;
    return (giorniSettimana(giorno) as string[]).map((g) => {
      const c = p50.chiusuraDi(g);
      return {
        iso: g,
        titolo: dataUmana(g),
        stato: g > oggi ? ("futuro" as const)
          : c ? (c.esito === "ok" ? ("pieno" as const) : ("fallito" as const))
          // Un giorno passato e mai chiuso non è «in corso»: è perso, e la
          // striscia deve dirlo — altrimenti la sera si scambia per un
          // giorno che si può ancora recuperare.
          : g < oggi ? ("vuoto" as const)
          : ("aperto" as const),
      };
    });
  });

  const titoloGiorno = $derived(
    giorno === oggi ? "Oggi" : giorno === piuGiorni(oggi, -1) ? "Ieri" : dataUmana(giorno),
  );
</script>

{#snippet strumenti()}
  <Segmenti
    opzioni={sfida
      ? [{ id: "oggi", testo: "Giorno" }, { id: "sfida", testo: "Sfida" }]
      : [{ id: "oggi", testo: "Giorno" }, { id: "serie", testo: "Serie" }]}
    bind:valore={vista}
    etichetta="Vista"
  />
  <!-- Sulla revisione la striscia non ci va: la griglia dei cinquanta dice
       la stessa cosa e più in là, e due strisce nella stessa schermata si
       leggono come due misure diverse. -->
  {#if vista === "oggi" && (sfida || tutte.length)}
    <Settimana giorni={sfida ? settimana50 : settimana} {oggi} scelto={giorno} onscegli={(g) => { tocco(6); giorno = g; }} />
  {/if}
{/snippet}

{#snippet riepilogo()}
  {#if sfida}
    <!-- Niente card «Riepilogo» e niente percentuale: in una sfida
         tutto-o-niente un 87% significa che hai fallito, detto in un modo
         che permette di sentirsi a posto. -->
    <Testata50 giorno={sfida.giorno} fatte={sfida.fatte} previste={sfida.previste} chiuso={sfida.chiuso} />
    <!-- Le serate sono un'azione del giorno: sulla revisione, che è una
         schermata che si legge e basta, sarebbero l'unica cosa da toccare.
         Al loro posto, lì, i tre numeri della sfida — che sul PC riempiono
         la colonna del riepilogo invece di lasciarla col solo contatore. -->
    {#if vista === "oggi"}<SerateFuori {giorno} />{:else}<NumeriSfida />{/if}
  {:else if vista === "serie"}
    <Serie parte="eroe" onapri={apriDettaglio} />
  {:else}
    <!-- «Quante ne restano» è la domanda, e la risposta è una cifra sola. -->
    <Sezione titolo="Riepilogo">
      <div class="eroe" class:tutto>
        <div class="numeri">
          <span class="text-footnote etichetta">
            {!p.attese ? "Giornata libera" : tutto ? "Tutto fatto" : "Ancora da fare"}
          </span>
          <span class="cifra cifre">{!p.attese ? "—" : tutto ? p.fatte : restano}</span>
          <span class="text-subheadline secondario">
            {!p.attese ? "Nessuna abitudine prevista per questo giorno."
              : tutto ? plurale(p.fatte, "abitudine spuntata", "abitudini spuntate")
              : `${p.fatte} di ${p.attese} già fatte`}
          </span>
        </div>
        <!-- In una giornata libera l'anello resta vuoto e al posto della
             percentuale c'è un trattino: «100%» accanto a «nessuna abitudine
             prevista» si contraddiceva, «0%» direbbe che hai mancato qualcosa. -->
        <Anello valore={p.frazione} misura={84} spessore={9} colore="var(--color-green)">
          <span class="pct cifre">{p.riposo ? "—" : `${Math.round(p.frazione * 100)}%`}</span>
        </Anello>
      </div>
    </Sezione>
  {/if}
{/snippet}

<Pagina titolo="Abitudini" {strumenti} laterale={sfida || tutte.length ? riepilogo : undefined}>
  {#snippet azioni()}
    <Pulsante variante="vetro" misura="media" tondo icona="piu" etichetta="Nuova abitudine" onclick={() => apriModifica(null)} />
  {/snippet}

  {#if sfida && vista === "sfida"}
    <Revisione />
  {:else if sfida}
    <Blocchi
      otto={sfida.otto}
      supporto={sfida.supporto}
      {giorno}
      fatte={sfida.fatte}
      previste={sfida.previste}
      supportoFatte={sfida.supportoFatte}
      bloccato={sfida.chiuso}
      onapri={apriDettaglio}
    />
    {#if sfida.spente.length}
      <Sezione titolo="Non previste oggi">
        {#each sfida.spente as h (h.id)}
          <RigaAbitudine {h} {giorno} spenta compatta bloccata={sfida.chiuso} onapri={apriDettaglio} />
        {/each}
      </Sezione>
    {/if}

    <!-- LA CHIUSURA sta in fondo, larga, dopo le righe: è l'ultima cosa
         della giornata e si tocca dopo aver guardato le otto, non prima.
         In cima sarebbe la prima cosa sotto il pollice a schermata aperta.
         `intera` la tiene a tutta larghezza sul PC: come cella della griglia
         finiva in fondo alla colonna del supporto, dove non la cerca
         nessuno. -->
    <div class="chiusura intera">
      {#if sfida.chiuso}
        <p class="esito text-subheadline" class:male={sfida.rec?.esito !== "ok"}>
          <Icona nome={sfida.rec?.esito === "ok" ? "spunta" : "chiudi"} misura={15} tratto={2.4} />
          {sfida.rec?.esito === "ok"
            ? `Giorno ${sfida.rec?.giorno} chiuso.`
            : `Giorno ${sfida.rec?.giorno} perso: si riparte da ${sfida.rec?.prossimo}.`}
        </p>
        <p class="text-footnote secondario">Un giorno chiuso non si tocca più.</p>
      {:else if sfida.chiudibile === "si"}
        <Pulsante variante="pieno" misura="grande" larga onclick={() => (chiusuraAperta = true)}>
          Chiudi il giorno
        </Pulsante>
      {:else if sfida.chiudibile === "presto"}
        <!-- Il pulsante spento non c'è: un bottone grigio che non si può
             toccare lo si prova lo stesso, e non spiega perché. La riga sì. -->
        <p class="text-footnote secondario">Il giorno si chiude dalle {p50.DALLE_ORE}.</p>
      {:else}
        <p class="text-footnote secondario">
          Questo giorno non è stato chiuso, e non si chiude più: si chiude solo il giorno in cui sei.
        </p>
      {/if}
    </div>
  {:else if vista === "serie"}
    <Serie parte="resto" onapri={apriDettaglio} />
  {:else if !tutte.length}
    <Vuoto icona="abitudini" titolo="Nessuna abitudine" testo="Aggiungi la prima: una cosa piccola, da fare ogni giorno.">
      <Pulsante variante="pieno" misura="media" onclick={() => apriModifica(null)}>Nuova abitudine</Pulsante>
    </Vuoto>
  {:else}
    {#if attese.length}
      <Sezione titolo={titoloGiorno}>
        {#each attese as h (h.id)}
          <RigaAbitudine {h} {giorno} onapri={apriDettaglio} />
        {/each}
      </Sezione>
    {/if}

    {#if altre.length}
      <Sezione titolo="Non previste {giorno === oggi ? 'oggi' : 'quel giorno'}">
        {#each altre as h (h.id)}
          <RigaAbitudine {h} {giorno} spenta onapri={apriDettaglio} />
        {/each}
      </Sezione>
    {/if}
  {/if}
</Pagina>

<Chiusura bind:aperto={chiusuraAperta} {giorno} />
<Dettaglio bind:aperto={dettaglioAperto} id={dettaglioId} onmodifica={(id) => setTimeout(() => apriModifica(id), 300)} />
<Modifica bind:aperto={modificaAperta} id={modificaId} />

<style>
  .chiusura { display: flex; flex-direction: column; align-items: center; gap: var(--space-2); padding: var(--space-5) var(--space-4) var(--space-3); }
  .chiusura > :global(.pulsante) { width: 100%; }
  .esito { display: flex; align-items: center; gap: var(--space-2); color: var(--color-green); }
  .esito.male { color: var(--color-red); }

  .eroe { display: flex; align-items: center; gap: var(--space-4); padding: var(--space-4) var(--space-5); }
  .numeri { flex: 1; display: flex; flex-direction: column; gap: 2px; }
  .etichetta { font-weight: var(--weight-semibold); color: var(--accento); }
  .tutto .etichetta { color: var(--color-green); }
  .cifra { font-family: var(--font-display); font-size: 48px; line-height: 52px; font-weight: var(--weight-bold); }
  .pct { font-size: var(--text-subheadline); font-weight: var(--weight-semibold); }
</style>
