<!-- I movimenti del mese, giorno per giorno, con il netto di ogni giorno. -->
<script lang="ts">
  import Sezione from "$lib/ui/Sezione.svelte";
  import Vuoto from "$lib/ui/Vuoto.svelte";
  import RigaMovimento from "./RigaMovimento.svelte";
  import { dati } from "$lib/core/reattivo.svelte";
  import { euro, dataUmana, maiuscola } from "$lib/core/ui";
  import { movimentiDelMese, importoEffettivo } from "$condivisi/finanze/calcolo.js";

  let { mese, filtro }: { mese: string; filtro: string } = $props();


  const giorni = $derived.by(() => {
    dati.versione;
    let ms = movimentiDelMese(mese) as any[];
    if (filtro === "altri") ms = ms.filter((m) => ["giro", "rimb", "reso"].includes(m.tipo));
    else if (filtro === "ecc") ms = ms.filter((m) => m.tipo === "out" && m.ecc);
    else if (filtro === "out") ms = ms.filter((m) => m.tipo === "out" && !m.ecc);
    else if (filtro !== "tutti") ms = ms.filter((m) => m.tipo === filtro);
    const per = new Map<string, any[]>();
    for (const m of ms) { if (!per.has(m.data)) per.set(m.data, []); per.get(m.data)!.push(m); }
    // Il netto del giorno: entrate meno uscite ORDINARIE. Gli straordinari
    // ne restano fuori, per lo stesso motivo per cui stanno fuori dal budget.
    return [...per.entries()].map(([data, movs]) => ({
      data, movs,
      netto: movs.reduce((s, m) => s + (m.tipo === "in" ? m.imp : m.tipo === "out" && !m.ecc ? -importoEffettivo(m) : 0), 0),
    }));
  });
</script>

{#if !giorni.length}
  <Vuoto icona="portafoglio" titolo="Nessun movimento" testo="Con Uscita o Entrata qui in basso ne registri uno." />
{:else}
  {#each giorni as g (g.data)}
      <Sezione titolo={maiuscola(dataUmana(g.data))}>
        {#snippet coda()}
          {#if g.netto !== 0}<span class="cifre text-subheadline" class:entrata={g.netto > 0} class:uscita={g.netto < 0}>{euro(g.netto, { segno: true })}</span>{/if}
        {/snippet}
        {#each g.movs as m (m.id)}<RigaMovimento {m} />{/each}
      </Sezione>
  {/each}
{/if}

<style>
  .entrata { color: var(--color-green); }
  .uscita { color: var(--color-red); }
</style>
