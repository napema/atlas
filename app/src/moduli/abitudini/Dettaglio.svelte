<!--
  Il dettaglio di un'abitudine: la serie, il record, gli ultimi trenta
  giorni e i promemoria. Si modifica da «Modifica» in alto a destra.
-->
<script lang="ts">
  import Foglio from "$lib/ui/Foglio.svelte";
  import Sezione from "$lib/ui/Sezione.svelte";
  import Riga from "$lib/ui/Riga.svelte";
  import Pulsante from "$lib/ui/Pulsante.svelte";
  import Icona from "$lib/ui/Icona.svelte";
  import { tinta } from "$lib/core/tinte";
  import { dati } from "$lib/core/reattivo.svelte";
  import { oggiISO, piuGiorni, dataUmana, daISO } from "$lib/core/ui";
  import { abitudinePerId, partiDi, gruppiParti } from "$condivisi/abitudini/dati.js";
  import {
    pianoDi, serie, serieMigliore, costanza, fattaIl, ePrevista, etichettaPiano, conteggioSettimana,
  } from "$condivisi/abitudini/calcolo.js";

  let {
    aperto = $bindable(false),
    id,
    onmodifica,
  }: { aperto: boolean; id: string | null; onmodifica: (id: string) => void } = $props();

  const d = $derived.by(() => {
    dati.versione;
    const h = id ? abitudinePerId(id) : null;
    if (!h) return null;
    const oggi = oggiISO();
    const p = pianoDi(h);
    return {
      h, p,
      attuale: serie(h),
      record: serieMigliore(h),
      cost: costanza(h, 30),
      settimana: p.type === "weekly" ? conteggioSettimana(h, oggi) : 0,
      trenta: Array.from({ length: 30 }, (_, i) => {
        const g = piuGiorni(oggi, -(29 - i));
        return { g, fatta: fattaIl(h, g), prevista: ePrevista(h, g) };
      }),
      orari: partiDi(h).length
        ? gruppiParti(h).filter((x: any) => x.ora).map((x: any) => ({ nome: x.nome, ora: x.ora }))
        : h.remind ? [{ nome: "Promemoria", ora: h.remind }] : [],
    };
  });
</script>

<Foglio bind:aperto titolo={d?.h.name ?? ""}>
  {#snippet destra()}
    <Pulsante variante="testo" misura="media" onclick={() => { aperto = false; if (id) onmodifica(id); }}>Modifica</Pulsante>
  {/snippet}

  {#if d}
    <div class="testa" style:--tinta={tinta(d.h.tint)}>
      <span class="simbolo emoji">{d.h.emoji || "⭐️"}</span>
      <div>
        <h3 class="text-title2">{d.h.name}</h3>
        <p class="text-subheadline secondario">{etichettaPiano(d.h)}</p>
      </div>
    </div>

    <div class="riquadri">
      <div class="riquadro">
        <span class="text-footnote secondario">Serie attuale</span>
        <span class="cifra cifre">{d.attuale}</span>
        <span class="text-footnote secondario">{d.p.type === "weekly" ? "settimane di fila" : "giorni di fila"}</span>
      </div>
      <div class="riquadro">
        <span class="text-footnote secondario">Record</span>
        <span class="cifra cifre">{d.record}</span>
        <span class="text-footnote secondario">{d.record > d.attuale ? "da battere" : "sei al massimo"}</span>
      </div>
    </div>

    <Sezione titolo="Ultimi 30 giorni" piede="{d.cost}% dei giorni previsti.">
      <div class="trenta" style:--tinta={tinta(d.h.tint)}>
        {#each d.trenta as c (c.g)}
          <span
            class="cella"
            class:piena={c.fatta}
            class:spenta={!c.prevista}
            title="{dataUmana(c.g)}{c.fatta ? ' · fatta' : ''}"
          >{daISO(c.g).getDate()}</span>
        {/each}
      </div>
    </Sezione>

    {#if d.p.type === "weekly"}
      <Sezione titolo="Questa settimana">
        <Riga titolo="Volte" valore="{d.settimana} di {d.p.times || 1}" />
      </Sezione>
    {/if}

    {#if d.orari.length}
      <!-- Con le parti i promemoria sono uno per fascia, e vanno mostrati
           tutti: «Promemoria 08:00» su una routine che ne ha due dice una
           mezza verità, quella che fa credere che la sera non suoni. -->
      <Sezione titolo="Promemoria">
        {#each d.orari as o (o.nome)}
          <Riga titolo={o.nome} valore={o.ora}>
            {#snippet inizio()}<Icona nome="campanella" misura={20} tratto={1.9} />{/snippet}
          </Riga>
        {/each}
      </Sezione>
    {/if}
  {/if}
</Foglio>

<style>
  .testa { display: flex; align-items: center; gap: var(--space-4); }
  .simbolo {
    flex: none; display: grid; place-items: center; width: 64px; height: 64px; border-radius: 18px;
    font-size: 34px; background: color-mix(in srgb, var(--tinta) 22%, transparent);
  }
  .riquadri { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); }
  .riquadro {
    display: flex; flex-direction: column; gap: 2px; padding: var(--space-4);
    border-radius: var(--radius-xxl); background: var(--bg-grouped-secondary);
  }
  .cifra { font-family: var(--font-display); font-size: 34px; line-height: 40px; font-weight: var(--weight-bold); }

  .trenta { display: grid; grid-template-columns: repeat(10, 1fr); gap: 6px; padding: var(--space-4); }
  .cella {
    aspect-ratio: 1; display: grid; place-items: center; border-radius: 8px;
    font-size: 11px; font-weight: var(--weight-medium); color: var(--label-tertiary);
    background: var(--fill-quaternary);
  }
  .cella.piena { background: var(--tinta); color: #fff; }
  .cella.spenta { background: none; box-shadow: inset 0 0 0 1px var(--separator); }
</style>
