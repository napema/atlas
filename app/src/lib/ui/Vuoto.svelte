<!--
  Vuoto — cosa si vede dove non c'è ancora niente. Dice cosa verrà qui e
  come farlo arrivare: una schermata vuota senza una strada è un vicolo.
-->
<script lang="ts">
  import type { Snippet } from "svelte";
  import Icona from "./Icona.svelte";

  let {
    icona,
    titolo,
    testo,
    children,
  }: { icona?: string; titolo: string; testo?: string; children?: Snippet } = $props();
</script>

<div class="vuoto">
  {#if icona}<span class="segno"><Icona nome={icona} misura={30} tratto={1.8} /></span>{/if}
  <h3 class="text-title3">{titolo}</h3>
  {#if testo}<p class="text-subheadline secondario">{testo}</p>{/if}
  {#if children}<div class="azioni">{@render children()}</div>{/if}
</div>

<style>
  .vuoto {
    display: flex; flex-direction: column; align-items: center; text-align: center; gap: var(--space-2);
    padding: var(--space-10) var(--space-6);
  }
  .segno {
    display: grid; place-items: center; width: 60px; height: 60px; margin-bottom: var(--space-2);
    border-radius: var(--radius-full);
    color: var(--accento);
    background: color-mix(in srgb, var(--accento) 16%, transparent);
  }
  p { max-width: 32ch; }
  .azioni { margin-top: var(--space-3); display: flex; gap: var(--space-2); }
</style>
