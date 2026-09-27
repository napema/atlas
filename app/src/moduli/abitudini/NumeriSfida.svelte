<!--
  I tre numeri della sfida, nella colonna del riepilogo.

  Stavano dentro la card della griglia, e sul PC lasciavano la colonna di
  sinistra con il solo contatore del giorno e mezzo schermo vuoto sotto.
  Qui invece sono la seconda cosa che leggi dopo «Giorno n», che è l'ordine
  in cui le si guarda davvero.

  Il RECORD è l'unico numero che sopravvive a un reset, ed è il motivo per
  cui c'è: dopo la terza ripartenza il contatore dice 2, e senza il record
  la schermata racconterebbe soltanto quello.
-->
<script lang="ts">
  import { dati } from "$lib/core/reattivo.svelte";
  import { statistiche, ripartenze } from "$condivisi/abitudini/p50.js";

  const d = $derived.by(() => {
    dati.versione;
    return { s: statistiche() as any, ripartito: ripartenze() as number };
  });
</script>

<dl class="numeri">
  <div class="voce">
    <dt class="text-footnote secondario">Record</dt>
    <dd class="cifra cifre">{d.s.record}</dd>
  </div>
  <div class="voce">
    <dt class="text-footnote secondario">Tenuti</dt>
    <dd class="cifra cifre">{d.s.bene}</dd>
  </div>
  <div class="voce">
    <dt class="text-footnote secondario">Ripartenze</dt>
    <dd class="cifra cifre" class:male={d.ripartito > 0}>{d.ripartito}</dd>
  </div>
</dl>

<style>
  .numeri { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-3); padding: var(--space-2) 0; }
  .voce { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .cifra { font-family: var(--font-display); font-size: 34px; line-height: 1; font-weight: var(--weight-bold); }
  .cifra.male { color: var(--color-red); }
</style>
