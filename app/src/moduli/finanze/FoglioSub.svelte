<!-- Una sottocategoria: cosa ci sta sotto, anche fuori dal mese. -->
<script lang="ts">
  import Foglio from "$lib/ui/Foglio.svelte";
  import Sezione from "$lib/ui/Sezione.svelte";
  import RigaMovimento from "./RigaMovimento.svelte";
  import { dati } from "$lib/core/reattivo.svelte";
  import { euro, MESI } from "$lib/core/ui";
  import { categoriaPerId } from "$condivisi/finanze/dati.js";
  import { movimentiSottocategoria, importoEffettivo } from "$condivisi/finanze/calcolo.js";

  let { aperto = $bindable(false), catId, sub, mese }: { aperto: boolean; catId: string; sub: string; mese: string } = $props();

  const d = $derived.by(() => {
    dati.versione;
    const tutti = movimentiSottocategoria(catId, sub) as any[];
    const delMese = tutti.filter((m) => m.data.slice(0, 7) === mese);
    const tot = (xs: any[]) => xs.reduce((s, m) => s + importoEffettivo(m), 0);
    return {
      c: categoriaPerId(catId), tutti, delMese,
      prima: tutti.filter((m) => m.data.slice(0, 7) !== mese).slice(0, 12),
      totMese: tot(delMese), totTutti: tot(tutti),
    };
  });
</script>

<Foglio bind:aperto titolo={sub}>
  <p class="text-subheadline secondario centro">{d.c?.nome}</p>
  <div class="tre">
    <div><span class="text-footnote secondario">Questo mese</span><b class="cifre">{euro(d.totMese)}</b></div>
    <div><span class="text-footnote secondario">Volte</span><b class="cifre">{d.delMese.length}</b></div>
    <div><span class="text-footnote secondario">Medio</span><b class="cifre">{d.delMese.length ? euro(Math.round(d.totMese / d.delMese.length)) : "—"}</b></div>
  </div>
  <Sezione titolo="Movimenti di {MESI[Number(mese.slice(5, 7)) - 1]}" piede={d.delMese.length ? undefined : "Nessun movimento questo mese."}>
    {#each d.delMese as m (m.id)}<RigaMovimento {m} />{/each}
  </Sezione>
  {#if d.prima.length}
    <Sezione titolo="Prima di questo mese" piede="In archivio: {d.tutti.length} movimenti per {euro(d.totTutti)} in totale.">
      {#each d.prima as m (m.id)}<RigaMovimento {m} />{/each}
    </Sezione>
  {/if}
</Foglio>

<style>
  .centro { text-align: center; margin-bottom: calc(-1 * var(--space-3)); }
  .tre { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-2); }
  .tre div { display: flex; flex-direction: column; gap: 2px; padding: 10px 12px; border-radius: var(--radius-xl); background: var(--bg-grouped-secondary); }
  .tre b { font-size: var(--text-headline); font-weight: var(--weight-semibold); }
</style>
