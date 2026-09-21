<!--
  Sezione — un gruppo di righe su una lastra, con titolo e nota facoltativi.
  È la lista «inset grouped» di iOS: la pagina è il fondo, i gruppi salgono.

  `nuda` toglie la lastra, per le sezioni che contengono carte proprie
  (i riquadri della home, un grafico).
-->
<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    titolo,
    piede,
    coda,
    nuda = false,
    children,
  }: {
    titolo?: string;
    /** La nota piccola sotto la lastra. */
    piede?: string | Snippet;
    /** Un collegamento a destra del titolo («Tutte», «Modifica»). */
    coda?: Snippet;
    nuda?: boolean;
    children: Snippet;
  } = $props();
</script>

<section class="sezione">
  {#if titolo || coda}
    <div class="testa">
      {#if titolo}<h2 class="text-title3">{titolo}</h2>{/if}
      {#if coda}<div class="coda text-body">{@render coda()}</div>{/if}
    </div>
  {/if}
  <div class={nuda ? "nuda" : "lastra"}>
    {@render children()}
  </div>
  {#if piede}
    <p class="piede text-footnote secondario">
      {#if typeof piede === "string"}{piede}{:else}{@render piede()}{/if}
    </p>
  {/if}
</section>

<style>
  .sezione { display: flex; flex-direction: column; }
  .testa {
    display: flex; align-items: baseline; justify-content: space-between; gap: var(--space-3);
    padding: 0 var(--space-1) var(--space-2);
  }
  .coda { color: var(--accento); }
  .lastra {
    background: var(--bg-grouped-secondary);
    border-radius: var(--radius-xxxl);
    overflow: hidden;
  }
  .nuda { display: flex; flex-direction: column; gap: var(--space-3); }
  .piede { padding: var(--space-2) var(--space-4) 0; }
</style>
