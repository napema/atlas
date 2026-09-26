<!--
  La testata di Project 50: a che giorno sei.

  Ha preso il posto della card «Riepilogo» con la percentuale, e la
  sostituzione è il punto. In una sfida tutto-o-niente un 87% non significa
  niente: significa che hai fallito, ma detto in un modo che permette di
  sentirsi a posto. Qui non ci sono percentuali da nessuna parte — c'è il
  numero del giorno, che è l'unica misura che quella sfida riconosce.

  «Oggi 0/8» sta in una riga sola e piccola, sotto. È lo stato di adesso, non
  il risultato: il risultato esiste solo dopo la chiusura.
-->
<script lang="ts">
  import { TOTALE } from "$condivisi/abitudini/p50.js";

  let {
    giorno,
    fatte,
    previste,
    chiuso = false,
  }: { giorno: number; fatte: number; previste: number; chiuso?: boolean } = $props();

  const quota = $derived(Math.max(0, Math.min(1, (giorno - 1) / TOTALE)));
</script>

<header class="testata">
  <div class="cifra">
    <span class="eti text-footnote semibold">Giorno</span>
    <span class="numero cifre">{giorno}</span>
    <span class="su cifre">/ {TOTALE}</span>
  </div>

  <div class="asta" role="img" aria-label="{giorno - 1} giorni su {TOTALE}">
    <i style:width="{Math.round(quota * 100)}%"></i>
  </div>

  <p class="riga text-subheadline">
    {#if chiuso}
      <span class="secondario">Giorno chiuso</span>
    {:else}
      <span class="secondario">Oggi</span>
      <b class="cifre" class:tutte={previste > 0 && fatte === previste}>{fatte}/{previste}</b>
    {/if}
  </p>
</header>

<style>
  .testata { display: flex; flex-direction: column; gap: var(--space-2); padding: var(--space-2) 0 0; }

  .cifra { display: flex; align-items: baseline; gap: var(--space-2); }
  .eti { color: var(--accento); letter-spacing: 0.6px; text-transform: uppercase; align-self: center; }
  .numero {
    font-family: var(--font-display); font-size: 56px; line-height: 1; font-weight: var(--weight-bold);
    letter-spacing: -0.02em;
  }
  .su { font-size: var(--text-title3); font-weight: var(--weight-semibold); color: var(--label-tertiary); }

  /* Quattro punti, sottile: è un promemoria di quanta strada c'è, non un
     grafico. Più spessa diventerebbe la cosa che guardi al posto del numero. */
  .asta { height: 4px; border-radius: var(--radius-full); background: var(--fill-tertiary); overflow: hidden; }
  .asta i { display: block; height: 100%; background: var(--accento); border-radius: inherit; transition: width var(--duration-slow) var(--ease-default); }

  .riga { display: flex; align-items: baseline; gap: 6px; }
  .riga b { font-weight: var(--weight-semibold); }
  .riga .tutte { color: var(--color-green); }
</style>
