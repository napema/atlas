<!--
  I movimenti del CICLO, giorno per giorno, con il netto di ogni giorno.

  Erano del mese solare, ed era l'ultima schermata di Finanze a parlare una
  lingua diversa da tutte le altre: il Riepilogo, l'Analisi, la quota, «in
  arrivo» e le chiusure vivono tutte da stipendio a stipendio. Chi cercava
  la spesa che ha fatto saltare il ciclo la trovava spezzata in due mesi, e
  la somma dei giorni qui non tornava con nessun totale delle altre
  schermate. Una finestra sola per tutta la app.
-->
<script lang="ts">
  import Sezione from "$lib/ui/Sezione.svelte";
  import Vuoto from "$lib/ui/Vuoto.svelte";
  import RigaMovimento from "./RigaMovimento.svelte";
  import { dati } from "$lib/core/reattivo.svelte";
  import { euro, dataUmana, maiuscola } from "$lib/core/ui";
  import { movimentiDelCiclo, importoEffettivo } from "$condivisi/finanze/calcolo.js";
  import { cicloPerIndice } from "$condivisi/finanze/analisi.js";

  let { indice, filtro }: { indice: string; filtro: string } = $props();


  const giorni = $derived.by(() => {
    dati.versione;
    let ms = movimentiDelCiclo(cicloPerIndice(indice)) as any[];
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
