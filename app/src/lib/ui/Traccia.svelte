<!-- Traccia — l'avanzamento in orizzontale. Stessa regola dell'anello. -->
<script lang="ts">
  let {
    valore = 0,
    colore = "var(--accento)",
    altezza = 6,
    etichetta,
  }: { valore?: number; colore?: string; altezza?: number; etichetta?: string } = $props();

  const pieno = $derived(Math.max(0, Math.min(1, Number(valore) || 0)));
</script>

<div
  class="traccia"
  style:--colore={colore}
  style:height="{altezza}px"
  role="progressbar"
  aria-label={etichetta}
  aria-valuemin={0}
  aria-valuemax={100}
  aria-valuenow={Math.round(pieno * 100)}
>
  <span style:width="{pieno * 100}%"></span>
</div>

<style>
  .traccia {
    width: 100%; overflow: hidden;
    border-radius: var(--radius-full);
    background: color-mix(in srgb, var(--colore) 20%, transparent);
  }
  span {
    display: block; height: 100%; min-width: 0;
    border-radius: inherit; background: var(--colore);
    transition: width var(--duration-slow) var(--ease-default);
  }
</style>
