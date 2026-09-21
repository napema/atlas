<!--
  Riga — una riga di lista. Diventa un link con `href`, un bottone con
  `onclick`, un semplice contenitore altrimenti: il tag giusto per la cosa
  giusta, così VoiceOver e la tastiera sanno cosa fare.

  Il separatore lo disegna ogni riga sopra di sé, tranne la prima, e parte
  dal testo e non dal bordo — come in iOS: la riga è separata dalla riga,
  non l'icona dall'icona.
-->
<script lang="ts">
  import type { Snippet } from "svelte";
  import Icona from "./Icona.svelte";

  let {
    titolo,
    sottotitolo,
    valore,
    href,
    onclick,
    freccia = false,
    distruttiva = false,
    accento = false,
    disabilitata = false,
    inizio,
    fine,
    children,
  }: {
    titolo?: string;
    sottotitolo?: string | null;
    /** Il valore grigio a destra («3 di 7», «12,50 €»). */
    valore?: string | number | null;
    href?: string;
    onclick?: (e: MouseEvent) => void;
    /** Il chevron: dice «qui dentro c'è un'altra schermata». */
    freccia?: boolean;
    distruttiva?: boolean;
    /** Il titolo nel colore del modulo: per le righe che sono azioni. */
    accento?: boolean;
    disabilitata?: boolean;
    /** A sinistra: un'icona, un'emoji, una spunta. */
    inizio?: Snippet;
    /** A destra, al posto del valore: un interruttore, un campo. */
    fine?: Snippet;
    /** Il corpo, se titolo e sottotitolo non bastano. */
    children?: Snippet;
  } = $props();

  const tag = $derived(href ? "a" : onclick ? "button" : "div");
</script>

<!-- Il tag è sempre <a> o <button> quando c'è un tocco da gestire: il
     compilatore non lo può sapere, perché lo sceglie una variabile. -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<svelte:element
  this={tag}
  class="riga"
  class:attiva={Boolean(href || onclick)}
  class:con-inizio={Boolean(inizio)}
  class:disabilitata
  href={href}
  type={tag === "button" ? "button" : undefined}
  disabled={tag === "button" ? disabilitata : undefined}
  onclick={onclick}
>
  {#if inizio}<span class="inizio">{@render inizio()}</span>{/if}
  <span class="corpo">
    {#if children}
      {@render children()}
    {:else}
      <span class="titolo" class:distruttiva class:accento>{titolo}</span>
      {#if sottotitolo}<span class="sottotitolo text-subheadline secondario">{sottotitolo}</span>{/if}
    {/if}
  </span>
  {#if fine}
    <span class="fine">{@render fine()}</span>
  {:else if valore !== undefined && valore !== null && valore !== ""}
    <span class="valore secondario cifre">{valore}</span>
  {/if}
  {#if freccia}<span class="freccia"><Icona nome="freccia" misura={16} tratto={2.4} /></span>{/if}
</svelte:element>

<style>
  .riga {
    --inizio-testo: var(--space-4);
    position: relative;
    display: flex; align-items: center; gap: var(--space-3);
    width: 100%; min-height: var(--list-row-height);
    padding: 11px var(--space-4);
    text-align: left;
    color: var(--label-primary);
  }
  .riga.con-inizio { --inizio-testo: calc(var(--space-4) + var(--inizio-l, 30px) + var(--space-3)); }

  /* Il separatore sopra ogni riga tranne la prima. `:global` perché quella
     prima può essere un'altra istanza, o un altro componente nella lastra.
     `.avvolge` è per chi mette una riga dentro un contenitore suo (per
     animarla, per darle un colore): il separatore lo guarda da fuori. */
  :global(* + .riga)::before,
  :global(* + .avvolge > .riga:first-child)::before {
    content: ""; position: absolute; top: 0; right: 0;
    left: var(--inizio-testo);
    border-top: 0.5px solid var(--separator);
  }

  .attiva { cursor: pointer; transition: background-color var(--duration-micro) linear; }
  .attiva:active { background: var(--fill-quaternary); }
  .disabilitata { opacity: 0.4; pointer-events: none; }

  /* Larga 30 come le icone di Impostazioni; chi ci mette qualcosa di più
     largo (il giorno di un'uscita) lo dice con `--inizio-l`, e il
     separatore si sposta con lui. */
  .inizio {
    flex: none; width: var(--inizio-l, 30px); min-height: 30px;
    display: grid; place-items: center;
  }
  .corpo { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
  .titolo { overflow-wrap: anywhere; }
  .titolo.distruttiva { color: var(--color-red); }
  .titolo.accento { color: var(--accento); }
  .valore { flex: none; max-width: 55%; text-align: right; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  /* La coda può restringersi fino a metà riga: un valore lungo (il nome di
     una cena) si tronca, non esce dalla lastra. */
  .fine { flex: 0 1 auto; min-width: 0; max-width: 60%; display: flex; align-items: center; justify-content: flex-end; }
  .freccia { flex: none; color: var(--label-tertiary); margin-right: -4px; }
</style>
