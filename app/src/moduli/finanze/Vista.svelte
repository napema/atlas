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
  import Icona from "$lib/ui/Icona.svelte";
  import Riepilogo from "./Riepilogo.svelte";
  import Movimenti from "./Movimenti.svelte";
  import Analisi from "./Analisi.svelte";
  import FoglioMovimento from "./FoglioMovimento.svelte";
  import FoglioDettaglio from "./FoglioDettaglio.svelte";
  import FoglioCheck from "./FoglioCheck.svelte";
  import FoglioArrivo from "./FoglioArrivo.svelte";
  import FoglioCategoria from "./FoglioCategoria.svelte";
  import FoglioSub from "./FoglioSub.svelte";
  import FoglioRicariche from "./FoglioRicariche.svelte";
  import FoglioPocket from "./FoglioPocket.svelte";
  import { dati } from "$lib/core/reattivo.svelte";
  import { ascolta, EVENTI } from "$lib/core/bus";
  import { maiuscola } from "$lib/core/ui";
  import { meseDi, spostaMese, nomeMese } from "$condivisi/finanze/calcolo.js";
  import { migra } from "$condivisi/finanze/dati.js";
  import { fogli, apri } from "./fogli.svelte";

  let { resto = [] }: { resto?: string[] } = $props();

  // Come stai GUARDANDO i dati, non un dato: niente casella, niente sync.
  // Altrimenti cambiare scheda sull'iPhone la cambierebbe sul PC.
  let scheda = $state<"home" | "movimenti" | "analisi">("home");
  let mese = $state(meseDi());
  let filtro = $state("tutti");

  migra();

  $effect(() => {
    const r = resto[0];
    if (r === "movimenti" || r === "analisi") scheda = r;
    if (r === "nuovo") queueMicrotask(() => apri({ tipo: "movimento", tipoMov: "out" }));
    // La rotta della notifica del lunedì: dalla notifica alla conferma non
    // ci deve essere una schermata in mezzo.
    if (r === "ricarica") queueMicrotask(() => apri({ tipo: "ricaricaSett" }));
  });
  $effect(() => ascolta(EVENTI.GIORNO_CAMBIATO, () => { mese = meseDi(); }));

  const corrente = $derived.by(() => { dati.versione; return meseDi(); });
  const f = $derived(fogli.corrente);
</script>

<Pagina titolo="Finanze">
  {#snippet azioni()}
    <Pulsante variante="vetro" misura="media" tondo icona="portafoglio" etichetta="Saldi dei pocket" onclick={() => apri({ tipo: "pocket" })} />
  {/snippet}

  <Segmenti
    opzioni={[{ id: "home", testo: "Riepilogo" }, { id: "movimenti", testo: "Movimenti" }, { id: "analisi", testo: "Analisi" }]}
    bind:valore={scheda}
    etichetta="Vista"
  />

  {#if scheda !== "home"}
    <!-- Il mese si sfoglia solo dove conta: il riepilogo guarda sempre oggi. -->
    <div class="mese">
      <Pulsante variante="grigio" misura="media" tondo icona="indietro" etichetta="Mese precedente" onclick={() => (mese = spostaMese(mese, -1))} />
      <button type="button" class="mese-nome text-headline" title="Torna al mese corrente" onclick={() => (mese = corrente)}>{maiuscola(nomeMese(mese))}</button>
      <Pulsante variante="grigio" misura="media" tondo icona="freccia" etichetta="Mese successivo" disabled={mese >= corrente} onclick={() => (mese = spostaMese(mese, 1))} />
    </div>
  {/if}

  {#if scheda === "home"}
    <Riepilogo />
  {:else if scheda === "movimenti"}
    <Movimenti {mese} bind:filtro />
  {:else}
    <Analisi {mese} />
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
  <button type="button" class="rapida altro" aria-label="Giroconto, rimborso, reso, ricarica" onclick={() => apri({ tipo: "movimento", tipoMov: "giro" })}>
    <Icona nome="sync" misura={18} tratto={2.2} />
  </button>
</div>

{#if f?.tipo === "movimento"}
  <FoglioMovimento bind:aperto={fogli.aperto} movimento={f.movimento ?? null} tipoIniziale={f.tipoMov ?? f.movimento?.tipo ?? "out"} />
{:else if f?.tipo === "dettaglio"}
  <FoglioDettaglio bind:aperto={fogli.aperto} id={f.id} />
{:else if f?.tipo === "check"}
  <FoglioCheck bind:aperto={fogli.aperto} />
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
  .mese { display: flex; align-items: center; justify-content: space-between; margin-top: calc(-1 * var(--space-2)); }
  .mese-nome { flex: 1; text-align: center; }

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
  .uscita { background: var(--accento); }
  .entrata { background: var(--color-blue); }
  .altro { width: 44px; padding: 0; justify-content: center; color: var(--label-primary); background: var(--fill-tertiary); }
  :global(.pagina):has(~ .azioni-rapide) { padding-bottom: calc(var(--spazio-schede) + 64px); }
</style>
