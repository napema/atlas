<!--
  Anello — l'avanzamento di una cosa sola, come gli anelli di Fitness.
  Il tratto parte da mezzogiorno e gira in senso orario; la traccia sotto è
  un velo del colore stesso, così un anello vuoto si riconosce comunque.
-->
<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    valore = 0,
    misura = 56,
    spessore = 7,
    colore = "var(--accento)",
    etichetta,
    children,
  }: {
    /** Da 0 a 1. Sopra 1 resta pieno. */
    valore?: number;
    misura?: number;
    spessore?: number;
    colore?: string;
    etichetta?: string;
    children?: Snippet;
  } = $props();

  const r = $derived((misura - spessore) / 2);
  const giro = $derived(2 * Math.PI * r);
  const pieno = $derived(Math.max(0, Math.min(1, Number(valore) || 0)));
</script>

<div
  class="anello"
  style:width="{misura}px"
  style:height="{misura}px"
  style:--colore={colore}
  role="img"
  aria-label={etichetta ?? `${Math.round(pieno * 100)}%`}
>
  <svg viewBox="0 0 {misura} {misura}" width={misura} height={misura} aria-hidden="true">
    <circle class="traccia" cx={misura / 2} cy={misura / 2} r={r} stroke-width={spessore} />
    <circle
      class="tratto"
      cx={misura / 2} cy={misura / 2} r={r}
      stroke-width={spessore}
      stroke-dasharray={giro}
      stroke-dashoffset={giro * (1 - pieno)}
      opacity={pieno > 0 ? 1 : 0}
    />
  </svg>
  {#if children}<div class="centro">{@render children()}</div>{/if}
</div>

<style>
  .anello { position: relative; flex: none; display: grid; place-items: center; }
  svg { position: absolute; inset: 0; transform: rotate(-90deg); }
  circle { fill: none; }
  .traccia { stroke: color-mix(in srgb, var(--colore) 22%, transparent); }
  .tratto {
    stroke: var(--colore); stroke-linecap: round;
    transition: stroke-dashoffset var(--duration-slow) var(--ease-default);
  }
  .centro { position: relative; display: grid; place-items: center; text-align: center; }
</style>
