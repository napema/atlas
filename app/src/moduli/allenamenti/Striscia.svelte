<!--
  Tredici settimane in una riga che scorre. Il blocco intero resta sempre
  sotto il pollice; la fase si legge dal colore della barra. Una barra e non
  sei pallini: tredici settimane × sei pallini sono settantotto puntini, e
  da lontano diventano rumore.
-->
<script lang="ts">
  import { dati } from "$lib/core/reattivo.svelte";
  import { oggiISO } from "$lib/core/ui";
  import { PIANO, settimanaDi } from "$condivisi/allenamenti/dati.js";
  import { progressoSettimana } from "$condivisi/allenamenti/calcolo.js";
  import { fase } from "./comune";

  let { scelta = $bindable(1) }: { scelta: number } = $props();

  const attuale = $derived.by(() => { dati.versione; return settimanaDi(oggiISO()); });
  const voci = $derived.by(() => {
    dati.versione;
    return (PIANO as any[]).map((p) => ({ n: p.n, fase: p.fase, colore: fase(p.fase).colore, pr: progressoSettimana(p.n) }));
  });

  let nastro: HTMLElement | undefined = $state();
  // La settimana scelta al centro, non a sinistra: aprendo si vede subito
  // dove sei senza dover trascinare.
  $effect(() => {
    scelta;
    queueMicrotask(() => nastro?.querySelector<HTMLElement>(".scelta")?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" }));
  });
</script>

<div class="nastro" bind:this={nastro}>
  {#each voci as v (v.n)}
    <button
      type="button"
      class="sett"
      class:scelta={v.n === scelta}
      class:ora={v.n === attuale}
      class:chiusa={v.pr.frazione >= 1}
      style:--fase={v.colore}
      aria-pressed={v.n === scelta}
      aria-label="Settimana {v.n}, {v.fase}, {v.pr.fatti} di {v.pr.totali}"
      onclick={() => (scelta = v.n)}
    >
      <span class="n cifre">{v.n}</span>
      <span class="barra"><i style:width="{Math.round(v.pr.frazione * 100)}%"></i></span>
    </button>
  {/each}
</div>

<style>
  .nastro {
    display: flex; gap: var(--space-2);
    overflow-x: auto; scrollbar-width: none;
    margin: 0 calc(-1 * var(--content-inset)); padding: 4px var(--content-inset);
    scroll-snap-type: x proximity;
  }
  .nastro::-webkit-scrollbar { display: none; }
  .sett {
    flex: none; width: 52px; height: 60px; scroll-snap-align: center;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 7px;
    border-radius: var(--radius-xl);
    background: var(--bg-grouped-secondary);
    transition: transform var(--duration-fast) var(--ease-spring), background-color var(--duration-fast);
  }
  .sett:active { transform: scale(0.94); }
  .n { font-size: var(--text-headline); font-weight: var(--weight-semibold); color: var(--label-secondary); }
  .ora .n { color: var(--label-primary); }
  .scelta { background: var(--accento); }
  .scelta .n { color: #fff; }
  .barra { width: 28px; height: 4px; border-radius: 2px; overflow: hidden; background: color-mix(in srgb, var(--fase) 25%, transparent); }
  .barra i { display: block; height: 100%; background: var(--fase); border-radius: inherit; }
  .scelta .barra { background: rgba(255, 255, 255, 0.3); }
  .scelta .barra i { background: #fff; }
</style>
