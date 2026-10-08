<!--
  Una sottocategoria: cosa ci sta sotto in questo ciclo, e cosa c'era prima.

  Il ciclo e non il mese solare, come il foglio da cui si arriva: due
  finestre a un tocco di distanza fanno due numeri diversi per la stessa
  domanda, ed e' il modo di non fidarsi piu' di nessuno dei due.
-->
<script lang="ts">
  import { cicloPerIndice } from "$condivisi/finanze/analisi.js";
  import Foglio from "$lib/ui/Foglio.svelte";
  import Sezione from "$lib/ui/Sezione.svelte";
  import RigaMovimento from "./RigaMovimento.svelte";
  import { dati } from "$lib/core/reattivo.svelte";
  import { euro, oggiISO } from "$lib/core/ui";
  import { categoriaPerId } from "$condivisi/finanze/dati.js";
  import { movimentiSottocategoria, importoEffettivo, cicloDi, nomeCiclo } from "$condivisi/finanze/calcolo.js";

  let { aperto = $bindable(false), catId, sub, mese }: { aperto: boolean; catId: string; sub: string; mese: string } = $props();

  const d = $derived.by(() => {
    dati.versione;
    // Il ciclo da cui arrivi: l'Analisi si sfoglia all'indietro, e un
    // foglio che mostrava sempre quello di oggi contraddiceva la riga toccata.
    const ciclo = cicloPerIndice(mese);
    const tutti = movimentiSottocategoria(catId, sub) as any[];
    const dentro = (m: any) => m.data >= ciclo.da && m.data <= ciclo.a;
    const delMese = tutti.filter(dentro);
    const tot = (xs: any[]) => xs.reduce((s, m) => s + importoEffettivo(m), 0);
    return {
      c: categoriaPerId(catId), tutti, delMese, ciclo,
      prima: tutti.filter((m) => !dentro(m)).slice(0, 12),
      totMese: tot(delMese), totTutti: tot(tutti),
    };
  });
</script>

<Foglio bind:aperto titolo={sub}>
  <p class="text-subheadline secondario centro">{d.c?.nome}</p>
  <div class="tre">
    <div><span class="text-footnote secondario">Questo ciclo</span><b class="cifre">{euro(d.totMese)}</b></div>
    <div><span class="text-footnote secondario">Volte</span><b class="cifre">{d.delMese.length}</b></div>
    <div><span class="text-footnote secondario">Medio</span><b class="cifre">{d.delMese.length ? euro(Math.round(d.totMese / d.delMese.length)) : "—"}</b></div>
  </div>
  <Sezione titolo="Movimenti del ciclo" piede={d.delMese.length ? nomeCiclo(d.ciclo) : `Nessun movimento fra il ${nomeCiclo(d.ciclo)}.`}>
    {#each d.delMese as m (m.id)}<RigaMovimento {m} />{/each}
  </Sezione>
  {#if d.prima.length}
    <Sezione titolo="Prima di questo ciclo" piede="In archivio: {d.tutti.length} movimenti per {euro(d.totTutti)} in totale.">
      {#each d.prima as m (m.id)}<RigaMovimento {m} />{/each}
    </Sezione>
  {/if}
</Foglio>

<style>
  .centro { text-align: center; margin-bottom: calc(-1 * var(--space-3)); }
  .tre { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-2); }
  .tre div { display: flex; flex-direction: column; gap: 2px; padding: 10px 12px; border-radius: var(--radius-xl); background: var(--lastra-dentro); }
  .tre b { font-size: var(--text-headline); font-weight: var(--weight-semibold); }
</style>
