<!--
  I due blocchi: le otto non negoziabili e il supporto.

  È la modifica che conta più di tutte le altre messe insieme. Prima erano
  una lista sola, tutte uguali: e se sono tutte uguali, quando ne manca una
  non sai se hai perso il contatore o se hai saltato la skincare. La
  gerarchia non è estetica — è l'informazione.

  Il blocco delle otto ha un bordo, una superficie sua e una testata che
  resta in cima mentre scorri. Il supporto non ha niente: un titolino in
  caps, un separatore, righe più basse e un filo di opacità in meno.

  IL BORDO RESTA NEUTRO FINO A 7/8. Diventa verde solo a otto su otto, e
  questa è la regola che rende la cosa una sfida invece di un gioco: sette
  su otto non è «quasi», è un giorno perso, e un feedback positivo parziale
  lo racconterebbe come un successo a cui manca poco.
-->
<script lang="ts">
  import RigaAbitudine from "./RigaAbitudine.svelte";

  let {
    otto,
    supporto,
    giorno,
    fatte,
    previste,
    onapri,
  }: {
    otto: any[];
    supporto: any[];
    giorno: string;
    fatte: number;
    previste: number;
    onapri: (id: string) => void;
  } = $props();

  const pieno = $derived(previste > 0 && fatte === previste);
</script>

<section class="blocco-a" class:pieno>
  <header class="capo">
    <span class="titolo text-footnote semibold">Project 50</span>
    <span class="conto cifre">{fatte}/{previste}</span>
  </header>
  <div class="righe">
    {#each otto as h (h.id)}
      <RigaAbitudine {h} {giorno} {onapri} />
    {/each}
  </div>
</section>

{#if supporto.length}
  <section class="blocco-b">
    <span class="eti text-caption1 semibold">Supporto</span>
    <div class="righe">
      {#each supporto as h (h.id)}
        <RigaAbitudine {h} {giorno} compatta {onapri} />
      {/each}
    </div>
  </section>
{/if}

<style>
  .blocco-a {
    border-radius: 16px;
    background: var(--bg-grouped-secondary);
    box-shadow: inset 0 0 0 1.5px var(--separator);
    overflow: hidden;
    transition: box-shadow var(--duration-slow) var(--ease-default);
  }
  .blocco-a.pieno { box-shadow: inset 0 0 0 1.5px var(--color-green); }

  /* La testata resta in cima mentre scorri: con otto righe e la morning
     routine aperta, il contatore usciva dallo schermo proprio mentre lo
     stavi facendo salire. */
  .capo {
    position: sticky; top: calc(var(--altezza-barra) - 1px); z-index: 2;
    display: flex; align-items: baseline; justify-content: space-between; gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    background: var(--bg-grouped-secondary);
    box-shadow: 0 0.5px 0 var(--separator);
  }
  .titolo { letter-spacing: 0.8px; text-transform: uppercase; color: var(--label-secondary); }
  .pieno .titolo { color: var(--color-green); }
  .conto { font-size: var(--text-title3); font-weight: var(--weight-semibold); }
  .pieno .conto { color: var(--color-green); }

  .righe { padding: 0 var(--space-4) var(--space-2); }
  .righe > :global(.abitudine + .abitudine) { box-shadow: inset 0 0.5px 0 var(--separator); }

  /* Trentadue punti di distacco: deve essere evidente a colpo d'occhio che
     sono due cose diverse, non due parti della stessa lista. */
  .blocco-b { margin-top: 32px; padding-top: var(--space-3); border-top: 0.5px solid var(--separator); }
  .blocco-b .eti {
    display: block; padding: 0 var(--space-4) var(--space-1);
    letter-spacing: 0.8px; text-transform: uppercase; color: var(--label-tertiary);
  }
</style>
