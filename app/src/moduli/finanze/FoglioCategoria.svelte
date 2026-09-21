<!-- Una categoria: sei mesi, le sottocategorie, i movimenti del mese. -->
<script lang="ts">
  import Foglio from "$lib/ui/Foglio.svelte";
  import Sezione from "$lib/ui/Sezione.svelte";
  import Riga from "$lib/ui/Riga.svelte";
  import Traccia from "$lib/ui/Traccia.svelte";
  import GraficoBarre from "./GraficoBarre.svelte";
  import RigaMovimento from "./RigaMovimento.svelte";
  import { dati } from "$lib/core/reattivo.svelte";
  import { euro, plurale } from "$lib/core/ui";
  import { categoriaPerId, profiloDi } from "$condivisi/finanze/dati.js";
  import { statistiche, categoriaSuSeiMesi } from "$condivisi/finanze/calcolo.js";
  import { coloreCat } from "./comune";
  import { apri } from "./fogli.svelte";

  let { aperto = $bindable(false), catId, mese }: { aperto: boolean; catId: string; mese: string } = $props();

  const d = $derived.by(() => {
    dati.versione;
    const c = categoriaPerId(catId);
    if (!c) return null;
    const st = statistiche(mese);
    const x = st.perCat[catId] || { tot: 0, movs: [], sub: {} };
    const budget = Math.round((profiloDi(mese).b[catId] || 0) * 100);
    return {
      c, x, budget,
      medio: x.movs.length ? Math.round(x.tot / x.movs.length) : 0,
      sei: categoriaSuSeiMesi(mese, catId),
      sub: Object.entries(x.sub as Record<string, any>).sort((a, b) => b[1].tot - a[1].tot),
    };
  });
</script>

<Foglio bind:aperto titolo={d?.c.nome ?? ""}>
  {#if d}
    <div class="tre">
      <div><span class="text-footnote secondario">Questo mese</span><b class="cifre">{euro(d.x.tot)}</b></div>
      <div><span class="text-footnote secondario">Pocket</span><b class="cifre">{d.budget ? euro(d.budget, { tondo: true }) : "—"}</b></div>
      <div><span class="text-footnote secondario">Scontrino medio</span><b class="cifre">{d.x.movs.length ? euro(d.medio) : "—"}</b></div>
    </div>
    {#if d.budget > 0}
      <div class="avanzo">
        <Traccia valore={Math.min(1, d.x.tot / d.budget)} colore={d.x.tot >= d.budget ? "var(--color-red)" : d.x.tot >= d.budget * 0.9 ? "var(--color-orange)" : coloreCat(catId)} altezza={6} />
        <span class="text-footnote secondario">{Math.round((d.x.tot / d.budget) * 100)}% del pocket · {d.x.tot <= d.budget ? `restano ${euro(d.budget - d.x.tot)}` : `sforato di ${euro(d.x.tot - d.budget)}`}</span>
      </div>
    {/if}

    <Sezione titolo="Sei mesi">
      <div class="grafico"><GraficoBarre valori={d.sei.valori} etichette={d.sei.etichette} evidenzia={5} retta={d.budget || null} colore={coloreCat(catId)} /></div>
    </Sezione>

    {#if d.sub.length}
      <Sezione titolo="Sottocategorie">
        {#each d.sub as [nome, v] (nome)}
          <Riga titolo={nome} sottotitolo="{plurale(v.n, 'volta', 'volte')} · medio {euro(Math.round(v.tot / v.n))}" valore={euro(v.tot)} freccia onclick={() => apri({ tipo: "sub", catId, sub: nome, mese })} />
        {/each}
      </Sezione>
    {/if}

    <Sezione titolo="Movimenti del mese" piede={d.x.movs.length ? undefined : "Nessun movimento questo mese."}>
      {#each d.x.movs as m (m.id)}<RigaMovimento {m} />{/each}
    </Sezione>
  {/if}
</Foglio>

<style>
  .tre { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-2); }
  .tre div { display: flex; flex-direction: column; gap: 2px; padding: 10px 12px; border-radius: var(--radius-xl); background: var(--bg-grouped-secondary); }
  .tre b { font-size: var(--text-headline); font-weight: var(--weight-semibold); }
  .avanzo { display: flex; flex-direction: column; gap: 6px; margin-top: calc(-1 * var(--space-3)); }
  .grafico { padding: var(--space-4); }
</style>
