<!--
  Tastierino — il tastierino numerico disegnato. Su iPhone è più veloce
  della tastiera di sistema e non fa saltare la vista; su un PC con la
  tastiera vera chi lo usa lo nasconde (`nascondiSuPC`).
-->
<script lang="ts">
  import Icona from "./Icona.svelte";
  import { tocco } from "$lib/core/ui";

  let { valore = $bindable(""), nascondiSuPC = true }: { valore: string; nascondiSuPC?: boolean } = $props();

  /** Un tasto sopra un testo di importo. Due decimali, otto cifre al più. */
  function premi(t: string) {
    tocco(5);
    if (t === "←") { valore = valore.slice(0, -1); return; }
    if (t === ",") { if (!valore.includes(",")) valore = valore ? `${valore},` : "0,"; return; }
    const [, dec] = valore.split(",");
    if (dec != null && dec.length >= 2) return;
    if (valore.replace(",", "").length >= 8) return;
    valore = valore === "0" ? t : valore + t;
  }
</script>

<div class="tastierino" class:nascondiSuPC>
  {#each ["1", "2", "3", "4", "5", "6", "7", "8", "9", ",", "0", "←"] as t (t)}
    <button type="button" class="tasto" aria-label={t === "←" ? "Cancella" : t} onclick={() => premi(t)}>
      {#if t === "←"}<Icona nome="indietro" misura={24} tratto={2} />{:else}{t}{/if}
    </button>
  {/each}
</div>

<style>
  .tastierino { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-2); }
  .tasto {
    height: 54px; display: grid; place-items: center; border-radius: var(--radius-lg);
    font-family: var(--font-display); font-size: 26px; font-weight: var(--weight-medium);
    background: var(--bg-grouped-secondary);
    transition: background-color var(--duration-micro), transform var(--duration-micro);
  }
  .tasto:active { background: var(--fill-secondary); transform: scale(0.97); }
  @media (hover: hover) and (pointer: fine) { .nascondiSuPC { display: none; } }
</style>
