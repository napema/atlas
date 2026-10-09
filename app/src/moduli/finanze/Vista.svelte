<!--
  Finanze — il registro di entrate e uscite.

  Tre viste (Riepilogo, Movimenti, Analisi) e in basso, sempre sotto il
  pollice, i due gesti di tutti i giorni: Uscita ed Entrata. Registrare
  un'uscita è la cosa che fai dieci volte a settimana, un'entrata due volte
  al mese: nasconderle dietro lo stesso tondo costava un tocco e un dubbio.
  Le impostazioni (budget, pocket, ricorrenti, import) stanno nella sezione
  Finanze di Impostazioni.
-->
<script lang="ts">
  import Pagina from "$lib/ui/Pagina.svelte";
  import Pulsante from "$lib/ui/Pulsante.svelte";
  import Segmenti from "$lib/ui/Segmenti.svelte";
  import Pillole from "$lib/ui/Pillole.svelte";
  import Icona from "$lib/ui/Icona.svelte";
  import Riepilogo from "./Riepilogo.svelte";
  import Movimenti from "./Movimenti.svelte";
  import Analisi from "./Analisi.svelte";
  import FoglioMovimento from "./FoglioMovimento.svelte";
  import FoglioDettaglio from "./FoglioDettaglio.svelte";
  import FoglioArrivo from "./FoglioArrivo.svelte";
  import FoglioLista from "./FoglioLista.svelte";
  import FoglioObiettivo from "./FoglioObiettivo.svelte";
  import FoglioPaga from "./FoglioPaga.svelte";
  import FoglioChiusura from "./FoglioChiusura.svelte";
  import FoglioCategoria from "./FoglioCategoria.svelte";
  import FoglioSub from "./FoglioSub.svelte";
  import FoglioRicariche from "./FoglioRicariche.svelte";
  import FoglioPocket from "./FoglioPocket.svelte";
  import { dati } from "$lib/core/reattivo.svelte";
  import { ascolta, EVENTI } from "$lib/core/bus";
  import { maiuscola } from "$lib/core/ui";
  import { meseDi, spostaMese, nomeMese, cicloDi, spostaCiclo, nomeCiclo } from "$condivisi/finanze/calcolo.js";
  import { primoCiclo } from "$condivisi/finanze/analisi.js";
  import { voceInArrivo } from "$condivisi/finanze/piano.js";
  import { migra } from "$condivisi/finanze/dati.js";
  import { fogli, apri } from "./fogli.svelte";
  import { vaiA } from "$lib/core/router.svelte";

  let { resto = [] }: { resto?: string[] } = $props();

  // Come stai GUARDANDO i dati, non un dato: niente casella, niente sync.
  // Altrimenti cambiare scheda sull'iPhone la cambierebbe sul PC.
  let scheda = $state<"home" | "movimenti" | "analisi">("home");
  let mese = $state(meseDi());
  // Il ciclo che l'Analisi sta guardando, per indice («2026-09»).
  let ciclo = $state(cicloDi().indice);
  let filtro = $state("tutti");
  const FILTRI = [
    { id: "tutti", testo: "Tutti" }, { id: "out", testo: "Uscite" }, { id: "ecc", testo: "Straordinari" },
    { id: "in", testo: "Entrate" }, { id: "extra", testo: "Sforamenti" }, { id: "altri", testo: "Altri" },
  ];

  migra();

  $effect(() => {
    const r = resto[0];
    if (r === "movimenti" || r === "analisi") scheda = r;
    // «cicli» è la rotta di v3, che l'Analisi ha sostituito: un link
    // vecchio deve aprire la schermata che c'è, non una bianca.
    if (r === "cicli") scheda = "analisi";
    if (r === "nuovo") queueMicrotask(() => apri({ tipo: "movimento", tipoMov: "out" }));
    // Le rotte delle notifiche: dalla notifica al gesto non ci deve essere
    // una schermata in mezzo.
    if (r === "ricarica") queueMicrotask(() => apri({ tipo: "ricaricaSett" }));
    if (r === "chiusura") queueMicrotask(() => apri({ tipo: "chiusura" }));
    if (r === "lista") queueMicrotask(() => apri({ tipo: "lista" }));

    /* UNA SCADENZA APERTA DA FUORI: `#/finanze/arrivo/<origine>/<id>/<quando>`.
       La home non può aprire un foglio di Finanze — nessun modulo ne importa
       un altro — quindi ci arriva per indirizzo, come una notifica. Le tre
       parti identificano la voce; l'oggetto lo ricostruisce il modulo, che è
       l'unico che sa cos'è una scadenza. */
    if (r === "arrivo" && resto.length >= 4) {
      const [, origine, id, quando] = resto;
      queueMicrotask(() => {
        const v = voceInArrivo(origine, id, quando);
        // Una voce già pagata non esiste più: meglio la schermata di
        // Finanze, dove si vede che non c'è, di un foglio vuoto.
        if (v) apri({ tipo: "arrivo", voce: v });
        /* L'indirizzo torna quello della schermata appena il foglio e'
           aperto: se restasse quello della voce, chiudere il foglio e
           premere indietro lo riaprirebbe, e un «indietro» che non torna
           indietro e' la cosa che fa chiudere la app. */
        vaiA("#/finanze", { sostituisci: true });
      });
    }
  });
  $effect(() => ascolta(EVENTI.GIORNO_CAMBIATO, () => { mese = meseDi(); ciclo = cicloDi().indice; }));

  const corrente = $derived.by(() => { dati.versione; return meseDi(); });
  const cicloOra = $derived.by(() => { dati.versione; return cicloDi().indice; });
  const cicloPrimo = $derived.by(() => { dati.versione; return primoCiclo().indice; });
  const cicloVisto = $derived.by(() => { dati.versione; return spostaCiclo(ciclo, 0); });
  const f = $derived(fogli.corrente);
</script>

{#snippet strumenti()}
  <Segmenti
    opzioni={[{ id: "home", testo: "Riepilogo" }, { id: "movimenti", testo: "Movimenti" }, { id: "analisi", testo: "Analisi" }]}
    bind:valore={scheda}
    etichetta="Vista"
  />
  {#if scheda === "movimenti"}
    <!-- Il mese si sfoglia solo dove conta: il riepilogo guarda sempre oggi. -->
    <div class="mese">
      <Pulsante variante="grigio" misura="media" tondo icona="indietro" etichetta="Mese precedente" onclick={() => (mese = spostaMese(mese, -1))} />
      <button type="button" class="mese-nome text-headline" title="Torna al mese corrente" onclick={() => (mese = corrente)}>{maiuscola(nomeMese(mese))}</button>
      <Pulsante variante="grigio" misura="media" tondo icona="freccia" etichetta="Mese successivo" disabled={mese >= corrente} onclick={() => (mese = spostaMese(mese, 1))} />
    </div>
  {/if}
  {#if scheda === "analisi"}
    <!-- Si sfoglia per CICLO, da stipendio a stipendio: è la finestra di
         tutta l'app, e indietro ci si ferma al primo ciclo con dei dati. -->
    <div class="mese">
      <Pulsante variante="grigio" misura="media" tondo icona="indietro" etichetta="Ciclo precedente" disabled={ciclo <= cicloPrimo} onclick={() => (ciclo = spostaCiclo(ciclo, -1).indice)} />
      <button type="button" class="mese-nome text-headline" title="Torna al ciclo in corso" onclick={() => (ciclo = cicloOra)}>
        {nomeCiclo(cicloVisto)}{#if ciclo === cicloOra}<span class="in-corso">&nbsp;· in corso</span>{/if}
      </button>
      <Pulsante variante="grigio" misura="media" tondo icona="freccia" etichetta="Ciclo successivo" disabled={ciclo >= cicloOra} onclick={() => (ciclo = spostaCiclo(ciclo, 1).indice)} />
    </div>
  {/if}
  {#if scheda === "movimenti"}
    <div class="filtri"><Pillole opzioni={FILTRI} scelte={[filtro]} oncambio={(v) => (filtro = v[0])} etichetta="Filtro" /></div>
  {/if}
{/snippet}

{#snippet riepilogo()}<Riepilogo parte="lato" />{/snippet}
{#snippet analisiLato()}<Analisi indice={ciclo} parte="lato" />{/snippet}

<Pagina titolo="Finanze" {strumenti} laterale={scheda === "home" ? riepilogo : scheda === "analisi" ? analisiLato : undefined}>
  {#snippet azioni()}
    <Pulsante variante="vetro" misura="media" tondo icona="portafoglio" etichetta="Saldi dei pocket" onclick={() => apri({ tipo: "pocket" })} />
  {/snippet}

  {#if scheda === "home"}
    <Riepilogo parte="resto" />
  {:else if scheda === "movimenti"}
    <Movimenti {mese} {filtro} />
  {:else}
    <Analisi indice={ciclo} parte="resto" />
  {/if}
</Pagina>

<!-- I due gesti di tutti i giorni, a portata di pollice sopra la barra. -->
<div class="azioni-rapide">
  <button type="button" class="rapida uscita" onclick={() => apri({ tipo: "movimento", tipoMov: "out" })}>
    <Icona nome="meno" misura={18} tratto={2.6} />Uscita
  </button>
  <button type="button" class="rapida entrata" onclick={() => apri({ tipo: "movimento", tipoMov: "in" })}>
    <Icona nome="piu" misura={18} tratto={2.6} />Entrata
  </button>
  <!-- LA LISTA D'ATTESA al posto del simulatore. Resta nello stesso posto
       perche' e' il terzo gesto di tutti i giorni, ma risponde prima: si
       scrive quando la cosa ti viene in mente, non quando sei alla cassa. -->
  <button type="button" class="rapida chiedi" aria-label="Lista d'attesa" onclick={() => apri({ tipo: "lista" })}>
    <Icona nome="orologio" misura={18} tratto={2.2} />
  </button>
  <button type="button" class="rapida altro" aria-label="Giroconto, rimborso, reso, ricarica" onclick={() => apri({ tipo: "movimento", tipoMov: "giro" })}>
    <Icona nome="sync" misura={18} tratto={2.2} />
  </button>
</div>

{#if f?.tipo === "lista"}
  <FoglioLista bind:aperto={fogli.aperto} />
{:else if f?.tipo === "obiettivo"}
  <FoglioObiettivo bind:aperto={fogli.aperto} />
{:else if f?.tipo === "paga"}
  <FoglioPaga bind:aperto={fogli.aperto} dataStip={f.dataStip} entrata={f.entrata ?? null} />
{:else if f?.tipo === "chiusura"}
  <FoglioChiusura bind:aperto={fogli.aperto} />
{:else if f?.tipo === "movimento"}
  <FoglioMovimento bind:aperto={fogli.aperto} movimento={f.movimento ?? null} preset={f.preset ?? null} dopo={f.dopo ?? null} tipoIniziale={f.tipoMov ?? f.movimento?.tipo ?? "out"} />
{:else if f?.tipo === "dettaglio"}
  <FoglioDettaglio bind:aperto={fogli.aperto} id={f.id} />
{:else if f?.tipo === "arrivo"}
  <FoglioArrivo bind:aperto={fogli.aperto} voce={f.voce} />
{:else if f?.tipo === "categoria"}
  <FoglioCategoria bind:aperto={fogli.aperto} catId={f.catId} mese={f.mese} />
{:else if f?.tipo === "sub"}
  <FoglioSub bind:aperto={fogli.aperto} catId={f.catId} sub={f.sub} mese={f.mese} />
{:else if f?.tipo === "ricarica" || f?.tipo === "ricaricaSett" || f?.tipo === "saldoING"}
  <FoglioRicariche bind:aperto={fogli.aperto} quale={f.tipo} />
{:else if f?.tipo === "pocket"}
  <FoglioPocket bind:aperto={fogli.aperto} />
{/if}

<style>
  .mese { display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); max-width: 420px; width: 100%; }
  .mese-nome { flex: 1; text-align: center; }
  .in-corso { color: var(--accento); font-weight: var(--weight-regular); }
  .filtri { overflow-x: auto; scrollbar-width: none; max-width: 100%; }
  .filtri :global(.pillole) { flex-wrap: nowrap; }
  .filtri :global(button) { flex: none; }

  .azioni-rapide {
    position: fixed; z-index: 25; left: 50%; translate: -50% 0;
    bottom: calc(max(12px, calc(env(safe-area-inset-bottom, 0px) - 8px)) + 62px + 12px);
    display: flex; gap: var(--space-2); padding: 5px;
    border-radius: var(--radius-full);
    background: var(--glass-bg);
    -webkit-backdrop-filter: blur(6px) saturate(1.8);
    backdrop-filter: blur(6px) saturate(1.8);
    box-shadow: inset 0 0 0 0.5px var(--glass-rim), var(--glass-shadow);
  }
  .rapida {
    display: inline-flex; align-items: center; gap: 6px; height: 44px; padding: 0 var(--space-5);
    border-radius: var(--radius-full); font-weight: var(--weight-semibold); color: #fff;
    transition: transform var(--duration-fast) var(--ease-spring);
  }
  .rapida:active { transform: scale(0.95); }
  /* Uscita rossa, entrata verde: in Finanze i due colori dicono la
     direzione dei soldi, ovunque, e solo quella. */
  .uscita { background: var(--color-red); }
  .entrata { background: var(--color-green); }
  .altro, .chiedi { width: 44px; padding: 0; justify-content: center; color: var(--label-primary); background: var(--fill-tertiary); }
  :global(.pagina):has(~ .azioni-rapide) { padding-bottom: calc(var(--spazio-schede) + 64px); }
</style>
